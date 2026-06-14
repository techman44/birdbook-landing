'use client';

import { useEffect, useState, type RefObject } from 'react';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type BirdDetection } from '@/lib/api/identification';

/**
 * Vision-Pro style multi-bird indicators: a subtle pulsing dot + numbered chip
 * at the center of each detected bird. No solid rectangles.
 *
 * Positioning is computed against the RENDERED image content box (handles
 * object-contain letterboxing), so the overlay container itself only needs a
 * `relative` parent that the <img> is a direct child of.
 */

interface RenderedBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Compute the on-screen content box of an object-contain <img>. */
function useRenderedImageBox(imgRef: RefObject<HTMLImageElement | null>): RenderedBox | null {
  const [box, setBox] = useState<RenderedBox | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const compute = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const cw = img.clientWidth;
      const ch = img.clientHeight;
      if (!cw || !ch) return;
      const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      setBox({
        left: img.offsetLeft + (cw - w) / 2,
        top: img.offsetTop + (ch - h) / 2,
        width: w,
        height: h,
      });
    };

    compute();
    img.addEventListener('load', compute);
    const ro = new ResizeObserver(compute);
    ro.observe(img);
    return () => {
      img.removeEventListener('load', compute);
      ro.disconnect();
    };
  }, [imgRef]);

  return box;
}

interface BirdIndicatorsProps {
  /** Ref to the rendered <img> (must be a direct child of a relative parent). */
  imageRef: RefObject<HTMLImageElement | null>;
  /** Normalized detections (boxes 0-1, sorted by confidence — #1 is primary). */
  detections: BirdDetection[];
  /** Index of the bird whose results are currently shown. */
  selectedIndex?: number;
  /** Index currently being identified (shows a spinner on its chip). */
  loadingIndex?: number | null;
  /** Indexes that already have an identification result. */
  identifiedIndexes?: number[];
  onSelect: (index: number) => void;
}

export function BirdIndicators({
  imageRef,
  detections,
  selectedIndex = 0,
  loadingIndex = null,
  identifiedIndexes = [],
  onSelect,
}: BirdIndicatorsProps) {
  const box = useRenderedImageBox(imageRef);

  if (!box || detections.length < 2) return null;

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    >
      {detections.map((det, idx) => {
        const [x1, y1, x2, y2] = det.box;
        const cx = ((x1 + x2) / 2) * 100;
        const cy = ((y1 + y2) / 2) * 100;
        const isSelected = idx === selectedIndex;
        const isLoading = idx === loadingIndex;
        const isIdentified = identifiedIndexes.includes(idx);

        return (
          <div
            key={idx}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${cx}%`, top: `${cy}%` }}
          >
            {/* Pulsing dot */}
            <span className="relative flex h-3 w-3 mx-auto">
              <span
                className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  isSelected ? 'bg-emerald-400' : 'bg-white/80'
                )}
              />
              <span
                className={cn(
                  'relative inline-flex rounded-full h-3 w-3 ring-2 ring-white/90 shadow-md',
                  isSelected ? 'bg-emerald-500' : 'bg-emerald-400/90'
                )}
              />
            </span>

            {/* Numbered chip (the only interactive element) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSelect(idx);
              }}
              disabled={isLoading}
              aria-label={`Identify bird ${idx + 1}`}
              className={cn(
                'pointer-events-auto mt-1 flex items-center justify-center gap-1 mx-auto',
                'min-w-[1.75rem] h-7 px-1.5 rounded-full text-xs font-semibold',
                'backdrop-blur-md shadow-lg ring-1 transition-all',
                isSelected
                  ? 'bg-emerald-500/90 text-white ring-emerald-300/80 scale-110'
                  : 'bg-black/45 text-white ring-white/40 hover:bg-black/65 hover:scale-110'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  {idx + 1}
                  {isIdentified && <Check className="w-3 h-3" strokeWidth={3} />}
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
