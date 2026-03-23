import Link from "next/link";

import { TruckCard } from "@/components/TruckCard";
import {
  getFeaturedTrucks,
  getMarketplaceTrucks,
  getPopularLocations,
} from "@/lib/services/trucks";
import { formatCurrency } from "@/lib/utils/format";

export default async function HomePage() {
  const [featuredTrucks, locations, allTrucks] = await Promise.all([
    getFeaturedTrucks(),
    getPopularLocations(),
    getMarketplaceTrucks(),
  ]);
  const startingPrice = allTrucks.length
    ? Math.min(...allTrucks.map((truck) => truck.pricePerDay))
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[40px] bg-[linear-gradient(135deg,#1f1612,#472d21)] p-8 text-white shadow-[0_32px_90px_rgba(31,22,18,0.18)] sm:p-10">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-orange-200">
              Sàn xe cho logistics
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
              Tìm xe tải phù hợp đơn hàng trong một giao diện quen thuộc như sàn
              thương mại điện tử.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/74 sm:text-lg">
              TruckGo tập trung vào tra cứu nhanh, bộ lọc rõ ràng và thao tác đặt
              xe gọn. Phù hợp cho chủ xe lẫn shop online cần đặt xe liên tục.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-white/12 bg-white/8 p-5">
              <p className="text-sm text-white/65">Xe đang cho thuê</p>
              <p className="mt-2 text-3xl font-semibold">
                {allTrucks.length.toString().padStart(2, "0")}
              </p>
            </div>
            <div className="rounded-[28px] border border-white/12 bg-white/8 p-5">
              <p className="text-sm text-white/65">Khu vực phủ sóng</p>
              <p className="mt-2 text-3xl font-semibold">
                {locations.length.toString().padStart(2, "0")}
              </p>
            </div>
            <div className="rounded-[28px] border border-white/12 bg-white/8 p-5">
              <p className="text-sm text-white/65">Giá từ</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatCurrency(startingPrice)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[40px] border border-white/70 bg-white/85 p-7 shadow-[0_24px_80px_rgba(41,24,12,0.08)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
            Tìm nhanh
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-950">
            Lọc xe theo khu vực và ngân sách
          </h2>
          <form action="/trucks" className="mt-7 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Địa điểm</span>
              <input
                name="location"
                placeholder="VD: TP.HCM, Hà Nội, Đà Nẵng..."
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">
                Từ khóa xe
              </span>
              <input
                name="keyword"
                placeholder="mui bạt, thùng kín, giao nhanh..."
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">
                Giá tối đa / ngày
              </span>
              <input
                name="maxPrice"
                type="number"
                placeholder="1800000"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-stone-950 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600"
            >
              Tìm xe ngay
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            {locations.slice(0, 5).map((location) => (
              <Link
                key={location}
                href={`/trucks?location=${encodeURIComponent(location)}`}
                className="rounded-full bg-orange-50 px-3 py-1.5 text-sm text-orange-700 transition hover:bg-orange-100"
              >
                {location}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
              Xe nổi bật
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950">
              Danh sách xe đang được xem nhiều
            </h2>
          </div>
          <Link
            href="/trucks"
            className="text-sm font-semibold text-stone-700 transition hover:text-orange-600"
          >
            Xem toàn bộ danh sách
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {featuredTrucks.map((truck) => (
            <TruckCard key={truck.id} truck={truck} />
          ))}
        </div>
      </section>
    </div>
  );
}
