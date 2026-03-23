"use client";

import { useEffect, useState, useTransition } from "react";

import { BookingChatPanel } from "@/components/BookingChatPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getBookingsForOwner,
  updateBookingStatus,
} from "@/lib/services/bookings";
import { getPublicUserProfilesByIds } from "@/lib/services/users";
import { formatDateRange } from "@/lib/utils/format";
import { getBookingStatusLabel } from "@/lib/utils/labels";
import type { Booking } from "@/types";

interface OwnerBookingViewModel extends Booking {
  renterName: string;
}

export function OwnerBookingsPanel() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<OwnerBookingViewModel[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadBookings(ownerId: string) {
    const nextBookings = await getBookingsForOwner(ownerId);
    const renterProfiles = await getPublicUserProfilesByIds(
      nextBookings.map((booking) => booking.renterId)
    );

    setBookings(
      nextBookings.map((booking) => ({
        ...booking,
        renterName:
          renterProfiles.get(booking.renterId)?.name ?? booking.renterId,
      }))
    );
  }

  useEffect(() => {
    let active = true;

    async function run() {
      if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
        setBookings([]);
        return;
      }

      try {
        await loadBookings(profile.id);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải booking."
        );
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [profile]);

  function handleStatusUpdate(bookingId: string, status: Booking["status"]) {
    startTransition(async () => {
      try {
        if (!profile) {
          return;
        }

        await updateBookingStatus(bookingId, profile.id, status);
        await loadBookings(profile.id);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể cập nhật booking."
        );
      }
    });
  }

  if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
    return null;
  }

  return (
    <section className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
        Booking phía chủ xe
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">
        Quản lý trao đổi và tình trạng đơn
      </h2>

      {errorMessage ? (
        <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 space-y-5">
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <article
              key={booking.id}
              className="space-y-4 rounded-[26px] border border-stone-200 bg-stone-50 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">
                    {getBookingStatusLabel(booking.status)}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-stone-950">
                    Đơn thuê cho {booking.renterName}
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Xe được thuê: {booking.truckId}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatDateRange(booking.startDate, booking.endDate)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {booking.status === "pending" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusUpdate(booking.id, "confirmed")}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                    >
                      Xác nhận
                    </button>
                  ) : null}
                  {booking.status === "confirmed" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusUpdate(booking.id, "completed")}
                      className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-70"
                    >
                      Hoàn tất
                    </button>
                  ) : null}
                </div>
              </div>

              <BookingChatPanel
                bookingId={booking.id}
                partnerLabel={booking.renterName}
              />
            </article>
          ))
        ) : (
          <div className="rounded-[26px] border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-stone-600">
            Chưa có booking nào cho tài khoản này.
          </div>
        )}
      </div>
    </section>
  );
}
