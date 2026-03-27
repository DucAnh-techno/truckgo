import Link from "next/link";

import { OwnerBookingsPanel } from "@/components/OwnerBookingsPanel";
import { ProfileReviewsPanel } from "@/components/ProfileReviewsPanel";
import { getOwnerTrucks, type TruckCatalogItem } from "@/lib/services/trucks";
import { getPublicUserProfileById } from "@/lib/services/users";
import { formatCurrency } from "@/lib/utils/format";
import type { PublicUserProfile, User } from "@/types";

interface OwnerPageProps {
  params: Promise<{ ownerId: string }>;
}

export default async function OwnerPage({ params }: OwnerPageProps) {
  const { ownerId } = await params;

  let owner: PublicUserProfile | null = null;
  let trucks: TruckCatalogItem[] = [];

  try {
    owner = await getPublicUserProfileById(ownerId);
    trucks = await getOwnerTrucks(ownerId);
  } catch (error) {
    // ignore - show fallback
  }

  const reviewPanelUser = owner
    ? {
        id: owner.id,
        isVerified: owner.isVerified,
        verificationStatus: (owner.isVerified
          ? "verified"
          : "unsubmitted") as User["verificationStatus"],
        createdAt: owner.createdAt,
        role: owner.role,
      }
    : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">{owner?.name ?? ownerId}</h1>
          <p className="mt-1 text-sm text-stone-600">Trang cá nhân công khai của chủ xe.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/chat/${ownerId}`} className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">Nhắn chủ xe</Link>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6">
          <h2 className="text-lg font-semibold">Thông tin chủ xe</h2>
          <div className="mt-4 space-y-3 text-sm text-stone-600">
            <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
              <span>Vai trò</span>
              <span className="font-semibold text-stone-900">{owner?.role ?? "owner"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
              <span>Đánh giá trung bình</span>
              <span className="font-semibold text-stone-900">{owner?.avgRating ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
              <span>Tổng đánh giá</span>
              <span className="font-semibold text-stone-900">{owner?.totalReviews ?? 0}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 mb-6">
            <h3 className="text-lg font-semibold">Xe của chủ xe</h3>
            <div className="mt-4 grid gap-4">
              {trucks.length > 0 ? (
                trucks.map((truck) => (
                  <div key={truck.id} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{truck.name}</p>
                      <p className="text-sm text-stone-600">{truck.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(truck.pricePerDay)}</p>
                      <Link href={`/trucks/${truck.id}`} className="mt-2 inline-block text-sm text-orange-600">Xem bài đăng</Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600">Chưa có xe nào được đăng bởi người này.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <ProfileReviewsPanel userId={ownerId} user={reviewPanelUser} />
      </section>
    </div>
  );
}
