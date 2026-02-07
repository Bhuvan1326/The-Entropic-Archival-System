import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  itemId: string;
  title: string;
  content: string | null;
  itemType: string;
  tags: string[];
  generateSummary?: boolean;
}

interface SemanticScores {
  relevance: number;
  uniqueness: number;
  reconstructability: number;
  semanticScore: number;
  reasoning: string;
  summary?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId, title, content, itemType, tags, generateSummary } = await req.json() as AnalyzeRequest;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a semantic analysis engine for an archival system. 
Your task is to evaluate archived items and provide quantitative scores for preservation decisions.

You MUST respond using the provided function tool. Do not respond with plain text.

Scoring Guidelines (0-100 scale):
- RELEVANCE (Long-term value): Consider historical significance, research value, timeless information vs dated content
- UNIQUENESS: How rare is this information? Can it be found elsewhere? Lower score = more redundant
- RECONSTRUCTABILITY: How well can this be summarized without losing meaning? Text is more reconstructable than images/videos`;

    const userPrompt = `Analyze this archived item:

Title: ${title}
Type: ${itemType}
Tags: ${tags.join(', ') || 'none'}
Content: ${content?.slice(0, 2000) || 'No content available'}

${generateSummary ? 'Also generate a semantic summary (2-3 sentences) that preserves the core meaning for future reference.' : ''}

Provide scores and reasoning for preservation decisions.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "provide_semantic_analysis",
          description: "Provide semantic scores and analysis for the archived item",
          parameters: {
            type: "object",
            properties: {
              relevance: {
                type: "number",
                description: "Long-term relevance score (0-100)"
              },
              uniqueness: {
                type: "number", 
                description: "Uniqueness score - how rare/irreplaceable is this content (0-100)"
              },
              reconstructability: {
                type: "number",
                description: "How well can this be compressed/summarized without losing meaning (0-100)"
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of the scoring decisions"
              },
              summary: {
                type: "string",
                description: "Semantic summary preserving core meaning (if requested)"
              }
            },
            required: ["relevance", "uniqueness", "reconstructability", "reasoning"],
            additionalProperties: false
          }
        }
      }
    ];

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
        tools,
        tool_choice: { type: "function", function: { name: "provide_semantic_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "provide_semantic_analysis") {
      // Fallback: try to parse from content if tool call failed
      console.warn("No tool call found, using fallback scores");
      const fallbackScores: SemanticScores = {
        relevance: 50 + Math.random() * 30,
        uniqueness: 40 + Math.random() * 40,
        reconstructability: itemType === 'article' || itemType === 'research' ? 60 + Math.random() * 30 : 30 + Math.random() * 30,
        semanticScore: 50,
        reasoning: "Fallback scoring used - LLM response parsing failed",
      };
      fallbackScores.semanticScore = fallbackScores.relevance * 0.4 + fallbackScores.uniqueness * 0.35 + fallbackScores.reconstructability * 0.25;
      
      return new Response(JSON.stringify({ itemId, scores: fallbackScores }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    
    // Normalize scores to 0-100 and calculate weighted semantic score
    const scores: SemanticScores = {
      relevance: Math.min(100, Math.max(0, args.relevance)),
      uniqueness: Math.min(100, Math.max(0, args.uniqueness)),
      reconstructability: Math.min(100, Math.max(0, args.reconstructability)),
      reasoning: args.reasoning,
      summary: args.summary,
      semanticScore: 0,
    };
    
    scores.semanticScore = scores.relevance * 0.4 + scores.uniqueness * 0.35 + scores.reconstructability * 0.25;

    return new Response(JSON.stringify({ itemId, scores }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("analyze-semantic error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
