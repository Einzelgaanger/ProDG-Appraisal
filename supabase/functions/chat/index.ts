import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigins = [
  "https://three60appraisal.onrender.com",
  "http://localhost:5173",
  "http://localhost:8080",
  "https://id-preview--13fa90b5-15b3-4b0e-96ac-5bc3269f79e4.lovable.app",
];

function getCorsHeaders(origin: string | null) {
  const originHeader = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": originHeader,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, dataContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert HR analytics assistant for VGG 360° Performance Reviews. You have comprehensive access to the complete appraisal dataset and must provide thorough, data-driven analysis.

=== COMPLETE DATA CONTEXT ===
${dataContext}

=== RESPONSE FORMATTING RULES (MANDATORY) ===
1. **Use Bold Headers**: Start sections with clear bold headers like "**Top Performers:**" or "**Key Insights:**"
2. **Use Numbered Lists**: For rankings or sequential information, always use numbered lists (1., 2., 3.)
3. **Use Bullet Points**: For general points, use bullet points (•)
4. **Include Specific Numbers**: Always cite exact scores, percentages, and counts from the data
5. **Structure Your Response**: Break down responses into clear sections with headers
6. **Compare When Relevant**: When discussing one manager, mention how they compare to the average or top performers
7. **Provide Context**: Explain what scores mean (e.g., "3.5/4.0 represents 87.5% performance")

=== ANALYSIS GUIDELINES ===
- ALWAYS analyze the complete dataset before responding, not just a subset
- Cross-reference competency scores with qualitative feedback when relevant
- Consider relationship distribution when discussing a manager's scores
- Identify patterns across managers (e.g., "5 out of 8 managers struggle with...")
- When asked about feedback themes, synthesize and categorize them meaningfully
- For comparisons, create structured side-by-side analysis
- If data is insufficient, clearly state what information is available

=== EXAMPLE RESPONSE FORMAT ===
**Question Analysis:**
Brief restatement of what you're analyzing.

**Key Findings:**
1. **First point with bold emphasis** - Supporting details with numbers
2. **Second point** - More context and percentages
3. **Third point** - Additional insights

**Recommendations:**
• Actionable insight based on data
• Another recommendation

**Summary:**
Concise wrap-up with the main takeaway.`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});