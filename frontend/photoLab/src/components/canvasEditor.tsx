// components/CanvasEditor.tsx

import React, { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import {
  getCroppedImg,
  blobToDataURL,
  removeBackground,
  addSolidBackground,
  layoutOnSheetPDF,
  PASSPORT_SIZES,
  SHEET_SIZES,
  DEFAULT_ADJUSTMENTS,
  type Area,
  type PassportRegion,
  type SheetSize,
  type Adjustments,
} from "../utils/cropImage";
import "./CanvasEditor.css";

// ── Slider config ──────────────────────────────────────────────
const SLIDERS: {
  key:     keyof Adjustments;
  label:   string;
  min:     number;
  max:     number;
  step:    number;
  default: number;
  format:  (v: number) => string;
  skin?:   true;
}[] = [
  { key: "brightness",    label: "Brightness",    min: 50,  max: 150, step: 1, default: 100, format: v => `${v}%`                   },
  { key: "contrast",      label: "Contrast",      min: 50,  max: 150, step: 1, default: 100, format: v => `${v}%`                   },
  { key: "exposure",      label: "Exposure",      min: -50, max: 50,  step: 1, default: 0,   format: v => v > 0 ? `+${v}` : `${v}` },
  { key: "saturation",    label: "Saturation",    min: 0,   max: 200, step: 1, default: 100, format: v => `${v}%`                   },
  { key: "skinSmoothing", label: "Skin Smooth ✦", min: 0,   max: 100, step: 1, default: 0,   format: v => v === 0 ? "off" : `${v}%`, skin: true },
];

const PRESET_COLORS = [
  { hex: "#FFFFFF", label: "White"       },
  { hex: "#F0F4FF", label: "Off-white"   },
  { hex: "#C8D8F0", label: "Light blue"  },
  { hex: "#E8F5E9", label: "Sage green"  },
  { hex: "#F5F5DC", label: "Cream"       },
];

function toCSSFilter(adj: Adjustments): string {
  const b = adj.brightness + adj.exposure;
  return `brightness(${b}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;
}

// ──────────────────────────────────────────────────────────────

const CanvasEditor: React.FC = () => {
  // Source
  const [image, setImage]       = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const objectUrlRef            = useRef<string | null>(null);

  // Cropper
  const [crop, setCrop]   = useState({ x: 0, y: 0 });
  const [zoom, setZoom]   = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Pipeline blobs + dataURLs
  const [croppedBlob,  setCroppedBlob]  = useState<Blob | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [noBgBlob,     setNoBgBlob]     = useState<Blob | null>(null);
  const [noBgImage,    setNoBgImage]    = useState<string | null>(null);
  const [finalBlob,    setFinalBlob]    = useState<Blob | null>(null);
  const [finalImage,   setFinalImage]   = useState<string | null>(null);

  // BG colour
  const [bgColor,       setBgColor]      = useState<string | null>(null); // null = no bg (transparent)
  const [applyingBg,    setApplyingBg]   = useState(false);

  // Print layout
  const [sheetSize,     setSheetSize]    = useState<SheetSize>("A4");
  const [layoutBlob,    setLayoutBlob]   = useState<Blob | null>(null);
  const [layoutImage,   setLayoutImage]  = useState<string | null>(null);
  const [layoutCopies,  setLayoutCopies] = useState<number>(0);
  const [layouting,     setLayouting]    = useState(false);

  // Format + status
  const [region,      setRegion]      = useState<PassportRegion>("IN");
  const [loading,     setLoading]     = useState(false);
  const [removingBg,  setRemovingBg]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);

  const zoomPct    = ((zoom - 1) / 2) * 100;
  const isAdjusted = SLIDERS.some(s => adjustments[s.key] !== s.default);
  const setAdj     = (key: keyof Adjustments, val: number) =>
    setAdjustments(prev => ({ ...prev, [key]: val }));

  // The best single-photo blob for download — prefer finalBlob > noBgBlob > croppedBlob
  const bestSingleBlob  = finalBlob ?? noBgBlob ?? croppedBlob;
  // Preview src that updates through all pipeline stages
  const previewSrc      = finalImage ?? noBgImage ?? croppedImage;

  // ── Reset ────────────────────────────────────────────────────
  const clearPipeline = () => {
    setCroppedBlob(null);  setCroppedImage(null);
    setNoBgBlob(null);     setNoBgImage(null);
    setFinalBlob(null);    setFinalImage(null);
    setLayoutBlob(null);   setLayoutImage(null);
    setBgColor(null);
    setError(null);
  };

  // ── Upload ───────────────────────────────────────────────────
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImage(url);
    setFileName(file.name);
    clearPipeline();
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAdjustments(DEFAULT_ADJUSTMENTS);
  };

  const onCropComplete = useCallback((_: Area, px: Area) => {
    setCroppedAreaPixels(px);
  }, []);

  const onRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRegion(e.target.value as PassportRegion);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    clearPipeline();
  };

  // ── Step 1: Apply effects ────────────────────────────────────
  const handleApplyEffects = async () => {
    if (!image || !croppedAreaPixels) return;
    setLoading(true);
    setError(null);
    setNoBgBlob(null);  setNoBgImage(null);
    setFinalBlob(null); setFinalImage(null);
    setLayoutBlob(null); setLayoutImage(null);
    setBgColor(null);
    try {
      const blob    = await getCroppedImg(image, croppedAreaPixels, region, adjustments);
      const dataUrl = await blobToDataURL(blob);
      setCroppedBlob(blob);
      setCroppedImage(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply effects");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Remove background ────────────────────────────────
  const handleRemoveBg = async () => {
    if (!croppedBlob) return;
    setRemovingBg(true);
    setError(null);
    setFinalBlob(null); setFinalImage(null);
    setLayoutBlob(null); setLayoutImage(null);
    setBgColor(null);
    try {
      const blob    = await removeBackground(croppedBlob);
      const dataUrl = await blobToDataURL(blob);
      setNoBgBlob(blob);
      setNoBgImage(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Background removal failed");
    } finally {
      setRemovingBg(false);
    }
  };

  // ── Step 3a: Apply solid BG colour ───────────────────────────
  const handleApplyBgColor = async (hex: string) => {
    if (!noBgBlob) return;
    setBgColor(hex);
    setApplyingBg(true);
    setError(null);
    setLayoutBlob(null); setLayoutImage(null);
    try {
      const blob    = await addSolidBackground(noBgBlob, hex);
      const dataUrl = await blobToDataURL(blob);
      setFinalBlob(blob);
      setFinalImage(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply background colour");
    } finally {
      setApplyingBg(false);
    }
  };

  // ── Step 3b: Remove BG (back to transparent) ─────────────────
  const handleClearBgColor = () => {
    setBgColor(null);
    setFinalBlob(null);
    setFinalImage(null);
    setLayoutBlob(null);
    setLayoutImage(null);
  };

  // ── Step 4: Print layout ─────────────────────────────────────
  // Uses finalBlob (solid bg) if available, else noBgBlob, else croppedBlob
  const handleLayout = async () => {
    const source = finalBlob ?? noBgBlob ?? croppedBlob;
    if (!source) return;
    setLayouting(true);
    setError(null);
    try {
      const { blob, copies } = await layoutOnSheetPDF(source, region, sheetSize);
      const dataUrl = await blobToDataURL(blob);
      setLayoutBlob(blob);
      setLayoutImage(dataUrl);
      setLayoutCopies(copies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Layout failed");
    } finally {
      setLayouting(false);
    }
  };

  // ── Download ─────────────────────────────────────────────────
  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = () => {
    if (!bestSingleBlob) return;
    const ext = finalBlob || croppedBlob ? "jpg" : "png";
    download(bestSingleBlob, `passport_${region}.${ext}`);
  };

  const handleDownloadSheet = () => {
    if (!layoutBlob) return;
    download(layoutBlob, `passport_sheet_${sheetSize}_${region}.pdf`);
  };

  return (
    <div className="editor-shell" style={{ minHeight: "100vh" }}>
      <div className="editor">

        {/* ── Header spans all 3 cols ──────────────────────────── */}
        <header className="editor__header">
          <h1 className="editor__title">Photo Lab</h1>
          <span className="editor__subtitle">Passport studio</span>
        </header>

        {/* ── Col 1: Controls ──────────────────────────────────── */}
        <div className="editor__controls">
          <div className="controls__scroll">

            {/* Upload */}
            <div className="editor__section">
              <label className="editor__label">Source image</label>
              <div className="upload-zone">
                <input type="file" accept="image/*" onChange={onFileChange} aria-label="Upload" />
                <svg className="upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div className="upload-zone__text">
                  <span className="upload-zone__primary">{fileName ?? "Choose or drag & drop"}</span>
                  <span className="upload-zone__secondary">PNG, JPG, WEBP · up to 20 MB</span>
                </div>
              </div>
            </div>

            {/* Passport format */}
            <div className="editor__section">
              <label className="editor__label" htmlFor="region-select">Passport format</label>
              <select id="region-select" className="editor__select" value={region} onChange={onRegionChange}>
                {(Object.keys(PASSPORT_SIZES) as PassportRegion[]).map(k => (
                  <option key={k} value={k}>{PASSPORT_SIZES[k].label}</option>
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
                    <span className="adj-value">{zoom.toFixed(1)}×</span>
                  </div>
                  <div className="adj-row">
                    <input
                      type="range" className="adj-slider"
                      min={1} max={3} step={0.1} value={zoom}
                      style={{ "--fill-pct": `${zoomPct}%` } as React.CSSProperties}
                      onChange={e => setZoom(Number(e.target.value))}
                    />
                  </div>
                </div>

                <hr className="editor__divider" />

                {/* Adjustments */}
                <div className="adj-header">
                  <label className="editor__label">Adjustments</label>
                  {isAdjusted && (
                    <button className="btn-reset" onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}>
                      Reset all
                    </button>
                  )}
                </div>

                {SLIDERS.map(s => {
                  const val = adjustments[s.key];
                  const pct = ((val - s.min) / (s.max - s.min)) * 100;
                  return (
                    <React.Fragment key={s.key}>
                      {s.skin && <hr className="skin-divider" />}
                      <div className="editor__section">
                        <div className="adj-label-row">
                          <span className={`adj-label${s.skin ? " adj-label--skin" : ""}`}>{s.label}</span>
                          <span className={`adj-value${val === s.default ? " adj-value--muted" : ""}`}>{s.format(val)}</span>
                        </div>
                        <div className="adj-row">
                          <input
                            type="range"
                            className={`adj-slider${s.skin ? " adj-slider--skin" : ""}`}
                            min={s.min} max={s.max} step={s.step} value={val}
                            style={{ "--fill-pct": `${pct}%` } as React.CSSProperties}
                            onChange={e => setAdj(s.key, Number(e.target.value))}
                          />
                        </div>
                        {s.skin && val > 0 && <span className="adj-note">Applied at crop · skin pixels only</span>}
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* BG colour — shown after removal */}
                {noBgBlob && (
                  <>
                    <hr className="editor__divider" />
                    <div className="editor__section">
                      <div className="adj-header">
                        <label className="editor__label">Background colour</label>
                        {bgColor && (
                          <button className="btn-reset" onClick={handleClearBgColor}>
                            No BG
                          </button>
                        )}
                      </div>
                      <div className="color-swatches">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c.hex}
                            className={`color-swatch${bgColor === c.hex ? " color-swatch--active" : ""}`}
                            style={{ background: c.hex }}
                            title={c.label}
                            onClick={() => handleApplyBgColor(c.hex)}
                            disabled={applyingBg}
                          />
                        ))}
                        <label className="color-swatch color-swatch--custom" title="Custom colour">
                          <input
                            type="color"
                            value={bgColor ?? "#ffffff"}
                            onChange={e => setBgColor(e.target.value)}
                            onBlur={e => handleApplyBgColor(e.target.value)}
                          />
                          <span>+</span>
                        </label>
                      </div>
                      {applyingBg && <span className="adj-note">Compositing…</span>}
                    </div>
                  </>
                )}

                {/* Print layout — shown after effects applied */}
                {croppedBlob && (
                  <>
                    <hr className="editor__divider" />
                    <div className="editor__section">
                      <label className="editor__label">Print layout</label>
                      <select
                        className="editor__select"
                        value={sheetSize}
                        onChange={e => {
                          setSheetSize(e.target.value as SheetSize);
                          setLayoutBlob(null); setLayoutImage(null);
                        }}
                      >
                        {(Object.keys(SHEET_SIZES) as SheetSize[]).map(k => (
                          <option key={k} value={k}>{SHEET_SIZES[k].label}</option>
                        ))}
                      </select>
                      <button
                        className={`btn btn--outline btn--full${layouting ? " btn--loading" : ""}`}
                        onClick={handleLayout}
                        disabled={layouting}
                        style={{ marginTop: "6px" }}
                      >
                        {layouting && <span className="btn__spinner btn__spinner--dark" />}
                        {layouting ? "Generating…" : "Generate sheet"}
                      </button>
                      {layoutImage && (
                        <span className="adj-note">{layoutCopies} copies on {SHEET_SIZES[sheetSize].label}</span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>{/* end controls__scroll */}

          <div className="controls__footer">
            {error && <p className="editor__error">{error}</p>}
            <button
              className={`btn btn--primary${loading ? " btn--loading" : ""}`}
              onClick={handleApplyEffects}
              disabled={loading || !image}
            >
              {loading && <span className="btn__spinner" />}
              {loading ? "Applying…" : "Apply effects"}
            </button>
          </div>
        </div>{/* end editor__controls */}

        {/* ── Col 2: Cropper ───────────────────────────────────── */}
        <div className="editor__cropper">
          {!image ? (
            <div className="preview-empty">
              <svg className="preview-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="preview-empty__text">Upload an image to begin</span>
            </div>
          ) : (
            <div className="cropper-wrap">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={PASSPORT_SIZES[region].width / PASSPORT_SIZES[region].height}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{ mediaStyle: { filter: toCSSFilter(adjustments) } }}
              />
            </div>
          )}
        </div>

        {/* ── Col 3: Output preview ─────────────────────────────── */}
        <div className="editor__output">
          {!croppedImage ? (
            <div className="preview-empty">
              <svg className="preview-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span className="preview-empty__text">Apply effects to see result</span>
            </div>
          ) : (
            <>
              {/* ── Photo preview ── */}
              <div className="output__photo-area">
                <div
                  className="output__photo-frame"
                  style={{
                    background: noBgImage && !finalImage
                      ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 12px 12px"
                      : finalImage
                        ? bgColor ?? "transparent"
                        : "var(--ink)",
                  }}
                >
                  <img
                    key={previewSrc}
                    src={previewSrc!}
                    alt="Result"
                    className="output__photo"
                  />
                </div>

                {/* Stage label */}
                <p className="output__stage-label">
                  {finalImage   ? `Solid BG · ${bgColor}` :
                   noBgImage    ? "Background removed"    :
                                  "Effects applied"}
                </p>
              </div>

              {/* ── Action bar ── */}
              <div className="output__actions">
                {!noBgImage && (
                  <button
                    className={`btn btn--outline${removingBg ? " btn--loading" : ""}`}
                    onClick={handleRemoveBg}
                    disabled={removingBg}
                  >
                    {removingBg && <span className="btn__spinner btn__spinner--dark" />}
                    {removingBg ? "Removing…" : "Remove BG"}
                  </button>
                )}
                <button
                  className="btn btn--secondary"
                  onClick={handleDownloadSingle}
                  disabled={!bestSingleBlob}
                >
                  ↓ Photo
                </button>
                {layoutBlob && (
                  <button
                    className="btn btn--secondary"
                    onClick={handleDownloadSheet}
                  >
                    ↓ Sheet
                  </button>
                )}
              </div>

              {/* ── Print sheet preview (shown after layout generated) ── */}
              {layoutImage && (
                <div className="output__sheet-area">
                  <p className="output__sheet-label">
                    {layoutCopies} copies · {SHEET_SIZES[sheetSize].label}
                  </p>
                  <div className="output__sheet-frame">
                    <img src={layoutImage} alt="Print sheet" className="output__sheet-img" />
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

export default CanvasEditor;