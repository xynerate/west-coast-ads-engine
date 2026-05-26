import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { ServiceKey } from "@/data/custom-ad-images";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  catalogIdForPath,
  listUserImages,
  UPLOAD_SERVICE_OPTIONS,
  uploadUserImage,
} from "@/lib/user-uploads";

type UserUploadCardProps = {
  lastGeneratedAt?: number | null;
  onUploaded?: (id: string) => void;
};

export function UserUploadCard({ lastGeneratedAt, onUploaded }: UserUploadCardProps = {}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [service, setService] = useState<ServiceKey>("loose-rug");
  const [file, setFile] = useState<File | null>(null);
  const [justUploadedCount, setJustUploadedCount] = useState(0);

  const uploadsQuery = useQuery({
    queryKey: ["user-uploads"],
    queryFn: listUserImages,
  });

  useEffect(() => {
    if (lastGeneratedAt) {
      setJustUploadedCount(0);
    }
  }, [lastGeneratedAt]);

  const uploadMut = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose an image first.");
      return uploadUserImage(file, service);
    },
    onSuccess: (path) => {
      queryClient.invalidateQueries({ queryKey: ["user-uploads"] });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setJustUploadedCount((c) => c + 1);
      onUploaded?.(catalogIdForPath(path));
      toast.success("Image uploaded successfully — it will be used in your next batch of generated ads.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploads = uploadsQuery.data ?? [];
  const uploadCount = uploads.length;

  return (
    <Card className="p-5 md:p-6 shadow-[var(--shadow-soft)] border border-border/60">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2 shrink-0">
          <ImagePlus className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">Your photos</h3>
          <p className="text-sm text-muted-foreground">
            Upload job photos by service — they mix into ad generation alongside built-in images.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sm:flex-1"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Select value={service} onValueChange={(v) => setService(v as ServiceKey)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            {UPLOAD_SERVICE_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={() => uploadMut.mutate()}
          disabled={!file || uploadMut.isPending}
          className="sm:w-auto"
        >
          {uploadMut.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" /> Upload photo
            </>
          )}
        </Button>
      </div>

      {uploadsQuery.isLoading && (
        <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking your uploads…
        </p>
      )}
      {uploadsQuery.isError && (
        <p className="text-sm text-destructive mt-4">
          Could not load uploads. Create the <code className="text-xs">user-ad-images</code> bucket in Supabase Storage first.
        </p>
      )}
      {!uploadsQuery.isLoading && !uploadsQuery.isError && justUploadedCount > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <Check className="w-4 h-4 shrink-0" />
          <span>
            {justUploadedCount} new photo{justUploadedCount === 1 ? "" : "s"} uploaded — ready for your next batch.
          </span>
        </div>
      )}
      {!uploadsQuery.isLoading && !uploadsQuery.isError && uploadCount === 0 && justUploadedCount === 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          No uploads yet. Add rug, carpet, or cleaning job photos to mix into generated ads.
        </p>
      )}
    </Card>
  );
}
