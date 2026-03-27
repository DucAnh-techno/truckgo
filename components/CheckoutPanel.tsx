"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { useAuth } from "@/components/providers/AuthProvider";
import { markBookingPaid } from "@/lib/services/bookings";
import { formatCurrency } from "@/lib/utils/format";
import { getPaymentStatusLabel } from "@/lib/utils/labels";
import type { Booking } from "@/types";

interface CheckoutPanelProps {
  booking: Booking;
}

export function CheckoutPanel({ booking }: CheckoutPanelProps) {
  const { profile } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const bankCode = "MB";
  const accountNumber = "0362982242";
  const amount = booking.totalPrice;
  const orderId = booking.id;
  const note = `Thanh toan booking ${orderId}`;
  const paymentStatus = booking.paymentStatus ?? "unpaid";
  const isPaid = paymentStatus === "paid";

  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(orderId)}`;

  function handleConfirmPayment() {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        if (!profile) {
          throw new Error("Bạn cần đăng nhập để xác nhận thanh toán.");
        }

        await markBookingPaid(booking.id, profile.id);
        setSuccessMessage(
          "Đã ghi nhận thanh toán thành công. Chủ xe sẽ thấy nút Nhận đơn, sau đó bạn có thể xác nhận Đã nhận xe."
        );

        setTimeout(() => {
          router.push(`/bookings?payment=success&bookingId=${booking.id}`);
        }, 900);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể xác nhận thanh toán cho booking này."
        );
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
      <h2 className="text-xl font-semibold text-stone-900">Thanh toán</h2>
      <p className="mt-2 text-sm text-stone-600">Quét mã QR dưới đây để chuyển khoản theo số tiền đơn hàng.</p>
      <div className="mt-4 inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700">
        Trạng thái thanh toán: {getPaymentStatusLabel(paymentStatus)}
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="rounded-lg bg-stone-50 p-4">
          <Image src={qrUrl} alt="QR code" width={300} height={300} unoptimized />
        </div>

        <div className="text-center">
          <p className="text-sm text-stone-600">Ngân hàng</p>
          <p className="mt-1 font-semibold">MB Bank</p>

          <p className="mt-3 text-sm text-stone-600">Số tài khoản</p>
          <p className="mt-1 font-semibold">{accountNumber}</p>

          <p className="mt-3 text-sm text-stone-600">Số tiền</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{formatCurrency(amount)}</p>

          <p className="mt-3 text-xs text-stone-500">Nội dung chuyển khoản: {note}</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleConfirmPayment}
          disabled={isPending || isPaid}
          className="rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {isPaid
            ? "Đơn này đã thanh toán"
            : isPending
              ? "Đang xác nhận..."
              : "Tôi đã chuyển khoản"}
        </button>
      </div>
    </div>
  );
}
