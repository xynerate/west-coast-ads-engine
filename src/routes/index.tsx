import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Sparkles,
  Download,
  Loader2,
  RefreshCw,
  LogOut,
  ShieldAlert,
  Pencil,
  RotateCcw,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  ImagePlus,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { resolveCustomImageCatalog } from "@/data/custom-ad-images";
import { BRAND_VOICE, COPY_SAMPLES } from "@/data/copy-samples";
import { downloadAdAsPng } from "@/lib/ad-export";
import { splitCta } from "@/lib/utils";
import {
  COPY_TEMPERATURE_DEFAULT,
  COPY_TEMPERATURE_PRESETS,
  clampCopyTemperature,
  copyTemperatureExample,
  copyTemperatureLabel,
} from "@/lib/copy-temperature";
import { Slider } from "@/components/ui/slider";
import { listUserImages } from "@/lib/user-uploads";
import { UserUploadCard } from "@/components/UserUploadCard";
import { ALLOWED_EMAILS, signInWithGoogle, signOut, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "West Coast Cleaners — Facebook Ad Engine" },
      {
        name: "description",
        content: "Generate ready-to-post Facebook group ads for West Coast Cleaners in seconds.",
      },
    ],
  }),
});

type AdCopySnapshot = {
  headline: string;
  body: string;
  cta: string;
  hashtags: string;
};

type Ad = AdCopySnapshot & {
  serviceKey: string;
  service: string;
  occasion?: string;
  angle?: string;
  angleLabel?: string;
  imageUrl: string | null;
  imagePrompt?: string;
  imageSource?: "custom" | "ai";
  imageMeta?: { type: string; tags: string[]; subject: string };
  imageCache?: {
    status: "fresh" | "cached" | "uncached";
    usedCount?: number;
    createdAt?: string;
    cacheId?: string;
  };
  imageMatchVote?: "up" | "down" | null;
  phone: string;
  __edited?: boolean;
  __original?: AdCopySnapshot;
};

function normalizeHashtags(input: string): string {
  return input
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");
}

function copySnapshot(ad: Ad): AdCopySnapshot {
  return {
    headline: ad.headline,
    body: ad.body,
    cta: ad.cta,
    hashtags: ad.hashtags,
  };
}

function copyEquals(a: AdCopySnapshot, b: AdCopySnapshot): boolean {
  return (
    a.headline === b.headline &&
    a.body === b.body &&
    a.cta === b.cta &&
    a.hashtags === b.hashtags
  );
}

const MAX_BATCH = 10;

async function generateAds(
  count: number,
  theme: string,
  uploadsOnly: boolean,
  mustIncludeImageIds: string[],
  forceFresh: boolean,
  serviceKey: string,
  copyTemperature: number,
  angles: string[],
): Promise<{ ads: Ad[]; skippedMustIncludeCount: number }> {
  const userPhotos = typeof window !== "undefined" ? await listUserImages() : [];

  if (uploadsOnly && userPhotos.length === 0) {
    throw new Error("Upload at least one photo before using uploads-only test mode.");
  }

  const builtin = typeof window !== "undefined" ? resolveCustomImageCatalog() : [];
  const customImageCatalog = uploadsOnly ? userPhotos : [...builtin, ...userPhotos];

  const validMustIncludeIds = mustIncludeImageIds.filter((id) =>
    customImageCatalog.some((c) => c.id === id),
  );

  let effectiveCount = uploadsOnly ? Math.min(count, userPhotos.length) : count;
  if (validMustIncludeIds.length > effectiveCount) {
    effectiveCount = Math.min(validMustIncludeIds.length, MAX_BATCH);
  }

  const { data, error } = await supabase.functions.invoke("generate-ads", {
    body: {
      count: effectiveCount,
      theme,
      customImageCatalog,
      uploadsOnly,
      mustIncludeImageIds: validMustIncludeIds,
      forceFresh,
      serviceKey: serviceKey && serviceKey !== "any" ? serviceKey : undefined,
      copySamples: COPY_SAMPLES,
      brandVoice: BRAND_VOICE,
      copyTemperature: clampCopyTemperature(copyTemperature),
      angles,
    },
  });

  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? error.message);
  }
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return {
    ads: data.ads as Ad[],
    skippedMustIncludeCount: Number(data.skippedMustIncludeCount) || 0,
  };
}

