"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Img = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export function ArtworkSlideshow({
  images,
  title,
  priority = false,
}: {
  images: Img[];
  title: string;
  priority?: boolean;
}) {
  const n = images.length;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const go = useCallback((d: number) => setIdx((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    if (!playing || n < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 5000);
    return () => clearInterval(t);
  }, [playing, n]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, go]);

  if (n === 0) return null;
  const cur = images[Math.min(idx, n - 1)];

  return (
    <div className="pf-stage-wrap">
      <div className="pf-stage">
        {cur.width && cur.height ? (
          <Image
            src={cur.url}
            alt={cur.alt}
            width={cur.width}
            height={cur.height}
            className="pf-img"
            // Displayed at up to the stage width; serve a size to match.
            sizes="(min-width: 1100px) 1100px, 100vw"
            priority={priority}
            onClick={() => setLightbox(true)}
          />
        ) : (
          /* Legacy row without stored dimensions — plain <img> fallback. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cur.url}
            alt={cur.alt}
            className="pf-img"
            onClick={() => setLightbox(true)}
          />
        )}
        {n > 1 && (
          <>
            <button
              className="pf-arrow pf-prev"
              onClick={() => go(-1)}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              className="pf-arrow pf-next"
              onClick={() => go(1)}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="pf-controls">
          <button
            className="pf-play"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          >
            {playing ? "❚❚" : "►"}
          </button>
          <div className="pf-dots">
            {images.map((_, i) => (
              <button
                key={i}
                className={"pf-dot" + (i === idx ? " is-active" : "")}
                onClick={() => setIdx(i)}
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === idx}
              />
            ))}
          </div>
          <span className="pf-count">
            {idx + 1} / {n}
          </span>
        </div>
      )}

      {lightbox && (
        <div
          className="pf-lightbox"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — full image`}
        >
          {cur.width && cur.height ? (
            <Image
              src={cur.url}
              alt={cur.alt}
              width={cur.width}
              height={cur.height}
              className="pf-lightbox-img"
              sizes="100vw"
              quality={90}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={cur.url} alt={cur.alt} className="pf-lightbox-img" />
          )}
          <button
            className="pf-lightbox-close"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
