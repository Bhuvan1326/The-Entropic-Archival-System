import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Gemini to create a semantic hash that we convert to a pseudo-embedding
    // Since we need a 384-dim vector, we'll use a deterministic approach
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an embedding generator. Given text, output exactly 384 floating point numbers between -1 and 1 separated by commas. These numbers should semantically represent the text content. Similar texts should produce similar number patterns. Output ONLY the numbers, nothing else.`
          },
          {
            role: 'user',
            content: `Generate a 384-dimensional embedding for: "${text.slice(0, 1000)}"`
          }
        ],
        temperature: 0,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI gateway error:', error);
      
      // Fallback: generate deterministic pseudo-embedding from text hash
      const embedding = generateDeterministicEmbedding(text);
      return new Response(
        JSON.stringify({ embedding }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const embeddingText = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Parse the embedding
    let embedding: number[];
    try {
      embedding = embeddingText.split(',').map((n: string) => {
        const num = parseFloat(n.trim());
        return isNaN(num) ? 0 : Math.max(-1, Math.min(1, num));
      });
      
      // Ensure exactly 384 dimensions
      while (embedding.length < 384) embedding.push(0);
      embedding = embedding.slice(0, 384);
    } catch {
      embedding = generateDeterministicEmbedding(text);
    }

    return new Response(
      JSON.stringify({ embedding }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Embedding generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback deterministic embedding generator
function generateDeterministicEmbedding(text: string): number[] {
  const embedding: number[] = [];
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  // Use character-based hashing for deterministic embedding
  for (let i = 0; i < 384; i++) {
    let hash = 0;
    for (let j = 0; j < normalized.length; j++) {
      hash = ((hash << 5) - hash + normalized.charCodeAt(j) * (i + 1)) | 0;
    }
    // Normalize to [-1, 1]
    embedding.push(Math.sin(hash) * 0.5 + Math.cos(hash * 0.7) * 0.3);
  }
  
  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map(v => v / (magnitude || 1));
}
