import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SUBSIDIARY = "ProDG";

type ImportUser = {
  email: string;
  name?: string;
  role?: "pm" | "developer" | "admin";
  subsidiary?: string;
};

async function requireAdmin(req: Request, supabaseAdmin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false as const, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!anonKey) {
    return { ok: false as const, response: new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return { ok: false as const, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  if (!roles?.length) {
    return { ok: false as const, response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  return { ok: true as const };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const gate = await requireAdmin(req, supabaseAdmin);
    if (!gate.ok) return gate.response;

    const { users, default_password, default_subsidiary } = await req.json();

    if (!users || !Array.isArray(users) || !default_password) {
      return new Response(
        JSON.stringify({ error: "users array and default_password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

    // Cache subsidiary name -> id so we don't re-query/insert per user.
    const subsidiaryCache = new Map<string, string>();
    const resolveSubsidiaryId = async (name: string): Promise<string> => {
      const key = name.trim() || DEFAULT_SUBSIDIARY;
      const cached = subsidiaryCache.get(key);
      if (cached) return cached;

      const { data: existing } = await supabaseAdmin
        .from("subsidiaries")
        .select("id")
        .ilike("name", key)
        .maybeSingle();

      let id = existing?.id as string | undefined;
      if (!id) {
        const { data: inserted, error } = await supabaseAdmin
          .from("subsidiaries")
          .insert({ name: key })
          .select("id")
          .single();
        if (error) throw error;
        id = inserted.id as string;
      }
      subsidiaryCache.set(key, id);
      return id;
    };

    for (const raw of users as ImportUser[]) {
      const email = raw.email?.toLowerCase().trim();
      if (!email) continue;
      const name = raw.name || email.split("@")[0];
      const isPM = raw.role === "pm";
      const isAdmin = raw.role === "admin";
      const subsidiaryName = raw.subsidiary || default_subsidiary || DEFAULT_SUBSIDIARY;

      try {
        const subsidiaryId = await resolveSubsidiaryId(subsidiaryName);

        // Create (or find existing) auth user.
        let userId: string | undefined;
        const { data: userData, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: default_password,
            email_confirm: true,
          });

        if (createError) {
          if (createError.message.includes("already been registered")) {
            // Idempotent re-import: locate the existing user via their profile.
            const { data: existingProfile } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .ilike("email", email)
              .maybeSingle();
            userId = existingProfile?.id as string | undefined;
            if (!userId) {
              results.skipped++;
              continue;
            }
            results.updated++;
          } else {
            results.errors.push(`${email}: ${createError.message}`);
            continue;
          }
        } else {
          userId = userData.user.id;
          results.created++;
        }

        // Upsert the employee record (this is what the PM pool reads from).
        const { data: existingEmp } = await supabaseAdmin
          .from("employees")
          .select("id")
          .ilike("email", email)
          .maybeSingle();

        let employeeId = existingEmp?.id as string | undefined;
        if (employeeId) {
          await supabaseAdmin
            .from("employees")
            .update({ name, is_pm: isPM, subsidiary_id: subsidiaryId })
            .eq("id", employeeId);
        } else {
          const { data: newEmp, error: empError } = await supabaseAdmin
            .from("employees")
            .insert({ name, email, is_pm: isPM, subsidiary_id: subsidiaryId })
            .select("id")
            .single();
          if (empError) throw empError;
          employeeId = newEmp.id as string;
        }

        // Link auth user -> employee via profile.
        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          email,
          name,
          employee_id: employeeId,
        });

        if (isAdmin) {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
          await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", "pm");
        } else if (isPM) {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: "pm" }, { onConflict: "user_id,role" });
          await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", "admin");
        } else {
          await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .in("role", ["pm", "admin"]);
        }
      } catch (err) {
        results.errors.push(`${email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
