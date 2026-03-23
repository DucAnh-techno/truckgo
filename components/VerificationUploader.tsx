"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  getVerificationDocumentTypesForRole,
  submitVerificationDocuments,
} from "@/lib/services/users";
import { getVerificationDocumentTypeLabel } from "@/lib/utils/labels";

export function VerificationUploader() {
  const { profile, isConfigured, refreshProfile } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState("identity");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        if (!isConfigured) {
          throw new Error("Firebase chưa được cấu hình để gửi xác thực.");
        }

        if (!profile) {
          throw new Error("Bạn cần đăng nhập để gửi giấy tờ xác thực.");
        }

        if (files.length === 0) {
          throw new Error("Hãy chọn ít nhất một giấy tờ để gửi xác thực.");
        }

        await submitVerificationDocuments({
          userId: profile.id,
          files,
          documentType: documentType as ReturnType<
            typeof getVerificationDocumentTypesForRole
          >[number],
        });
        await refreshProfile();
        setSuccessMessage(
          "Hồ sơ xác thực đã được tải lên. Admin sẽ kiểm tra và cập nhật badge cho bạn."
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể gửi xác thực."
        );
      }
    });
  }

  if (!profile) {
    return (
      <div className="rounded-4xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        Bạn cần đăng nhập để gửi giấy tờ xác thực.{" "}
        <Link href="/login" className="font-semibold text-orange-600">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const documentOptions = getVerificationDocumentTypesForRole(profile.role);

  return (
    <div className="space-y-6 rounded-4xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
            Hồ sơ xác thực
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">
            Tải giấy tờ để mở khóa trust badge
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
            Tải lên giấy tờ phù hợp với vai trò của bạn. Sau khi được admin duyệt,
            badge xác minh sẽ hiện trên profile và các trang liên quan.
          </p>
        </div>

        <VerifiedBadge
          isVerified={profile.isVerified}
          verificationStatus={profile.verificationStatus}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-orange-50 p-5">
          <p className="text-sm font-semibold text-orange-600">Bước 01</p>
          <p className="mt-3 text-sm text-stone-700">Chọn loại giấy tờ phù hợp</p>
        </div>
        <div className="rounded-3xl bg-orange-50 p-5">
          <p className="text-sm font-semibold text-orange-600">Bước 02</p>
          <p className="mt-3 text-sm text-stone-700">Tải file và mô tả đúng danh mục</p>
        </div>
        <div className="rounded-3xl bg-orange-50 p-5">
          <p className="text-sm font-semibold text-orange-600">Bước 03</p>
          <p className="mt-3 text-sm text-stone-700">Chờ admin duyệt và phản hồi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Loại giấy tờ</span>
          <select
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
          >
            {documentOptions.map((option) => (
              <option key={option} value={option}>
                {getVerificationDocumentTypeLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="block rounded-[28px] border border-dashed border-orange-300 bg-orange-50/80 p-5">
          <span className="text-sm font-semibold text-stone-800">
            Chọn giấy tờ để tải lên
          </span>
          <p className="mt-2 text-sm text-stone-600">
            Gợi ý: {documentOptions.map(getVerificationDocumentTypeLabel).join(", ")}.
          </p>
          <input
            type="file"
            multiple
            className="mt-4 block w-full text-sm text-stone-600 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:font-semibold file:text-white"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {files.length > 0 ? (
            files.map((file) => (
              <span
                key={`${file.name}-${file.lastModified}`}
                className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700"
              >
                {file.name}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-500">
              Chưa có giấy tờ nào được chọn
            </span>
          )}
        </div>

        {profile.verificationDocs.length > 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-900">
              Hồ sơ đã gửi: {profile.verificationDocs.length} tệp
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Bạn có thể tải bổ sung nếu cần cập nhật thêm giấy tờ.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.verificationDocs.map((document) => (
                <span
                  key={document.id}
                  className="rounded-full bg-white px-3 py-1 text-sm text-stone-700"
                >
                  {getVerificationDocumentTypeLabel(document.type)}: {document.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {profile.verificationNote ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Ghi chú từ admin</p>
            <p className="mt-1">{profile.verificationNote}</p>
          </div>
        ) : null}

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
          className="rounded-full bg-stone-950 px-6 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Đang tải..." : "Gửi hồ sơ xác thực"}
        </button>
      </form>
    </div>
  );
}
