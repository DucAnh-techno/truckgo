"use client";

import { useState, useTransition } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { createReview } from "@/lib/services/reviews";

interface ReviewComposerProps {
  bookingId: string;
  onSubmitted?: () => Promise<void> | void;
}

export function ReviewComposer({
  bookingId,
  onSubmitted,
}: ReviewComposerProps) {
  const { profile, isConfigured } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        if (!isConfigured) {
          throw new Error("Firebase chưa được cấu hình để gửi đánh giá.");
        }

        if (!profile) {
          throw new Error("Bạn cần đăng nhập để gửi đánh giá.");
        }

        await createReview({
          bookingId,
          reviewerId: profile.id,
          rating,
          comment,
        });
        setComment("");
        setSuccessMessage("Đánh giá của bạn đã được ghi nhận.");
        await onSubmitted?.();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể gửi đánh giá."
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[24px] border border-stone-200 bg-stone-50 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
            Đánh giá sau chuyến xe
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Booking đã hoàn tất, bạn có thể chia sẻ trải nghiệm của mình.
          </p>
        </div>
        <select
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
          className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} sao
            </option>
          ))}
        </select>
      </div>

      <textarea
        rows={4}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Chủ xe có hỗ trợ nhanh không? Xe có đúng mô tả không?"
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
        required
      />

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
        disabled={isPending}
        className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Đang gửi..." : "Gửi đánh giá"}
      </button>
    </form>
  );
}
