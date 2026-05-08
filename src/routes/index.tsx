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
  headline: string;
  body: string;
  cta: string;
  hashtags: string;
  imageUrl: string | null;
  phone: string;
};

async function generateAds(count: number): Promise<Ad[]> {
  const { data, error } = await supabase.functions.invoke("generate-ads", { body: { count } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.ads as Ad[];
}

function AdCard({ ad, index }: { ad: Ad; index: number }) {
  const fullPost = `${ad.headline}\n\n${ad.body}\n\n${ad.cta}\n\n${ad.hashtags}`;
  const copy = async () => {
    await navigator.clipboard.writeText(fullPost);
    toast.success("Ad copied — paste it into your Facebook group!");
  };
  const download = async () => {
    if (!ad.imageUrl) return;
    const a = document.createElement("a");
    a.href = ad.imageUrl;
    a.download = `wcc-ad-${index + 1}.png`;
    a.click();
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
  const [ads, setAds] = useState<Ad[]>([]);

  const mut = useMutation({
    mutationFn: () => generateAds(count),
    onSuccess: (data) => {
      setAds(data);
      toast.success(`Generated ${data.length} fresh ads!`);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to generate ads"),
  });

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
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Generate a fresh batch</h2>
              <p className="text-sm text-muted-foreground">5–10 unique ads across rugs, carpets, upholstery, mattresses &amp; home cleaning.</p>
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
                disabled={mut.isPending}
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
