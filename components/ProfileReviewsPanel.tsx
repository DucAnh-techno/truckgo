"use client";

import { useEffect, useState } from "react";

import { ReviewList, type ReviewListItem } from "@/components/ReviewList";
import { TrustSummary } from "@/components/TrustSummary";
import { getReviewsForTargetUser, getReviewSummaryForUser } from "@/lib/services/reviews";
import { getPublicUserProfilesByIds } from "@/lib/services/users";
import type { User } from "@/types";

type ProfileReviewsPanelUser = Pick<
  User,
  "id" | "isVerified" | "verificationStatus" | "createdAt" | "role"
>;

interface ProfileReviewsPanelProps {
  userId?: string;
  user?: ProfileReviewsPanelUser;
}

export function ProfileReviewsPanel({ userId, user }: ProfileReviewsPanelProps) {
  const targetUserId = user?.id ?? userId;

  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!targetUserId) {
      setErrorMessage("Không tìm thấy người dùng để tải đánh giá.");
      return;
    }

    let active = true;

    async function loadReviews() {
      try {
        const [nextReviews, summary] = await Promise.all([
          getReviewsForTargetUser(targetUserId),
          getReviewSummaryForUser(targetUserId),
        ]);
        const reviewerProfiles = await getPublicUserProfilesByIds(
          nextReviews.map((review) => review.reviewerId)
        );

        if (!active) {
          return;
        }

        setAvgRating(summary.avgRating);
        setTotalReviews(summary.totalReviews);
        setReviews(
          nextReviews.map((review) => ({
            id: review.id,
            reviewerName:
              reviewerProfiles.get(review.reviewerId)?.name ?? review.reviewerId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
          }))
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải đánh giá."
        );
      }
    }

    void loadReviews();

    return () => {
      active = false;
    };
  }, [targetUserId]);

  return (
    <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-4xl bg-[linear-gradient(135deg,#1f1612,#45271c)] p-6 text-white shadow-[0_20px_60px_rgba(31,22,18,0.16)]">
        <h2 className="mt-2 text-2xl font-semibold">Uy tín của tài khoản này</h2>
        <p className="mt-3 text-sm leading-7 text-white/74">
          Giấy tờ xác minh, rating, tổng review và thời gian tham gia được thể hiện ở
          đây để người dùng nhận biết mức độ tin cậy.
        </p>

        <div className="mt-6">
          {user ? (
            <TrustSummary
              isVerified={user.isVerified}
              verificationStatus={user.verificationStatus}
              avgRating={avgRating}
              totalReviews={totalReviews}
              memberSince={user.createdAt}
              role={user.role}
            />
          ) : (
            <div className="rounded-3xl bg-white/10 p-5 text-sm text-white/80">
              Không có dữ liệu hồ sơ công khai để hiển thị mức độ uy tín.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
          Đánh giá
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-950">
          Đánh giá nhận được
        </h2>

        {errorMessage ? (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6">
          <ReviewList
            reviews={reviews}
            emptyMessage="Tài khoản này chưa nhận được đánh giá nào."
          />
        </div>
      </div>
    </section>
  );
}
