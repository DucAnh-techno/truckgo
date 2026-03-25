"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { deleteTruck } from "@/lib/services/trucks";
import { canManageTrucks } from "@/lib/utils/permissions";

interface DeleteTruckButtonProps {
  truckId: string;
  ownerId: string;
}

export function DeleteTruckButton({ truckId, ownerId }: DeleteTruckButtonProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile || !canManageTrucks(profile.role)) {
    return null;
  }

  if (profile.role !== "admin" && profile.id !== ownerId) {
    return null;
  }

  const onDelete = async () => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa xe này? Hành động này không thể hoàn tác."
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deleteTruck(truckId, profile.id);
      router.push("/profile");
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Xảy ra lỗi khi xóa xe.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:bg-red-100 disabled:text-red-400"
      >
        {isDeleting ? "Đang xóa..." : "Xóa xe"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
