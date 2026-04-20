import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CONTEXT_CHARS = 24_000;

const SYSTEM_PROMPT = `You are a concise, supportive workplace coach for ProDG 360° peer review.

You receive ONLY aggregated anonymous peer feedback and numeric summaries for ONE employee. There are no names of reviewers.

Rules (mandatory):
- Never invent feedback or scores. Only synthesize what is provided.
- Do not claim to know who said what; everything is anonymous.
- Use short sections with **bold** mini-headings.
- Tone: growth-oriented, direct, no corporate fluff.
- If a section has no usable text, say "Not enough written feedback in this area yet" for that part.

Output exactly these sections in order:

**Themes across the feedback**
3–6 bullets: recurring ideas in the STOP / START / KEEP comments (merge duplicates).

**Where to focus next**
2–4 bullets: specific, actionable behaviors tied to the lowest scores or critical STOP/START themes.

**Strengths peers want you to keep**
2–4 bullets: based on KEEP DOING and higher-scored areas.

**Personal resource suggestions**
3–5 highly relevant public resources to help this exact person grow. Use a mix of articles, practical guides, talks, research, or reputable publications. For each: title, link, and one brief sentence explaining why it fits their score pattern or feedback theme. Only include real public links you are confident exist; avoid generic homepages.

**One sentence takeaway**
A single honest line summarizing the growth edge for this person.

Keep total output under 650 words.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing SUPABASE_URL or anon key in edge function env");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const growthContext =
      typeof body?.growthContext === "string" ? body.growthContext.trim() : "";
    if (!growthContext || growthContext.length < 20) {
      return new Response(
        JSON.stringify({ error: "growthContext is required (min 20 characters)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clipped = growthContext.slice(0, MAX_CONTEXT_CHARS);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "AI insights are not configured (LOVABLE_API_KEY missing on server).",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `=== DATA FOR THIS EMPLOYEE (anonymous peers only) ===\n\n${clipped}`,
            },
          ],
          stream: false,
          max_tokens: 1200,
          temperature: 0.35,
        }),
      }
    );

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({
          error: "Could not generate insights right now. Try again shortly.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiJson = await aiRes.json();
    const insight =
      aiJson?.choices?.[0]?.message?.content?.trim() ||
      aiJson?.choices?.[0]?.text?.trim();

    if (!insight) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("growth-insights error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
