import { formatDate } from "@/lib/utils/format";

export interface ReviewListItem {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ReviewListProps {
  reviews: ReviewListItem[];
  emptyMessage?: string;
}

function renderStars(rating: number) {
  return "★".repeat(Math.max(0, Math.min(5, rating)));
}

export function ReviewList({
  reviews,
  emptyMessage = "Chưa có đánh giá nào.",
}: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-[24px] border border-stone-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-stone-950">{review.reviewerName}</p>
              <p className="mt-1 text-sm text-orange-600">{renderStars(review.rating)}</p>
            </div>
            <p className="text-sm text-stone-500">{formatDate(review.createdAt)}</p>
          </div>
          <p className="mt-3 text-sm leading-7 text-stone-600">{review.comment}</p>
        </article>
      ))}
    </div>
  );
}
