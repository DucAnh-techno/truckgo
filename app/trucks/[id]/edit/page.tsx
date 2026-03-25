"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { TruckForm } from "@/components/TruckForm";
import { useAuth } from "@/components/providers/AuthProvider";
import { getTruckById, type TruckCatalogItem } from "@/lib/services/trucks";
import { canManageTrucks } from "@/lib/utils/permissions";

export default function EditTruckPage() {
  const params = useParams<{ id: string }>();
  const truckId = params?.id;
  const { profile, isLoading, isConfigured } = useAuth();
  const [truck, setTruck] = useState<TruckCatalogItem | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isTruckLoading, setIsTruckLoading] = useState(true);

  useEffect(() => {
    if (!truckId) {
      setErrorMessage("Không xác định được xe cần chỉnh sửa.");
      setIsTruckLoading(false);
      return;
    }

    let active = true;

    async function loadTruck() {
      try {
        const truckDetail = await getTruckById(truckId);

        if (!active) {
          return;
        }

        setTruck(truckDetail);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Không tải được dữ liệu xe."
        );
      } finally {
        if (active) {
          setIsTruckLoading(false);
        }
      }
    }

    void loadTruck();

    return () => {
      active = false;
    };
  }, [truckId]);

  if (!isConfigured) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">Chưa cấu hình Firebase</h1>
        <p className="text-stone-600">
          Hãy điền `.env.local` theo `.env.example` để chỉnh sửa dữ liệu xe thật.
        </p>
      </div>
    );
  }

  if (isLoading || isTruckLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="min-h-96 w-full animate-pulse rounded-[40px] bg-white/80" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">Bạn chưa đăng nhập</h1>
        <p className="text-stone-600">Đăng nhập để chỉnh sửa thông tin xe.</p>
        <Link
          href="/login"
          className="mx-auto inline-flex rounded-full bg-stone-950 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
        >
          Đến trang đăng nhập
        </Link>
      </div>
    );
  }

  if (!canManageTrucks(profile.role)) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">Không có quyền truy cập</h1>
        <p className="text-stone-600">Chỉ chủ xe hoặc quản trị viên mới được chỉnh sửa xe.</p>
      </div>
    );
  }

  if (!truck) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">Không tìm thấy xe</h1>
        <p className="text-stone-600">{errorMessage || "Xe có thể đã bị xóa."}</p>
      </div>
    );
  }

  if (profile.role !== "admin" && profile.id !== truck.ownerId) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">Không có quyền chỉnh sửa</h1>
        <p className="text-stone-600">Bạn không sở hữu xe này.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 rounded-[40px] border border-white/70 bg-white/80 p-7 shadow-[0_24px_70px_rgba(41,24,12,0.06)] lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
            Dashboard chỉnh sửa
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-950">
            Cập nhật thông tin xe để tối ưu tỷ lệ đặt đơn
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-stone-600">
            Chỉnh sửa thông số, ảnh chính và giấy tờ xe để giữ hồ sơ phương tiện luôn
            chính xác và đáng tin cậy.
          </p>
        </div>
      </section>

      <TruckForm mode="edit" truckId={truck.id} initialTruck={truck} />
    </div>
  );
}
