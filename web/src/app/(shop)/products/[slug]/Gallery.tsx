"use client";

import { useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) return <div className="aspect-square rounded-3xl bg-white" />;
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt={alt} className="aspect-square w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.slice(0, 10).map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`overflow-hidden rounded-xl border-2 bg-white ${i === active ? "border-ink" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
