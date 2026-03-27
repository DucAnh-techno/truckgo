"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  reviewTruckDocuments,
  type TruckDocumentReviewDecision,
} from "@/lib/services/trucks";
import { getTruckDocumentReviewStatusLabel } from "@/lib/utils/labels";
import type { VehicleDocument } from "@/types";

interface TruckDocumentReviewFormProps {
  truckId: string;
  enabled: boolean;
  vehicleDocuments: VehicleDocument[];
  documentsReviewStatus?: string;
  documentsReviewNote?: string;
  documentsApproved?: boolean;
}

export function TruckDocumentReviewForm({
  truckId,
  enabled,
  vehicleDocuments,
  documentsReviewStatus,
  documentsReviewNote,
  documentsApproved,
}: TruckDocumentReviewFormProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [note, setNote] = useState(documentsReviewNote ?? "");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!enabled || !profile || profile.role !== "admin") {
    return null;
  }

  const adminId = profile.id;

  function handleSubmit(decision: TruckDocumentReviewDecision) {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        await reviewTruckDocuments({
          truckId,
          actorId: adminId,
          decision,
          note,
        });

        setSuccessMessage(
          decision === "approved"
            ? "Đã duyệt giấy tờ xe thành công."
            : "Đã gửi yêu cầu bổ sung giấy tờ cho chủ xe."
        );
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Không thể xử lý duyệt giấy tờ xe lúc này."
        );
      }
    });
  }

  return (
    <div className="mt-6 rounded-4xl border border-orange-200 bg-orange-50/70 p-6 shadow-[0_18px_50px_rgba(255,122,24,0.12)]">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-600">
        Duyệt giấy tờ xe
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-stone-950">Form duyệt hồ sơ xe</h3>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-white px-3 py-1 font-semibold text-stone-700">
          Trạng thái: {getTruckDocumentReviewStatusLabel(documentsReviewStatus)}
        </span>
        <span className="rounded-full bg-white px-3 py-1 font-semibold text-stone-700">
          Kết quả hiện tại: {documentsApproved ? "Đã duyệt" : "Chưa duyệt"}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white bg-white p-4">
        <p className="text-sm font-semibold text-stone-800">Giấy tờ đã tải lên</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {vehicleDocuments.length > 0 ? (
            vehicleDocuments.map((document) => (
              <a
                key={document.id}
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
              >
                {document.type === "vehicleRegistration"
                  ? "Đăng ký xe"
                  : "Kiểm định an toàn"}
              </a>
            ))
          ) : (
            <p className="text-sm text-stone-600">Xe chưa có giấy tờ để duyệt.</p>
          )}
        </div>
      </div>

      <label className="mt-4 block space-y-2">
        <span className="text-sm font-medium text-stone-700">Ghi chú cho chủ xe</span>
        <textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nêu rõ lý do nếu cần bổ sung giấy tờ..."
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
        />
      </label>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSubmit("approved")}
          className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
        >
          Duyệt
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSubmit("needsMore")}
          className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900 disabled:opacity-70"
        >
          Yêu cầu bổ sung
        </button>
      </div>
    </div>
  );
}
