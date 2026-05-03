// utils/photoLabUtils.ts

export type Area = {
  width:  number;
  height: number;
  x:      number;
  y:      number;
};

export type Adjustments = {
  brightness:    number;  // 50–150,  default 100
  contrast:      number;  // 50–150,  default 100
  exposure:      number;  // -50–50,  default 0
  saturation:    number;  // 0–200,   default 100
  skinSmoothing: number;  // 0–100,   default 0
};

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness:    100,
  contrast:      100,
  exposure:      0,
  saturation:    100,
  skinSmoothing: 0,
};

// ── Passport sizes at 300 DPI ─────────────────────────────────
export const PASSPORT_SIZES = {
  IN_UO: { width: 330, height: 424, label: "India (28×36mm)"  },
  IN:            { width: 413, height: 531, label: "India (35×45mm)"  },
  US:            { width: 600, height: 600, label: "US (2×2 in)"      },
  UK:            { width: 413, height: 531, label: "UK (35×45mm)"     },
  EU:            { width: 413, height: 531, label: "EU (35×45mm)"     },
} as const;

export type PassportRegion = keyof typeof PASSPORT_SIZES;

// ── Sheet sizes ───────────────────────────────────────────────
export const SHEET_SIZES = {
  A4:     { widthMm: 210, heightMm: 297, label: "A4 (210×297mm)"    },
  A5:     { widthMm: 148, heightMm: 210, label: "A5 (148×210mm)"    },
  LETTER: { widthMm: 216, heightMm: 279, label: "Letter (8.5×11in)" },
} as const;

export type SheetSize = keyof typeof SHEET_SIZES;

const DPI      = 300;
const MM_TO_PX = DPI / 25.4;
const PX_TO_MM = 25.4 / DPI;

// ── CSS filter (live preview) ─────────────────────────────────
export function toFilterString(adj: Adjustments): string {
  const brightness = adj.brightness + adj.exposure;
  return `brightness(${brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;
}

// ── Skin smoothing ────────────────────────────────────────────
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if      (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else                h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function isSkin(r: number, g: number, b: number): boolean {
  const [h, s, l] = rgbToHsl(r, g, b);
  return h >= 0 && h <= 50 && s >= 0.10 && s <= 0.90 && l >= 0.20 && l <= 0.90 && r > 60 && r > b;
}

function boxBlurChannel(
  src: Uint8ClampedArray, dst: Uint8ClampedArray,
  w: number, h: number, ch: number, radius: number
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(Math.max(x + dx, 0), w - 1);
          const ny = Math.min(Math.max(y + dy, 0), h - 1);
          sum += src[(ny * w + nx) * 4 + ch];
          count++;
        }
      }
      dst[(y * w + x) * 4 + ch] = sum / count;
    }
  }
}

function applySkinSmoothing(data: Uint8ClampedArray, w: number, h: number, strength: number): void {
  if (strength <= 0) return;
  const radius = Math.max(1, Math.round(strength / 33));
  const blend  = strength / 100;
  const blurred = new Uint8ClampedArray(data);
  for (const ch of [0, 1, 2]) boxBlurChannel(data, blurred, w, h, ch, radius);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (isSkin(r, g, b)) {
      data[i]     = r + (blurred[i]     - r) * blend;
      data[i + 1] = g + (blurred[i + 1] - g) * blend;
      data[i + 2] = b + (blurred[i + 2] - b) * blend;
    }
  }
}

// ── Step 1: Crop + adjustments ────────────────────────────────
export async function getCroppedImg(
  imageSrc:    string,
  pixelCrop:   Area,
  region:      PassportRegion = "IN",
  adjustments?: Adjustments,
  outputFormat: "image/png" | "image/jpeg" = "image/jpeg",
  jpegQuality = 0.95,
): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Failed to load image"));
    img.src = imageSrc;
  });

  const { width: outW, height: outH } = PASSPORT_SIZES[region];
  const canvas = document.createElement("canvas");
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  if (adjustments) ctx.filter = toFilterString(adjustments);
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, outW, outH);
  ctx.filter = "none";

  const smoothing = adjustments?.skinSmoothing ?? 0;
  if (smoothing > 0) {
    const imgData = ctx.getImageData(0, 0, outW, outH);
    applySkinSmoothing(imgData.data, outW, outH, smoothing);
    ctx.putImageData(imgData, 0, 0);
  }

  return toBlob(canvas, outputFormat, jpegQuality);
}

// ── Step 2: Remove background (FastAPI) ──────────────────────
const REMOVE_BG_URL = "http://localhost:8000/photolab/remove-bg/";

export async function removeBackground(blob: Blob): Promise<Blob> {
  const form = new FormData();
  form.append("file", blob, "photo.png");
  const res = await fetch(REMOVE_BG_URL, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Remove BG failed (${res.status}): ${text}`);
  }
  return res.blob();
}

