///\app\trucks\page.tsx

import Link from "next/link";

import { CreateTruckLink } from "@/components/CreateTruckLink";
import { TruckCard } from "@/components/TruckCard";
import {
  getMarketplaceTrucks,
  getPopularLocations,
  type TruckCatalogItem,
} from "@/lib/services/trucks";

export const dynamic = "force-dynamic";

interface TrucksPageProps {
  searchParams: Promise<{
    location?: string | string[];
    keyword?: string | string[];
    maxPrice?: string | string[];
  }>;
}

function readSearchValue(value?: string | string[]) {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value) ? value[0] : undefined;
}

export default async function TrucksPage({ searchParams }: TrucksPageProps) {
  const filters = await searchParams;
  const location = readSearchValue(filters.location);
  const keyword = readSearchValue(filters.keyword);
  const maxPrice = readSearchValue(filters.maxPrice);

  let trucks: TruckCatalogItem[] = [];
  let locations: string[] = [];
  let errorMessage = "";

  try {
    [trucks, locations] = await Promise.all([
      getMarketplaceTrucks({
        location,
        keyword,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      }),
      getPopularLocations(),
    ]);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Không thể tải danh sách xe.";
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[36px] bg-[linear-gradient(135deg,#ff8a3d,#ff5a1f)] p-8 text-white shadow-[0_24px_70px_rgba(255,98,39,0.26)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
          Danh sách xe
        </p>
        <h1 className="mt-3 text-4xl font-semibold">
          Tìm xe tải phù hợp – so sánh giá minh bạch, đặt xe nhanh chóng.
        </h1>
        <p className="mt-3 max-w-2xl text-white/82">
          So sánh nhiều nhà xe, lựa chọn linh hoạt theo tải trọng, tuyến đường và ngân sách của bạn.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.06)]">
          <h2 className="text-xl font-semibold text-stone-950">Bộ lọc</h2>
          <form className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Địa điểm</span>
              <input
                name="location"
                defaultValue={location}
                placeholder="Nhập khu vực"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Từ khóa</span>
              <input
                name="keyword"
                defaultValue={keyword}
                placeholder="mui bạt, giao nhanh..."
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">
                Giá tối đa / ngày
              </span>
              <input
                type="number"
                name="maxPrice"
                defaultValue={maxPrice}
                placeholder="1800000"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-stone-950 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600"
            >
              Cập nhật kết quả
            </button>
          </form>

          <div className="mt-6">
            <p className="text-sm font-medium text-stone-700">Khu vực phổ biến</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {locations.map((location) => (
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
        </aside>

        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-[28px] border border-stone-200 bg-white/70 px-5 py-4">
            <div>
              <p className="text-sm text-stone-500">Kết quả hiển thị</p>
              <p className="text-2xl font-semibold text-stone-950">
                {trucks.length} xe
              </p>
            </div>
            <CreateTruckLink className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
              Đăng xe mới
            </CreateTruckLink>
          </div>

          {errorMessage ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            {trucks.length > 0 ? (
              trucks.map((truck) => <TruckCard key={truck.id} truck={truck} />)
            ) : (
              <div className="rounded-4xl border border-dashed border-stone-300 bg-white/80 p-10 text-center text-stone-600 xl:col-span-2">
                {errorMessage ||
                  "Không tìm thấy xe phù hợp. Thử đổi địa điểm hoặc tăng mức giá."}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
