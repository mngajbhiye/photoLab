// components/photoStudio.tsx

import React, { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import {
  getCroppedImg,
  blobToDataURL,
  removeBackground,
  addSolidBackground,
  addBorderToImage,
  layoutOnSheetPDF,
  toFilterString,
  PASSPORT_SIZES,
  SHEET_SIZES,
  DEFAULT_ADJUSTMENTS,
  type Area,
  type PassportRegion,
  type SheetSize,
  type Adjustments,
} from "../utils/photoLabUtils";
import "./photoStudio.css";

// ── Slider config ─────────────────────────────────────────────
const SLIDERS: {
  key: keyof Adjustments;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  format: (v: number) => string;
  skin?: true;
}[] = [
  {
    key: "brightness",
    label: "Brightness",
    min: 50,
    max: 150,
    step: 1,
    default: 100,
    format: (v) => `${v}%`,
  },
  {
    key: "contrast",
    label: "Contrast",
    min: 50,
    max: 150,
    step: 1,
    default: 100,
    format: (v) => `${v}%`,
  },
  {
    key: "exposure",
    label: "Exposure",
    min: -50,
    max: 50,
    step: 1,
    default: 0,
    format: (v) => (v > 0 ? `+${v}` : `${v}`),
  },
  {
    key: "saturation",
    label: "Saturation",
    min: 0,
    max: 200,
    step: 1,
    default: 100,
    format: (v) => `${v}%`,
  },
  {
    key: "skinSmoothing",
    label: "Skin Smooth ✦",
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    format: (v) => (v === 0 ? "off" : `${v}%`),
    skin: true,
  },
];

const PRESET_COLORS = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#F0F4FF", label: "Off-white" },
  { hex: "#C8D8F0", label: "Light blue" },
  { hex: "#E8F5E9", label: "Sage green" },
  { hex: "#F5F5DC", label: "Cream" },
];

// ── Pipeline state ────────────────────────────────────────────
type Pipeline = {
  croppedBlob: Blob | null;
  noBgBlob: Blob | null; // null = bg not removed
  bgColor: string | null; // null = no solid colour
  bgBlob: Blob | null;
  borderPx: number; // 0 = no border
  borderBlob: Blob | null;
  displayBlob: Blob | null;
  displayURL: string | null;
};

const EMPTY_PIPELINE: Pipeline = {
  croppedBlob: null,
  noBgBlob: null,
  bgColor: null,
  bgBlob: null,
  borderPx: 0,
  borderBlob: null,
  displayBlob: null,
  displayURL: null,
};

// ─────────────────────────────────────────────────────────────