// ── Step 3: Add solid background ─────────────────────────────
export async function addSolidBackground(
  noBgBlob: Blob,
  hexColor: string,
  outputFormat: "image/jpeg" | "image/png" = "image/jpeg",
  jpegQuality = 0.97,
): Promise<Blob> {
  const img = await loadBlob(noBgBlob);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return toBlob(canvas, outputFormat, jpegQuality);
}

// ── Step 4: Add border ────────────────────────────────────────
export async function addBorderToImage(
  inputBlob:    Blob,
  borderPx:     number,
  color:        string,
  outputFormat: "image/jpeg" | "image/png" = "image/jpeg",
  jpegQuality  = 0.97,
): Promise<Blob> {
  const img = await loadBlob(inputBlob);
  const canvas = document.createElement("canvas");
  canvas.width  = img.naturalWidth  + 2 * borderPx;
  canvas.height = img.naturalHeight + 2 * borderPx;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, borderPx, borderPx);
  return toBlob(canvas, outputFormat, jpegQuality);
}

// ── Step 5: Layout on sheet (PDF via jsPDF) ───────────────────
// Returns a PDF Blob — NOT renderable in <img>. Use blobToDataURL
// for download only; show a canvas-rendered JPEG preview separately.
export async function layoutOnSheetPDF(
  photoBlob: Blob,
  region:    PassportRegion,
  sheetSize: SheetSize = "A4",
): Promise<{ pdfBlob: Blob; previewBlob: Blob; copies: number }> {
  const { jsPDF } = await import("jspdf");

  const { widthMm, heightMm } = SHEET_SIZES[sheetSize];
  const { width: photoWpx, height: photoHpx } = PASSPORT_SIZES[region];
  const photoWmm = photoWpx * PX_TO_MM;
  const photoHmm = photoHpx * PX_TO_MM;

  const margin = 10; // mm
  const gap    = 1;  // mm

  const cols   = Math.floor((widthMm  - 2 * margin + gap) / (photoWmm + gap));
  const rows   = Math.floor((heightMm - 2 * margin + gap) / (photoHmm + gap));
  const copies = cols * rows;

  const totalW  = cols * photoWmm + (cols - 1) * gap;
  const totalH  = rows * photoHmm + (rows - 1) * gap;
  const startX  = (widthMm  - totalW) / 2;
  const startY  = (heightMm - totalH) / 2;

  const imgData = await blobToDataURL(photoBlob);
  const isTransparent = photoBlob.type === "image/png";

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [widthMm, heightMm] });

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (photoWmm + gap);
      const y = startY + row * (photoHmm + gap);
      pdf.addImage(imgData, isTransparent ? "PNG" : "JPEG", x, y, photoWmm, photoHmm);
    }
  }

  const pdfBlob = pdf.output("blob");

  // Canvas preview (JPEG) — renderable in <img>
  const sheetWpx = Math.round(widthMm  * MM_TO_PX);
  const sheetHpx = Math.round(heightMm * MM_TO_PX);
  const canvas   = document.createElement("canvas");
  canvas.width   = sheetWpx;
  canvas.height  = sheetHpx;
  const ctx      = canvas.getContext("2d")!;
  ctx.fillStyle  = "#FFFFFF";
  ctx.fillRect(0, 0, sheetWpx, sheetHpx);
  const photoImg = await loadBlob(photoBlob);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = Math.round((startX + col * (photoWmm + gap)) * MM_TO_PX);
      const y = Math.round((startY + row * (photoHmm + gap)) * MM_TO_PX);
      ctx.drawImage(photoImg, x, y, photoWpx, photoHpx);
    }
  }
  const previewBlob = await toBlob(canvas, "image/jpeg", 0.90);

  return { pdfBlob, previewBlob, copies };
}

// ── Helpers ───────────────────────────────────────────────────
async function loadBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  const img  = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload  = () => res();
    img.onerror = () => rej(new Error("Failed to load image"));
    img.src = url;
  });
  URL.revokeObjectURL(url);
  return img;
}

function toBlob(
  canvas: HTMLCanvasElement,
  format: "image/jpeg" | "image/png",
  quality: number,
): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob(
      b => (b ? res(b) : rej(new Error("toBlob returned null"))),
      format,
      format === "image/jpeg" ? quality : undefined,
    ),
  );
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}