"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { canManageTrucks } from "@/lib/utils/permissions";

interface CreateTruckLinkProps {
  children: ReactNode;
  className: string;
}

export function CreateTruckLink({
  children,
  className,
}: CreateTruckLinkProps) {
  const { profile } = useAuth();

  if (profile && !canManageTrucks(profile.role)) {
    return null;
  }

  return (
    <Link href="/trucks/create" className={className}>
      {children}
    </Link>
  );
}
