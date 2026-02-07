import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SummaryRequest {
  itemId: string;
  title: string;
  content: string;
  targetStage: 'SUMMARIZED' | 'MINIMAL';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId, title, content, targetStage } = await req.json() as SummaryRequest;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = targetStage === 'SUMMARIZED' 
      ? `You are a semantic preservation engine. Create a comprehensive summary that preserves the essential meaning, key facts, and important context of the content. The summary should be detailed enough to answer most queries about the original content.`
      : `You are a minimal extraction engine. Extract only the most critical metadata: key topics, essential facts, and primary keywords. This is the last line of defense before deletion - preserve only what's absolutely essential.`;

    const userPrompt = `${targetStage === 'SUMMARIZED' ? 'Summarize' : 'Extract minimal metadata from'} this archived content:

Title: ${title}
Content: ${content.slice(0, 4000)}

${targetStage === 'SUMMARIZED' 
  ? 'Provide a semantic summary (3-5 paragraphs) that preserves the core meaning and key information.'
  : 'Provide minimal JSON metadata with: topics (array), key_facts (array of 3-5 essential facts), keywords (array), and one_sentence_essence (string).'}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content || '';

    let result: { summary?: string; minimalJson?: object } = {};

    if (targetStage === 'SUMMARIZED') {
      result.summary = generatedContent;
    } else {
      // Try to parse JSON from the response
      try {
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result.minimalJson = JSON.parse(jsonMatch[0]);
        } else {
          result.minimalJson = {
            topics: [],
            key_facts: [generatedContent.slice(0, 200)],
            keywords: title.split(' ').slice(0, 5),
            one_sentence_essence: generatedContent.slice(0, 150),
          };
        }
      } catch {
        result.minimalJson = {
          topics: [],
          key_facts: [generatedContent.slice(0, 200)],
          keywords: title.split(' ').slice(0, 5),
          one_sentence_essence: generatedContent.slice(0, 150),
        };
      }
    }

    return new Response(JSON.stringify({ itemId, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-summary error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
