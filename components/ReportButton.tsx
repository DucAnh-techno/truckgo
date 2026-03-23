"use client";

import { useState, useTransition } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { createReport } from "@/lib/services/reports";
import type { ReportTargetType } from "@/types";

interface ReportButtonProps {
  targetId: string;
  targetType: ReportTargetType;
  buttonClassName?: string;
}

export function ReportButton({
  targetId,
  targetType,
  buttonClassName,
}: ReportButtonProps) {
  const { profile, isConfigured } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        if (!isConfigured) {
          throw new Error("Firebase chưa được cấu hình để gửi báo cáo.");
        }

        if (!profile) {
          throw new Error("Bạn cần đăng nhập để gửi báo cáo.");
        }

        await createReport({
          reporterId: profile.id,
          targetId,
          targetType,
          reason,
        });

        setReason("");
        setSuccessMessage("Báo cáo đã được gửi tới bộ phận quản trị.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể gửi báo cáo."
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={
          buttonClassName ??
          "rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        }
      >
        Báo cáo {targetType === "truck" ? "phương tiện" : "chủ xe"}
      </button>

      {isOpen ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-3xl border border-red-100 bg-red-50/70 p-4"
        >
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={
              targetType === "truck"
                ? "Mô tả lý do: thông tin sai, nghi ngờ lừa đảo, không trung thực..."
                : "Mô tả lý do báo cáo người dùng này..."
            }
            className="w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-300"
            required
          />

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
