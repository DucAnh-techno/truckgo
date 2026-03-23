"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { logoutUser } from "@/lib/services/auth";
import { useAuth } from "@/components/providers/AuthProvider";

export function HeaderAuthControls() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { profile, isConfigured, isLoading } = useAuth();

  function handleLogout() {
    startTransition(async () => {
      await logoutUser();
      router.push("/");
      router.refresh();
    });
  }

  if (!isConfigured) {
    return (
      <span className="hidden rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 sm:inline-flex">
        Chưa gắn Firebase env
      </span>
    );
  }

  if (isLoading) {
    return (
      <span className="hidden rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-500 sm:inline-flex">
        Đang tải...
      </span>
    );
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="hidden rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-950 sm:inline-flex"
      >
        Đăng nhập
      </Link>
    );
  }

  return (
    <div className="hidden items-center gap-3 sm:flex">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
      </button>
    </div>
  );
}
