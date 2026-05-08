// Generate Facebook ad copy + image for West Coast Cleaners
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SERVICES = [
  { key: "loose-rug", name: "Loose Rug Cleaning", phone: "082 228 9226", perk: "Free collection & dropoff" },
  { key: "fitted-carpet", name: "Fitted Carpet Cleaning", phone: "082 228 9226", perk: "Deep steam clean in your home" },
  { key: "upholstery", name: "Upholstery Cleaning", phone: "082 228 9226", perk: "Couches looking brand new" },
  { key: "mattress", name: "Mattress Cleaning", phone: "082 228 9226", perk: "Sleep healthier tonight" },
  { key: "home", name: "Home Cleaning", phone: "079 365 8668", perk: "Friendly, reliable local team" },
  { key: "office", name: "Office Cleaning", phone: "079 365 8668", perk: "Spotless workspaces, happy teams" },
];

// Southern hemisphere seasons (Cape Town)
function currentSeason(d: Date): { name: string; angle: string } {
  const m = d.getMonth() + 1;
  if (m === 12 || m <= 2) return { name: "Summer", angle: "beach sand, salty wind, braai season — homes get extra dirt, dust and sandy footprints" };
  if (m <= 5) return { name: "Autumn", angle: "leaves, dust and load-shedding grime building up before winter" };
  if (m <= 8) return { name: "Winter", angle: "wet Cape Town winter — muddy paws, damp carpets, mould-prone upholstery, cosy indoors" };
  return { name: "Spring", angle: "spring cleaning season — fresh start, refresh the home after winter" };
}

// Fixed + computed SA-relevant occasions
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
    .filter((c) => c.daysAway >= -1 && c.daysAway <= 35)
    .sort((a, b) => a.daysAway - b.daysAway);

  return future[0] || null;
}

function buildContext(theme?: string) {
  const today = new Date();
  const season = currentSeason(today);
  const occ = upcomingOccasion(today);
  const themeOverride = (theme && theme !== "auto") ? theme : null;

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

interface AdConcept {
  service: string;
  headline: string;
  body: string;
  cta: string;
  hashtags: string;
  imagePrompt: string;
  phone: string;
}

async function generateAdCopy(count: number, theme?: string): Promise<AdConcept[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const context = buildContext(theme);

  const prompt = `You are a Facebook group marketing copywriter for "West Coast Cleaners" — a friendly, local home & rug cleaning company on the West Coast of Cape Town, South Africa (Blouberg area).

TIMING & SEASONAL CONTEXT (use this to make ads feel timely and relevant):
${context}

Their services: ${SERVICES.map((s) => `${s.name} (${s.perk}, call ${s.phone})`).join("; ")}.

Tone: warm, neighbourly, locally proud, casual South African. NOT salesy. Feels like a community recommendation, not a corporate ad. Use light emojis sparingly (1-2 per ad). Tie copy AND imagery to the seasonal/holiday context above where it feels natural — never forced.

Generate ${count} DIFFERENT short, catchy Facebook group ads. Each should target one of the services and feel native to local community groups (Blouberg, Table View, Melkbosstrand, Parklands, West Coast Moms etc). Vary services across the batch.

Return strict JSON: { "ads": [{ "service": "<one of: loose-rug | fitted-carpet | upholstery | mattress | home | office>", "occasion": "short label of the seasonal/holiday hook used (e.g. 'Christmas', 'Winter', 'Mother's Day') or 'Evergreen'", "headline": "punchy 4-8 word hook", "body": "2-3 sentence post body that ties to the occasion when relevant", "cta": "short call to action sentence including the phone number", "hashtags": "3-5 relevant hashtags space separated", "imagePrompt": "detailed visual prompt for an eye-catching square ad image (no text in image), South African home context, bright clean aesthetic, reflecting the season/occasion visually (decor, lighting, props)" }] }`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI copy gen failed ${res.status}: ${err}`);
  }
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return (parsed.ads || []).map((ad: any) => {
    const svc = SERVICES.find((s) => s.key === ad.service) || SERVICES[0];
    return { ...ad, phone: svc.phone, service: svc.name, occasion: ad.occasion || "Evergreen" };
  });
}

async function generateImage(imagePrompt: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `${imagePrompt}. Bright, vibrant, professional Facebook ad photography. Square 1:1 composition. NO TEXT, NO LOGOS in the image.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.error("image gen failed", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const img = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return img || null;
  } catch (e) {
    console.error("image error", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { count = 6 } = await req.json().catch(() => ({}));
    const safeCount = Math.min(Math.max(Number(count) || 6, 5), 10);

    const ads = await generateAdCopy(safeCount);

    // Generate images in parallel
    const withImages = await Promise.all(
      ads.map(async (ad) => ({
        ...ad,
        imageUrl: await generateImage(ad.imagePrompt),
      }))
    );

    return new Response(JSON.stringify({ ads: withImages }), {
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
