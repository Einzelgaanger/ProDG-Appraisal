import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CONTEXT_CHARS = 24_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function countLinks(text: string) {
  return (text.match(/https?:\/\/[^\s)]+/g) || []).length;
}

function extractFocusArea(text: string) {
  const match = text.match(/\*\*Where to focus next\*\*([\s\S]*?)(\*\*Strengths peers want you to keep\*\*|$)/i);
  const firstBullet = match?.[1]?.split('\n').find((line) => line.trim().startsWith('-') || line.trim().startsWith('•'));
  return firstBullet?.replace(/^[-•]\s*/, '').slice(0, 180) || 'your current growth priorities';
}

const SYSTEM_PROMPT = `You are a concise, supportive workplace coach for ProDG 360° peer review.

You receive ONLY aggregated anonymous peer feedback and numeric summaries for ONE employee. There are no names of reviewers.

Rules (mandatory):
- Never invent feedback or scores. Only synthesize what is provided.
- Do not claim to know who said what; everything is anonymous.
- Use short sections with **bold** mini-headings.
- Tone: growth-oriented, direct, no corporate fluff.
- Resource suggestions must be specific to this person's lowest scores, STOP/START themes, and strengths to maintain.
- Prioritize widely respected, practical, current or evergreen resources from credible sources such as Harvard Business Review, Google re:Work, Atlassian, McKinsey, First Round Review, MIT Sloan, Stanford, TED, Center for Creative Leadership, or well-known engineering/product leadership publications.
- Prefer latest/recent resources when confidently known; otherwise choose established popular resources that remain useful.
- If a section has no usable text, say "Not enough written feedback in this area yet" for that part.

Output exactly these sections in order:

**Themes across the feedback**
3–6 bullets: recurring ideas in the STOP / START / KEEP comments (merge duplicates).

**Where to focus next**
2–4 bullets: specific, actionable behaviors tied to the lowest scores or critical STOP/START themes.

**Strengths peers want you to keep**
2–4 bullets: based on KEEP DOING and higher-scored areas.

**Personal resource suggestions**
4–6 highly relevant public resources to help this exact person grow. Use a mix of articles, practical guides, talks, research, or reputable publications. For each: title, link, and one brief sentence explaining why it fits their score pattern or feedback theme. Only include real public links you are confident exist; avoid generic homepages.

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

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const serviceClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;

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
    const forceRefresh = body?.forceRefresh === true;
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
    const contextHash = await sha256(clipped);

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email, employee_id")
      .eq("id", user.id)
      .maybeSingle();

    if (serviceClient && !forceRefresh) {
      const { data: cached } = await serviceClient
        .from("growth_insights")
        .select("id, insight, generated_at, expires_at, resource_count, email_sent_at")
        .eq("user_id", user.id)
        .eq("context_hash", contextHash)
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.insight) {
        return new Response(JSON.stringify({
          insight: cached.insight,
          cached: true,
          generatedAt: cached.generated_at,
          nextRefreshAt: cached.expires_at,
          resourceCount: cached.resource_count,
          emailSent: Boolean(cached.email_sent_at),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
          max_tokens: 1600,
          temperature: 0.45,
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

    const resourceCount = countLinks(insight);
    const expiresAt = new Date(Date.now() + ONE_DAY_MS).toISOString();
    let emailSent = false;

    if (serviceClient && profile?.employee_id) {
      const { data: inserted, error: insertError } = await serviceClient
        .from("growth_insights")
        .insert({
          user_id: user.id,
          employee_id: profile.employee_id,
          insight,
          context_hash: contextHash,
          resource_count: resourceCount,
          expires_at: expiresAt,
        })
        .select("id, generated_at")
        .single();

      if (insertError) {
        console.error("Could not save growth insight", insertError);
      } else if (inserted && (profile.email || user.email)) {
        try {
          const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              templateName: "growth-insight-ready",
              recipientEmail: profile.email || user.email,
              idempotencyKey: `growth-insight-${inserted.id}`,
              templateData: {
                name: profile.name || user.email?.split("@")[0] || "there",
                resourceCount,
                focusArea: extractFocusArea(insight),
              },
            }),
          });
          emailSent = emailRes.ok;
          if (emailSent) {
            await serviceClient
              .from("growth_insights")
              .update({ email_sent_at: new Date().toISOString() })
              .eq("id", inserted.id);
          } else {
            console.error("Growth insight email enqueue failed", emailRes.status, await emailRes.text());
          }
        } catch (emailError) {
          console.error("Growth insight email error", emailError);
        }
      }
    }

    return new Response(JSON.stringify({ insight, cached: false, nextRefreshAt: expiresAt, resourceCount, emailSent }), {
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
