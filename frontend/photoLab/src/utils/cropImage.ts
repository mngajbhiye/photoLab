// utils/cropImage.ts
import jsPDF from "jspdf";

export type Area = {
  width:  number;
  height: number;
  x:      number;
  y:      number;
};

export type Adjustments = {
  brightness:    number;  // 50–150,  default 100 (CSS %)
  contrast:      number;  // 50–150,  default 100 (CSS %)
  exposure:      number;  // -50–50,  default 0   (offset on brightness)
  saturation:    number;  // 0–200,   default 100 (CSS %)
  skinSmoothing: number;  // 0–100,   default 0   (blend strength %)
};

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness:    100,
  contrast:      100,
  exposure:      0,
  saturation:    100,
  skinSmoothing: 0,
};

// Passport output dimensions at 300 DPI
export const PASSPORT_SIZES = {
  IN_UNOFFICIAL: { width: 330,  height: 424,  label: "India (28×36mm)" },
  IN: { width: 413,  height: 531,  label: "India (35×45mm)" },
  US: { width: 600,  height: 600,  label: "US (2×2 in)"     },
  UK: { width: 413,  height: 531,  label: "UK (35×45mm)"    },
  EU: { width: 413,  height: 531,  label: "EU (35×45mm)"    },
} as const;

export type PassportRegion = keyof typeof PASSPORT_SIZES;

/** CSS filter string for color adjustments — used for live preview too */
export function toFilterString(adj: Adjustments): string {
  const brightness = adj.brightness + adj.exposure;
  return [
    `brightness(${brightness}%)`,
    `contrast(${adj.contrast}%)`,
    `saturate(${adj.saturation}%)`,
  ].join(" ");
}

// ── Skin smoothing helpers ─────────────────────────────────────

/** Convert an RGB pixel to HSL (h: 0-360, s: 0-1, l: 0-1) */
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

/**
 * Returns true if an RGB pixel is likely human skin.
 * Skin spans hue 0–50° (warm reds/oranges/yellows), moderate saturation,
 * and mid-to-high lightness. Works across a wide range of skin tones.
 */
function isSkin(r: number, g: number, b: number): boolean {
  const [h, s, l] = rgbToHsl(r, g, b);
  return (
    h >= 0 && h <= 50 &&
    s >= 0.10 && s <= 0.90 &&
    l >= 0.20 && l <= 0.90 &&
    r > 60 && r > b          // red channel dominates in skin
  );
}

/**
 * Box-blur a single channel of pixel data in-place.
 * Radius 1 = 3×3 kernel, radius 2 = 5×5, etc.
 */
function boxBlurChannel(
  src:    Uint8ClampedArray,
  dst:    Uint8ClampedArray,
  w:      number,
  h:      number,
  ch:     number,   // channel offset: 0=R, 1=G, 2=B
  radius: number
): void {
  const stride = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(Math.max(x + dx, 0), w - 1);
          const ny = Math.min(Math.max(y + dy, 0), h - 1);
          sum += src[(ny * w + nx) * stride + ch];
          count++;
        }
      }
      dst[(y * w + x) * stride + ch] = sum / count;
    }
  }
}

/**
 * Apply selective skin smoothing to canvas pixel data.
 * @param data   - ImageData.data (Uint8ClampedArray, modified in-place)
 * @param width  - canvas width in pixels
 * @param height - canvas height in pixels
 * @param strength - 0 (no effect) to 100 (full blur)
 */
function applySkinSmoothing(
  data:     Uint8ClampedArray,
  width:    number,
  height:   number,
  strength: number
): void {
  if (strength <= 0) return;

  // Blur radius scales with strength: strength 100 → radius 3 (≈ 7×7 kernel)
  const radius  = Math.max(1, Math.round(strength / 33));
  const blend   = strength / 100; // 0.0 – 1.0

  // Blur into a copy
  const blurred = new Uint8ClampedArray(data);
  for (const ch of [0, 1, 2]) {
    boxBlurChannel(data, blurred, width, height, ch, radius);
  }

  // Selectively blend blurred pixels back only on skin pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (isSkin(r, g, b)) {
      data[i]     = r     + (blurred[i]     - r)     * blend;
      data[i + 1] = g     + (blurred[i + 1] - g)     * blend;
      data[i + 2] = b     + (blurred[i + 2] - b)     * blend;
    }
    // alpha (data[i+3]) is never touched
  }
}

// ── Main export ────────────────────────────────────────────────

/**
 * Crops the image, applies colour adjustments + skin smoothing,
 * and returns a Blob at the correct passport output size.
 */
export async function getCroppedImg(
  imageSrc:     string,
  pixelCrop:    Area,
  region:       PassportRegion = "IN",
  adjustments?: Adjustments,
  outputFormat: "image/png" | "image/jpeg" = "image/jpeg",
  jpegQuality  = 0.95
): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload  = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });

  const { width: outputWidth, height: outputHeight } = PASSPORT_SIZES[region];

  const canvas = document.createElement("canvas");
  canvas.width  = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Failed to get canvas 2D context");

  // 1. Draw with colour adjustments baked in via ctx.filter
  if (adjustments) ctx.filter = toFilterString(adjustments);
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, outputWidth, outputHeight);
  ctx.filter = "none";

  // 2. Apply skin smoothing via pixel manipulation
  const smoothing = adjustments?.skinSmoothing ?? 0;
  if (smoothing > 0) {
    const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
    applySkinSmoothing(imageData.data, outputWidth, outputHeight, smoothing);
    ctx.putImageData(imageData, 0, 0);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      outputFormat,
      outputFormat === "image/jpeg" ? jpegQuality : undefined
    );
  });
}

