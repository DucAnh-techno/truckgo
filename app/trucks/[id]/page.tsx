import Link from "next/link";

import { BookingForm } from "@/components/BookingForm";
import { ReportButton } from "@/components/ReportButton";
import { ReviewList } from "@/components/ReviewList";
import { TrustSummary } from "@/components/TrustSummary";
import {
  getTruckById,
  type TruckCatalogItem,
} from "@/lib/services/trucks";
import { getReviewsForTargetUser } from "@/lib/services/reviews";
import {
  getPublicUserProfileById,
  getPublicUserProfilesByIds,
} from "@/lib/services/users";
import { formatCurrency } from "@/lib/utils/format";
import { getRoleLabel } from "@/lib/utils/labels";
import type { PublicUserProfile, Review } from "@/types";

interface TruckDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TruckDetailPage({ params }: TruckDetailPageProps) {
  const { id } = await params;

  let truck: TruckCatalogItem | null = null;
  let owner: PublicUserProfile | null = null;
  let reviews: Review[] = [];
  let errorMessage = "";

  try {
    truck = await getTruckById(id);

    if (truck) {
      [owner, reviews] = await Promise.all([
        getPublicUserProfileById(truck.ownerId),
        getReviewsForTargetUser(truck.ownerId),
      ]);
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Không thể tải chi tiết xe.";
  }

  if (!truck) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">
          Không tìm thấy chi tiết xe
        </h1>
        <p className="text-stone-600">
          {errorMessage || "Xe này có thể đã bị xóa hoặc chưa tồn tại."}
        </p>
        <Link
          href="/trucks"
          className="mx-auto inline-flex rounded-full bg-stone-950 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
        >
          Quay lại danh sách xe
        </Link>
      </div>
    );
  }

  const reviewerProfiles = await getPublicUserProfilesByIds(
    reviews.map((review) => review.reviewerId)
  );
  const reviewItems = reviews.map((review) => ({
    id: review.id,
    reviewerName:
      reviewerProfiles.get(review.reviewerId)?.name ?? review.reviewerId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
  }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div
            className="relative overflow-hidden rounded-[40px] p-8 text-white shadow-[0_28px_80px_rgba(41,24,12,0.18)]"
            style={{
              backgroundImage: truck.images[0]?.startsWith("http")
                ? `linear-gradient(135deg, rgba(31,22,18,0.28), rgba(31,22,18,0.6)), url(${truck.images[0]})`
                : `linear-gradient(135deg, ${truck.accentFrom}, ${truck.accentTo})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_32%)]" />
            <div className="relative">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                  {truck.category}
                </span>
                {truck.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/30 px-3 py-1 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight">
                {truck.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/82">
                {truck.description}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[28px] bg-white/10 p-5">
                  <p className="text-sm text-white/65">Giá theo ngày</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatCurrency(truck.pricePerDay)}
                  </p>
                </div>
                <div className="rounded-[28px] bg-white/10 p-5">
                  <p className="text-sm text-white/65">Tải trọng</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {truck.capacity.toLocaleString("vi-VN")} kg
                  </p>
                </div>
                <div className="rounded-[28px] bg-white/10 p-5">
                  <p className="text-sm text-white/65">Khu vực</p>
                  <p className="mt-2 text-2xl font-semibold">{truck.location}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {truck.images.length > 0 ? (
              truck.images.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_20px_60px_rgba(41,24,12,0.08)]"
                >
                  <div
                    className="min-h-48"
                    style={{
                      backgroundImage: image.startsWith("http")
                        ? `url(${image})`
                        : `linear-gradient(${135 + index * 20}deg, ${
                            truck.accentFrom
                          }, ${truck.accentTo})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }}
                  />
                  <div className="p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">
                      Ảnh {index + 1}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-stone-950">
                      Gallery xe
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-stone-300 bg-white/80 p-10 text-center text-stone-600 sm:col-span-3">
                Xe này chưa có hình ảnh.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <BookingForm
            truckId={truck.id}
            truckName={truck.name}
            pricePerDay={truck.pricePerDay}
          />

          <div className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
              Trust của chủ xe
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-stone-600">
              <p>
                Đây là cụm tín hiệu tin cậy được hiện ngay trên trang xe để người
                thuê nhìn nhanh và quyết định an tâm hơn.
              </p>
              <TrustSummary
                compact
                isVerified={owner?.isVerified ?? truck.ownerIsVerified ?? false}
                avgRating={truck.ownerAvgRating ?? owner?.avgRating ?? 0}
                totalReviews={truck.ownerTotalReviews ?? owner?.totalReviews ?? 0}
                memberSince={owner?.createdAt ?? truck.ownerMemberSince ?? truck.createdAt}
                role={owner?.role}
              />
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                  <span>Chủ xe</span>
                  <span className="font-semibold text-stone-900">
                    {owner?.name || truck.ownerName || truck.ownerId}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                  <span>Vai trò</span>
                  <span className="font-semibold text-stone-900">
                    {getRoleLabel(owner?.role || "owner")}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                  <span>Động cơ</span>
                  <span className="font-semibold text-stone-900">{truck.fuel}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                  <span>Trạng thái xe</span>
                  <span className="font-semibold text-stone-900">
                    {truck.availableFrom}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                  <span>Mức độ uy tín</span>
                  <span className="font-semibold text-stone-900">
                    {(truck.ownerAvgRating ?? owner?.avgRating ?? 0).toFixed(1)} / 5
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <ReportButton targetId={truck.id} targetType="truck" />
              </div>
              <div className="pt-2">
                <ReportButton targetId={truck.ownerId} targetType="user" />
              </div>
            </div>
            <Link
              href="/trucks"
              className="mt-5 inline-flex text-sm font-semibold text-stone-700 transition hover:text-orange-600"
            >
              Quay lại danh sách xe
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
              Đánh giá
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">
              Đánh giá về chủ xe này
            </h2>
          </div>
          <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
            {reviewItems.length} đánh giá
          </span>
        </div>

        <div className="mt-6">
          <ReviewList
            reviews={reviewItems}
            emptyMessage="Chủ xe này chưa có đánh giá công khai nào."
          />
        </div>
      </section>
    </div>
  );
}
