"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { changeUserPassword } from "@/lib/services/auth";

export default function ChangePasswordPage() {
  const { profile, isConfigured, isLoading } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        if (!isConfigured) {
          throw new Error("Firebase chưa được cấu hình.");
        }

        if (!profile) {
          throw new Error("Bạn cần đăng nhập để đổi mật khẩu.");
        }

        if (!currentPassword) {
          throw new Error("Hãy nhập mật khẩu hiện tại.");
        }

        if (!newPassword || newPassword.length < 8) {
          throw new Error("Mật khẩu mới cần có ít nhất 8 ký tự.");
        }

        if (newPassword === currentPassword) {
          throw new Error("Mật khẩu mới phải khác mật khẩu hiện tại.");
        }

        if (newPassword !== confirmPassword) {
          throw new Error("Xác nhận mật khẩu mới không khớp.");
        }

        await changeUserPassword({
          currentPassword,
          newPassword,
        });

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMessage("Đổi mật khẩu thành công.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể đổi mật khẩu lúc này."
        );
      }
    });
  }

  if (!isConfigured) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">Chưa cấu hình Firebase</h1>
        <p className="text-stone-600">Hãy điền file .env.local để dùng tính năng tài khoản.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-80 animate-pulse rounded-[36px] bg-white/80" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-stone-950">Bạn chưa đăng nhập</h1>
        <p className="text-stone-600">Đăng nhập để đổi mật khẩu tài khoản.</p>
        <Link
          href="/login"
          className="mx-auto inline-flex rounded-full bg-stone-950 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
        >
          Đến trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[36px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(41,24,12,0.1)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
          Bảo mật tài khoản
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Đổi mật khẩu</h1>
        <p className="mt-2 text-sm text-stone-600">
          Tài khoản: <span className="font-semibold text-stone-900">{profile.email}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Mật khẩu hiện tại</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Mật khẩu mới</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Xác nhận mật khẩu mới</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/profile"
              className="inline-flex rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
            >
              Quay lại hồ sơ
            </Link>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex justify-center rounded-full bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Đang cập nhật..." : "Lưu mật khẩu mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