/** Convenience: Blob → dataURL for img src preview */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Background removal ─────────────────────────────────────────

const REMOVE_BG_URL = "http://localhost:8000/photolab/remove-bg/";

/**
 * Sends a Blob to the FastAPI /photolab/remove-bg/ endpoint.
 * Returns a PNG Blob with the background removed (transparent).
 *
 * The endpoint expects:  POST multipart/form-data  field: "file"
 * The endpoint returns:  image/png  (StreamingResponse)
 */
export async function removeBackground(blob: Blob): Promise<Blob> {
  const form = new FormData();
  // Field name must match FastAPI param: file: UploadFile = File(...)
  form.append("file", blob, "photo.png");

  const res = await fetch(REMOVE_BG_URL, {
    method: "POST",
    body:   form,
    // No Content-Type header — browser sets it with the correct boundary automatically
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Remove BG failed (${res.status}): ${text}`);
  }

  return res.blob(); // PNG blob, transparent background
}

// ── Solid background fill ──────────────────────────────────────

/**
 * Composites a transparent PNG (bg-removed) over a solid colour.
 * Returns a JPEG Blob ready for download or further processing.
 *
 * @param noBgBlob  - PNG Blob with transparent background (from removeBackground)
 * @param hexColor  - Solid fill colour, e.g. "#FFFFFF"
 */
export async function addSolidBackground(
  noBgBlob: Blob,
  hexColor: string,
  outputFormat: "image/jpeg" | "image/png" = "image/jpeg",
  jpegQuality = 0.97
): Promise<Blob> {
  const url = URL.createObjectURL(noBgBlob);
  const img  = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload  = () => resolve();
    img.onerror = () => reject(new Error("Failed to load bg-removed image"));
    img.src = url;
  });

  URL.revokeObjectURL(url);

  const canvas = document.createElement("canvas");
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  // 1. Fill solid colour first (bottom layer)
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw transparent PNG on top — browser composites correctly
  ctx.drawImage(img, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
      outputFormat,
      outputFormat === "image/jpeg" ? jpegQuality : undefined
    );
  });
}

// ── A4 / print sheet layout ───────────────────────────────────

export const SHEET_SIZES = {
  A4:     { widthMm: 210, heightMm: 297, label: "A4 (210×297mm)"   },
  A5:     { widthMm: 148, heightMm: 210, label: "A5 (148×210mm)"   },
  LETTER: { widthMm: 216, heightMm: 279, label: "Letter (8.5×11in)" },
} as const;

export type SheetSize = keyof typeof SHEET_SIZES;

const DPI       = 300;
const MM_TO_PX = DPI / 25.4;   // 1mm at 300 DPI
const PX_TO_MM = 25.4 / 300;


/**
 * Tiles copies of a passport photo onto a print-size sheet at 300 DPI.
 * Leaves a 10mm margin on all sides, 3mm gap between photos.
 *
 * @param photoBlob  - The final passport photo (cropped + adjusted + bg applied)
 * @param region     - Passport size (determines photo pixel dimensions)
 * @param sheetSize  - Target paper size key
 * @returns JPEG Blob of the tiled sheet, ready to print
 */

export async function layoutOnSheetPDF(
  photoBlob: Blob,
  region: PassportRegion,
  sheetSize: SheetSize = "A4"
): Promise<{ blob: Blob; copies: number }> {

  const { widthMm, heightMm } = SHEET_SIZES[sheetSize];
  const { width: photoWpx, height: photoHpx } = PASSPORT_SIZES[region];

  // Convert px → mm (based on 300 DPI)
  const photoWmm = photoWpx * PX_TO_MM;
  const photoHmm = photoHpx * PX_TO_MM;

  const margin = 10; // mm
  const gap    = 3;  // mm

  const cols = Math.floor((widthMm - 2 * margin + gap) / (photoWmm + gap));
  const rows = Math.floor((heightMm - 2 * margin + gap) / (photoHmm + gap));
  const copies = cols * rows;

  // Create PDF (IMPORTANT: unit = mm)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [widthMm, heightMm],
  });

  // Convert Blob → base64
  const imgData = await blobToDataURL(photoBlob);

  // Center grid
  const totalW = cols * photoWmm + (cols - 1) * gap;
  const totalH = rows * photoHmm + (rows - 1) * gap;

  const startX = (widthMm - totalW) / 2;
  const startY = (heightMm - totalH) / 2;

  // Draw images 
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {

      const x = startX + col * (photoWmm + gap);
      const y = startY + row * (photoHmm + gap);

      pdf.addImage(
        imgData,
        "JPEG",  // or "PNG" if transparent
        x,
        y,
        photoWmm,
        photoHmm
      );
    }
  }

  // Export as Blob
  const blob = pdf.output("blob");

  return { blob, copies };
}
