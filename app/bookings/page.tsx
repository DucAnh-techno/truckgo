"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

import { BookingChatPanel } from "@/components/BookingChatPanel";
import { BookingForm } from "@/components/BookingForm";
import { ReportButton } from "@/components/ReportButton";
import { ReviewComposer } from "@/components/ReviewComposer";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getBookingsForRenter,
  updateBookingStatus,
} from "@/lib/services/bookings";
import { getReviewsByReviewer } from "@/lib/services/reviews";
import { getTruckById } from "@/lib/services/trucks";
import { getPublicUserProfilesByIds } from "@/lib/services/users";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";
import { getBookingStatusLabel } from "@/lib/utils/labels";
import type { Review } from "@/types";

interface BookingsPageProps {
  searchParams: Promise<{ truckId?: string | string[] }>;
}

function readSearchValue(value?: string | string[]) {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value) ? value[0] : undefined;
}

interface BookingViewModel {
  id: string;
  truckId: string;
  truckName: string;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
  createdAt: string;
}

export default function BookingsPage({ searchParams }: BookingsPageProps) {
  const { profile, isConfigured, isLoading } = useAuth();
  const { truckId } = use(searchParams);
  const selectedTruckId = readSearchValue(truckId);
  const [bookings, setBookings] = useState<BookingViewModel[]>([]);
  const [reviewMap, setReviewMap] = useState<Map<string, Review>>(new Map());
  const [errorMessage, setErrorMessage] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);

  const loadBookingsForCurrentUser = useCallback(async (userId: string) => {
    setIsPageLoading(true);
    setErrorMessage("");

    try {
      const [renterBookings, existingReviews] = await Promise.all([
        getBookingsForRenter(userId),
        getReviewsByReviewer(userId),
      ]);
      const truckEntries = await Promise.all(
        renterBookings.map(async (booking) => {
          const truck = await getTruckById(booking.truckId);
          return [booking.truckId, truck?.name ?? booking.truckId] as const;
        })
      );
      const ownerProfiles = await getPublicUserProfilesByIds(
        renterBookings.map((booking) => booking.ownerId)
      );
      const truckNameMap = new Map(truckEntries);

      setBookings(
        renterBookings.map((booking) => ({
          id: booking.id,
          truckId: booking.truckId,
          truckName: truckNameMap.get(booking.truckId) ?? booking.truckId,
          ownerId: booking.ownerId,
          ownerName:
            ownerProfiles.get(booking.ownerId)?.name ?? booking.ownerId,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
          totalPrice: booking.totalPrice,
          createdAt: booking.createdAt,
        }))
      );
      setReviewMap(
        new Map(existingReviews.map((review) => [review.bookingId, review]))
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể tải bookings."
      );
    } finally {
      setIsPageLoading(false);
    }
  }, []);

  async function handleCancelBooking(bookingId: string) {
    if (!profile) {
      return;
    }

    try {
      await updateBookingStatus(bookingId, profile.id, "cancelled");
      await loadBookingsForCurrentUser(profile.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể hủy booking."
      );
    }
  }

  useEffect(() => {
    if (!profile) {
      setBookings([]);
      setErrorMessage("");
      setIsPageLoading(false);
      return;
    }

    void loadBookingsForCurrentUser(profile.id);
  }, [loadBookingsForCurrentUser, profile]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[38px] bg-[linear-gradient(135deg,#1f1612,#4e3428)] p-8 text-white shadow-[0_28px_80px_rgba(31,22,18,0.18)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-200">
          Không gian booking
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Hoàn tất yêu cầu đặt xe</h1>
        <p className="mt-3 max-w-2xl text-white/78">
          CTA &quot;Đặt xe&quot; từ danh sách và chi tiết xe đều đưa người dùng về
          một trang form riêng. Đồng thời, trang này cũng là nơi bạn theo dõi
          toàn bộ các booking mình đã tạo.
        </p>
      </section>

      {selectedTruckId ? (
        <BookingForm
          truckId={selectedTruckId}
          onSubmitted={() =>
            profile ? loadBookingsForCurrentUser(profile.id) : undefined
          }
        />
      ) : (
        <div className="rounded-[28px] border border-dashed border-stone-300 bg-white/80 p-6 text-sm text-stone-600">
          Chọn một xe từ{" "}
          <Link href="/trucks" className="font-semibold text-orange-600">
            danh sách xe
          </Link>{" "}
          để tạo booking mới.
        </div>
      )}

      <section className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
              Đơn thuê của tôi
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">
              Lịch sử booking do bạn tạo
            </h2>
          </div>
          <Link
            href="/trucks"
            className="text-sm font-semibold text-stone-700 transition hover:text-orange-600"
          >
            Tiếp tục tìm xe
          </Link>
        </div>

        {!isConfigured ? (
          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            Firebase chưa được cấu hình. Hãy điền `.env.local` để xem dữ liệu
            booking thật.
          </div>
        ) : null}

        {!isLoading && !profile ? (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            Bạn cần đăng nhập để xem danh sách booking của mình.{" "}
            <Link href="/login" className="font-semibold text-orange-600">
              Đăng nhập ngay
            </Link>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {isPageLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="min-h-32 animate-pulse rounded-[26px] border border-stone-200 bg-white"
              />
            ))
          ) : bookings.length > 0 ? (
            bookings.map((booking) => (
              <article
                key={booking.id}
                className="space-y-4 rounded-[26px] border border-stone-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">
                      {getBookingStatusLabel(booking.status)}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-stone-950">
                      {booking.truckName}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600">
                      {formatDateRange(booking.startDate, booking.endDate)}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      Chủ xe: {booking.ownerName}
                    </p>
                  </div>

                  <div className="flex flex-col items-stretch gap-3 sm:items-end">
                    <div className="rounded-2xl bg-orange-50 px-4 py-3 text-right">
                      <p className="text-sm text-stone-600">Tổng tạm tính</p>
                      <p className="mt-1 text-lg font-semibold text-orange-600">
                        {formatCurrency(booking.totalPrice)}
                      </p>
                    </div>
                    {booking.status === "pending" || booking.status === "confirmed" ? (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(booking.id)}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Hủy booking
                      </button>
                    ) : null}
                  </div>
                </div>

                <BookingChatPanel
                  bookingId={booking.id}
                  partnerLabel={booking.ownerName}
                />

                <div className="flex flex-wrap gap-3">
                  <ReportButton targetId={booking.ownerId} targetType="user" />
                  <ReportButton targetId={booking.truckId} targetType="truck" />
                </div>

                {booking.status === "completed" ? (
                  reviewMap.has(booking.id) ? (
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                      Bạn đã đánh giá booking này: {reviewMap.get(booking.id)?.rating} sao.
                    </div>
                  ) : (
                    <ReviewComposer
                      bookingId={booking.id}
                      onSubmitted={() =>
                        profile ? loadBookingsForCurrentUser(profile.id) : undefined
                      }
                    />
                  )
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-[26px] border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-stone-600">
              Chưa có booking nào cho tài khoản này.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