const photoStudio: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [pipe, setPipe] = useState<Pipeline>(EMPTY_PIPELINE);
  const [adjustments, setAdj0] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [borderSize, setBorderSize] = useState(4);
  const [region, setRegion] = useState<PassportRegion>("IN");
  const [sheetSize, setSheetSize] = useState<SheetSize>("A4");

  const [busy, setBusy] = useState<
    | "idle"
    | "cropping"
    | "removingBg"
    | "applyingBg"
    | "applyingBorder"
    | "layouting"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [sheetPreview, setSheetPreview] = useState<string | null>(null);
  const [sheetCopies, setSheetCopies] = useState(0);

  const zoomPct = ((zoom - 1) / 2) * 100;
  const isAdjusted = SLIDERS.some((s) => adjustments[s.key] !== s.default);
  const isBusy = busy !== "idle";
  const setAdj = (key: keyof Adjustments, val: number) =>
    setAdj0((prev) => ({ ...prev, [key]: val }));

  // ── Pipeline helpers ──────────────────────────────────────────

  const commitPipe = async (update: Partial<Pipeline>, latestBlob: Blob) => {
    const url = await blobToDataURL(latestBlob);
    setPipe((prev) => ({
      ...prev,
      ...update,
      displayBlob: latestBlob,
      displayURL: url,
    }));
  };

  const resetPipe = () => {
    setPipe(EMPTY_PIPELINE);
    setPdfBlob(null);
    setSheetPreview(null);
    setError(null);
  };

  // Re-applies whichever downstream steps were active before a re-crop.
  // Caller is responsible for setting busy back to idle in its own finally.
  const replayDownstream = async (
    cropped: Blob,
    prev: Pipeline,
  ): Promise<void> => {
    let current = cropped;
    let noBg = null as Blob | null;
    let bg = null as Blob | null;
    let border = null as Blob | null;

    if (prev.noBgBlob !== null) {
      setBusy("removingBg");
      noBg = await removeBackground(current); // throws on failure — propagates to caller
      current = noBg;
    }

    if (prev.bgColor !== null && noBg) {
      setBusy("applyingBg");
      bg = await addSolidBackground(noBg, prev.bgColor);
      current = bg;
    }

    if (prev.borderPx > 0) {
      setBusy("applyingBorder");
      const fmt = !noBg || bg ? "image/jpeg" : "image/png";
      border = await addBorderToImage(current, prev.borderPx, "#000000", fmt);
      current = border;
    }

    await commitPipe(
      {
        croppedBlob: cropped,
        noBgBlob: noBg,
        bgColor: prev.bgColor,
        bgBlob: bg,
        borderPx: prev.borderPx,
        borderBlob: border,
      },
      current,
    );
  };

  // ── Upload ────────────────────────────────────────────────────
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImage(url);
    setFileName(file.name);
    resetPipe();
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAdj0(DEFAULT_ADJUSTMENTS);
    setBorderSize(4);
  };

  const onCropComplete = useCallback((_: Area, px: Area) => {
    setCroppedAreaPixels(px);
  }, []);

  const onRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRegion(e.target.value as PassportRegion);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    resetPipe();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.03 : 0.03), 1), 3));
  };

  // ── Step 1: Crop + effects (+ replay downstream) ──────────────
  const handleApplyEffects = async () => {
    if (!image || !croppedAreaPixels) return;
    setBusy("cropping");
    setError(null);
    setPdfBlob(null);
    setSheetPreview(null);
    const prevPipe = pipe;
    try {
      const cropped = await getCroppedImg(
        image,
        croppedAreaPixels,
        region,
        adjustments,
      );
      if (prevPipe.noBgBlob !== null || prevPipe.borderPx > 0) {
        await replayDownstream(cropped, prevPipe);
      } else {
        await commitPipe(
          {
            croppedBlob: cropped,
            noBgBlob: null,
            bgColor: null,
            bgBlob: null,
            borderPx: 0,
            borderBlob: null,
          },
          cropped,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply effects");
    } finally {
      setBusy("idle"); // always resets, even if replayDownstream threw
    }
  };

  // ── Step 2: Remove background ─────────────────────────────────
  const handleRemoveBg = async () => {
    if (!pipe.croppedBlob) return;
    setBusy("removingBg");
    setError(null);
    setPdfBlob(null);
    setSheetPreview(null);
    try {
      const noBg = await removeBackground(pipe.croppedBlob);
      await commitPipe(
        {
          noBgBlob: noBg,
          bgColor: null,
          bgBlob: null,
          borderPx: 0,
          borderBlob: null,
        },
        noBg,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Background removal failed",
      );
    } finally {
      setBusy("idle");
    }
  };

  // Restore original cropped image (undo bg removal and all downstream)
  const handleRestoreBg = async () => {
    if (!pipe.croppedBlob) return;
    const url = await blobToDataURL(pipe.croppedBlob);
    setPipe((prev) => ({
      ...prev,
      noBgBlob: null,
      bgColor: null,
      bgBlob: null,
      borderPx: 0,
      borderBlob: null,
      displayBlob: pipe.croppedBlob,
      displayURL: url,
    }));
    setPdfBlob(null);
    setSheetPreview(null);
  };

  // ── Step 3: Solid background colour ──────────────────────────
  const handleApplyBgColor = async (hex: string) => {
    if (!pipe.noBgBlob) return;
    setBusy("applyingBg");
    setError(null);
    setPdfBlob(null);
    setSheetPreview(null);
    try {
      const bg = await addSolidBackground(pipe.noBgBlob, hex);
      // If border was active, re-apply it on top of new bg colour
      if (pipe.borderPx > 0) {
        setBusy("applyingBorder");
        const bordered = await addBorderToImage(
          bg,
          pipe.borderPx,
          "#000000",
          "image/jpeg",
        );
        await commitPipe(
          { bgColor: hex, bgBlob: bg, borderBlob: bordered },
          bordered,
        );
      } else {
        await commitPipe({ bgColor: hex, bgBlob: bg, borderBlob: null }, bg);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to apply background colour",
      );
    } finally {
      setBusy("idle");
    }
  };

  const handleClearBgColor = async () => {
    if (!pipe.noBgBlob) return;
    const url = await blobToDataURL(pipe.noBgBlob);
    setPipe((prev) => ({
      ...prev,
      bgColor: null,
      bgBlob: null,
      borderPx: 0,
      borderBlob: null,
      displayBlob: pipe.noBgBlob,
      displayURL: url,
    }));
    setPdfBlob(null);
    setSheetPreview(null);
  };

  // ── Step 4: Border — toggled by checkbox, sized by slider ────
  // Single function handles both enable (px > 0) and disable (px = 0).
  const applyBorder = async (px: number) => {
    const source = pipe.bgBlob ?? pipe.noBgBlob ?? pipe.croppedBlob;
    if (!source) return;
    setPdfBlob(null);
    setSheetPreview(null);

    if (px === 0) {
      // Remove border — roll back to source without border
      const url = await blobToDataURL(source);
      setPipe((prev) => ({
        ...prev,
        borderPx: 0,
        borderBlob: null,
        displayBlob: source,
        displayURL: url,
      }));
      return;
    }

    setBusy("applyingBorder");
    setError(null);
    try {
      const fmt = !pipe.noBgBlob || pipe.bgBlob ? "image/jpeg" : "image/png";
      const bordered = await addBorderToImage(source, px, "#000000", fmt);
      await commitPipe({ borderPx: px, borderBlob: bordered }, bordered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply border");
    } finally {
      setBusy("idle");
    }
  };

  // ── Step 5: Print layout ──────────────────────────────────────
  const handleLayout = async () => {
    if (!pipe.displayBlob) return;
    setBusy("layouting");
    setError(null);
    try {
      const {
        pdfBlob: pdf,
        previewBlob,
        copies,
      } = await layoutOnSheetPDF(pipe.displayBlob, region, sheetSize);
      setPdfBlob(pdf);
      setSheetPreview(await blobToDataURL(previewBlob));
      setSheetCopies(copies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Layout failed");
    } finally {
      setBusy("idle");
    }
  };

  // ── Download ──────────────────────────────────────────────────
  const dl = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived display values ────────────────────────────────────
  const stageLabel = pipe.borderBlob
    ? `Border · ${pipe.borderPx}px`
    : pipe.bgBlob
      ? `Solid BG · ${pipe.bgColor}`
      : pipe.noBgBlob
        ? "Background removed"
        : pipe.croppedBlob
          ? "Effects applied"
          : "";

  // Checkerboard only when transparent (noBg and no solid colour yet)
  const frameBackground =
    pipe.noBgBlob && !pipe.bgBlob
      ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 12px 12px"
      : (pipe.bgColor ?? "var(--sage)");

  const busyLabel =
    busy === "cropping"
      ? "Applying…"
      : busy === "removingBg"
        ? "Removing BG…"
        : busy === "applyingBg"
          ? "Applying BG…"
          : busy === "applyingBorder"
            ? "Bordering…"
            : busy === "layouting"
              ? "Generating…"
              : "Apply effects";

  return (
    <div className="editor-shell" style={{ minHeight: "100vh" }}>
      <div className="editor">
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="editor__header">
          <h1 className="editor__title">Passport Studio</h1>
          <span className="editor__subtitle">Crop · Enhance · Print</span>
        </header>

        {/* ══════════════ Col 1: Controls ══════════════════════ */}
        <div className="editor__controls">
          <div className="controls__scroll">
            {/* Upload */}
            <div className="editor__section">
              <label className="editor__label">Source image</label>
              <div className="upload-zone">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  aria-label="Upload"
                />
                <svg
                  className="upload-zone__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div className="upload-zone__text">
                  <span className="upload-zone__primary">
                    {fileName ?? "Choose or drag & drop"}
                  </span>
                  <span className="upload-zone__secondary">
                    PNG, JPG, WEBP · up to 20 MB
                  </span>
                </div>
              </div>
            </div>

            {/* Passport format */}
            <div className="editor__section">
              <label className="editor__label" htmlFor="region-select">
                Passport format
              </label>
              <select
                id="region-select"
                className="editor__select"
                value={region}
                onChange={onRegionChange}
              >
                {(Object.keys(PASSPORT_SIZES) as PassportRegion[]).map((k) => (
                  <option key={k} value={k}>
                    {PASSPORT_SIZES[k].label}
                  </option>
                ))}
              </select>
            </div>

            {image && (
              <>
                <hr className="editor__divider" />

                {/* Zoom */}
                <div className="editor__section">
                  <div className="adj-label-row">
                    <span className="adj-label">Zoom</span>
                    <span className="adj-value">{zoom.toFixed(2)}×</span>
                  </div>
                  <div className="adj-row">
                    <input
                      type="range"
                      className="adj-slider"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      style={
                        { "--fill-pct": `${zoomPct}%` } as React.CSSProperties
                      }
                      onChange={(e) => setZoom(Number(e.target.value))}
                    />
                  </div>
                </div>

                <hr className="editor__divider" />

                {/* Adjustments */}
                <div className="adj-header">
                  <label className="editor__label">Adjustments</label>
                  {isAdjusted && (
                    <button
                      className="btn-reset"
                      onClick={() => setAdj0(DEFAULT_ADJUSTMENTS)}
                    >
                      Reset all
                    </button>
                  )}
                </div>

                {SLIDERS.map((s) => {
                  const val = adjustments[s.key];
                  const pct = ((val - s.min) / (s.max - s.min)) * 100;
                  return (
                    <React.Fragment key={s.key}>
                      {s.skin && <hr className="skin-divider" />}
                      <div className="editor__section">
                        <div className="adj-label-row">
                          <span
                            className={`adj-label${s.skin ? " adj-label--skin" : ""}`}
                          >
                            {s.label}
                          </span>
                          <span
                            className={`adj-value${val === s.default ? " adj-value--muted" : ""}`}
                          >
                            {s.format(val)}
                          </span>
                        </div>
                        <div className="adj-row">
                          <input
                            type="range"
                            className={`adj-slider${s.skin ? " adj-slider--skin" : ""}`}
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            value={val}
                            style={
                              { "--fill-pct": `${pct}%` } as React.CSSProperties
                            }
                            onChange={(e) =>
                              setAdj(s.key, Number(e.target.value))
                            }
                          />
                        </div>
                        {s.skin && val > 0 && (
                          <span className="adj-note">
                            Applied at crop · skin pixels only
                          </span>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* BG colour — only visible after bg is removed */}
                {pipe.noBgBlob && (
                  <>
                    <hr className="editor__divider" />
                    <div className="editor__section">
                      <div className="adj-header">
                        <label className="editor__label">
                          Background colour
                        </label>
                        {pipe.bgColor && (
                          <button
                            className="btn-reset"
                            onClick={handleClearBgColor}
                          >
                            No BG
                          </button>
                        )}
                      </div>
                      <div className="color-swatches">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            className={`color-swatch${pipe.bgColor === c.hex ? " color-swatch--active" : ""}`}
                            style={{ background: c.hex }}
                            title={c.label}
                            onClick={() => handleApplyBgColor(c.hex)}
                            disabled={isBusy}
                          />
                        ))}
                        <label
                          className="color-swatch color-swatch--custom"
                          title="Custom colour"
                        >
                          <input
                            type="color"
                            value={pipe.bgColor ?? "#ffffff"}
                            onChange={() => {}}
                            onBlur={(e) => handleApplyBgColor(e.target.value)}
                          />
                          <span>+</span>
                        </label>
                      </div>
                      {busy === "applyingBg" && (
                        <span className="adj-note">Compositing…</span>
                      )}
                    </div>
                  </>
                )}

                {/* Border — visible after effects applied.
                  Checkbox toggles on/off. Slider updates thickness live on pointer-up.
                  No separate Apply/Remove buttons needed. */}
                {pipe.croppedBlob && (
                  <>
                    <hr className="editor__divider" />
                    <div className="editor__section">
                      <div className="adj-header">
                        <label className="editor__label">Border</label>
                        {pipe.borderPx > 0 && (
                          <span
                            className="adj-note"
                            style={{ color: "var(--rose)" }}
                          >
                            {pipe.borderPx}px active
                          </span>
                        )}
                      </div>

                      {/* Toggle — applies/removes border immediately */}
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          className="toggle-check"
                          checked={pipe.borderPx > 0}
                          disabled={isBusy}
                          onChange={(e) =>
                            applyBorder(e.target.checked ? borderSize : 0)
                          }
                        />
                        <span className="toggle-label">Enable border</span>
                      </label>

                      {/* Thickness slider — only shown when border is active.
                      Applies on pointer-up so it doesn't fire on every tick. */}
                      {pipe.borderPx > 0 && (
                        <>
                          <div
                            className="adj-label-row"
                            style={{ marginTop: "8px" }}
                          >
                            <span className="adj-label">Thickness</span>
                            <span className="adj-value">{borderSize}px</span>
                          </div>
                          <div className="adj-row">
                            <input
                              type="range"
                              className="adj-slider"
                              min={1}
                              max={30}
                              step={1}
                              value={borderSize}
                              style={
                                {
                                  "--fill-pct": `${((borderSize - 1) / 29) * 100}%`,
                                } as React.CSSProperties
                              }
                              onChange={(e) =>
                                setBorderSize(Number(e.target.value))
                              }
                              onPointerUp={(e) =>
                                applyBorder(
                                  Number((e.target as HTMLInputElement).value),
                                )
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Print layout */}
                {pipe.croppedBlob && (
                  <>
                    <hr className="editor__divider" />
                    <div className="editor__section">
                      <label className="editor__label">Print layout</label>
                      <select
                        className="editor__select"
                        value={sheetSize}
                        onChange={(e) => {
                          setSheetSize(e.target.value as SheetSize);
                          setPdfBlob(null);
                          setSheetPreview(null);
                        }}
                      >
                        {(Object.keys(SHEET_SIZES) as SheetSize[]).map((k) => (
                          <option key={k} value={k}>
                            {SHEET_SIZES[k].label}
                          </option>
                        ))}
                      </select>
                      <button
                        className={`btn btn--outline btn--full${busy === "layouting" ? " btn--loading" : ""}`}
                        onClick={handleLayout}
                        disabled={isBusy}
                        style={{ marginTop: "6px" }}
                      >
                        {busy === "layouting" && (
                          <span className="btn__spinner btn__spinner--dark" />
                        )}
                        {busy === "layouting"
                          ? "Generating…"
                          : "Generate sheet"}
                      </button>
                      {sheetPreview && (
                        <span className="adj-note">
                          {sheetCopies} copies · {SHEET_SIZES[sheetSize].label}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          {/* end controls__scroll */}

          {/* Apply effects pinned at bottom — label reflects current busy state */}
          <div className="controls__footer">
            {error && <p className="editor__error">{error}</p>}
            <button
              className={`btn btn--primary${isBusy ? " btn--loading" : ""}`}
              onClick={handleApplyEffects}
              disabled={isBusy || !image}
            >
              {isBusy && <span className="btn__spinner" />}
              {busyLabel}
            </button>
          </div>
        </div>
        {/* end editor__controls */}

        {/* ══════════════ Col 2: Cropper ═══════════════════════ */}
        <div className="editor__cropper">
          {!image ? (
            <div className="preview-empty">
              <svg
                className="preview-empty__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="preview-empty__text">
                Upload an image to begin
              </span>
            </div>
          ) : (
            <div className="cropper-wrap" onWheel={handleWheel}>
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={
                  PASSPORT_SIZES[region].width / PASSPORT_SIZES[region].height
                }
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                zoomWithScroll={false}
                style={{ mediaStyle: { filter: toFilterString(adjustments) } }}
              />
            </div>
          )}
        </div>

        {/* ══════════════ Col 3: Output ════════════════════════ */}
        <div className="editor__output">
          {!pipe.displayURL ? (
            <div className="preview-empty">
              <svg
                className="preview-empty__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span className="preview-empty__text">
                Apply effects to see result
              </span>
            </div>
          ) : (
            <>
              {/* Photo preview */}
              <div className="output__photo-area">
                <div
                  className="output__photo-frame"
                  style={{ background: frameBackground }}
                >
                  <img
                    key={pipe.displayURL}
                    src={pipe.displayURL}
                    alt="Result"
                    className="output__photo"
                  />
                </div>
                <p className="output__stage-label">{stageLabel}</p>
              </div>

              {/* Action bar */}
              <div className="output__actions">
                {!pipe.noBgBlob ? (
                  <button
                    className={`btn btn--outline${busy === "removingBg" ? " btn--loading" : ""}`}
                    onClick={handleRemoveBg}
                    disabled={isBusy}
                  >
                    {busy === "removingBg" && (
                      <span className="btn__spinner btn__spinner--dark" />
                    )}
                    {busy === "removingBg" ? "Removing…" : "Remove BG"}
                  </button>
                ) : (
                  <button
                    className="btn btn--outline"
                    onClick={handleRestoreBg}
                    disabled={isBusy}
                  >
                    Restore BG
                  </button>
                )}
                <button
                  className="btn btn--secondary"
                  onClick={() => {
                    const blob = pipe.displayBlob;
                    if (!blob) return;
                    const ext = blob.type === "image/png" ? "png" : "jpg";
                    dl(blob, `passport_${region}.${ext}`);
                  }}
                  disabled={!pipe.displayBlob}
                >
                  ↓ Photo
                </button>
                {pdfBlob && (
                  <button
                    className="btn btn--secondary"
                    onClick={() =>
                      dl(pdfBlob, `passport_sheet_${sheetSize}_${region}.pdf`)
                    }
                  >
                    ↓ PDF Sheet
                  </button>
                )}
              </div>

              {/* Sheet preview */}
              {sheetPreview && (
                <div className="output__sheet-area">
                  <p className="output__sheet-label">
                    {sheetCopies} copies · {SHEET_SIZES[sheetSize].label}
                  </p>
                  <div className="output__sheet-frame">
                    <img
                      src={sheetPreview}
                      alt="Print sheet preview"
                      className="output__sheet-img"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default photoStudio;
