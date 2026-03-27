"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { logoutUser } from "@/lib/services/auth";
import { useAuth } from "@/components/providers/AuthProvider";

export function HeaderAuthControls() {
  const router = useRouter();
  const menuId = useId();
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { profile, isConfigured, isLoading } = useAuth();

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!menuContainerRef.current) {
        return;
      }

      const targetNode = event.target as Node | null;
      if (targetNode && !menuContainerRef.current.contains(targetNode)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  function handleLogout() {
    startTransition(async () => {
      await logoutUser();
      setIsMenuOpen(false);
      router.push("/");
      router.refresh();
    });
  }

  if (!isConfigured) {
    return (
      <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
        Chưa gắn Firebase env
      </span>
    );
  }

  if (isLoading) {
    return (
      <span className="inline-flex rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-500">
        Đang tải...
      </span>
    );
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="inline-flex rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
      >
        Đăng nhập
      </Link>
    );
  }

  return (
    <div ref={menuContainerRef} className="relative flex items-center">
      <div className="inline-flex items-center rounded-full border border-stone-200 bg-white text-sm font-semibold text-stone-800 transition hover:border-stone-900">
        <Link
          href="/profile"
          onClick={() => setIsMenuOpen(false)}
          className="max-w-28 truncate px-4 py-2 text-stone-800 transition hover:text-stone-950 sm:max-w-40"
        >
          {profile.name}
        </Link>

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          onClick={() => setIsMenuOpen((value) => !value)}
          className="rounded-r-full border-l border-stone-200 px-3 py-2 text-stone-700 transition hover:text-stone-950"
        >
          <span
            aria-hidden="true"
            className={`block text-xs transition ${isMenuOpen ? "rotate-180" : ""}`}
          >
            ▾
          </span>
          <span className="sr-only">Mở menu tài khoản</span>
        </button>
      </div>

      {isMenuOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_20px_48px_rgba(41,24,12,0.16)]"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setIsMenuOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-orange-50 hover:text-orange-700"
          >
            Hồ sơ
          </Link>

          <Link
            href="/profile/change-password"
            role="menuitem"
            onClick={() => setIsMenuOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-orange-50 hover:text-orange-700"
          >
            Đổi mật khẩu
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={isPending}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
