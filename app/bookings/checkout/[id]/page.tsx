"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CheckoutPanel } from "@/components/CheckoutPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingById } from "@/lib/services/bookings";
import type { Booking } from "@/types";

function readParam(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value) ? value[0] : undefined;
}

export default function CheckoutPage() {
  const params = useParams<{ id?: string | string[] }>();
  const bookingId = readParam(params?.id);
  const { profile, isLoading, isConfigured } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBooking() {
      if (!bookingId) {
        if (active) {
          setErrorMessage("Mã booking không hợp lệ.");
          setIsPageLoading(false);
        }
        return;
      }

      if (!isConfigured) {
        if (active) {
          setErrorMessage("Firebase chưa được cấu hình để tải thông tin thanh toán.");
          setIsPageLoading(false);
        }
        return;
      }

      if (isLoading) {
        return;
      }

      if (!profile) {
        if (active) {
          setErrorMessage("Bạn cần đăng nhập để xem trang thanh toán.");
          setIsPageLoading(false);
        }
        return;
      }

      setIsPageLoading(true);
      setErrorMessage("");

      try {
        const foundBooking = await getBookingById(bookingId);

        if (!active) {
          return;
        }

        if (!foundBooking) {
          setErrorMessage("Không tìm thấy booking hoặc bạn không có quyền truy cập.");
          setBooking(null);
          return;
        }

        setBooking(foundBooking);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải thông tin checkout."
        );
        setBooking(null);
      } finally {
        if (active) {
          setIsPageLoading(false);
        }
      }
    }

    void loadBooking();

    return () => {
      active = false;
    };
  }, [bookingId, isConfigured, isLoading, profile]);

  if (isPageLoading || isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 text-center text-sm text-stone-600">
        Đang tải thông tin thanh toán...
      </div>
    );
  }

  if (errorMessage || !booking) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Không tìm thấy booking</h1>
        <p className="mt-2 text-sm text-stone-600">
          {errorMessage || "Mã booking không hợp lệ hoặc đã hết hạn."}
        </p>
        <Link
          href="/bookings"
          className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700"
        >
          Quay lại đơn thuê
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <CheckoutPanel booking={booking} />
    </div>
  );
}
