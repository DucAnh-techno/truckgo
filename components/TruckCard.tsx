import Link from "next/link";

import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { TruckCatalogItem } from "@/lib/services/trucks";
import { formatCurrency } from "@/lib/utils/format";

interface TruckCardProps {
  truck: TruckCatalogItem;
}

export function TruckCard({ truck }: TruckCardProps) {
  const heroImage = truck.images.find((image) => image.startsWith("http"));

  return (
    <article className="overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
      <div
        className="relative min-h-56 overflow-hidden p-6 text-white"
        style={{
          backgroundImage: heroImage
            ? `linear-gradient(135deg, rgba(31,22,18,0.22), rgba(31,22,18,0.52)), url(${heroImage})`
            : `linear-gradient(135deg, ${truck.accentFrom}, ${truck.accentTo})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_30%)]" />
        <div className="absolute -bottom-12 right-6 h-32 w-32 rounded-full border border-white/30 bg-white/10" />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div className="flex items-start justify-between gap-4">
            <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
              {truck.category}
            </span>
            <span className="rounded-full border border-white/30 px-3 py-1 text-xs">
              {truck.availableFrom}
            </span>
          </div>
          <div>
            <p className="text-sm text-white/78">{truck.summary}</p>
            <h3 className="mt-3 max-w-xs text-2xl font-semibold leading-tight">
              {truck.name}
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="flex flex-wrap gap-2 text-sm text-stone-600">
          <span className="rounded-full bg-orange-50 px-3 py-1">
            {truck.location}
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1">
            Tải trọng {truck.capacity.toLocaleString("vi-VN")} kg
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1">
            {truck.gear}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <span className="font-medium text-stone-900">
            {truck.ownerName || "Chủ xe TruckGo"}
          </span>
          <VerifiedBadge isVerified={truck.ownerIsVerified ?? false} />
          <span className="rounded-full bg-stone-100 px-3 py-1">
            {truck.ownerAvgRating ? (truck.ownerAvgRating).toFixed(1) : "--"} / 5
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1">
            {truck.ownerTotalReviews ?? "--"} đánh giá
          </span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500">Giá thuê</p>
            <p className="text-2xl font-bold text-stone-950">
              {formatCurrency(truck.pricePerDay)}
              <span className="ml-1 text-sm font-medium text-stone-500">
                / ngày
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/trucks/${truck.id}`}
              className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
            >
              Xem chi tiết
            </Link>
            <Link
              href={`/bookings?truckId=${truck.id}`}
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Đặt xe
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
