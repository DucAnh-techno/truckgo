import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { db, ensureFirebaseConfigured, isFirebaseConfigured } from "@/lib/firebase/config";
import { getUserProfileById } from "@/lib/services/users";
import {
  COLLECTIONS,
  type Report,
  type ReportStatus,
  type ReportTargetType,
} from "@/types";

const demoReports: Report[] = [
  {
    id: "report_01",
    reporterId: "renter_01",
    targetId: "fuso-canter-go-vap",
    targetType: "truck",
    reason: "Thông tin xe không trùng khớp với hình ảnh đã đăng.",
    status: "investigating",
    reviewNote: "Đã liên hệ chủ xe để yêu cầu cập nhật gallery thực tế.",
    reviewedAt: "2026-03-20T10:30:00.000Z",
    reviewedBy: "admin_01",
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:30:00.000Z",
  },
  {
    id: "report_02",
    reporterId: "owner_04",
    targetId: "renter_02",
    targetType: "user",
    reason: "Người thuê nhiều lần đổi lịch sát giờ và phản hồi thiếu hợp tác.",
    status: "open",
    createdAt: "2026-03-21T08:20:00.000Z",
    updatedAt: "2026-03-21T08:20:00.000Z",
  },
];

function canUseFirebaseRead() {
  return isFirebaseConfigured && !!db;
}

function sortReports<T extends Report>(reports: T[]) {
  return [...reports].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export interface CreateReportInput {
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
}

export async function createReport(input: CreateReportInput) {
  const firebase = ensureFirebaseConfigured();
  const reporter = await getUserProfileById(input.reporterId);

  if (!reporter) {
    throw new Error("Không tìm thấy tài khoản gửi báo cáo.");
  }

  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("Hãy nhập lý do báo cáo.");
  }

  const payload: Omit<Report, "id"> = {
    reporterId: input.reporterId,
    targetId: input.targetId,
    targetType: input.targetType,
    reason,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const reference = await addDoc(collection(firebase.db, COLLECTIONS.reports), payload);

  return {
    id: reference.id,
    ...payload,
  };
}

export async function getReportsForReporter(reporterId: string) {
  if (!canUseFirebaseRead()) {
    return sortReports(
      demoReports.filter((report) => report.reporterId === reporterId)
    );
  }

  const reportsQuery = query(
    collection(db!, COLLECTIONS.reports),
    where("reporterId", "==", reporterId)
  );
  const snapshot = await getDocs(reportsQuery);

  return sortReports(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<Report, "id">),
    }))
  );
}

export async function getAllReports() {
  if (!canUseFirebaseRead()) {
    return sortReports(demoReports);
  }

  const reportsQuery = query(
    collection(db!, COLLECTIONS.reports),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(reportsQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<Report, "id">),
  }));
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  actorId: string,
  reviewNote?: string
) {
  const firebase = ensureFirebaseConfigured();
  const actor = await getUserProfileById(actorId);

  if (!actor || actor.role !== "admin") {
    throw new Error("Chỉ quản trị viên mới có quyền xử lý báo cáo.");
  }

  const snapshot = await getDoc(doc(firebase.db, COLLECTIONS.reports, reportId));
  if (!snapshot.exists()) {
    throw new Error("Không tìm thấy báo cáo cần xử lý.");
  }

  const nextReport: Report = {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Report, "id">),
    status,
    reviewNote: reviewNote?.trim() || undefined,
    reviewedAt: new Date().toISOString(),
    reviewedBy: actorId,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(firebase.db, COLLECTIONS.reports, reportId), nextReport, {
    merge: true,
  });

  return nextReport;
}
