import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatDate } from "@/lib/utils/format";
import { getRoleLabel } from "@/lib/utils/labels";
import type { UserRole, VerificationStatus } from "@/types";

interface TrustSummaryProps {
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  avgRating: number;
  totalReviews: number;
  memberSince: string;
  role?: UserRole;
  compact?: boolean;
}

function formatRating(avgRating: number) {
  return avgRating > 0 ? avgRating.toFixed(1) : "Mới";
}

export function TrustSummary({
  isVerified,
  verificationStatus,
  avgRating,
  totalReviews,
  memberSince,
  role,
  compact = false,
}: TrustSummaryProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <VerifiedBadge
          isVerified={isVerified}
          verificationStatus={verificationStatus}
        />
        <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700">
          {formatRating(avgRating)} / 5
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-1">
          {totalReviews} đánh giá
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-1">
          Tham gia {formatDate(memberSince)}
        </span>
        {role ? (
          <span className="rounded-full bg-stone-950 px-3 py-1 text-white">
            {getRoleLabel(role)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-3xl bg-white/8 p-5">
        <p className="text-sm text-white/60">Trạng thái xác thực</p>
        <div className="mt-3">
          <VerifiedBadge
            isVerified={isVerified}
            verificationStatus={verificationStatus}
          />
        </div>
      </div>
      <div className="rounded-3xl bg-white/8 p-5">
        <p className="text-sm text-white/60">Đánh giá</p>
        <p className="mt-2 text-2xl font-semibold">{formatRating(avgRating)} / 5</p>
      </div>
      <div className="rounded-3xl bg-white/8 p-5">
        <p className="text-sm text-white/60">Tổng review</p>
        <p className="mt-2 text-2xl font-semibold">{totalReviews}</p>
      </div>
      <div className="rounded-3xl bg-white/8 p-5">
        <p className="text-sm text-white/60">Thành viên từ</p>
        <p className="mt-2 text-lg font-semibold">{formatDate(memberSince)}</p>
      </div>
    </div>
  );
}
