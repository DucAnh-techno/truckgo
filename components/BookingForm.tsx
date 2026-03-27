"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  createBooking,
  getBookedDateRangesByTruckId,
  type BookedDateRange,
} from "@/lib/services/bookings";
import { getTruckById } from "@/lib/services/trucks";
import { calculateRentalDays, formatCurrency } from "@/lib/utils/format";
import { canCreateBookings } from "@/lib/utils/permissions";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const dayLabelFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
});

function formatIsoDateToDayMonth(isoDate: string) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return dayLabelFormatter.format(parsed);
}

const LocationMapPicker = dynamic(
  () =>
    import("@/components/ui/LocationMapPicker").then(
      (module) => module.LocationMapPicker
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />
    ),
  }
);

interface BookingFormProps {
  truckId?: string;
  truckName?: string;
  pricePerDay?: number;
  onSubmitted?: () => Promise<void> | void;
}

function getDefaultDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return toLocalIsoDate(date);
}

function toLocalIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateOnlyToTimestamp(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function dateToIso(value: Date) {
  return toLocalIsoDate(value);
}

function startOfCalendarWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const weekDay = start.getDay();
  const mondayOffset = weekDay === 0 ? 6 : weekDay - 1;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function startOfMonthCalendarWeek(year: number, monthIndex: number) {
  return startOfCalendarWeek(new Date(year, monthIndex, 1));
}

function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  const aStart = dateOnlyToTimestamp(startA);
  const aEnd = dateOnlyToTimestamp(endA);
  const bStart = dateOnlyToTimestamp(startB);
  const bEnd = dateOnlyToTimestamp(endB);

  return aStart < bEnd && bStart < aEnd;
}

