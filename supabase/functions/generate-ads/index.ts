/// <reference path="../deno.d.ts" />
// Generate Facebook ad copy + image for West Coast Cleaners (Google Gemini)
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
    console.error("[generate-ads] Missing SUPABASE_URL or SUPABASE_ANON_KEY env var");
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

const SERVICES = [
  { key: "loose-rug", name: "Loose Rug Cleaning", phone: "082 228 9226", perk: "Free collection & dropoff" },
  { key: "fitted-carpet", name: "Fitted Carpet Cleaning", phone: "082 228 9226", perk: "Deep steam clean in your home" },
  { key: "upholstery", name: "Upholstery Cleaning", phone: "082 228 9226", perk: "Couches looking brand new" },
  { key: "mattress", name: "Mattress Cleaning", phone: "082 228 9226", perk: "Sleep healthier tonight" },
  { key: "home", name: "Home Cleaning", phone: "079 365 8668", perk: "Friendly, reliable local team" },
  { key: "office", name: "Office Cleaning", phone: "079 365 8668", perk: "Spotless workspaces, happy teams" },
];

const SERVICE_VISUAL_SCOPES: Record<string, { subject: string; props: string; setting: string }> = {
  "loose-rug": {
    subject: "a freshly cleaned area rug",
    props: "rotary cleaning machine OR drying rack OR rolled clean rugs",
    setting: "professional rug-cleaning workshop / studio",
  },
  "fitted-carpet": {
    subject: "wall-to-wall fitted carpet",
    props: "hot-water extraction wand or steam-cleaning machine on the carpet",
    setting: "residential lounge / bedroom interior",
  },
  upholstery: {
    subject: "a fabric couch / armchair being cleaned",
    props: "upholstery extraction wand, microfiber cloth, lightly damp cleaned fabric, visibly cleaner cushion section",
    setting: "residential living room interior",
  },
  mattress: {
    subject: "a mattress being deep-cleaned",
    props: "upholstery cleaning machine, UV sanitiser, vacuum, spotless white mattress",
    setting: "residential bedroom interior",
  },
  home: {
    subject: "interior home surfaces being cleaned",
    props: "spray bottle, microfiber cloth, mop, gloved hands at work",
    setting: "modern South African home interior",
  },
  office: {
    subject: "an office workspace being cleaned",
    props: "wiped desks, monitors, vacuumed carpets, gloved cleaner at work",
    setting: "small modern office interior",
  },
};

const DEFAULT_VISUAL_SCOPE = {
  subject: "a professional cleaning service in action",
  props: "cleaning equipment, microfiber cloths, spray bottles",
  setting: "indoor residential or commercial interior",
};

interface CustomImageCatalogItem {
  id: string;
  url: string;
  services: string[];
  type: string;
  subject: string;
  copyAngle: string;
  tags: string[];
}

interface BrandVoice {
  tagline: string;
  location: string;
  notes: string[];
}

interface AdConcept {
  service: string;
  serviceKey: string;
  headline: string;
  body: string;
  cta: string;
  hashtags: string;
  imagePrompt: string;
  phone: string;
  occasion?: string;
  customImageId?: string | null;
  angle?: string;
  angleLabel?: string;
}

const ANGLES = [
  { key: "trust", label: "Trust & reputation", brief: "Lean on local reputation, friendly reliable team, years of experience, neighbours-recommended. Calm and reassuring tone." },
  { key: "urgency", label: "Urgency / limited slots", brief: "Time-sensitive — limited booking slots this week, season filling up fast, book before the weekend. Punchy and action-driving." },
  { key: "before-after", label: "Before & after / transformation", brief: "Dramatic visual transformation, jaw-dropping results, see the difference. Image must clearly suggest a before/after or stunning 'after' result." },
  { key: "value", label: "Value / smart spend", brief: "Affordable, great value, saves you a weekend of work, cheaper than replacing the carpet. Practical tone." },
  { key: "convenience", label: "Convenience / done-for-you", brief: "We collect, clean and return — zero hassle. Free up your weekend. Easygoing, lifestyle tone." },
  { key: "health", label: "Health & hygiene", brief: "Allergens, dust mites, pet dander, kids crawling on the carpet, healthier home. Caring, family-focused tone." },
  { key: "social-proof", label: "Social proof / testimonial-style", brief: "Written like a happy neighbour recommending them in the group. Quote-feel, casual, very local." },
];

const COPY_TEMPERATURE_DEFAULT = 50;

function normalizeCopyTemperature(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return COPY_TEMPERATURE_DEFAULT;
  return Math.min(100, Math.max(0, Math.round(n)));
}

type CopyTemperatureBand = "humorous" | "neutral" | "business";

function copyTemperatureBand(temp: number): CopyTemperatureBand {
  if (temp < 34) return "humorous";
  if (temp > 66) return "business";
  return "neutral";
}

function copyTemperatureSettingLine(temp: number): string {
  const band = copyTemperatureBand(temp);
  const labels: Record<CopyTemperatureBand, string> = {
    humorous: "Humorous / playful community post",
    neutral: "Neutral — warm neighbourly local post",
    business: "Business ad campaign manager — polished & benefit-led",
  };
  return `COPY TEMPERATURE: ${temp}/100 (${labels[band]}). This setting overrides default tone rules below where they conflict.`;
}

