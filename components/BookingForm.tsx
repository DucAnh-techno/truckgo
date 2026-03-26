"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { createBooking } from "@/lib/services/bookings";
import { getTruckById } from "@/lib/services/trucks";
import { calculateRentalDays, formatCurrency } from "@/lib/utils/format";
import { canCreateBookings } from "@/lib/utils/permissions";

interface BookingFormProps {
  truckId?: string;
  truckName?: string;
  pricePerDay?: number;
  onSubmitted?: () => Promise<void> | void;
}

function getDefaultDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function BookingForm({
  truckId,
  truckName,
  pricePerDay,
  onSubmitted,
}: BookingFormProps) {
  const [isPending, startTransition] = useTransition();
  const { profile, isConfigured, isLoading } = useAuth();
  const [startDate, setStartDate] = useState(() => getDefaultDate(1));
  const [endDate, setEndDate] = useState(() => getDefaultDate(3));
  const [resolvedTruckName, setResolvedTruckName] = useState(truckName ?? "");
  const [resolvedTruckId, setResolvedTruckId] = useState(truckId ?? "");
  const [resolvedPricePerDay, setResolvedPricePerDay] = useState(
    pricePerDay ?? 0
  );
  const [resolvedOwnerId, setResolvedOwnerId] = useState("");
  const [note, setNote] = useState("");
  const [includeLoadingService, setIncludeLoadingService] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function loadTruck() {
      if (!truckId) {
        return;
      }

      try {
        const truck = await getTruckById(truckId);
        if (!active || !truck) {
          return;
        }

        setResolvedTruckId(truck.id);
        setResolvedTruckName(truck.name);
        setResolvedPricePerDay(truck.pricePerDay);
        setResolvedOwnerId(truck.ownerId);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải thông tin xe."
        );
      }

      if (!active) {
        return;
      }
    }

    void loadTruck();

    return () => {
      active = false;
    };
  }, [pricePerDay, truckId, truckName]);

  const rentalDays = calculateRentalDays(startDate, endDate);
  const LOADING_FEE = 200000; // flat fee for bốc xếp
  const totalPrice = rentalDays * resolvedPricePerDay + (includeLoadingService ? LOADING_FEE : 0);
  const isOwnTruck = Boolean(profile && resolvedOwnerId && profile.id === resolvedOwnerId);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        if (!isConfigured) {
          throw new Error(
            "Firebase chưa được cấu hình. Hãy điền `.env.local` trước khi đặt xe."
          );
        }

        if (!profile) {
          throw new Error("Bạn cần đăng nhập trước khi tạo booking.");
        }

        if (!canCreateBookings(profile.role)) {
          throw new Error("Tài khoản hiện tại không có quyền tạo booking.");
        }

        if (!resolvedTruckId) {
          throw new Error("Không tìm thấy thông tin xe để đặt.");
        }

        if (isOwnTruck) {
          throw new Error("Bạn không thể thuê chính chiếc xe do mình đăng.");
        }

        const booking = await createBooking({
          truckId: resolvedTruckId,
          renterId: profile.id,
          startDate,
          endDate,
          loadingService: includeLoadingService,
        });
        await onSubmitted?.();

        // redirect renter to checkout page to complete payment
        if (booking?.id) {
          router.push(`/bookings/checkout/${booking.id}`);
          return;
        }

        setSuccessMessage(
          `Booking đã được tạo với trạng thái chờ xác nhận.${note ? " Ghi chú của bạn đã được lưu trong phiên đặt này." : ""}`
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tạo booking."
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
          Đặt xe
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-stone-950">
          Tạo yêu cầu thuê nhanh
        </h3>
        <p className="mt-2 text-sm text-stone-600">
          Yêu cầu của bạn sẽ được gửi tới chủ xe để xác nhận lịch và giá cuối
          cùng.
        </p>
      </div>

      <input type="hidden" name="truckId" value={resolvedTruckId} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-700">Tên xe</span>
        <input
          value={resolvedTruckName}
          disabled
          className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-600"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Ngày bắt đầu</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Ngày kết thúc</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-700">Ghi chú</span>
        <textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Cần tài xế, cần xuất hóa đơn, cần giao xe sớm..."
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
        />
      </label>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={includeLoadingService}
          onChange={(e) => setIncludeLoadingService(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-orange-600"
        />
        <span className="text-sm text-stone-700">Bao gồm dịch vụ bốc xếp (Phí cố định: {formatCurrency(LOADING_FEE)})</span>
      </label>

      {!isConfigured ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          Firebase chưa được cấu hình. Hãy điền `.env.local` để sử dụng booking
          thật.
        </div>
      ) : null}

      {!isLoading && !profile ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          Bạn cần đăng nhập trước khi đặt xe.{" "}
          <Link href="/login" className="font-semibold text-orange-600">
            Đăng nhập ngay
          </Link>
        </div>
      ) : null}

      {isOwnTruck ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Đây là xe do bạn đăng. Bạn vẫn có thể thuê xe của người khác, nhưng
          không thể tự thuê xe của chính mình.
        </div>
      ) : null}

      <div className="rounded-3xl bg-orange-50 p-4">
        <div className="flex items-center justify-between text-sm text-stone-600">
          <span>Số ngày dự kiến</span>
          <span>{rentalDays} ngày</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-stone-600">Tổng tạm tính</span>
          <span className="text-2xl font-bold text-orange-600">
            {formatCurrency(totalPrice)}
          </span>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || isOwnTruck}
        className="w-full rounded-full bg-stone-950 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Đang tạo booking..." : "Gửi yêu cầu đặt xe"}
      </button>
    </form>
  );
}
