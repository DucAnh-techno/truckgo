"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAllReports, updateReportStatus } from "@/lib/services/reports";
import {
  getTrucksPendingDocumentReview,
  type TruckCatalogItem,
} from "@/lib/services/trucks";
import {
  getUsersPendingVerification,
  updateUserVerificationStatus,
} from "@/lib/services/users";
import {
  getReportStatusLabel,
  getReportTargetLabel,
  getRoleLabel,
  getTruckDocumentReviewStatusLabel,
  getVerificationDocumentTypeLabel,
} from "@/lib/utils/labels";
import type { Report, User } from "@/types";

export function AdminModerationPanel() {
  const { profile } = useAuth();
  const [pendingTruckReviews, setPendingTruckReviews] = useState<TruckCatalogItem[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>(
    {}
  );
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadModerationData() {
    const [nextPendingTruckReviews, nextPendingUsers, nextReports] = await Promise.all([
      getTrucksPendingDocumentReview(),
      getUsersPendingVerification(),
      getAllReports(),
    ]);
    setPendingTruckReviews(nextPendingTruckReviews);
    setPendingUsers(nextPendingUsers);
    setReports(nextReports);
  }

  useEffect(() => {
    let active = true;

    async function run() {
      if (!profile || profile.role !== "admin") {
        setPendingTruckReviews([]);
        setPendingUsers([]);
        setReports([]);
        return;
      }

      try {
        await loadModerationData();
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải dữ liệu moderation."
        );
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [profile]);

  function handleVerification(
    userId: string,
    status: "verified" | "rejected"
  ) {
    startTransition(async () => {
      try {
        if (!profile) {
          return;
        }

        await updateUserVerificationStatus({
          userId,
          actorId: profile.id,
          status,
          note: verificationNotes[userId],
        });
        await loadModerationData();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể cập nhật trạng thái xác thực."
        );
      }
    });
  }

  function handleReportStatus(reportId: string, status: Report["status"]) {
    startTransition(async () => {
      try {
        if (!profile) {
          return;
        }

        await updateReportStatus(reportId, status, profile.id, reportNotes[reportId]);
        await loadModerationData();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể cập nhật báo cáo."
        );
      }
    });
  }

  if (!profile || profile.role !== "admin") {
    return null;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      {errorMessage ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 lg:col-span-2">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
              Hàng chờ xác minh
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">
              Hồ sơ đang chờ duyệt
            </h2>
          </div>
          <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
            {pendingTruckReviews.length + pendingUsers.length} hồ sơ
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {pendingTruckReviews.length > 0 ? (
            pendingTruckReviews.map((truck) => (
              <article
                key={truck.id}
                className="rounded-[26px] border border-orange-200 bg-orange-50/60 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">
                      Hồ sơ xe chờ duyệt
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-stone-950">
                      {truck.name}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600">
                      Chủ xe: {truck.ownerName ?? truck.ownerId}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      Đã gửi {(truck.vehicleDocuments ?? []).length} giấy tờ
                    </p>
                    <p className="mt-2 text-sm font-medium text-stone-700">
                      Trạng thái: {getTruckDocumentReviewStatusLabel(truck.documentsReviewStatus)}
                    </p>
                  </div>

                  <Link
                    href={`/trucks/${truck.id}?review=documents`}
                    className="inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Mở đơn
                  </Link>
                </div>
              </article>
            ))
          ) : null}

          {pendingUsers.length > 0 ? (
            pendingUsers.map((user) => (
              <article
                key={user.id}
                className="rounded-[26px] border border-stone-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">
                      {getRoleLabel(user.role)}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-stone-950">
                      {user.name}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600">{user.email}</p>
                    <div className="mt-3">
                      <VerifiedBadge
                        isVerified={user.isVerified}
                        verificationStatus={user.verificationStatus}
                      />
                    </div>
                    <p className="mt-3 text-sm text-stone-600">
                      Đã gửi {user.verificationDocs.length} tệp.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.verificationDocs.map((document) => (
                        <a
                          key={document.id}
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 transition hover:bg-stone-200"
                        >
                          {getVerificationDocumentTypeLabel(document.type)}
                        </a>
                      ))}
                    </div>
                    {user.verificationNote ? (
                      <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Ghi chú hiện tại: {user.verificationNote}
                      </p>
                    ) : null}
                  </div>

                  <div className="w-full max-w-sm space-y-3">
                    <textarea
                      rows={4}
                      value={verificationNotes[user.id] ?? ""}
                      onChange={(event) =>
                        setVerificationNotes((current) => ({
                          ...current,
                          [user.id]: event.target.value,
                        }))
                      }
                      placeholder="Ghi chú cho người gửi hồ sơ: thiếu giấy tờ gì, cần bổ sung gì..."
                      className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                    />
                    <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleVerification(user.id, "verified")}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleVerification(user.id, "rejected")}
                      className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950 disabled:opacity-70"
                    >
                      Yêu cầu bổ sung
                    </button>
                  </div>
                  </div>
                </div>
              </article>
            ))
          ) : pendingTruckReviews.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-stone-600">
              Hiện không có hồ sơ xác thực nào đang chờ duyệt.
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(41,24,12,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
              Báo cáo
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">
              Báo cáo từ người dùng
            </h2>
          </div>
          <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
            {reports.length} báo cáo
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {reports.length > 0 ? (
            reports.map((report) => (
              <article
                key={report.id}
                className="rounded-[26px] border border-stone-200 bg-white p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-500">
                    {getReportTargetLabel(report.targetType)}
                  </p>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                    {getReportStatusLabel(report.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-stone-950">
                  Đối tượng: {report.targetId}
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  {report.reason}
                </p>
                <p className="mt-3 text-xs text-stone-500">
                  Người gửi: {report.reporterId}
                </p>
                {report.reviewNote ? (
                  <div className="mt-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    Ghi chú xử lý: {report.reviewNote}
                  </div>
                ) : null}
                <textarea
                  rows={3}
                  value={reportNotes[report.id] ?? ""}
                  onChange={(event) =>
                    setReportNotes((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))
                  }
                  placeholder="Ghi chú xử lý cho report này..."
                  className="mt-4 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["investigating", "resolved", "rejected"] as const).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleReportStatus(report.id, status)}
                        className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950 disabled:opacity-70"
                      >
                        {getReportStatusLabel(status)}
                      </button>
                    )
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[26px] border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-stone-600">
              Chưa có report nào được gửi.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
