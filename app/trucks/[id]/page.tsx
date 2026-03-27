import Link from "next/link";

import { BookingForm } from "@/components/BookingForm";
import { DeleteTruckButton } from "@/components/DeleteTruckButton";
import { EditTruckButton } from "../../../components/EditTruckButton";
import { ReportButton } from "@/components/ReportButton";
import { ReviewList } from "@/components/ReviewList";
import { TruckDocumentReviewForm } from "@/components/TruckDocumentReviewForm";
import { TrustSummary } from "@/components/TrustSummary";
import { TruckImageGallery } from "@/components/TruckImageGallery";
import { TruckOwnerRedirectGate } from "@/components/TruckOwnerRedirectGate";
import {
  getTruckById,
  type TruckCatalogItem,
} from "@/lib/services/trucks";
import { getBookingCountByTruckId } from "@/lib/services/bookings";
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
  searchParams?: Promise<{ review?: string | string[] }>;
}

function readSearchValue(value?: string | string[]) {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value) ? value[0] : undefined;
}

export default async function TruckDetailPage({
  params,
  searchParams,
}: TruckDetailPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const reviewMode = readSearchValue(query?.review) === "documents";

  let truck: TruckCatalogItem | null = null;
  let owner: PublicUserProfile | null = null;
  let reviews: Review[] = [];
  let errorMessage = "";

  let rentalCount = 0;

  try {
    truck = await getTruckById(id);

    if (truck) {
      [owner, reviews, rentalCount] = await Promise.all([
        getPublicUserProfileById(truck.ownerId),
        getReviewsForTargetUser(truck.ownerId),
        getBookingCountByTruckId(truck.id),
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
      <TruckOwnerRedirectGate truckId={truck.id} ownerId={truck.ownerId} />
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <TruckImageGallery
            images={truck.images}
            primaryImageUrl={truck.primaryImageUrl}
          />

          <div className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
            <h2 className="text-2xl font-semibold text-stone-950">
              Thông tin chi tiết xe
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Hãng xe</span>
                <span className="font-semibold text-stone-900">{truck.brand || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Năm sản xuất</span>
                <span className="font-semibold text-stone-900">{truck.year ?? "N/A"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Loại xe</span>
                <span className="font-semibold text-stone-900">{truck.vehicleType || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Khu vực</span>
                <span className="font-semibold text-stone-900">{truck.location}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Kích thước thùng</span>
                <span className="font-semibold text-stone-900">
                  {`${truck.dimensions?.length ?? "--"} x ${truck.dimensions?.width ?? "--"} x ${truck.dimensions?.height ?? "--"} m`}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Thể tích thùng</span>
                <span className="font-semibold text-stone-900">{truck.cargoVolume ?? "--"} m³</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Nhiên liệu</span>
                <span className="font-semibold text-stone-900">{truck.fuelType}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Tiêu hao</span>
                <span className="font-semibold text-stone-900">{truck.fuelConsumption} L / 100km</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Tải trọng</span>
                <span className="font-semibold text-stone-900">{truck.capacity.toLocaleString("vi-VN")} kg</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Giá thuê</span>
                <span className="font-semibold text-stone-900">{formatCurrency(truck.pricePerDay)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Số lượt thuê</span>
                <span className="font-semibold text-stone-900">{rentalCount}</span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-semibold text-stone-700">Mô tả</p>
              <p className="mt-2 text-sm text-stone-600">{truck.description}</p>
            </div>

            <TruckDocumentReviewForm
              truckId={truck.id}
              enabled={reviewMode}
              vehicleDocuments={truck.vehicleDocuments ?? []}
              documentsReviewStatus={truck.documentsReviewStatus}
              documentsReviewNote={truck.documentsReviewNote}
              documentsApproved={truck.documentsApproved}
            />
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
              <div className="mt-3 flex gap-2">
                <a
                  href={`/owners/${truck.ownerId}`}
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
                >
                  Xem trang chủ xe
                </a>
                <a
                  href={`/chat/${truck.ownerId}`}
                  className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                >
                  Nhắn chủ xe
                </a>
              </div>

              <EditTruckButton truckId={truck.id} ownerId={truck.ownerId} />
              <DeleteTruckButton truckId={truck.id} ownerId={truck.ownerId} />
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
