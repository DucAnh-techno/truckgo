"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminModerationPanel } from "@/components/AdminModerationPanel";
import { OwnerBookingsPanel } from "@/components/OwnerBookingsPanel";
import { ProfileReviewsPanel } from "@/components/ProfileReviewsPanel";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  deleteTruck,
  getOwnerTrucks,
  type TruckCatalogItem,
} from "@/lib/services/trucks";
import { getRoleLabel } from "@/lib/utils/labels";
import { canManageTrucks } from "@/lib/utils/permissions";

export default function ProfilePage() {
  const { profile, isConfigured, isLoading } = useAuth();
  const [trucks, setTrucks] = useState<TruckCatalogItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfileData() {
      if (!profile || !canManageTrucks(profile.role)) {
        if (active) {
          setTrucks([]);
        }
        return;
      }

      try {
        const [nextTrucks] = await Promise.all([getOwnerTrucks(profile.id)]);

        if (!active) {
          return;
        }

        setTrucks(nextTrucks);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải profile."
        );
      }
    }

    void loadProfileData();

    return () => {
      active = false;
    };
  }, [profile]);

  async function handleDeleteTruck(truckId: string) {
    if (!profile) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa xe này? Hành động này không thể hoàn tác."
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(truckId);
      setErrorMessage("");
      await deleteTruck(truckId, profile.id);
      setTrucks((prev) => prev.filter((truck) => truck.id !== truckId));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể xóa xe, vui lòng thử lại."
      );
    } finally {
      setIsDeleting(null);
    }
  }

  if (!isConfigured) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">
          Chưa cấu hình Firebase
        </h1>
        <p className="text-stone-600">
          Hãy điền `.env.local` theo `.env.example` để xem profile và dữ liệu thật.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="min-h-96 w-full animate-pulse rounded-[40px] bg-white/80" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">
          Bạn chưa đăng nhập
        </h1>
        <p className="text-stone-600">
          Đăng nhập để xem profile, trạng thái xác minh và các đơn thuê của bạn.
        </p>
        <Link
          href="/login"
          className="mx-auto inline-flex rounded-full bg-stone-950 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
        >
          Đến trang đăng nhập
        </Link>
      </div>
    );
  }

  const hasBusinessLicense = profile.verificationDocs.some(
    (document) => document.type === "businessLicense"
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[38px] bg-[linear-gradient(135deg,#1f1612,#45271c)] p-8 text-white shadow-[0_28px_80px_rgba(31,22,18,0.18)]">
          <div className="flex items-center gap-4">
            <div className="grid h-18 w-18 place-items-center rounded-[28px] bg-white/12 text-2xl font-semibold">
              {profile.name
                .split(" ")
                .slice(-2)
                .map((part) => part[0])
                .join("")}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-200">
                {hasBusinessLicense ? "Hồ sơ doanh nghiệp" : "Hồ sơ cá nhân"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{profile.name}</h1>
              <p className="mt-1 text-white/74">{profile.email}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/8 p-5">
              <p className="text-sm text-white/60">Vai trò</p>
              <p className="mt-2 text-2xl font-semibold">{getRoleLabel(profile.role)}</p>
            </div>
            <div className="rounded-3xl bg-white/8 p-5">
              <p className="text-sm text-white/60">Xe đang quản lý</p>
              <p className="mt-2 text-2xl font-semibold">{trucks.length}</p>
            </div>
            <div className="rounded-3xl bg-white/8 p-5">
              <p className="text-sm text-white/60">Xác thực</p>
              <div className="mt-3">
                <VerifiedBadge
                  isVerified={profile.isVerified}
                  verificationStatus={profile.verificationStatus}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
              Thông tin liên hệ
            </p>
            <div className="mt-5 space-y-4 text-sm text-stone-600">
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Số điện thoại</span>
                <span className="font-semibold text-stone-900">
                  {profile.phone || "Chưa cập nhật"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Trạng thái</span>
                <VerifiedBadge
                  isVerified={profile.isVerified}
                  verificationStatus={profile.verificationStatus}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>Xác minh email</span>
                <span className="font-semibold text-stone-900">
                  {profile.emailVerified ? "Đã xác nhận" : "Chưa xác nhận"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-orange-50 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-600">
              Hành động nhanh
            </p>
            <div className="mt-5 space-y-3">
              <Link
                href="/profile/verification"
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 font-semibold text-stone-900 transition hover:text-orange-600"
              >
                <span>Tải giấy tờ xác thực</span>
                <span>&rarr;</span>
              </Link>
              {canManageTrucks(profile.role) ? (
                <Link
                  href="/trucks/create"
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 font-semibold text-stone-900 transition hover:text-orange-600"
                >
                  <span>Đăng xe mới</span>
                  <span>+</span>
                </Link>
              ) : null}
              <Link
                href="/bookings"
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 font-semibold text-stone-900 transition hover:text-orange-600"
              >
                <span>Không gian booking</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {canManageTrucks(profile.role) ? (
        <section>
          <div className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
                  Danh sách xe đã đăng
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                  Gian xe của bạn
                </h2>
              </div>
              <Link
                href="/trucks/create"
                className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Thêm xe
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {trucks.length > 0 ? (
                trucks.map((truck) => (
                  <div
                    key={truck.id}
                    className="flex flex-col gap-4 rounded-[26px] border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">
                        {truck.category}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-stone-950">
                        {truck.name}
                      </h3>
                      <p className="mt-1 text-sm text-stone-600">{truck.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/trucks/${truck.id}`}
                        className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
                      >
                        Xem bài đăng
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTruck(truck.id)}
                        disabled={isDeleting === truck.id}
                        className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:bg-red-100 disabled:text-red-400"
                      >
                        {isDeleting === truck.id ? "Đang xóa..." : "Xóa xe"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[26px] border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
                  Bạn chưa có xe nào trong Firestore.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <ProfileReviewsPanel user={profile} />
      <OwnerBookingsPanel />
      <AdminModerationPanel />
    </div>
  );
}
