/// <reference path="../deno.d.ts" />
// Save client-approved ad copy edits into a service-specific prompt library.
// @ts-ignore - Deno HTTPS import resolved at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EMAILS = new Set([
  "emmanuelledaniel1@gmail.com",
  "richard.bridgstock@gmail.com",
  "dugdan1979molteno@gmail.com",
]);

const SERVICE_KEYS = new Set([
  "loose-rug",
  "fitted-carpet",
  "upholstery",
  "mattress",
  "home",
  "office",
]);

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function authorize(req: Request): Promise<{ ok: true; email: string } | { ok: false; response: Response }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: jsonResponse({ error: "Missing Authorization header" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[save-ad-edit] Missing SUPABASE_URL or SUPABASE_ANON_KEY env var");
    return { ok: false, response: jsonResponse({ error: "Server auth not configured" }, 500) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: jsonResponse({ error: "Invalid or expired session" }, 401) };
  }

  const email = (data.user.email ?? "").toLowerCase();
  if (!ALLOWED_EMAILS.has(email)) {
    return { ok: false, response: jsonResponse({ error: "Account not approved" }, 403) };
  }

  return { ok: true, email };
}

function serviceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await authorize(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const serviceKey = cleanText(body.serviceKey);
    const headline = cleanText(body.headline);
    const adBody = cleanText(body.body);
    const cta = cleanText(body.cta);
    const hashtags = cleanText(body.hashtags);

    if (!SERVICE_KEYS.has(serviceKey)) {
      return jsonResponse({ error: "Invalid serviceKey" }, 400);
    }
    if (!headline || !adBody) {
      return jsonResponse({ error: "Headline and body are required" }, 400);
    }

    const supabase = serviceClient();
    const { error } = await supabase.from("ad_copy_library").insert({
      service_key: serviceKey,
      theme: cleanText(body.theme) || null,
      headline,
      body: adBody,
      cta,
      hashtags,
      original_headline: cleanText(body.originalHeadline) || null,
      original_body: cleanText(body.originalBody) || null,
      original_cta: cleanText(body.originalCta) || null,
      original_hashtags: cleanText(body.originalHashtags) || null,
      author_email: auth.email,
    });

    if (error) {
      console.error("[save-ad-edit] insert failed:", error.message);
      return jsonResponse({ error: "Could not save edit to copy library" }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error("[save-ad-edit]", e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
