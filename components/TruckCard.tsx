import Link from "next/link";
import Image from "next/image";

import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { TruckCatalogItem } from "@/lib/services/trucks";
import { formatCurrency } from "@/lib/utils/format";

interface TruckCardProps {
  truck: TruckCatalogItem;
}

export function TruckCard({ truck }: TruckCardProps) {
  const heroImage =
    truck.primaryImageUrl ?? truck.images.find((image) => image.startsWith("http"));

  return (
    <article className="overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_20px_60px_rgba(41,24,12,0.08)] flex flex-col h-full">
      {/* Image Section - 4:3 Ratio */}
      <Link
        href={`/trucks/${truck.id}`}
        className="group aspect-5/3 overflow-hidden rounded-t-[30px] bg-stone-200 relative"
      >
        {heroImage ? (
          <Image
            src={heroImage}
            alt={truck.name}
            fill
            className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `linear-gradient(135deg, ${truck.accentFrom}, ${truck.accentTo})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        )}
      </Link>

      {/* Content Section */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* Truck Name - Clickable */}
        <Link
          href={`/trucks/${truck.id}`}
          className="transition-colors hover:text-orange-600"
        >
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-stone-950 leading-tight">
            {truck.name}
          </h3>
        </Link>

        {/* Price */}
        <div>
          <p className="text-lg sm:text-xl font-bold text-stone-950">
            {formatCurrency(truck.pricePerDay)}
            <span className="ml-1 text-sm font-medium text-stone-500">
              / ngày
            </span>
          </p>
        </div>

        {/* Label Boxes */}
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-stone-600">
            {truck.location}
          </span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
            Tải trọng {truck.capacity.toLocaleString("vi-VN")} kg
          </span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
            {truck.gear}
          </span>
        </div>

        {/* Owner Info */}
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <span className="font-medium text-stone-900">
            {truck.ownerName || "Chủ xe TruckGo"}
          </span>
          <VerifiedBadge isVerified={truck.ownerIsVerified ?? false} />
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
            {truck.ownerAvgRating ? (truck.ownerAvgRating).toFixed(1) : "--"} / 5
          </span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
            {truck.ownerTotalReviews ?? "--"} đánh giá
          </span>
        </div>

        {/* Buttons - Sticky to Bottom */}
        <div className="mt-auto flex gap-3 pt-2">
          <Link
            href={`/trucks/${truck.id}`}
            className="flex-1 rounded-full border border-stone-200 px-4 py-2 text-center text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
          >
            Xem chi tiết
          </Link>
          <Link
            href={`/bookings?truckId=${truck.id}`}
            className="flex-1 rounded-full bg-stone-950 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Đặt xe
          </Link>
        </div>
      </div>
    </article>
  );
}
