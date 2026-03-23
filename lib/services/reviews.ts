import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db, ensureFirebaseConfigured, isFirebaseConfigured } from "@/lib/firebase/config";
import { getBookingById } from "@/lib/services/bookings";
import { COLLECTIONS, type Review } from "@/types";

const demoReviews: Review[] = [
  {
    id: "review_01",
    bookingId: "booking_03",
    truckId: "thaco-ollin-da-nang",
    reviewerId: "renter_03",
    targetUserId: "owner_02",
    rating: 5,
    comment: "Chủ xe phản hồi nhanh, xe sạch và giao đúng giờ như đã hẹn.",
    createdAt: "2026-03-18T19:30:00.000Z",
    updatedAt: "2026-03-18T19:30:00.000Z",
  },
  {
    id: "review_02",
    bookingId: "booking_01",
    truckId: "hino-500-long-bien",
    reviewerId: "owner_01",
    targetUserId: "renter_01",
    rating: 5,
    comment: "Người thuê hợp tác, trả xe đúng lịch và giữ xe cẩn thận.",
    createdAt: "2026-03-20T12:00:00.000Z",
    updatedAt: "2026-03-20T12:00:00.000Z",
  },
  {
    id: "review_03",
    bookingId: "booking_01",
    truckId: "hino-500-long-bien",
    reviewerId: "renter_01",
    targetUserId: "owner_01",
    rating: 4,
    comment: "Xe đúng mô tả, cần thêm hướng dẫn nhanh khi nhận xe.",
    createdAt: "2026-03-20T13:00:00.000Z",
    updatedAt: "2026-03-20T13:00:00.000Z",
  },
];

function canUseFirebaseRead() {
  return isFirebaseConfigured && !!db;
}

function sortReviews<T extends Review>(reviews: T[]) {
  return [...reviews].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

function calculateSummary(reviews: Review[]) {
  const totalReviews = reviews.length;
  const avgRating = totalReviews
    ? Math.round(
        (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10
      ) / 10
    : 0;

  return {
    avgRating,
    totalReviews,
  };
}

export async function getReviewsForTargetUser(targetUserId: string) {
  if (!canUseFirebaseRead()) {
    return sortReviews(
      demoReviews.filter((review) => review.targetUserId === targetUserId)
    );
  }

  try {
    const reviewsQuery = query(
      collection(db!, COLLECTIONS.reviews),
      where("targetUserId", "==", targetUserId)
    );
    const snapshot = await getDocs(reviewsQuery);

    return sortReviews(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Review, "id">),
      }))
    );
  } catch {
    return sortReviews(
      demoReviews.filter((review) => review.targetUserId === targetUserId)
    );
  }
}

export async function getReviewsByReviewer(reviewerId: string) {
  if (!canUseFirebaseRead()) {
    return sortReviews(
      demoReviews.filter((review) => review.reviewerId === reviewerId)
    );
  }

  try {
    const reviewsQuery = query(
      collection(db!, COLLECTIONS.reviews),
      where("reviewerId", "==", reviewerId)
    );
    const snapshot = await getDocs(reviewsQuery);

    return sortReviews(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Review, "id">),
      }))
    );
  } catch {
    return sortReviews(
      demoReviews.filter((review) => review.reviewerId === reviewerId)
    );
  }
}

export async function getReviewSummaryForUser(targetUserId: string) {
  const reviews = await getReviewsForTargetUser(targetUserId);
  return calculateSummary(reviews);
}

export async function getReviewSummariesForUsers(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const summaries = await Promise.all(
    uniqueIds.map(async (userId) => [userId, await getReviewSummaryForUser(userId)] as const)
  );

  return new Map(summaries);
}

export async function getReviewForBookingByReviewer(
  bookingId: string,
  reviewerId: string
) {
  const reviews = await getReviewsByReviewer(reviewerId);
  return reviews.find((review) => review.bookingId === bookingId) ?? null;
}

export interface CreateReviewInput {
  bookingId: string;
  reviewerId: string;
  rating: number;
  comment: string;
}

export async function createReview(input: CreateReviewInput) {
  const firebase = ensureFirebaseConfigured();
  const booking = await getBookingById(input.bookingId);

  if (!booking) {
    throw new Error("Không tìm thấy booking để đánh giá.");
  }

  if (booking.status !== "completed") {
    throw new Error("Chỉ booking đã hoàn tất mới có thể được đánh giá.");
  }

  if (
    booking.ownerId !== input.reviewerId &&
    booking.renterId !== input.reviewerId
  ) {
    throw new Error("Bạn không thuộc booking này nên không thể đánh giá.");
  }

  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Số sao đánh giá phải nằm trong khoảng từ 1 đến 5.");
  }

  const existingReview = await getReviewForBookingByReviewer(
    input.bookingId,
    input.reviewerId
  );

  if (existingReview) {
    throw new Error("Bạn đã gửi đánh giá cho booking này rồi.");
  }

  const payload: Omit<Review, "id"> = {
    bookingId: booking.id,
    truckId: booking.truckId,
    reviewerId: input.reviewerId,
    targetUserId:
      booking.ownerId === input.reviewerId ? booking.renterId : booking.ownerId,
    rating: input.rating,
    comment: input.comment.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const reference = await addDoc(collection(firebase.db, COLLECTIONS.reviews), payload);

  return {
    id: reference.id,
    ...payload,
  };
}
