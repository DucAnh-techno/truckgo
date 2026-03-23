"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { loginWithEmail, registerWithEmail } from "@/lib/services/auth";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { profile, isConfigured, isLoading, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "renter">("owner");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        if (!isConfigured) {
          throw new Error(
            "Firebase chưa được cấu hình. Hãy điền file .env.local trước."
          );
        }

        if (mode === "register") {
          await registerWithEmail({
            name,
            email,
            password,
            role,
          });
          await refreshProfile();
          setSuccessMessage(
            "Đăng ký thành công."
          );
        } else {
          await loginWithEmail({
            email,
            password,
          });
          await refreshProfile();
          setSuccessMessage("Đăng nhập thành công.");
        }

        router.push("/profile");
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể xử lý yêu cầu."
        );
      }
    });
  }

  if (!isLoading && profile) {
    return (
      <div className="space-y-5 rounded-4xl border border-white/70 bg-white p-7 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
          Tài khoản
        </p>
        <h2 className="text-3xl font-semibold text-stone-950">
          Bạn đã đăng nhập
        </h2>
        <p className="text-sm leading-7 text-stone-600">
          Xin chào {profile.name}. Bạn có thể vào profile để quản lý hồ sơ, xe
          đã đăng và các đơn thuê của mình.
        </p>
        <Link
          href="/profile"
          className="inline-flex rounded-full bg-stone-950 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
        >
          Đến trang profile
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-4xl border border-white/70 bg-white p-7 shadow-[0_20px_60px_rgba(41,24,12,0.08)]"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
          {mode === "login" ? "Đăng nhập" : "Đăng ký"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-stone-950">
          {mode === "login"
            ? "Truy cập tài khoản của bạn"
            : "Tạo tài khoản bằng email và mật khẩu"}
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          {mode === "login"
            ? "Đăng nhập để thuê xe, quản lý hồ sơ và đăng xe nếu bạn là chủ xe."
            : ""}
        </p>
      </div>

      {mode === "register" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Họ và tên</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nguyễn Văn A"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            required
          />
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-700">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@example.com"
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-700">Mật khẩu</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Tối thiểu 6 ký tự"
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
          minLength={6}
          required
        />
      </label>

      {mode === "register" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Vai trò</span>
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "owner" | "renter")
            }
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
          >
            <option value="owner">Chủ xe</option>
            <option value="renter">Người thuê</option>
          </select>
        </label>
      ) : null}

      <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-stone-700">
        <p className="font-semibold text-orange-600">Lưu ý</p>
        <p className="mt-1">
          {mode === "login"
            ? "Nếu đã đăng ký trước đó, bạn chỉ cần đăng nhập bằng email và mật khẩu."
            : role === "owner"
              ? "Tài khoản chủ xe có thể vừa đăng xe vừa thuê xe của người khác, nhưng không thể tự thuê xe do chính mình đăng."
              : "Tài khoản người thuê chỉ hiển thị các tính năng thuê xe. Sau khi gửi giấy tờ và được admin duyệt, xác minh sẽ hiển thị trên hồ sơ."}
        </p>
      </div>

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

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-stone-950 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending
          ? "Đang xử lý..."
          : mode === "login"
            ? "Đăng nhập"
            : "Đăng ký"}
      </button>

      <p className="text-sm text-stone-600">
        {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
        <Link
          href={mode === "login" ? "/register" : "/login"}
          className="font-semibold text-orange-600 transition hover:text-orange-700"
        >
          {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
        </Link>
      </p>
    </form>
  );
}
