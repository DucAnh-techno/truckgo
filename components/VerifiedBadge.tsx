import type { VerificationStatus } from "@/types";

interface VerifiedBadgeProps {
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
}

export function VerifiedBadge({
  isVerified,
  verificationStatus = "unsubmitted",
}: VerifiedBadgeProps) {
  if (isVerified) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Đã xác minh
      </span>
    );
  }

  if (verificationStatus === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        Đang chờ duyệt
      </span>
    );
  }

  if (verificationStatus === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
        Cần bổ sung hồ sơ
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
      Chưa xác minh
    </span>
  );
}
