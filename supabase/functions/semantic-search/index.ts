import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, matchCount = 5, threshold = 0.3 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding for the query
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let queryEmbedding: number[];

    if (LOVABLE_API_KEY) {
      // Try to get embedding from AI
      const embeddingResponse = await fetch(`${supabaseUrl}/functions/v1/generate-embedding`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: query }),
      });

      if (embeddingResponse.ok) {
        const { embedding } = await embeddingResponse.json();
        queryEmbedding = embedding;
      } else {
        queryEmbedding = generateDeterministicEmbedding(query);
      }
    } else {
      queryEmbedding = generateDeterministicEmbedding(query);
    }

    // Perform similarity search
    const { data: results, error: searchError } = await supabase.rpc('search_archive_items', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: threshold,
      match_count: matchCount,
      p_owner_id: user.id,
    });

    if (searchError) {
      console.error('Search error:', searchError);
      // Fall back to keyword search
      const { data: keywordResults } = await supabase
        .from('archive_items')
        .select('id, title, content, summary, stage, semantic_score')
        .eq('owner_id', user.id)
        .neq('stage', 'DELETED')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('semantic_score', { ascending: false })
        .limit(matchCount);

      return new Response(
        JSON.stringify({ 
          results: keywordResults?.map(r => ({ ...r, similarity: 0.5 })) || [],
          method: 'keyword'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        results: results || [],
        method: 'semantic'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Semantic search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateDeterministicEmbedding(text: string): number[] {
  const embedding: number[] = [];
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  for (let i = 0; i < 384; i++) {
    let hash = 0;
    for (let j = 0; j < normalized.length; j++) {
      hash = ((hash << 5) - hash + normalized.charCodeAt(j) * (i + 1)) | 0;
    }
    embedding.push(Math.sin(hash) * 0.5 + Math.cos(hash * 0.7) * 0.3);
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map(v => v / (magnitude || 1));
}
