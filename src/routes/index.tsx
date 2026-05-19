import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles, Copy, Download, Phone, Loader2, RefreshCw } from "lucide-react";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "West Coast Cleaners — Facebook Ad Engine" },
      { name: "description", content: "Generate ready-to-post Facebook group ads for West Coast Cleaners in seconds." },
    ],
  }),
});

type Ad = {
  service: string;
  occasion?: string;
  angle?: string;
  angleLabel?: string;
  headline: string;
  body: string;
  cta: string;
  hashtags: string;
  imageUrl: string | null;
  phone: string;
};

async function generateAds(count: number, theme: string, services: string[], angles: string[]): Promise<Ad[]> {
  const { data, error } = await supabase.functions.invoke("generate-ads", { body: { count, theme, services, angles } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.ads as Ad[];
}

const SERVICE_OPTIONS = [
  { key: "home", label: "House Cleaning" },
  { key: "office", label: "Office Cleaning" },
  { key: "fitted-carpet", label: "Fitted Carpet" },
  { key: "loose-rug", label: "Loose Rugs" },
  { key: "upholstery", label: "Upholstery" },
  { key: "mattress", label: "Mattresses" },
];

const ANGLE_OPTIONS = [
  { key: "trust", label: "Trust" },
  { key: "urgency", label: "Urgency" },
  { key: "before-after", label: "Before / After" },
  { key: "value", label: "Value" },
  { key: "convenience", label: "Convenience" },
  { key: "health", label: "Health" },
  { key: "social-proof", label: "Social proof" },
];

const THEMES = [
  { value: "auto", label: "Auto (smart pick)" },
  { value: "Evergreen — no holiday angle", label: "Evergreen" },
  { value: "Summer", label: "Summer" },
  { value: "Autumn", label: "Autumn" },
  { value: "Winter", label: "Winter" },
  { value: "Spring / Spring cleaning", label: "Spring cleaning" },
  { value: "Christmas & festive season", label: "Christmas" },
  { value: "New Year fresh start", label: "New Year" },
  { value: "Valentine's Day", label: "Valentine's" },
  { value: "Easter weekend", label: "Easter" },
  { value: "Mother's Day (SA)", label: "Mother's Day" },
  { value: "Father's Day (SA)", label: "Father's Day" },
  { value: "Heritage Day / Braai Day (SA)", label: "Heritage / Braai Day" },
  { value: "Black Friday", label: "Black Friday" },
  { value: "Back to school", label: "Back to school" },
  { value: "Long weekend / public holiday", label: "Long weekend" },
];

function AdCard({ ad, index }: { ad: Ad; index: number }) {
  const fullPost = `${ad.headline}\n\n${ad.body}\n\n${ad.cta}\n\n${ad.hashtags}`;
  const copy = async () => {
    await navigator.clipboard.writeText(fullPost);
    toast.success("Ad copied — paste it into your Facebook group!");
  };
  const download = async () => {
    if (!ad.imageUrl) return;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = ad.imageUrl;
      await new Promise((res, rej) => {
        img.onload = () => res(null);
        img.onerror = rej;
      });

      const W = 1080;
      const imgH = W; // square image
      const pad = 48;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      // height set after measuring text
      const ctx = canvas.getContext("2d")!;

      const wrap = (text: string, maxWidth: number, font: string) => {
        ctx.font = font;
        const lines: string[] = [];
        for (const para of text.split("\n")) {
          const words = para.split(/\s+/);
          let line = "";
          for (const w of words) {
            const test = line ? line + " " + w : w;
            if (ctx.measureText(test).width > maxWidth && line) {
              lines.push(line);
              line = w;
            } else {
              line = test;
            }
          }
          if (line) lines.push(line);
        }
        return lines;
      };

      const headlineFont = "bold 44px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      const bodyFont = "28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      const ctaFont = "bold 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      const tagFont = "italic 24px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

      const maxW = W - pad * 2;
      const headlineLines = wrap(ad.headline, maxW, headlineFont);
      const bodyLines = wrap(ad.body, maxW, bodyFont);
      const ctaLines = wrap(ad.cta, maxW, ctaFont);
      const tagLines = wrap(ad.hashtags, maxW, tagFont);

      const lh = { h: 54, b: 38, c: 40, t: 32 };
      const gap = 24;
      const textH =
        pad +
        headlineLines.length * lh.h +
        gap +
        bodyLines.length * lh.b +
        gap +
        ctaLines.length * lh.c +
        gap +
        tagLines.length * lh.t +
        pad;

      canvas.height = imgH + textH;

      // background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // image
      ctx.drawImage(img, 0, 0, W, imgH);

      // text block
      let y = imgH + pad;
      const drawLines = (lines: string[], font: string, color: string, lineH: number) => {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textBaseline = "top";
        for (const line of lines) {
          ctx.fillText(line, pad, y);
          y += lineH;
        }
      };

      drawLines(headlineLines, headlineFont, "#d6336c", lh.h);
      y += gap;
      drawLines(bodyLines, bodyFont, "#222222", lh.b);
      y += gap;
      drawLines(ctaLines, ctaFont, "#0d6efd", lh.c);
      y += gap;
      drawLines(tagLines, tagFont, "#6c757d", lh.t);

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `wcc-ad-${index + 1}.png`;
      a.click();
    } catch (e) {
      toast.error("Could not build composite image (image may be CORS-blocked).");
    }
  };
  return (
    <Card className="overflow-hidden border-0 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-1">
      <div className="aspect-square w-full bg-muted relative overflow-hidden">
        {ad.imageUrl ? (
          <img src={ad.imageUrl} alt={ad.headline} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Image unavailable
          </div>
        )}
        <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur border-0">
          {ad.service}
        </Badge>
        {ad.angleLabel && (
          <Badge className="absolute bottom-3 left-3 bg-foreground/85 text-background backdrop-blur border-0">
            {ad.angleLabel}
          </Badge>
        )}
        {ad.occasion && ad.occasion !== "Evergreen" && (
          <Badge
            className="absolute top-3 right-3 border-0 text-primary-foreground backdrop-blur"
            style={{ background: "var(--gradient-hero)" }}
          >
            {ad.occasion}
          </Badge>
        )}
      </div>
      <div className="p-5 space-y-3">
        <h3 className="font-bold text-lg leading-tight" style={{ color: "var(--accent-pink)" }}>
          {ad.headline}
        </h3>
        <p className="text-sm text-foreground/80 whitespace-pre-line">{ad.body}</p>
        <p className="text-sm font-medium flex items-start gap-2">
          <Phone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
          <span>{ad.cta}</span>
        </p>
        <p className="text-xs text-muted-foreground">{ad.hashtags}</p>
        <div className="flex gap-2 pt-2">
          <Button onClick={copy} variant="outline" size="sm" className="flex-1">
            <Copy className="w-4 h-4 mr-1" /> Copy text
          </Button>
          <Button onClick={download} size="sm" className="flex-1" disabled={!ad.imageUrl}>
            <Download className="w-4 h-4 mr-1" /> Image
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Index() {
  const [count, setCount] = useState(6);
  const [theme, setTheme] = useState<string>("auto");
  const [services, setServices] = useState<string[]>(SERVICE_OPTIONS.map((s) => s.key));
  const [angles, setAngles] = useState<string[]>(ANGLE_OPTIONS.map((a) => a.key));
  const [ads, setAds] = useState<Ad[]>([]);

  const mut = useMutation({
    mutationFn: () => generateAds(count, theme, services, angles),
    onSuccess: (data) => {
      setAds(data);
      toast.success(`Generated ${data.length} fresh ads!`);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to generate ads"),
  });

  const toggleService = (key: string) => {
    setServices((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAngle = (key: string) => {
    setAngles((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)", opacity: 0.85 }} />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 text-center text-primary-foreground">
          <Badge className="mb-6 bg-background/20 text-primary-foreground border border-primary-foreground/30 backdrop-blur">
            <Sparkles className="w-3 h-3 mr-1" /> AI Ad Engine
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            West Coast Cleaners
          </h1>
          <p className="text-xl md:text-2xl font-medium opacity-95 mb-2">
            Facebook Group Ads — generated in seconds
          </p>
          <p className="opacity-85 max-w-2xl mx-auto">
            Catchy copy + matching images, ready to copy-paste into Blouberg, Table View &amp; West Coast community groups.
          </p>
        </div>
      </header>

      {/* Generator */}
      <section className="max-w-6xl mx-auto px-6 -mt-10 relative z-10">
        <Card className="p-6 md:p-8 shadow-[var(--shadow-elegant)] border-0">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
              <h2 className="text-xl font-bold">Generate a fresh batch</h2>
              <p className="text-sm text-muted-foreground">5–10 unique ads — seasonally aware &amp; holiday-ready.</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
                {[5, 6, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      count === n ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => mut.mutate()}
                disabled={mut.isPending || services.length === 0 || angles.length === 0}
                size="lg"
                className="font-semibold"
                style={{ background: "var(--gradient-fresh)", color: "var(--primary-foreground)" }}
              >
                {mut.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                ) : ads.length ? (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Generate again</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate ads</>
                )}
              </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Services to feature
                </p>
                <div className="flex gap-2 text-xs">
                  <button
                    className="text-muted-foreground hover:text-foreground underline"
                    onClick={() => setServices(SERVICE_OPTIONS.map((s) => s.key))}
                  >All</button>
                  <button
                    className="text-muted-foreground hover:text-foreground underline"
                    onClick={() => setServices(["home"])}
                  >House only</button>
                  <button
                    className="text-muted-foreground hover:text-foreground underline"
                    onClick={() => setServices(["fitted-carpet", "loose-rug"])}
                  >Carpets only</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((s) => {
                  const active = services.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() => toggleService(s.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        active
                          ? "border-transparent text-primary-foreground shadow-sm"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                      style={active ? { background: "var(--gradient-fresh)" } : undefined}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {services.length === 0 && (
                <p className="text-xs text-destructive mt-2">Select at least one service.</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ad angles / variants
                </p>
                <div className="flex gap-2 text-xs">
                  <button
                    className="text-muted-foreground hover:text-foreground underline"
                    onClick={() => setAngles(ANGLE_OPTIONS.map((a) => a.key))}
                  >All</button>
                  <button
                    className="text-muted-foreground hover:text-foreground underline"
                    onClick={() => setAngles(["trust", "urgency", "before-after"])}
                  >Core 3</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {ANGLE_OPTIONS.map((a) => {
                  const active = angles.includes(a.key);
                  return (
                    <button
                      key={a.key}
                      onClick={() => toggleAngle(a.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        active
                          ? "border-transparent text-primary-foreground shadow-sm"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                      style={active ? { background: "var(--gradient-fresh)" } : undefined}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
              {angles.length === 0 && (
                <p className="text-xs text-destructive mb-2">Select at least one angle.</p>
              )}

              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Seasonal / holiday angle
              </p>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      theme === t.value
                        ? "border-transparent text-primary-foreground shadow-sm"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                    style={theme === t.value ? { background: "var(--gradient-hero)" } : undefined}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Results */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {mut.isPending && ads.length === 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-[var(--shadow-soft)] animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {ads.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad, i) => <AdCard key={i} ad={ad} index={i} />)}
          </div>
        )}

        {ads.length === 0 && !mut.isPending && (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-40" />
            <p>Click <strong>Generate ads</strong> to create your first batch.</p>
          </div>
        )}
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Built for <a className="font-medium hover:underline" href="https://www.westcoastcleaners.capetown" target="_blank" rel="noreferrer">West Coast Cleaners</a> · Cape Town
      </footer>
    </div>
  );
}
