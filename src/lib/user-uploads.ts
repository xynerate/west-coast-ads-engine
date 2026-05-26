import { supabase } from "@/integrations/supabase/client";
import type { CustomImageCatalogItem, ServiceKey } from "@/data/custom-ad-images";

const BUCKET = "user-ad-images";
const MAX_BYTES = 8 * 1024 * 1024;

export const UPLOAD_SERVICE_OPTIONS: { key: ServiceKey; label: string }[] = [
  { key: "loose-rug", label: "Loose rug" },
  { key: "fitted-carpet", label: "Fitted carpet" },
  { key: "upholstery", label: "Upholstery" },
  { key: "mattress", label: "Mattress" },
  { key: "home", label: "Home cleaning" },
  { key: "office", label: "Office cleaning" },
];

const SERVICE_LABELS = Object.fromEntries(
  UPLOAD_SERVICE_OPTIONS.map((o) => [o.key, o.label]),
) as Record<ServiceKey, string>;

function serviceFromPath(path: string): ServiceKey | null {
  const key = path.split("/")[0] as ServiceKey;
  return UPLOAD_SERVICE_OPTIONS.some((o) => o.key === key) ? key : null;
}

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) return fromName;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export function catalogIdForPath(path: string): string {
  return `user-${path.replace(/\//g, "-").replace(/\.[^.]+$/, "")}`;
}

function toCatalogItem(path: string, service: ServiceKey): CustomImageCatalogItem {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const label = SERVICE_LABELS[service] ?? service;
  return {
    id: catalogIdForPath(path),
    path,
    url: data.publicUrl,
    services: [service],
    type: "result",
    subject: `Owner-uploaded ${label} job photo`,
    copyAngle: "Real West Coast Cleaners job — reference the visible work in this photo, friendly local angle",
    tags: ["user-upload", service],
  };
}

export async function uploadUserImage(file: File, service: ServiceKey): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, or WebP).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 8 MB or smaller.");
  }

  const ext = extFromFile(file);
  const path = `${service}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function listUserImages(): Promise<CustomImageCatalogItem[]> {
  const items: CustomImageCatalogItem[] = [];

  for (const { key } of UPLOAD_SERVICE_OPTIONS) {
    const { data, error } = await supabase.storage.from(BUCKET).list(key, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      if (error.message.toLowerCase().includes("not found")) continue;
      console.warn(`listUserImages(${key}):`, error.message);
      continue;
    }

    for (const obj of data ?? []) {
      if (!obj.name || obj.name === ".emptyFolderPlaceholder") continue;
      const path = `${key}/${obj.name}`;
      items.push(toCatalogItem(path, key));
    }
  }

  return items;
}

export async function deleteUserImage(path: string): Promise<void> {
  const service = serviceFromPath(path);
  if (!service) throw new Error("Invalid upload path.");
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