async function saveEditedCopyToLibrary(
  ad: Ad,
  copy: AdCopySnapshot,
  original: AdCopySnapshot,
  theme: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke("save-ad-edit", {
    body: {
      serviceKey: ad.serviceKey,
      theme: theme === "auto" ? null : theme,
      headline: copy.headline,
      body: copy.body,
      cta: copy.cta,
      hashtags: copy.hashtags,
      originalHeadline: original.headline,
      originalBody: original.body,
      originalCta: original.cta,
      originalHashtags: original.hashtags,
    },
  });
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? error.message);
  }
  if (error) throw error;
}

async function rateAdImageMatch(
  ad: Ad,
  vote: "up" | "down",
): Promise<void> {
  const { error } = await supabase.functions.invoke("generate-ads", {
    body: {
      mode: "rate-image",
      vote,
      serviceKey: ad.serviceKey,
      cacheId: ad.imageCache?.cacheId ?? null,
      imageUrl: ad.imageUrl,
      headline: ad.headline,
      body: ad.body,
    },
  });
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? error.message);
  }
  if (error) throw error;
}

async function regenerateAdImage(
  ad: Ad,
  theme: string,
  copyTemperature: number,
): Promise<{ imageUrl: string; imageCache: Ad["imageCache"] }> {
  const { data, error } = await supabase.functions.invoke("generate-ads", {
    body: {
      mode: "regenerate-image",
      serviceKey: ad.serviceKey,
      imagePrompt: ad.imagePrompt ?? "",
      theme,
      copyTemperature: clampCopyTemperature(copyTemperature),
    },
  });
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? error.message);
  }
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.imageUrl) throw new Error("No image returned");
  return { imageUrl: data.imageUrl as string, imageCache: data.imageCache as Ad["imageCache"] };
}

const SERVICE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "loose-rug", label: "Loose rug" },
  { value: "fitted-carpet", label: "Fitted carpet" },
  { value: "upholstery", label: "Upholstery" },
  { value: "mattress", label: "Mattress" },
  { value: "home", label: "Home" },
  { value: "office", label: "Office" },
] as const;

type ServiceOptionValue = (typeof SERVICE_OPTIONS)[number]["value"];

const ANGLE_OPTIONS = [
  { key: "trust", label: "Trust" },
  { key: "urgency", label: "Urgency" },
  { key: "before-after", label: "Before / After" },
  { key: "value", label: "Value" },
  { key: "convenience", label: "Convenience" },
  { key: "health", label: "Health" },
  { key: "social-proof", label: "Social proof" },
] as const;

const SERVICE_FULL_NAMES: Record<Exclude<ServiceOptionValue, "any">, string> = {
  "loose-rug": "Loose rug cleaning",
  "fitted-carpet": "Fitted carpet cleaning",
  upholstery: "Upholstery cleaning",
  mattress: "Mattress cleaning",
  home: "Home cleaning",
  office: "Office cleaning",
};

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

function formatCacheBadge(cache: Ad["imageCache"]): string {
  if (!cache || cache.status === "fresh" || cache.status === "uncached") {
    return "Fresh AI";
  }
  const count = cache.usedCount ?? 1;
  return `Cached · used ${count}x`;
}