function copyTemperatureCopyRules(temp: number): string {
  const band = copyTemperatureBand(temp);
  if (band === "humorous") {
    return [
      "- Tone: witty, light-hearted, relatable SA humour — still trustworthy and local, never sarcastic at the customer.",
      "- Wordplay and gentle jokes are welcome; keep headlines punchy and fun.",
      "- You may use one light emoji per ad (besides 📞 before phone numbers) if it fits naturally.",
      "- Owner sample posts set facts/services — match their casual SA voice but lean more playful than the samples.",
    ].join("\n");
  }
  if (band === "business") {
    return [
      "- Tone: professional Facebook ad campaign manager — clear benefits, credibility, and a strong CTA.",
      "- Polished and concise; less slang; still mention West Coast / local area where relevant.",
      "- Use 📞 only before phone numbers — no other emojis.",
      "- Owner sample posts inform services and offers — do not copy their casual chatty style; elevate to campaign-ready copy.",
    ].join("\n");
  }
  return [
    "- Tone: warm, neighbourly, locally proud, casual South African — NOT salesy. Feels like a community recommendation.",
    "- Match owner sample posts for tone, length, and casual SA style.",
    "- Use 📞 only before phone numbers — no other emojis.",
  ].join("\n");
}

function copyTemperatureImageStyle(temp: number): string {
  const band = copyTemperatureBand(temp);
  if (band === "humorous") {
    return "Mood: bright, upbeat, slightly playful commercial cleaning photography — still photorealistic and professional.";
  }
  if (band === "business") {
    return "Mood: premium campaign photography — crisp lighting, polished composition, trustworthy commercial cleaning brand.";
  }
  return "Style: bright, clean, photorealistic Facebook ad photography.";
}

function buildImagePrompt(serviceKey: string, llmPrompt: string, copyTemperature = COPY_TEMPERATURE_DEFAULT): string {
  const scope = SERVICE_VISUAL_SCOPES[serviceKey] ?? DEFAULT_VISUAL_SCOPE;
  const scene = (llmPrompt || "").trim();
  const anchor = `${scope.subject} in ${scope.setting}, with ${scope.props}`;
  return [
    anchor + (scene ? `. ${scene}` : ""),
    `${copyTemperatureImageStyle(copyTemperature)} Square 1:1.`,
    "HARD CONSTRAINTS: must clearly depict the cleaning subject above; indoor or workshop setting only. If any person is depicted, they MUST wear a plain solid white T-shirt with no graphics, prints, text, or logos. Keep the top-left and bottom-right corners visually clean with low-detail areas reserved for branding overlays.",
    "DO NOT include: food, fruit, drinks, beverages, smoothies, beach, ocean, palm trees, swimming pools, picnics, party scenes, faces / portraits, load shedding, candles, dark / power-outage scenes, excessive foam, heavy suds, bubbly furniture, shirts with prints, branded clothing, t-shirts with logos, busy patterns in corners, text, logos, watermarks.",
  ].join(" ");
}

function geminiApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not configured on Supabase Edge Function secrets");
  return key;
}

async function geminiJson(model: string, prompt: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini text failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return JSON.parse(text);
}

const CACHE_BUCKET = "ai-ad-images";
const CACHE_TABLE = "ai_image_cache";

type ServiceClient = ReturnType<typeof createClient>;
type AiImageResult = {
  url: string;
  cacheStatus: "fresh" | "cached" | "uncached";
  usedCount?: number;
  createdAt?: string;
  cacheId?: string;
};

type CacheRow = {
  id: string;
  public_url: string;
  used_count: number | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
};

function isCacheEligible(row: { upvotes: number; downvotes: number }): boolean {
  const down = Number(row.downvotes ?? 0);
  const up = Number(row.upvotes ?? 0);
  if (down >= 3 && down > up) return false;
  return true;
}

