"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";

interface TruckOwnerRedirectGateProps {
  truckId: string;
  ownerId: string;
}

export function TruckOwnerRedirectGate({
  truckId,
  ownerId,
}: TruckOwnerRedirectGateProps) {
  const router = useRouter();
  const { profile, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !profile) {
      return;
    }

    if (profile.role === "owner" && profile.id === ownerId) {
      router.replace(`/trucks/${truckId}/edit`);
    }
  }, [isLoading, ownerId, profile, router, truckId]);

  return null;
}