function AdCard({
  ad,
  index,
  onSaveCopy,
  onRateMatch,
  onRegenerateImage,
  regenerating,
}: {
  ad: Ad;
  index: number;
  onSaveCopy: (index: number, copy: AdCopySnapshot) => void;
  onRateMatch: (index: number, vote: "up" | "down") => void;
  onRegenerateImage: (index: number) => void;
  regenerating: boolean;
}) {
  const [exporting, setExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<AdCopySnapshot>(() => copySnapshot(ad));
  const [rating, setRating] = useState(false);

  const original = ad.__original ?? copySnapshot(ad);
  const draftDiffersFromOriginal = !copyEquals(draft, original);
  const canSave = draft.headline.trim().length > 0 && draft.body.trim().length > 0;

  const startEdit = () => {
    setDraft(copySnapshot(ad));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(copySnapshot(ad));
    setIsEditing(false);
  };

  const resetDraftToOriginal = () => {
    setDraft({ ...original });
  };

  const handleSave = () => {
    if (!canSave) return;
    onSaveCopy(index, {
      headline: draft.headline.trim(),
      body: draft.body.trim(),
      cta: draft.cta.trim(),
      hashtags: normalizeHashtags(draft.hashtags),
    });
    setIsEditing(false);
    toast.success("Copy updated");
  };

  const handleDownload = async () => {
    if (!ad.imageUrl || exporting || isEditing) return;
    setExporting(true);
    try {
      await downloadAdAsPng(ad, index);
      toast.success("Post downloaded — ready to upload to Facebook!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not export post";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handleRate = async (vote: "up" | "down") => {
    if (rating || ad.imageMatchVote) return;
    setRating(true);
    try {
      await onRateMatch(index, vote);
    } finally {
      setRating(false);
    }
  };

  const canRegenerate =
    ad.imageSource === "ai" && Boolean(ad.imagePrompt?.trim()) && !isEditing && !regenerating;

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
        <Badge className="absolute top-2 left-2 sm:top-3 sm:left-3 max-w-[48%] truncate bg-background/90 text-foreground backdrop-blur border-0 text-[10px] sm:text-xs">
          {ad.service}
        </Badge>
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex max-w-[55%] flex-col items-end gap-1 sm:gap-1.5">
          {ad.__edited && (
            <Badge className="border-0 bg-amber-500/90 text-white backdrop-blur text-[10px] sm:text-xs">
              Edited
            </Badge>
          )}
          {ad.imageSource === "custom" && ad.imageMeta?.type === "before-after" && (
            <Badge className="border-0 bg-background/90 text-foreground backdrop-blur text-[10px] sm:text-xs">
              Before &amp; after
            </Badge>
          )}
          {ad.imageSource === "custom" && ad.imageMeta?.type !== "before-after" && (
            <Badge className="border-0 bg-background/90 text-foreground backdrop-blur text-[10px] sm:text-xs">
              Your photo
            </Badge>
          )}
          {ad.imageSource === "ai" && (
            <Badge className="border-0 bg-background/90 text-foreground backdrop-blur text-[10px] sm:text-xs">
              AI image
            </Badge>
          )}
          {ad.imageSource === "ai" && (
            <Badge
              className="border-0 bg-background/90 text-foreground backdrop-blur text-[10px] sm:text-xs"
              title={ad.imageCache?.createdAt ? `Created ${new Date(ad.imageCache.createdAt).toLocaleString()}` : undefined}
            >
              {formatCacheBadge(ad.imageCache)}
            </Badge>
          )}
          {ad.angleLabel && (
            <Badge className="border-0 bg-background/90 text-foreground backdrop-blur text-[10px] sm:text-xs">
              {ad.angleLabel}
            </Badge>
          )}
          {ad.occasion && ad.occasion !== "Evergreen" && (
            <Badge
              className="border-0 text-primary-foreground backdrop-blur text-[10px] sm:text-xs"
              style={{ background: "var(--gradient-hero)" }}
            >
              {ad.occasion}
            </Badge>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-5 space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`headline-${index}`} className="text-xs">
                Headline
              </Label>
              <Input
                id={`headline-${index}`}
                value={draft.headline}
                onChange={(e) => setDraft((d) => ({ ...d, headline: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`body-${index}`} className="text-xs">
                Body
              </Label>
              <Textarea
                id={`body-${index}`}
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                rows={4}
                className="resize-y min-h-[5rem]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`cta-${index}`} className="text-xs">
                Call to action
              </Label>
              <Input
                id={`cta-${index}`}
                value={draft.cta}
                onChange={(e) => setDraft((d) => ({ ...d, cta: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`hashtags-${index}`} className="text-xs">
                Hashtags
              </Label>
              <Input
                id={`hashtags-${index}`}
                value={draft.hashtags}
                onChange={(e) => setDraft((d) => ({ ...d, hashtags: e.target.value }))}
                placeholder="#WestCoastCleaners #CapeTown"
              />
            </div>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              <Button onClick={handleSave} size="sm" disabled={!canSave} className="w-full sm:w-auto">
                <Check className="w-4 h-4 mr-2" /> Save
              </Button>
              <Button onClick={cancelEdit} size="sm" variant="outline" className="w-full sm:w-auto">
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button
                onClick={resetDraftToOriginal}
                size="sm"
                variant="ghost"
                disabled={!draftDiffersFromOriginal}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Reset to original
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-bold text-base sm:text-lg leading-tight" style={{ color: "var(--accent-pink)" }}>
              {ad.headline}
            </h3>
            <p className="text-sm text-foreground/80 whitespace-pre-line">{ad.body}</p>
            {(() => {
              const { lead, phone } = splitCta(ad.cta);
              return (
                <div className="text-sm font-medium space-y-0.5">
                  {lead && <p>{lead}</p>}
                  {phone && <p className="whitespace-nowrap">{phone}</p>}
                </div>
              );
            })()}
            <p className="text-xs text-muted-foreground">{ad.hashtags}</p>
          </>
        )}
        {!isEditing && (
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 space-y-2">
            <p className="text-xs font-medium text-foreground/80">Does the image match this ad?</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={ad.imageMatchVote === "up" ? "default" : "outline"}
                className="h-8"
                disabled={rating || Boolean(ad.imageMatchVote)}
                onClick={() => handleRate("up")}
              >
                <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={ad.imageMatchVote === "down" ? "destructive" : "outline"}
                className="h-8"
                disabled={rating || Boolean(ad.imageMatchVote)}
                onClick={() => handleRate("down")}
              >
                <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                No
              </Button>
              {ad.imageMatchVote === "up" && (
                <span className="text-xs text-muted-foreground">Thanks — we&apos;ll reuse similar images.</span>
              )}
              {ad.imageMatchVote === "down" && ad.imageSource === "ai" && (
                <span className="text-xs text-muted-foreground">Generating a better match…</span>
              )}
              {ad.imageMatchVote === "down" && ad.imageSource !== "ai" && (
                <span className="text-xs text-muted-foreground">Try editing the copy to match the photo.</span>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
          {!isEditing && (
            <Button onClick={startEdit} size="sm" variant="outline" className="w-full sm:flex-1">
              <Pencil className="w-4 h-4 mr-2" /> Edit copy
            </Button>
          )}
          {canRegenerate && (
            <Button
              onClick={() => onRegenerateImage(index)}
              size="sm"
              variant="outline"
              className="w-full sm:flex-1"
              disabled={regenerating}
            >
              {regenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> New image…</>
              ) : (
                <><ImagePlus className="w-4 h-4 mr-2" /> Regenerate image</>
              )}
            </Button>
          )}
          <Button
            onClick={handleDownload}
            size="sm"
            className="w-full sm:flex-1"
            disabled={!ad.imageUrl || exporting || isEditing}
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building post…</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download post</>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function SignInScreen() {
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign-in failed";
      toast.error(message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-md p-8 border-0 shadow-[var(--shadow-elegant)] text-center">
        <Badge className="mx-auto mb-6 bg-background/20 text-foreground border">
          <Sparkles className="w-3 h-3 mr-1" /> West Coast Cleaners
        </Badge>
        <h1 className="text-2xl font-bold mb-2">Facebook Ad Engine</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Sign in with your approved Google account to continue.
        </p>
        <Button
          onClick={handleSignIn}
          disabled={busy}
          size="lg"
          className="w-full font-semibold"
          style={{ background: "var(--gradient-fresh)", color: "var(--primary-foreground)" }}
        >
          {busy ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</>
          ) : (
            <>Sign in with Google</>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-6">
          Access is limited to approved team members only.
        </p>
      </Card>
    </div>
  );
}

function NotAllowedScreen({ email }: { email: string | null }) {
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign-out failed";
      toast.error(message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-md p-8 border-0 shadow-[var(--shadow-elegant)] text-center">
        <ShieldAlert className="w-10 h-10 mx-auto mb-4 text-destructive" />
        <h1 className="text-xl font-bold mb-2">Access not approved</h1>
        <p className="text-sm text-muted-foreground mb-2">
          {email ? <>The account <strong>{email}</strong> isn’t on the allow list.</> : "This account isn’t on the allow list."}
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Approved accounts: {ALLOWED_EMAILS.join(", ")}
        </p>
        <Button onClick={handleSignOut} disabled={busy} variant="outline" className="w-full">
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing out…</> : <><LogOut className="w-4 h-4 mr-2" /> Sign out</>}
        </Button>
      </Card>
    </div>
  );
}

function Index() {
  const auth = useAuth();

  if (auth.loading) return <FullScreenLoader />;
  if (!auth.session) return <SignInScreen />;
  if (!auth.isAllowed) return <NotAllowedScreen email={auth.email} />;

  return <AuthedApp email={auth.email} />;
}

function AuthedApp({ email }: { email: string | null }) {
  const [count, setCount] = useState(6);
  const [theme, setTheme] = useState<string>("auto");
  const [service, setService] = useState<ServiceOptionValue>("any");
  const [uploadsOnly, setUploadsOnly] = useState(false);
  const [forceFresh, setForceFresh] = useState(false);
  const [copyTemperature, setCopyTemperature] = useState(COPY_TEMPERATURE_DEFAULT);
  const [angles, setAngles] = useState<string[]>(ANGLE_OPTIONS.map((a) => a.key));
  const [ads, setAds] = useState<Ad[]>([]);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const uploadsQuery = useQuery({
    queryKey: ["user-uploads"],
    queryFn: listUserImages,
  });
  const uploadCount = uploadsQuery.data?.length ?? 0;
  const baseCount = uploadsOnly ? Math.min(count, uploadCount) : count;
  const effectiveCount = Math.min(MAX_BATCH, Math.max(baseCount, pendingIds.length));

  const effectiveService: ServiceOptionValue = uploadsOnly ? "any" : service;

  const mut = useMutation({
    mutationFn: () =>
      generateAds(count, theme, uploadsOnly, pendingIds, forceFresh, effectiveService, copyTemperature, angles),
    onSuccess: ({ ads, skippedMustIncludeCount }) => {
      setAds(ads);
      setLastGeneratedAt(Date.now());
      setPendingIds([]);
      toast.success(`Generated ${ads.length} fresh ads!`);
      if (skippedMustIncludeCount > 0) {
        toast.warning(
          `${skippedMustIncludeCount} recent upload${skippedMustIncludeCount === 1 ? " doesn't" : "s don't"} match the selected service and ${skippedMustIncludeCount === 1 ? "was" : "were"} skipped.`,
        );
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to generate ads"),
  });

  const handleUploaded = (id: string) =>
    setPendingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const handleAdSaveCopy = (index: number, copy: AdCopySnapshot) => {
    const adToSave = ads[index];
    const original = adToSave ? adToSave.__original ?? copySnapshot(adToSave) : null;
    setAds((prev) =>
      prev.map((ad, i) => {
        if (i !== index) return ad;
        const original = ad.__original ?? copySnapshot(ad);
        const next = { ...ad, ...copy };
        return {
          ...next,
          __original: original,
          __edited: !copyEquals(copy, original),
        };
      }),
    );
    if (adToSave && original && !copyEquals(copy, original)) {
      saveEditedCopyToLibrary(adToSave, copy, original, theme).catch((e) => {
        const message = e instanceof Error ? e.message : "Could not add edit to the copy library";
        toast.warning(`Copy saved locally, but not added to library: ${message}`);
      });
    }
  };

  const handleRegenerateImage = async (index: number, options?: { silent?: boolean }) => {
    const ad = ads[index];
    if (!ad?.imagePrompt?.trim() || ad.imageSource !== "ai") return;

    setRegeneratingIndex(index);
    try {
      const { imageUrl, imageCache } = await regenerateAdImage(ad, theme, copyTemperature);
      setAds((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                imageUrl,
                imageCache,
                imageMatchVote: null,
              }
            : item,
        ),
      );
      if (!options?.silent) {
        toast.success("New AI image ready");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not regenerate image";
      toast.error(message);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleRateMatch = async (index: number, vote: "up" | "down") => {
    const ad = ads[index];
    if (!ad) return;

    setAds((prev) =>
      prev.map((item, i) => (i === index ? { ...item, imageMatchVote: vote } : item)),
    );

    try {
      await rateAdImageMatch(ad, vote);
      if (vote === "up") {
        toast.success("Thanks — we'll favour similar images.");
      } else if (ad.imageSource === "ai" && ad.imagePrompt?.trim()) {
        await handleRegenerateImage(index, { silent: true });
        toast.success("Generating a new image that better matches the copy.");
      } else {
        toast.message("Tip: edit the copy so it describes what's in the photo.");
      }
    } catch (e) {
      setAds((prev) =>
        prev.map((item, i) => (i === index ? { ...item, imageMatchVote: null } : item)),
      );
      const message = e instanceof Error ? e.message : "Could not save feedback";
      toast.error(message);
    }
  };

  const generateDisabled =
    mut.isPending || (uploadsOnly && uploadCount === 0) || angles.length === 0;
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign-out failed";
      toast.error(message);
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />

      <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-2 sm:py-3 border-b bg-background/95 text-sm">
        <span className="text-muted-foreground hidden sm:inline">{email}</span>
        <Button onClick={handleSignOut} disabled={signingOut} variant="ghost" size="sm">
          {signingOut ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing out…</>
          ) : (
            <><LogOut className="w-4 h-4 mr-2" /> Sign out</>
          )}
        </Button>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)", opacity: 0.85 }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 md:py-24 text-center text-primary-foreground">
          <Badge className="mb-6 bg-background/20 text-primary-foreground border border-primary-foreground/30 backdrop-blur">
            <Sparkles className="w-3 h-3 mr-1" /> AI Ad Engine
          </Badge>
          <h1 className="mb-4 flex justify-center">
            <img
              src={`${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/brand/logo.png`}
              alt="West Coast Cleaners"
              className="w-48 sm:w-64 md:w-80 lg:w-96 h-auto rounded-2xl bg-background/95 p-4 shadow-[var(--shadow-elegant)]"
            />
          </h1>
          <p className="text-xl md:text-2xl font-medium opacity-95 mb-2">
            Facebook Group Ads — generated in seconds
          </p>
          <p className="opacity-85 max-w-2xl mx-auto">
            Catchy copy + your real photos mixed with AI images — ready to paste into Blouberg, Table View &amp; West Coast community groups.
          </p>
        </div>
      </header>

      {/* Generator */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 sm:-mt-10 relative z-10">
        <Card className="p-4 sm:p-6 md:p-8 shadow-[var(--shadow-elegant)] border-0">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Generate a fresh batch</h2>
                <p className="text-sm text-muted-foreground">
                  {uploadsOnly
                    ? `Test mode — up to ${effectiveCount || 0} ad${effectiveCount === 1 ? "" : "s"} from your uploads only.`
                    : effectiveService !== "any"
                      ? `All ads will focus on ${SERVICE_FULL_NAMES[effectiveService]}.`
                      : "5–10 unique ads — seasonally aware & holiday-ready."}
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">
                <div className="flex w-full items-center justify-between gap-1 rounded-lg border bg-muted/30 p-1 sm:w-auto">
                  {[5, 6, 8, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition sm:flex-none ${
                        count === n ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => mut.mutate()}
                  disabled={generateDisabled}
                  size="lg"
                  className="w-full font-semibold sm:w-auto"
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

            <UserUploadCard lastGeneratedAt={lastGeneratedAt} onUploaded={handleUploaded} />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
                <Checkbox
                  id="uploads-only"
                  checked={uploadsOnly}
                  onCheckedChange={(checked) => setUploadsOnly(checked === true)}
                />
                <div className="space-y-1">
                  <label htmlFor="uploads-only" className="text-sm font-medium leading-none cursor-pointer">
                    Uploads only (test)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Test mode — uses only your uploaded photos. Batch size is capped to your upload count.
                  </p>
                  {uploadsOnly && uploadCount === 0 && (
                    <p className="text-xs text-destructive">Upload at least one photo to enable this mode.</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
                <Checkbox
                  id="force-fresh"
                  checked={forceFresh}
                  onCheckedChange={(checked) => setForceFresh(checked === true)}
                  disabled={uploadsOnly}
                />
                <div className="space-y-1">
                  <label htmlFor="force-fresh" className="text-sm font-medium leading-none cursor-pointer">
                    Force fresh AI images
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Skips the cache and asks Gemini for brand new images (costs Gemini quota). New images are still saved to the cache for next time.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Focus on a service
                {uploadsOnly && (
                  <span className="ml-2 normal-case text-muted-foreground/70">
                    (disabled in uploads-only mode — service is driven by the uploaded photo)
                  </span>
                )}
              </p>
              <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                <div className="flex flex-nowrap gap-2 sm:flex-wrap">
                  {SERVICE_OPTIONS.map((s) => {
                    const selected = service === s.value;
                    return (
                      <button
                        key={s.value}
                        onClick={() => setService(s.value)}
                        disabled={uploadsOnly}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          selected
                            ? "border-transparent text-primary-foreground shadow-sm"
                            : "border-border bg-background hover:bg-muted text-foreground"
                        } ${uploadsOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                        style={selected ? { background: "var(--gradient-hero)" } : undefined}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Ad angles / variants
              </p>
              <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                <div className="flex flex-nowrap gap-2 sm:flex-wrap">
                  {ANGLE_OPTIONS.map((a) => {
                    const active = angles.includes(a.key);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() =>
                          setAngles((prev) =>
                            active ? prev.filter((k) => k !== a.key) : [...prev, a.key],
                          )
                        }
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          active
                            ? "border-transparent text-primary-foreground shadow-sm"
                            : "border-border bg-background hover:bg-muted text-foreground"
                        }`}
                        style={active ? { background: "var(--gradient-hero)" } : undefined}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {angles.length === 0 && (
                <p className="text-xs text-destructive mt-2">Select at least one angle.</p>
              )}
            </div>

            <div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Copy temperature
                </p>
                <span className="text-xs text-muted-foreground">
                  {copyTemperatureLabel(copyTemperature)} · {copyTemperature}/100
                </span>
              </div>
              <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {COPY_TEMPERATURE_PRESETS.map((preset) => {
                    const selected = copyTemperature === preset.value;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCopyTemperature(preset.value)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          selected
                            ? "border-transparent text-primary-foreground shadow-sm"
                            : "border-border bg-background hover:bg-muted text-foreground"
                        }`}
                        style={selected ? { background: "var(--gradient-hero)" } : undefined}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <Slider
                  value={[copyTemperature]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => setCopyTemperature(clampCopyTemperature(v[0] ?? COPY_TEMPERATURE_DEFAULT))}
                  aria-label="Copy temperature"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sets the tone for headlines, body copy, and AI-generated images. Example at this level:{" "}
                  <span className="text-foreground/90 italic">{copyTemperatureExample(copyTemperature)}</span>
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Seasonal / holiday angle
              </p>
              <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                <div className="flex flex-nowrap gap-2 sm:flex-wrap">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
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
          </div>
        </Card>
      </section>

      {/* Results */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {mut.isPending && ads.length === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: effectiveCount || count }).map((_, i) => (
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
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {ads.map((ad, i) => (
              <AdCard
                key={i}
                ad={ad}
                index={i}
                onSaveCopy={handleAdSaveCopy}
                onRateMatch={handleRateMatch}
                onRegenerateImage={handleRegenerateImage}
                regenerating={regeneratingIndex === i}
              />
            ))}
          </div>
        )}

        {ads.length === 0 && !mut.isPending && (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-40" />
            <p>Click <strong>Generate ads</strong> to create your first batch.</p>
          </div>
        )}
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground space-y-2">
        <p>
          Built for{" "}
          <a className="font-medium hover:underline" href="https://www.westcoastcleaners.capetown" target="_blank" rel="noreferrer">
            West Coast Cleaners
          </a>{" "}
          · Cape Town
        </p>
        <p>
          <a
            className="font-medium hover:underline"
            href={`${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/help.txt`}
            target="_blank"
            rel="noreferrer"
          >
            Help guide
          </a>
          {" "}
          — what each feature does and how to use it
        </p>
      </footer>
    </div>
  );
}
