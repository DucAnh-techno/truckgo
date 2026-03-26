"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

interface TruckImageGalleryProps {
  images: string[];
  primaryImageUrl?: string;
}

export function TruckImageGallery({
  images,
  primaryImageUrl,
}: TruckImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!primaryImageUrl) {
      return 0;
    }

    const index = images.findIndex((image) => image === primaryImageUrl);
    return index >= 0 ? index : 0;
  });
  const [isZoomed, setIsZoomed] = useState(false);

  const mainImage = useMemo(() => {
    if (images.length === 0) {
      return null;
    }
    return images[activeIndex] ?? images[0];
  }, [images, activeIndex]);

  if (!images || images.length === 0) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white/80 p-10 text-center text-stone-500">
        Không có ảnh để hiển thị.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-100 overflow-hidden rounded-[40px] border border-stone-200 bg-stone-100">
        {mainImage ? (
          <Image
            src={mainImage}
            alt="Ảnh xe"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 65vw, 720px"
            onClick={() => setIsZoomed((previous) => !previous)}
            className={`cursor-zoom-in object-cover transition duration-200 ${
              isZoomed ? "scale-110" : "scale-100"
            }`}
          />
        ) : (
          <div className="flex h-80 items-center justify-center bg-stone-200 text-stone-500">
            Không có ảnh
          </div>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`shrink-0 rounded-lg border p-1 transition ${
              index === activeIndex
                ? "border-orange-500" 
                : "border-stone-200 hover:border-orange-400"
            }`}
          >
            <Image
              src={image}
              alt={`Ảnh ${index + 1}`}
              width={112}
              height={80}
              className="h-20 w-28 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
