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

interface AdConcept {
  service: string;
  headline: string;
  body: string;
  cta: string;
  hashtags: string;
  imagePrompt: string;
  phone: string;
}

async function generateAdCopy(count: number): Promise<AdConcept[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const prompt = `You are a Facebook group marketing copywriter for "West Coast Cleaners" — a friendly, local home & rug cleaning company on the West Coast of Cape Town, South Africa (Blouberg area).

Their services: ${SERVICES.map((s) => `${s.name} (${s.perk}, call ${s.phone})`).join("; ")}.

Tone: warm, neighbourly, locally proud, casual South African. NOT salesy. Feels like a community recommendation, not a corporate ad. Use light emojis sparingly (1-2 per ad).

Generate ${count} DIFFERENT short, catchy Facebook group ads. Each should target one of the services and feel native to local community groups (Blouberg, Table View, Melkbosstrand, Parklands, West Coast Moms etc).

Return strict JSON: { "ads": [{ "service": "<one of: loose-rug | fitted-carpet | upholstery | mattress | home | office>", "headline": "punchy 4-8 word hook", "body": "2-3 sentence post body", "cta": "short call to action sentence including the phone number", "hashtags": "3-5 relevant hashtags space separated", "imagePrompt": "detailed visual prompt for an eye-catching square ad image (no text in image), South African home context, bright clean aesthetic" }] }`;

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
    return { ...ad, phone: svc.phone, service: svc.name };
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
