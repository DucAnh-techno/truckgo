"use client";

import Link from "next/link";

import { useAuth } from "@/components/providers/AuthProvider";
import { canManageTrucks } from "@/lib/utils/permissions";

interface EditTruckButtonProps {
  truckId: string;
  ownerId: string;
}

export function EditTruckButton({ truckId, ownerId }: EditTruckButtonProps) {
  const { profile } = useAuth();

  if (!profile || !canManageTrucks(profile.role)) {
    return null;
  }

  if (profile.role !== "admin" && profile.id !== ownerId) {
    return null;
  }

  return (
    <div className="mt-4">
      <Link
        href={`/trucks/${truckId}/edit`}
        className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
      >
        Chỉnh sửa xe
      </Link>
    </div>
  );
}