export function BookingForm({
  truckId,
  truckName,
  pricePerDay,
  onSubmitted,
}: BookingFormProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const yearOptions = Array.from({ length: 7 }, (_, index) => currentYear - 1 + index);

  const [isPending, startTransition] = useTransition();
  const { profile, isConfigured, isLoading } = useAuth();
  const [startDate, setStartDate] = useState(() => getDefaultDate(1));
  const [endDate, setEndDate] = useState(() => getDefaultDate(3));
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  const [resolvedTruckName, setResolvedTruckName] = useState(truckName ?? "");
  const [resolvedTruckId, setResolvedTruckId] = useState(truckId ?? "");
  const [resolvedPricePerDay, setResolvedPricePerDay] = useState(
    pricePerDay ?? 0
  );
  const [resolvedOwnerId, setResolvedOwnerId] = useState("");
  const [note, setNote] = useState("");
  const [includeLoadingService, setIncludeLoadingService] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [bookedRanges, setBookedRanges] = useState<BookedDateRange[]>([]);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [calendarSelectionAnchor, setCalendarSelectionAnchor] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  async function resolveAddress(latitude: number, longitude: number) {
    setIsResolvingAddress(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=vi`
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { display_name?: string };
      if (data.display_name) {
        setDeliveryAddress(data.display_name);
      }
    } finally {
      setIsResolvingAddress(false);
    }
  }

  async function handleMapPick(latitude: number, longitude: number) {
    setDeliveryLat(latitude);
    setDeliveryLng(longitude);
    await resolveAddress(latitude, longitude);
  }

  function handleUseCurrentLocation() {
    setErrorMessage("");

    if (!navigator.geolocation) {
      setErrorMessage("Thiết bị của bạn không hỗ trợ định vị GPS.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setDeliveryLat(latitude);
        setDeliveryLng(longitude);
        await resolveAddress(latitude, longitude);
        setIsLocating(false);
      },
      () => {
        setErrorMessage("Không thể lấy vị trí hiện tại. Hãy bật quyền truy cập vị trí.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      }
    );
  }

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

        const nextBookedRanges = await getBookedDateRangesByTruckId(truck.id);
        if (!active) {
          return;
        }
        setBookedRanges(nextBookedRanges);
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
  const hasDateConflict = bookedRanges.some((range) =>
    rangesOverlap(startDate, endDate, range.startDate, range.endDate)
  );
  const todayIso = getDefaultDate(0);

  function isDateBooked(isoDate: string) {
    const dayTs = dateOnlyToTimestamp(isoDate);
    return bookedRanges.some((range) => {
      const startTs = dateOnlyToTimestamp(range.startDate);
      const endTs = dateOnlyToTimestamp(range.endDate);
      return startTs <= dayTs && dayTs < endTs;
    });
  }

  function hasBookedDateInRange(rangeStart: string, rangeEnd: string) {
    const from = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const to = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    return bookedRanges.some((range) => rangesOverlap(from, to, range.startDate, range.endDate));
  }

  const calendarStart = startOfMonthCalendarWeek(calendarYear, calendarMonth);
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(day.getDate() + index);
    const isoDate = dateToIso(day);
    const isBooked = isDateBooked(isoDate);
    const isPast = isoDate < todayIso;
    const isCurrentMonth = day.getMonth() === calendarMonth;

    const rangeStart = startDate <= endDate ? startDate : endDate;
    const rangeEnd = startDate <= endDate ? endDate : startDate;
    const isInSelectedRange =
      startDate === endDate
        ? isoDate === startDate
        : isoDate >= rangeStart && isoDate <= rangeEnd;
    const isSelectedStart = isoDate === startDate;
    const isSelectedEnd = isoDate === endDate;

    return {
      key: `${isoDate}-${index}`,
      isoDate,
      dayLabel: dayLabelFormatter.format(day),
      isBooked,
      isPast,
      isCurrentMonth,
      isInSelectedRange,
      isSelectedStart,
      isSelectedEnd,
    };
  });

  function handleCalendarDatePick(isoDate: string, disabled: boolean) {
    if (disabled) {
      return;
    }

    setErrorMessage("");

    if (!calendarSelectionAnchor) {
      setCalendarSelectionAnchor(isoDate);
      setStartDate(isoDate);
      setEndDate(isoDate);
      return;
    }

    const nextStart = calendarSelectionAnchor <= isoDate ? calendarSelectionAnchor : isoDate;
    const nextEnd = calendarSelectionAnchor <= isoDate ? isoDate : calendarSelectionAnchor;

    if (hasBookedDateInRange(nextStart, nextEnd)) {
      setErrorMessage("Khoảng ngày chọn có lịch đã kín. Vui lòng chọn lại.");
      setCalendarSelectionAnchor(null);
      return;
    }

    setStartDate(nextStart);
    setEndDate(nextEnd);
    setCalendarSelectionAnchor(null);
  }

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

        const normalizedDeliveryAddress = deliveryAddress.trim();
        if (!normalizedDeliveryAddress) {
          throw new Error("Vui lòng nhập địa điểm giao xe.");
        }

        if (deliveryLat === null || deliveryLng === null) {
          throw new Error("Vui lòng chọn vị trí giao xe trên bản đồ.");
        }

        if (hasDateConflict) {
          throw new Error("Khung ngày đã chọn đang có lịch thuê. Vui lòng chọn ngày khác.");
        }

        const booking = await createBooking({
          truckId: resolvedTruckId,
          renterId: profile.id,
          startDate,
          endDate,
          deliveryAddress: normalizedDeliveryAddress,
          deliveryLat,
          deliveryLng,
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

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              value={calendarMonth}
              onChange={(event) => {
                setCalendarMonth(Number(event.target.value));
                setCalendarSelectionAnchor(null);
              }}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 outline-none transition focus:border-orange-400"
              aria-label="Chọn tháng"
            >
              {Array.from({ length: 12 }, (_, monthIndex) => (
                <option key={monthIndex} value={monthIndex}>
                  Tháng {monthIndex + 1}
                </option>
              ))}
            </select>
            <select
              value={calendarYear}
              onChange={(event) => {
                setCalendarYear(Number(event.target.value));
                setCalendarSelectionAnchor(null);
              }}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 outline-none transition focus:border-orange-400"
              aria-label="Chọn năm"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  Năm {year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-stone-600">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Đang chọn
            </span>
            <span className="inline-flex items-center gap-1 text-stone-600">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Đã kín
            </span>
            <span className="inline-flex items-center gap-1 text-stone-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Còn trống
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-stone-500">
          Chạm 1 lần để chọn ngày bắt đầu, chạm lần 2 để chọn ngày kết thúc.
        </p>

        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const isDisabled = day.isPast || day.isBooked;
            const baseStyle = day.isBooked
              ? "border-red-200 bg-red-50 text-red-700"
              : day.isPast
                ? "border-stone-200 bg-stone-100 text-stone-400"
                : "border-emerald-200 bg-emerald-50 text-emerald-700";
            const selectedStyle = day.isSelectedStart || day.isSelectedEnd
              ? "border-orange-600 bg-orange-500 text-white"
              : day.isInSelectedRange
                ? "border-orange-200 bg-orange-100 text-orange-800"
                : "";
            const fadedStyle = day.isCurrentMonth ? "" : "opacity-50";

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => handleCalendarDatePick(day.isoDate, isDisabled)}
                disabled={isDisabled}
                className={`rounded-xl border px-2 py-2 text-center text-xs transition ${baseStyle} ${selectedStyle} ${fadedStyle} ${
                  isDisabled ? "cursor-not-allowed opacity-80" : "hover:-translate-y-0.5 hover:shadow-sm"
                }`}
                title={day.isoDate}
              >
                <div className="font-semibold">{day.dayLabel}</div>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-stone-600">
          Bạn đã chọn: {formatIsoDateToDayMonth(startDate)} đến {formatIsoDateToDayMonth(endDate)}
        </p>

        {hasDateConflict ? (
          <p className="mt-3 text-sm font-medium text-red-700">
            Khoảng ngày bạn chọn đang trùng lịch thuê. Vui lòng điều chỉnh ngày bắt đầu hoặc kết thúc.
          </p>
        ) : null}
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

      <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-stone-800">Địa điểm giao xe (bắt buộc)</p>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLocating ? "Đang lấy vị trí..." : "Dùng vị trí hiện tại"}
          </button>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Địa chỉ giao xe</span>
          <input
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            placeholder="Nhập địa chỉ cụ thể hoặc chọn điểm trên bản đồ"
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400"
          />
        </label>

        <LocationMapPicker
          latitude={deliveryLat}
          longitude={deliveryLng}
          onPick={(latitude, longitude) => {
            void handleMapPick(latitude, longitude);
          }}
        />

        <p className="text-xs text-stone-500">
          {isResolvingAddress
            ? "Đang tự động lấy địa chỉ từ vị trí..."
            : deliveryLat !== null && deliveryLng !== null
              ? `Tọa độ đã chọn: ${deliveryLat.toFixed(6)}, ${deliveryLng.toFixed(6)}`
              : "Nhấn vào bản đồ để chọn vị trí giao xe chính xác."}
        </p>
      </div>

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
        disabled={isPending || isOwnTruck || hasDateConflict}
        className="w-full rounded-full bg-stone-950 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Đang tạo booking..." : "Gửi yêu cầu đặt xe"}
      </button>
    </form>
  );
}
