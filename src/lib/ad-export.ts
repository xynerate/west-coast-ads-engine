import { splitCta } from "@/lib/utils";

export type ExportableAd = {
  headline: string;
  body: string;
  cta: string;
  hashtags: string;
  imageUrl: string | null;
};

const CANVAS_WIDTH = 1080;
const IMAGE_SIZE = 1080;
const MAX_HEIGHT = 1700;
const FONT_STACK = '"Inter", "Helvetica Neue", Arial, sans-serif';
const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const withBase = (p: string) => (p.startsWith("/") ? `${BASE}${p}` : p);
const LOGO_SOURCES = ["/brand/logo.svg", "/brand/logo.png"].map(withBase);
const TAGLINE_SOURCES = ["/brand/tagline.svg", "/brand/tagline.png", "/brand/liwci.svg"].map(withBase);

async function loadImage(srcs: string[]): Promise<HTMLImageElement | null> {
  for (const src of srcs) {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const candidate = new Image();
      candidate.crossOrigin = "anonymous";
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => resolve(null);
      candidate.src = src;
    });
    if (img) return img;
  }
  console.warn(`Unable to load image from: ${srcs.join(", ")}`);
  return null;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
) {
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, x, y, w, h);
  return { w, h };
}

function drawTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineHeight: number,
  maxY = Infinity,
  options: { noWrap?: boolean } = {},
) {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  let cursorY = y;

  for (const paragraph of paragraphs) {
    if (options.noWrap) {
      if (cursorY + lineHeight > maxY) return cursorY;
      ctx.fillText(paragraph, x, cursorY);
      cursorY += lineHeight + Math.round(lineHeight * 0.35);
      continue;
    }

    const words = paragraph.split(/\s+/);
    let line = "";

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        if (cursorY + lineHeight > maxY) return cursorY;
        ctx.fillText(line, x, cursorY);
        cursorY += lineHeight;
        line = word;
      } else {
        line = test;
      }
    }

    if (line) {
      if (cursorY + lineHeight > maxY) return cursorY;
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }
    cursorY += Math.round(lineHeight * 0.35);
  }

  return cursorY;
}

function measureTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  lineHeight: number,
  options: { noWrap?: boolean } = {},
) {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  let height = 0;

  for (const paragraph of paragraphs) {
    if (options.noWrap) {
      height += lineHeight + Math.round(lineHeight * 0.35);
      continue;
    }

    const words = paragraph.split(/\s+/);
    let line = "";

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        height += lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) height += lineHeight;
    height += Math.round(lineHeight * 0.35);
  }

  return height;
}

async function composeBrandedImage(adImage: HTMLImageElement): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create image canvas");

  drawCover(ctx, adImage, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

  const [logo, tagline] = await Promise.all([loadImage(LOGO_SOURCES), loadImage(TAGLINE_SOURCES)]);
  const pad = Math.round(IMAGE_SIZE * 0.03);

  if (logo) {
    drawContain(ctx, logo, pad, pad, IMAGE_SIZE * 0.14, IMAGE_SIZE * 0.14);
  }

  if (tagline) {
    const maxW = IMAGE_SIZE * 0.32;
    const maxH = IMAGE_SIZE * 0.12;
    const scale = Math.min(maxW / tagline.naturalWidth, maxH / tagline.naturalHeight);
    const w = tagline.naturalWidth * scale;
    const h = tagline.naturalHeight * scale;
    const x = IMAGE_SIZE - pad - w;
    const y = IMAGE_SIZE - pad - h;
    const bgPad = Math.round(IMAGE_SIZE * 0.012);
    const radius = Math.round(IMAGE_SIZE * 0.01);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(x - bgPad, y - bgPad, w + bgPad * 2, h + bgPad * 2, radius);
    ctx.fill();
    ctx.drawImage(tagline, x, y, w, h);
  }

  return canvas;
}

function composeAdPost(brandedImage: HTMLCanvasElement, ad: ExportableAd): HTMLCanvasElement {
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("Could not create text canvas");

  const padX = 64;
  const textW = CANVAS_WIDTH - padX * 2;
  measureCtx.font = `700 52px ${FONT_STACK}`;
  const headlineH = measureTextLines(measureCtx, ad.headline, textW, 60);
  measureCtx.font = `400 30px ${FONT_STACK}`;
  const bodyH = measureTextLines(measureCtx, ad.body, textW, 40);
  measureCtx.font = `600 32px ${FONT_STACK}`;
  const cta = splitCta(ad.cta);
  const ctaLeadH = cta.lead ? measureTextLines(measureCtx, cta.lead, textW, 42) : 0;
  const ctaPhoneH = cta.phone ? measureTextLines(measureCtx, cta.phone, textW, 42, { noWrap: true }) : 0;
  const ctaH = ctaLeadH + ctaPhoneH;
  measureCtx.font = `400 24px ${FONT_STACK}`;
  const hashtagH = measureTextLines(measureCtx, ad.hashtags, textW, 32);

  const textHeight = Math.min(620, 56 + headlineH + bodyH + ctaH + hashtagH + 70);
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = Math.min(MAX_HEIGHT, IMAGE_SIZE + textHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(brandedImage, 0, 0, CANVAS_WIDTH, IMAGE_SIZE);

  let y = IMAGE_SIZE + 64;
  const maxY = canvas.height - 40;

  ctx.fillStyle = "#e91e63";
  ctx.font = `700 52px ${FONT_STACK}`;
  y = drawTextLines(ctx, ad.headline, padX, y, textW, 60, maxY);

  y += 10;
  ctx.fillStyle = "#333333";
  ctx.font = `400 30px ${FONT_STACK}`;
  y = drawTextLines(ctx, ad.body, padX, y, textW, 40, maxY);

  y += 8;
  ctx.fillStyle = "#333333";
  ctx.font = `600 32px ${FONT_STACK}`;
  if (cta.lead) {
    y = drawTextLines(ctx, cta.lead, padX, y, textW, 42, maxY);
  }
  if (cta.phone) {
    y = drawTextLines(ctx, cta.phone, padX, y, textW, 42, maxY, { noWrap: true });
  }

  y += 10;
  ctx.fillStyle = "#777777";
  ctx.font = `400 24px ${FONT_STACK}`;
  drawTextLines(ctx, ad.hashtags, padX, y, textW, 32, maxY);

  return canvas;
}

export async function downloadAdAsPng(ad: ExportableAd, index: number): Promise<void> {
  if (!ad.imageUrl) throw new Error("This ad does not have an image to export.");

  const adImage = await loadImage([ad.imageUrl]);
  if (!adImage) throw new Error("Could not load the ad image for export.");

  const brandedImage = await composeBrandedImage(adImage);
  const post = composeAdPost(brandedImage, ad);

  const blob = await new Promise<Blob | null>((resolve) => post.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create the final PNG.");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wcc-ad-${index + 1}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
