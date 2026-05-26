import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Split a CTA string into the lead text and the phone segment (everything from
 * the 📞 emoji onwards). Used to render the phone on its own line so the
 * number is never split across two lines.
 */
export function splitCta(cta: string): { lead: string; phone: string | null } {
  if (!cta) return { lead: "", phone: null };
  const idx = cta.indexOf("📞");
  if (idx === -1) return { lead: cta.trim(), phone: null };
  return {
    lead: cta.slice(0, idx).trim(),
    phone: cta.slice(idx).trim(),
  };
}