function pickWeightedCacheRow(rows: CacheRow[]): CacheRow | null {
  const eligible = rows.filter(isCacheEligible);
  if (!eligible.length) return null;
  const sorted = [...eligible].sort((a, b) => {
    const scoreA = Number(a.upvotes ?? 0) - Number(a.downvotes ?? 0);
    const scoreB = Number(b.upvotes ?? 0) - Number(b.downvotes ?? 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const usedA = Number(a.used_count ?? 0);
    const usedB = Number(b.used_count ?? 0);
    return usedA - usedB;
  });
  const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  return topHalf[Math.floor(Math.random() * topHalf.length)] ?? null;
}

type CopyLibraryRow = {
  service_key: string;
  headline: string;
  body: string;
  cta: string | null;
  hashtags: string | null;
  created_at: string;
};

function getServiceClient(): ServiceClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.warn("[ai-image-cache] SUPABASE_SERVICE_ROLE_KEY missing — cache disabled");
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchCopyLibrarySamples(
  client: ServiceClient | null,
  preferServiceKey: string | null = null,
): Promise<string[]> {
  if (!client) return [];
  const { data, error } = await client
    .from("ad_copy_library")
    .select("service_key, headline, body, cta, hashtags, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    console.warn("[ad-copy-library] lookup failed:", error.message);
    return [];
  }

  const all = (data ?? []) as CopyLibraryRow[];
  const focusedCap = preferServiceKey ? 8 : 3;
  const otherCap = preferServiceKey ? 2 : 3;
  const focusedRows: CopyLibraryRow[] = [];
  const otherRows: CopyLibraryRow[] = [];
  const seenPerService = new Map<string, number>();

  for (const row of all) {
    const isFocused = preferServiceKey && row.service_key === preferServiceKey;
    const cap = isFocused ? focusedCap : otherCap;
    const count = seenPerService.get(row.service_key) ?? 0;
    if (count >= cap) continue;
    seenPerService.set(row.service_key, count + 1);
    if (isFocused) focusedRows.push(row);
    else otherRows.push(row);
  }

  const rows = [...focusedRows, ...otherRows].slice(0, 18);

  return rows.map((row) => {
    const service = SERVICES.find((s) => s.key === row.service_key);
    const serviceName = service ? `${service.name} [key: ${service.key}]` : row.service_key;
    return [
      `CLIENT-APPROVED EDIT FOR SERVICE: ${serviceName}`,
      row.headline,
      row.body,
      row.cta ?? "",
      row.hashtags ?? "",
    ].filter(Boolean).join("\n");
  });
}

async function pickCachedAiImage(
  client: ServiceClient,
  serviceKey: string,
  theme: string | null,
  finalPrompt: string,
): Promise<AiImageResult | null> {
  const promptHash = await sha256Hex(`${serviceKey}|${theme ?? ""}|${finalPrompt}`);
  const selectCols = "id, public_url, used_count, created_at, upvotes, downvotes";

  const useCachedRow = async (row: CacheRow): Promise<AiImageResult> => {
    const usedCount = Number(row.used_count ?? 0) + 1;
    const { error: updateErr } = await client
      .from(CACHE_TABLE)
      .update({ used_count: usedCount, last_used_at: new Date().toISOString() })
      .eq("id", row.id);
    if (updateErr) {
      console.warn("[ai-image-cache] usage update failed:", updateErr.message);
    }
    return {
      url: row.public_url,
      cacheStatus: "cached",
      usedCount,
      createdAt: row.created_at,
      cacheId: row.id,
    };
  };

  const { data: exact, error: exactErr } = await client
    .from(CACHE_TABLE)
    .select(selectCols)
    .eq("prompt_hash", promptHash)
    .limit(1)
    .maybeSingle();
  if (exactErr) {
    console.warn("[ai-image-cache] exact prompt lookup failed:", exactErr.message);
  } else if (exact && isCacheEligible(exact as CacheRow)) {
    return useCachedRow(exact as CacheRow);
  }

  const tryServiceQuery = async (matchTheme: boolean) => {
    let q = client
      .from(CACHE_TABLE)
      .select(selectCols)
      .eq("service_key", serviceKey)
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .limit(30);
    if (matchTheme && theme) q = q.eq("theme", theme);
    return q;
  };

  let { data, error } = await tryServiceQuery(true);
  if (error) {
    console.warn("[ai-image-cache] lookup (theme) failed:", error.message);
    return null;
  }
  if (!data?.length) {
    const fallback = await tryServiceQuery(false);
    if (fallback.error) {
      console.warn("[ai-image-cache] lookup (any) failed:", fallback.error.message);
      return null;
    }
    data = fallback.data;
  }
  if (!data?.length) return null;

  const pick = pickWeightedCacheRow(data as CacheRow[]);
  if (!pick) return null;
  return useCachedRow(pick);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function storeAiImage(
  client: ServiceClient,
  serviceKey: string,
  theme: string | null,
  prompt: string,
  mimeType: string,
  base64: string,
): Promise<AiImageResult | null> {
  try {
    const ext = mimeType.includes("jpeg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
    const path = `${serviceKey}/${crypto.randomUUID()}.${ext}`;
    const bytes = base64ToBytes(base64);
    const { error: upErr } = await client.storage
      .from(CACHE_BUCKET)
      .upload(path, bytes, { contentType: mimeType, upsert: false });
    if (upErr) {
      console.warn("[ai-image-cache] upload failed:", upErr.message);
      return null;
    }
    const { data: pub } = client.storage.from(CACHE_BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    const prompt_hash = await sha256Hex(`${serviceKey}|${theme ?? ""}|${prompt}`);
    const { data: inserted, error: insErr } = await client.from(CACHE_TABLE).insert({
      service_key: serviceKey,
      theme: theme,
      prompt,
      prompt_hash,
      storage_bucket: CACHE_BUCKET,
      storage_path: path,
      public_url: publicUrl,
      used_count: 1,
      last_used_at: new Date().toISOString(),
    }).select("id, used_count, created_at").single();
    if (insErr) {
      console.warn("[ai-image-cache] metadata insert failed:", insErr.message);
    }
    return {
      url: publicUrl,
      cacheStatus: "fresh",
      usedCount: Number(inserted?.used_count ?? 1),
      createdAt: inserted?.created_at as string | undefined,
      cacheId: inserted?.id as string | undefined,
    };
  } catch (e) {
    console.warn("[ai-image-cache] storeAiImage error:", (e as Error).message);
    return null;
  }
}

async function geminiImage(
  serviceKey: string,
  llmPrompt: string,
  theme: string | null,
  forceFresh: boolean,
  copyTemperature = COPY_TEMPERATURE_DEFAULT,
): Promise<AiImageResult | null> {
  const finalPrompt = buildImagePrompt(serviceKey, llmPrompt, copyTemperature);
  const cache = getServiceClient();

  if (cache && !forceFresh) {
    const hit = await pickCachedAiImage(cache, serviceKey, theme, finalPrompt);
    if (hit) return hit;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiApiKey()}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
    if (!res.ok) {
      console.error("Gemini image failed", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || "image/png";
        const base64 = part.inlineData.data as string;
        if (cache) {
          const stored = await storeAiImage(cache, serviceKey, theme, finalPrompt, mimeType, base64);
          if (stored) return stored;
        }
        return {
          url: `data:${mimeType};base64,${base64}`,
          cacheStatus: "uncached",
        };
      }
    }
    return null;
  } catch (e) {
    console.error("Gemini image error", e);
    return null;
  }
}

function normalizeHashtags(hashtags: string): string {
  return (hashtags || "")
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");
}

function currentSeason(d: Date): { name: string; angle: string } {
  const m = d.getMonth() + 1;
  if (m === 12 || m <= 2) return { name: "Summer", angle: "beach sand, salty wind, braai season — homes get extra dirt, dust and sandy footprints" };
  if (m <= 5) return { name: "Autumn", angle: "leaves, dust and grime building up before winter" };
  if (m <= 8) return { name: "Winter", angle: "wet Cape Town winter — muddy paws, damp carpets, mould-prone upholstery, cosy indoors" };
  return { name: "Spring", angle: "spring cleaning season — fresh start, refresh the home after winter" };
}

function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function nthWeekdayOfMonth(year: number, month0: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month0, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month0, 1 + offset + (n - 1) * 7));
}

function upcomingOccasion(today: Date): { name: string; daysAway: number; angle: string } | null {
  const y = today.getUTCFullYear();
  const candidates: { name: string; date: Date; angle: string }[] = [];
  const push = (name: string, date: Date, angle: string) => candidates.push({ name, date, angle });

  for (const yr of [y, y + 1]) {
    push("New Year", new Date(Date.UTC(yr, 0, 1)), "fresh start, brand new year, clean slate for the home");
    push("Valentine's Day", new Date(Date.UTC(yr, 1, 14)), "romantic at-home dinner, freshly cleaned couches and rugs");
    push("Human Rights Day (SA)", new Date(Date.UTC(yr, 2, 21)), "long weekend at home — perfect time for a deep clean");
    const easter = easterSunday(yr);
    push("Good Friday & Easter", new Date(easter.getTime() - 2 * 86400000), "Easter family gathering, hosting visitors, egg hunt on a clean rug");
    push("Freedom Day (SA)", new Date(Date.UTC(yr, 3, 27)), "long weekend, autumn deep clean before winter");
    push("Workers' Day", new Date(Date.UTC(yr, 4, 1)), "public holiday — let us do the work for you");
    push("Mother's Day (SA)", nthWeekdayOfMonth(yr, 4, 0, 2), "treat Mom — gift her a spotless home, no chores this Sunday");
    push("Youth Day (SA)", new Date(Date.UTC(yr, 5, 16)), "long weekend, kids home — get the rugs and play areas refreshed");
    push("Father's Day (SA)", nthWeekdayOfMonth(yr, 5, 0, 3), "give Dad the gift of a clean garage, office or man-cave");
    push("Women's Day (SA)", new Date(Date.UTC(yr, 7, 9)), "celebrate the women at home — let us handle the cleaning");
    push("Heritage Day / Braai Day", new Date(Date.UTC(yr, 8, 24)), "post-braai cleanup, sauce on the rug, guests over");
    push("Spring Day (SA)", new Date(Date.UTC(yr, 8, 1)), "spring cleaning kickoff — out with winter dust");
    push("Halloween", new Date(Date.UTC(yr, 9, 31)), "kids tracking in sweets and mud — fun cleanup time");
    push("Black Friday", new Date(Date.UTC(yr, 10, 28)), "smart spend — book a clean before festive guests arrive");
    push("Day of Reconciliation", new Date(Date.UTC(yr, 11, 16)), "festive season starts — get the home guest-ready");
    push("Christmas", new Date(Date.UTC(yr, 11, 25)), "festive hosting, family visiting from upcountry, sparkling rugs and couches");
    push("Day of Goodwill / Boxing Day", new Date(Date.UTC(yr, 11, 26)), "post-Christmas cleanup, wine spills, full house");
    push("New Year's Eve", new Date(Date.UTC(yr, 11, 31)), "host the party, we'll handle the aftermath");
  }

  const future = candidates
    .map((c) => ({ ...c, daysAway: Math.floor((c.date.getTime() - today.getTime()) / 86400000) }))
    .filter((c) => c.daysAway >= -1 && c.daysAway <= 14)
    .sort((a, b) => a.daysAway - b.daysAway);

  return future[0] || null;
}

function buildContext(theme?: string) {
  const today = new Date();
  const season = currentSeason(today);
  const occ = upcomingOccasion(today);
  const themeOverride = theme && theme !== "auto" ? theme : null;

  const lines: string[] = [
    `Today is ${today.toISOString().slice(0, 10)}.`,
    `Current season in Cape Town: ${season.name} — ${season.angle}.`,
  ];
  if (themeOverride) {
    lines.push(`USER-SELECTED THEME: "${themeOverride}". Every ad MUST tie naturally to this theme.`);
  } else if (occ) {
    const when = occ.daysAway <= 0 ? "happening now" : `in ${occ.daysAway} days`;
    lines.push(`Upcoming occasion: ${occ.name} (${when}) — angle: ${occ.angle}. Most ads should reference it naturally.`);
  } else {
    lines.push("No major holiday in the next month — lean on the seasonal angle above.");
  }
  return lines.join("\n");
}

function formatImageCatalog(catalog: CustomImageCatalogItem[]): string {
  if (!catalog.length) return "No custom photos available — use AI images for all ads (customImageId: null).";
  return catalog
    .map(
      (img) =>
        `- id: "${img.id}" | services: ${img.services.join(", ")} | type: ${img.type} | tags: ${img.tags.join(", ")}\n  subject: ${img.subject}\n  copyAngle: ${img.copyAngle}`,
    )
    .join("\n");
}

function formatCopySamples(samples: string[], brand?: BrandVoice): string {
  const parts: string[] = [];
  if (brand?.tagline || brand?.location) {
    parts.push(`Tagline: "${brand.tagline ?? ""}" | Location: ${brand.location ?? ""}`);
  }
  if (brand?.notes?.length) {
    parts.push("Voice notes: " + brand.notes.join(" "));
  }
  if (samples.length) {
    parts.push("\nREAL POSTS FROM THE OWNER (match this tone, length, and casual SA style — do NOT copy verbatim):\n");
    samples.forEach((s, i) => parts.push(`--- Sample ${i + 1} ---\n${s}`));
    parts.push(
      "\nSome samples may be labeled CLIENT-APPROVED EDIT FOR SERVICE. Treat these as especially important examples of wording the client liked. When writing for a service, prefer edits labeled for that same service.",
    );
  }
  return parts.join("\n");
}

function pickUnusedUpload(
  catalog: CustomImageCatalogItem[],
  usedCustom: Set<string>,
  serviceKey: string,
): string | null {
  const unused = catalog.filter((c) => !usedCustom.has(c.id));
  if (!unused.length) return null;
  const serviceMatch = unused.find((c) => c.services.includes(serviceKey));
  const picked = serviceMatch ?? unused[0];
  usedCustom.add(picked.id);
  return picked.id;
}

async function generateAdCopy(
  count: number,
  theme: string | undefined,
  catalog: CustomImageCatalogItem[],
  copySamples: string[],
  brandVoice?: BrandVoice,
  uploadsOnly = false,
  mustIncludeImageIds: string[] = [],
  focusServiceKey: string | null = null,
  copyTemperature = COPY_TEMPERATURE_DEFAULT,
  angleKeys?: string[],
): Promise<AdConcept[]> {
  const context = buildContext(theme);

  const activeAngles = angleKeys?.length
    ? ANGLES.filter((a) => angleKeys.includes(a.key))
    : ANGLES;
  const allowedAngleKeys = activeAngles.map((a) => a.key).join(" | ");
  const angleBriefs = activeAngles.map((a) => `- ${a.key} (${a.label}): ${a.brief}`).join("\n");

  const focusedService = focusServiceKey
    ? SERVICES.find((s) => s.key === focusServiceKey) ?? null
    : null;

  const rankPhoto = (id: string) => (id.startsWith("user-") ? 0 : 1);

  const focusedRankedMatches = focusedService
    ? catalog
        .filter((c) => c.services.includes(focusedService.key))
        .sort((a, b) => rankPhoto(a.id) - rankPhoto(b.id))
    : [];

  const expectedCustomCount = focusedService
    ? Math.min(count, focusedRankedMatches.length)
    : 0;

  const promptCatalog = focusedService ? focusedRankedMatches : catalog;

  const customTarget = uploadsOnly
    ? count
    : focusedService
      ? expectedCustomCount
      : catalog.length
        ? Math.max(1, Math.floor(count / 2))
        : 0;

  const mustIncludeList = mustIncludeImageIds.length
    ? `\nMANDATORY PHOTOS (ALL of these MUST appear as customImageId in this batch — no exceptions, no skipping):\n${mustIncludeImageIds
        .map((id) => `- "${id}"`)
        .join("\n")}\n`
    : "";

  const photoInstructions = uploadsOnly
    ? `AVAILABLE USER-UPLOADED PHOTOS (ALL ${count} ads MUST use a customImageId from this list — NEVER null, NEVER AI):
${formatImageCatalog(promptCatalog)}${mustIncludeList}`
    : focusedService
      ? expectedCustomCount > 0
        ? `MATCHING PHOTOS for ${focusedService.name} (use ALL ${expectedCustomCount} of them across the batch — one each, no duplicates; remaining ${Math.max(0, count - expectedCustomCount)} ad(s) use AI — set customImageId to null):
${formatImageCatalog(promptCatalog)}${mustIncludeList}`
        : `No custom photos match ${focusedService.name} — ALL ${count} ads use AI (set customImageId to null).${mustIncludeList}`
      : `AVAILABLE CUSTOM PHOTOS (use ~${customTarget} of ${count} ads with a customImageId; rest use AI — set customImageId to null):
${formatImageCatalog(promptCatalog)}${mustIncludeList}`;

  const servicesForPrompt = focusedService ? [focusedService] : SERVICES;
  const serviceKeysForPrompt = servicesForPrompt.map((s) => s.key).join("|");

  const baseImageRules = uploadsOnly
    ? `- EVERY ad MUST set customImageId to one of the uploaded photo ids above — no exceptions.
- When customImageId is set: body MUST reference what's in that photo. Use the copyAngle.
- Match customImageId to a photo whose services include the ad's service when possible.
- Use each customImageId at most once per batch.
- Set imagePrompt to an empty string for all ads — no AI images in this mode.`
    : focusedService
      ? `- The photos listed above are the ONLY allowed photos for this batch. Use ALL ${expectedCustomCount} of them across the first ${expectedCustomCount} ad(s) — one each, no duplicates.
- When customImageId is set: body MUST reference what's in that photo. Use the copyAngle.
- For before-after images: mention the visible transformation naturally ("look at the difference", "left vs right", etc.).
- The remaining ${Math.max(0, count - expectedCustomCount)} ad(s) MUST set customImageId to null and provide an imagePrompt for AI generation.
- imagePrompt (only when customImageId is null): 1–2 sentences describing ONE cleaning scene for ${focusedService.name}. Concrete nouns only — no metaphors, no lifestyle scenes.
- imagePrompt MUST show the cleaning service in action OR its visible result.`
      : `- When customImageId is set: body MUST reference what's in that photo (especially before/after splits, stains, transformations). Use the copyAngle.
- For before-after images: mention the visible transformation naturally ("look at the difference", "left vs right", etc.)
- Match customImageId to a photo whose services include the ad's service when possible.
- Use each customImageId at most once per batch.
- imagePrompt (only when customImageId is null): 1–2 sentences describing ONE cleaning scene for that ad's service. Concrete nouns only — no metaphors, no lifestyle scenes.
- imagePrompt MUST show the cleaning service in action OR its visible result (e.g. steam wand on carpet, freshly cleaned couch, spotless mattress).`;

  const focusedServiceRule = focusedService
    ? `\n- FOCUSED BATCH: every ad in this batch MUST set service to "${focusedService.key}" (${focusedService.name}). Do NOT use any other service key. The "Vary services across the batch" rule does NOT apply here — keep all ads on this single service and vary the angle/headline/body instead.`
    : "\n- Vary services across the batch.";

  const varietyEmojiRule = "";

  const prompt = `You are a Facebook group marketing copywriter for "West Coast Cleaners" — a friendly, local home & rug cleaning company on the West Coast of Cape Town, South Africa (Blouberg / Melkbosstrand area).

${copyTemperatureSettingLine(copyTemperature)}

BRAND VOICE & SAMPLE POSTS (study carefully — new ads must sound like these):
${formatCopySamples(copySamples, brandVoice)}

TIMING & SEASONAL CONTEXT:
${context}

Services: ${servicesForPrompt.map((s) => `${s.name} [key: ${s.key}] (${s.perk}, call ${s.phone})`).join("; ")}.

${photoInstructions}

CREATIVE ANGLES — each ad must commit to ONE of these angles (shapes copy and imagePrompt):
${angleBriefs}
- Spread across allowed angles as evenly as possible; avoid duplicate (service, angle) pairs in one batch.

COPY TONE (temperature ${copyTemperature}/100):
${copyTemperatureCopyRules(copyTemperature)}

RULES:
${baseImageRules}${focusedServiceRule}
${varietyEmojiRule}
- imagePrompt mood should match copy temperature (${copyTemperature}/100) while obeying all image constraints below.
- Seasonal/holiday context affects COPY ONLY — do NOT put beach, summer, ocean, braai, or outdoor leisure imagery in imagePrompt. Use indoor cleaning scenes regardless of season.
- FORBIDDEN in imagePrompt mode: food, fruit, drinks, smoothies, plates of food, beach, palm trees, ocean, swimming pools, picnics, parties, portraits, faces, hands holding food, load shedding, candles, power-outage / dark scenes, excessive foam, heavy suds, bubbly furniture.
- FORBIDDEN in copy (headline/body/cta/hashtags): no mention of load shedding, load-shedding, loadshedding, power cuts, blackouts, or Eskom. Pick a different angle.
- Good example (upholstery): "Technician using extraction wand on grey fabric sofa in a bright living room, with one cushion visibly cleaner and only lightly damp fabric."
- Bad example: "Fresh summer vibes with tropical fruit on the beach."

Generate ${count} DIFFERENT short Facebook group ads.

Return strict JSON: { "ads": [{ "service": "<${serviceKeysForPrompt}>", "angle": "<one of: ${allowedAngleKeys}>", "customImageId": "<id from catalog${uploadsOnly ? "" : " or null"}>", "occasion": "short label or Evergreen", "headline": "punchy 4-8 word hook reflecting the angle", "body": "2-3 sentences — must tie to photo if customImageId set", "cta": "short CTA with phone number", "hashtags": "3-5 hashtags space separated", "imagePrompt": "${uploadsOnly ? "empty string" : "only when customImageId is null — cleaning-scene description per rules and angle; no text in image"}" }] }`;

  const parsed = (await geminiJson("gemini-2.5-flash", prompt)) as { ads?: AdConcept[] };
  const usedCustom = new Set<string>();

  const ads = (parsed.ads || []).map((ad) => {
    const requestedSvc = SERVICES.find((s) => s.key === ad.service) || SERVICES[0];
    const svc = focusedService ?? requestedSvc;
    let customImageId = ad.customImageId || null;
    if (customImageId) {
      const img = focusedService
        ? focusedRankedMatches.find((c) => c.id === customImageId)
        : catalog.find((c) => c.id === customImageId);
      if (!img || usedCustom.has(customImageId)) customImageId = null;
      else usedCustom.add(customImageId);
    }
    const ang = activeAngles.find((a) => a.key === ad.angle) ?? activeAngles[0];
    return {
      ...ad,
      hashtags: normalizeHashtags(ad.hashtags),
      customImageId,
      phone: svc.phone,
      serviceKey: svc.key,
      service: svc.name,
      occasion: ad.occasion || "Evergreen",
      angle: ang.key,
      angleLabel: ang.label,
    };
  });

  for (const requiredId of mustIncludeImageIds) {
    if (usedCustom.has(requiredId)) continue;
    const requiredImg = catalog.find((c) => c.id === requiredId);
    if (!requiredImg) continue;

    const matchingService = requiredImg.services[0];
    const target =
      ads.find((ad) => !ad.customImageId && ad.serviceKey === matchingService) ??
      ads.find((ad) => !ad.customImageId) ??
      ads.find((ad) => ad.customImageId && !mustIncludeImageIds.includes(ad.customImageId)) ??
      ads[0];

    if (!target) continue;
    if (target.customImageId) usedCustom.delete(target.customImageId);
    target.customImageId = requiredId;
    if (!focusedService) {
      target.serviceKey = matchingService;
      const svc = SERVICES.find((s) => s.key === matchingService);
      if (svc) {
        target.service = svc.name;
        target.phone = svc.phone;
      }
    }
    usedCustom.add(requiredId);
  }

  if (focusedService && !uploadsOnly) {
    const allowedIds = new Set(focusedRankedMatches.map((c) => c.id));

    for (const ad of ads) {
      if (ad.customImageId && !allowedIds.has(ad.customImageId)) {
        usedCustom.delete(ad.customImageId);
        ad.customImageId = null;
      }
    }

    usedCustom.clear();
    for (const ad of ads) {
      if (ad.customImageId) usedCustom.add(ad.customImageId);
    }

    for (const img of focusedRankedMatches) {
      if (usedCustom.size >= expectedCustomCount) break;
      if (usedCustom.has(img.id)) continue;
      const target =
        ads.find((ad) => !ad.customImageId) ??
        ads.find((ad) => ad.customImageId && !mustIncludeImageIds.includes(ad.customImageId));
      if (!target) break;
      if (target.customImageId) usedCustom.delete(target.customImageId);
      target.customImageId = img.id;
      usedCustom.add(img.id);
    }

    let assigned = ads.filter((a) => a.customImageId).length;
    if (assigned > expectedCustomCount) {
      for (const ad of [...ads].reverse()) {
        if (assigned <= expectedCustomCount) break;
        if (ad.customImageId && !mustIncludeImageIds.includes(ad.customImageId)) {
          usedCustom.delete(ad.customImageId);
          ad.customImageId = null;
          assigned--;
        }
      }
    }
  }

  if (uploadsOnly) {
    for (const ad of ads) {
      if (!ad.customImageId) {
        ad.customImageId = pickUnusedUpload(catalog, usedCustom, ad.serviceKey);
      }
    }
  }

  return ads;
}

const FEEDBACK_TABLE = "ad_image_feedback";

async function rateAdImage(
  client: ServiceClient,
  email: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const vote = body.vote === "up" || body.vote === "down" ? body.vote : null;
  const serviceKey = typeof body.serviceKey === "string" ? body.serviceKey.trim() : "";
  const cacheId = typeof body.cacheId === "string" ? body.cacheId.trim() : null;
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : null;
  const headline = typeof body.headline === "string" ? body.headline.trim().slice(0, 500) : null;
  const adBody = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : null;

  if (!vote) {
    return jsonResponse({ error: "vote must be 'up' or 'down'" }, 400);
  }
  if (!SERVICES.some((s) => s.key === serviceKey)) {
    return jsonResponse({ error: "Invalid serviceKey" }, 400);
  }

  const { error: feedbackErr } = await client.from(FEEDBACK_TABLE).insert({
    cache_id: cacheId || null,
    image_url: imageUrl || null,
    service_key: serviceKey,
    vote,
    headline,
    body: adBody,
    author_email: email,
  });
  if (feedbackErr) {
    console.error("[rate-image] feedback insert failed:", feedbackErr.message);
    return jsonResponse({ error: "Could not save feedback" }, 500);
  }

  if (cacheId) {
    const { data: row, error: readErr } = await client
      .from(CACHE_TABLE)
      .select("upvotes, downvotes")
      .eq("id", cacheId)
      .maybeSingle();
    if (!readErr && row) {
      const upvotes = Number(row.upvotes ?? 0) + (vote === "up" ? 1 : 0);
      const downvotes = Number(row.downvotes ?? 0) + (vote === "down" ? 1 : 0);
      const { error: updateErr } = await client
        .from(CACHE_TABLE)
        .update({ upvotes, downvotes })
        .eq("id", cacheId);
      if (updateErr) {
        console.warn("[rate-image] cache score update failed:", updateErr.message);
      }
    }
  }

  return jsonResponse({ ok: true, vote }, 200);
}

async function regenerateAdImage(body: Record<string, unknown>): Promise<Response> {
  const serviceKey = typeof body.serviceKey === "string" ? body.serviceKey.trim() : "";
  const imagePrompt = typeof body.imagePrompt === "string" ? body.imagePrompt.trim() : "";
  const themeRaw = typeof body.theme === "string" ? body.theme : undefined;
  const themeForCache = themeRaw && themeRaw !== "auto" ? themeRaw : null;
  const copyTemperature = normalizeCopyTemperature(body.copyTemperature);

  if (!SERVICES.some((s) => s.key === serviceKey)) {
    return jsonResponse({ error: "Invalid serviceKey" }, 400);
  }
  if (!imagePrompt) {
    return jsonResponse({ error: "imagePrompt is required" }, 400);
  }

  const image = await geminiImage(serviceKey, imagePrompt, themeForCache, true, copyTemperature);
  if (!image?.url) {
    return jsonResponse({ error: "Could not generate a new image" }, 502);
  }

  return jsonResponse(
    {
      imageUrl: image.url,
      imageCache: {
        status: image.cacheStatus,
        usedCount: image.usedCount,
        createdAt: image.createdAt,
        cacheId: image.cacheId,
      },
    },
    200,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorize(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const mode = typeof body.mode === "string" ? body.mode : null;

    if (mode === "rate-image") {
      const client = getServiceClient();
      if (!client) return jsonResponse({ error: "Feedback storage not configured" }, 500);
      return await rateAdImage(client, auth.email, body);
    }

    if (mode === "regenerate-image") {
      return await regenerateAdImage(body);
    }

    const {
      count = 6,
      theme,
      customImageCatalog: rawCatalog,
      copySamples: rawSamples,
      brandVoice,
      uploadsOnly = false,
      mustIncludeImageIds: rawMustInclude,
      forceFresh = false,
      serviceKey: rawServiceKey,
      copyTemperature: rawCopyTemperature,
      angles: rawAngles,
    } = body;
    const copyTemperature = normalizeCopyTemperature(rawCopyTemperature);
    const validAngleKeys = ANGLES.map((a) => a.key);
    const angleKeys = Array.isArray(rawAngles)
      ? rawAngles.filter((k: unknown): k is string => typeof k === "string" && validAngleKeys.includes(k))
      : validAngleKeys;
    const themeForCache = typeof theme === "string" && theme && theme !== "auto" ? theme : null;
    const validServiceKeys = new Set(SERVICES.map((s) => s.key));
    const focusServiceKey: string | null =
      !uploadsOnly && typeof rawServiceKey === "string" && validServiceKeys.has(rawServiceKey)
        ? rawServiceKey
        : null;
    let safeCount = Math.min(Math.max(Number(count) || 6, uploadsOnly ? 1 : 5), 10);

    let catalog: CustomImageCatalogItem[] = Array.isArray(rawCatalog)
      ? rawCatalog.filter((c: CustomImageCatalogItem) => c?.id && c?.url?.startsWith("http"))
      : [];

    if (uploadsOnly) {
      catalog = catalog.filter((c) => c.id.startsWith("user-"));
      if (!catalog.length) {
        return new Response(JSON.stringify({ error: "No user uploads in catalog" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      safeCount = Math.min(safeCount, catalog.length);
    }

    const catalogIds = new Set(catalog.map((c) => c.id));
    const rawMustIncludeList: string[] = Array.isArray(rawMustInclude)
      ? Array.from(
          new Set(
            rawMustInclude.filter((id: unknown): id is string => typeof id === "string" && catalogIds.has(id)),
          ),
        )
      : [];

    let skippedMustIncludeCount = 0;
    let mustIncludeImageIds = rawMustIncludeList;
    if (focusServiceKey) {
      const kept: string[] = [];
      for (const id of rawMustIncludeList) {
        const img = catalog.find((c) => c.id === id);
        if (img?.services.includes(focusServiceKey)) {
          kept.push(id);
        } else {
          skippedMustIncludeCount++;
        }
      }
      mustIncludeImageIds = kept;
    }

    if (mustIncludeImageIds.length > safeCount) {
      safeCount = Math.min(mustIncludeImageIds.length, 10);
    }

    const copySamples: string[] = Array.isArray(rawSamples)
      ? rawSamples.filter((s: unknown) => typeof s === "string" && s.length > 20)
      : [];
    const librarySamples = await fetchCopyLibrarySamples(getServiceClient(), focusServiceKey);
    const enrichedCopySamples = [...librarySamples, ...copySamples].slice(0, 24);

    const ads = await generateAdCopy(
      safeCount,
      theme,
      catalog,
      enrichedCopySamples,
      brandVoice,
      uploadsOnly,
      mustIncludeImageIds,
      focusServiceKey,
      copyTemperature,
      angleKeys,
    );

    const catalogById = new Map(catalog.map((c) => [c.id, c]));

    const withImages = await Promise.all(
      ads.map(async (ad) => {
        if (ad.customImageId && catalogById.has(ad.customImageId)) {
          const img = catalogById.get(ad.customImageId)!;
          return {
            ...ad,
            imageUrl: img.url,
            imageSource: "custom" as const,
            imageMeta: { type: img.type, tags: img.tags, subject: img.subject },
          };
        }

        if (uploadsOnly) {
          throw new Error(`Uploads-only mode: no upload assigned for ${ad.service}`);
        }

        const image = await geminiImage(
          ad.serviceKey,
          ad.imagePrompt,
          themeForCache,
          forceFresh === true,
          copyTemperature,
        );
        return {
          ...ad,
          imageUrl: image?.url ?? null,
          imageSource: "ai" as const,
          imageCache: image
            ? {
                status: image.cacheStatus,
                usedCount: image.usedCount,
                createdAt: image.createdAt,
                cacheId: image.cacheId,
              }
            : undefined,
        };
      }),
    );

    return new Response(JSON.stringify({ ads: withImages, skippedMustIncludeCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
