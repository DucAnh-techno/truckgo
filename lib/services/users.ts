import { v4 as uuidv4 } from "uuid";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import {
  db,
  ensureFirebaseConfigured,
  isFirebaseConfigured,
} from "@/lib/firebase/config";
import type {
  PublicUserProfile,
  User,
  VerificationDocument,
  VerificationDocumentType,
  VerificationStatus,
} from "@/types";
import { COLLECTIONS } from "@/types";

const USER_DEFAULTS = {
  isVerified: false,
  emailVerified: false,
  verificationDocs: [] as VerificationDocument[],
  verificationStatus: "unsubmitted" as const,
  avgRating: 0,
  totalReviews: 0,
};

function stripUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;
}

function normalizeVerificationDocuments(
  docs: User["verificationDocs"] | string[] | undefined
) {
  if (!Array.isArray(docs)) {
    return USER_DEFAULTS.verificationDocs;
  }

  return docs.map((document, index) => {
    if (typeof document === "string") {
      return {
        id: `legacy-${index + 1}`,
        name: `Tệp ${index + 1}`,
        type: "other" as const,
        url: document,
        uploadedAt: new Date().toISOString(),
      };
    }

    return {
      id: document.id ?? uuidv4(),
      name: document.name ?? "Tài liệu xác minh",
      type: document.type ?? "other",
      url: document.url,
      uploadedAt: document.uploadedAt ?? new Date().toISOString(),
    };
  });
}

function deriveVerificationStatus(data: Partial<User>) {
  if (data.verificationStatus) {
    return data.verificationStatus;
  }

  if (data.isVerified) {
    return "verified";
  }

  const normalizedDocs = normalizeVerificationDocuments(data.verificationDocs);
  return normalizedDocs.length > 0 ? "pending" : "unsubmitted";
}

export function normalizeUserProfile(
  userId: string,
  data: Partial<User>
): User {
  const verificationDocs = normalizeVerificationDocuments(data.verificationDocs);

  return stripUndefinedFields({
    ...USER_DEFAULTS,
    id: userId,
    name: data.name ?? "Người dùng TruckGo",
    email: data.email ?? "",
    role: data.role ?? "renter",
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
    phone: data.phone,
    avatarUrl: data.avatarUrl,
    isVerified: data.isVerified ?? USER_DEFAULTS.isVerified,
    emailVerified: data.emailVerified ?? USER_DEFAULTS.emailVerified,
    verificationDocs,
    verificationStatus: deriveVerificationStatus({
      ...data,
      verificationDocs,
    }),
    verificationNote: data.verificationNote,
    verificationReviewedAt: data.verificationReviewedAt,
    verificationReviewedBy: data.verificationReviewedBy,
    avgRating:
      typeof data.avgRating === "number" ? data.avgRating : USER_DEFAULTS.avgRating,
    totalReviews:
      typeof data.totalReviews === "number"
        ? data.totalReviews
        : USER_DEFAULTS.totalReviews,
  }) as User;
}

export function toPublicUserProfile(user: User): PublicUserProfile {
  return stripUndefinedFields({
    id: user.id,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
    avgRating: user.avgRating,
    totalReviews: user.totalReviews,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }) as PublicUserProfile;
}

function createDemoVerificationDoc(
  name: string,
  type: VerificationDocumentType,
  url: string,
  uploadedAt: string
): VerificationDocument {
  return {
    id: uuidv4(),
    name,
    type,
    url,
    uploadedAt,
  };
}

export function getVerificationDocumentTypesForRole(role: User["role"]) {
  if (role === "owner") {
    return [
      "identity",
      "vehicleRegistration",
      "authorizationLetter",
      "businessLicense",
      "other",
    ] as const satisfies VerificationDocumentType[];
  }

  if (role === "admin") {
    return [
      "identity",
      "driverLicense",
      "vehicleRegistration",
      "authorizationLetter",
      "businessLicense",
      "other",
    ] as const satisfies VerificationDocumentType[];
  }

  return [
    "identity",
    "driverLicense",
    "businessLicense",
    "other",
  ] as const satisfies VerificationDocumentType[];
}

export const demoUsers: Record<string, User> = {
  admin_01: normalizeUserProfile("admin_01", {
    name: "TruckGo Admin",
    email: "admin@truckgo.example.com",
    role: "admin",
    isVerified: true,
    emailVerified: true,
    verificationStatus: "verified",
    phone: "0901 000 999",
    createdAt: "2026-01-05T08:00:00.000Z",
    updatedAt: "2026-03-20T08:00:00.000Z",
  }),
  owner_01: normalizeUserProfile("owner_01", {
    name: "Trần Minh Châu",
    email: "chau.owner@example.com",
    role: "owner",
    isVerified: true,
    emailVerified: true,
    verificationStatus: "verified",
    phone: "0909 123 456",
    createdAt: "2026-01-08T08:30:00.000Z",
    updatedAt: "2026-03-20T08:30:00.000Z",
  }),
  owner_02: normalizeUserProfile("owner_02", {
    name: "Lê Bảo Ngọc",
    email: "ngoc.fleet@example.com",
    role: "owner",
    isVerified: true,
    emailVerified: true,
    verificationStatus: "verified",
    phone: "0912 555 888",
    createdAt: "2026-01-14T09:15:00.000Z",
    updatedAt: "2026-03-18T10:00:00.000Z",
  }),
  owner_03: normalizeUserProfile("owner_03", {
    name: "Phạm Quốc Tuấn",
    email: "tuan.hyundai@example.com",
    role: "owner",
    isVerified: true,
    emailVerified: true,
    verificationStatus: "verified",
    phone: "0938 888 123",
    createdAt: "2026-01-20T07:45:00.000Z",
    updatedAt: "2026-03-19T16:20:00.000Z",
  }),
  owner_04: normalizeUserProfile("owner_04", {
    name: "Nguyễn Thu Hà",
    email: "ha.retail@example.com",
    role: "owner",
    isVerified: false,
    emailVerified: true,
    verificationDocs: [
      createDemoVerificationDoc(
        "CCCD mặt trước",
        "identity",
        "https://demo.truckgo.local/verification/owner_04/id-front.jpg",
        "2026-03-17T15:10:00.000Z"
      ),
      createDemoVerificationDoc(
        "Đăng ký xe tải",
        "vehicleRegistration",
        "https://demo.truckgo.local/verification/owner_04/vehicle-registration.pdf",
        "2026-03-17T15:15:00.000Z"
      ),
    ],
    verificationStatus: "pending",
    phone: "0977 777 456",
    createdAt: "2026-02-02T11:30:00.000Z",
    updatedAt: "2026-03-17T15:40:00.000Z",
  }),
  renter_01: normalizeUserProfile("renter_01", {
    name: "Đoàn Minh Anh",
    email: "minhanh.renter@example.com",
    role: "renter",
    isVerified: true,
    emailVerified: true,
    verificationStatus: "verified",
    createdAt: "2026-02-08T09:00:00.000Z",
    updatedAt: "2026-03-20T12:00:00.000Z",
  }),
  renter_02: normalizeUserProfile("renter_02", {
    name: "Đặng Hoàng Việt",
    email: "viet.renter@example.com",
    role: "renter",
    isVerified: false,
    emailVerified: true,
    verificationDocs: [
      createDemoVerificationDoc(
        "CCCD gắn chip",
        "identity",
        "https://demo.truckgo.local/verification/renter_02/identity.jpg",
        "2026-03-20T11:20:00.000Z"
      ),
      createDemoVerificationDoc(
        "Giấy phép lái xe hạng C",
        "driverLicense",
        "https://demo.truckgo.local/verification/renter_02/driver-license.jpg",
        "2026-03-20T11:22:00.000Z"
      ),
    ],
    verificationStatus: "pending",
    createdAt: "2026-02-18T09:00:00.000Z",
    updatedAt: "2026-03-20T12:00:00.000Z",
  }),
  renter_03: normalizeUserProfile("renter_03", {
    name: "Nguyễn Bảo Hân",
    email: "han.renter@example.com",
    role: "renter",
    isVerified: true,
    emailVerified: true,
    verificationStatus: "verified",
    createdAt: "2026-02-10T09:00:00.000Z",
    updatedAt: "2026-03-19T12:00:00.000Z",
  }),
};

export const demoPublicProfiles: Record<string, PublicUserProfile> = Object.fromEntries(
  Object.values(demoUsers).map((user) => [user.id, toPublicUserProfile(user)])
);

function canUseFirebaseRead() {
  return isFirebaseConfigured && !!db;
}

export async function getUserProfileById(userId: string) {
  if (!canUseFirebaseRead()) {
    return demoUsers[userId] ?? null;
  }

  const snapshot = await getDoc(doc(db!, COLLECTIONS.users, userId));
  if (!snapshot.exists()) {
    return demoUsers[userId] ?? null;
  }

  return normalizeUserProfile(snapshot.id, snapshot.data() as Partial<User>);
}

export async function getPublicUserProfileById(userId: string) {
  if (!canUseFirebaseRead()) {
    return demoPublicProfiles[userId] ?? null;
  }

  try {
    const publicProfileSnapshot = await getDoc(
      doc(db!, COLLECTIONS.publicProfiles, userId)
    );
    if (publicProfileSnapshot.exists()) {
      const data = publicProfileSnapshot.data() as Partial<PublicUserProfile>;
      return {
        id: publicProfileSnapshot.id,
        name: data.name ?? "Người dùng TruckGo",
        role: data.role ?? "renter",
        isVerified: data.isVerified ?? false,
        avgRating: typeof data.avgRating === "number" ? data.avgRating : 0,
        totalReviews:
          typeof data.totalReviews === "number" ? data.totalReviews : 0,
        avatarUrl: data.avatarUrl,
        createdAt: data.createdAt ?? new Date().toISOString(),
        updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
      };
    }

    const privateProfile = await getUserProfileById(userId);
    return privateProfile ? toPublicUserProfile(privateProfile) : null;
  } catch {
    return demoPublicProfiles[userId] ?? null;
  }
}

export async function getPublicUserProfilesByIds(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const profiles = await Promise.all(
    uniqueIds.map(async (userId) => [userId, await getPublicUserProfileById(userId)] as const)
  );

  return new Map(
    profiles.filter((entry): entry is readonly [string, PublicUserProfile] => Boolean(entry[1]))
  );
}

export async function syncPublicUserProfile(user: User) {
  const firebase = ensureFirebaseConfigured();

  await setDoc(
    doc(firebase.db, COLLECTIONS.publicProfiles, user.id),
    toPublicUserProfile(user),
    { merge: true }
  );
}

export interface SubmitVerificationDocumentsInput {
  userId: string;
  files: File[];
  documentType: VerificationDocumentType;
}

export async function submitVerificationDocuments({
  userId,
  files,
  documentType,
}: SubmitVerificationDocumentsInput) {
  const firebase = ensureFirebaseConfigured();
  const currentUser = await getUserProfileById(userId);

  if (!currentUser) {
    throw new Error("Không tìm thấy hồ sơ để tải giấy tờ.");
  }

  if (files.length === 0) {
    throw new Error("Hãy chọn ít nhất một giấy tờ để gửi xác thực.");
  }

  const uploadedDocs: VerificationDocument[] = [];

  for (const file of files) {
    const extension = file.name.split(".").pop();
    const storageRef = ref(
      firebase.storage,
      `verification-docs/${userId}/${uuidv4()}${extension ? `.${extension}` : ""}`
    );
    const snapshot = await uploadBytes(storageRef, file);

    uploadedDocs.push({
      id: uuidv4(),
      name: file.name,
      type: documentType,
      url: await getDownloadURL(snapshot.ref),
      uploadedAt: new Date().toISOString(),
    });
  }

  const nextProfile = normalizeUserProfile(userId, {
    ...currentUser,
    isVerified: false,
    verificationDocs: [...currentUser.verificationDocs, ...uploadedDocs],
    verificationStatus: "pending",
    verificationNote: undefined,
    verificationReviewedAt: undefined,
    verificationReviewedBy: undefined,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(firebase.db, COLLECTIONS.users, userId), nextProfile, {
    merge: true,
  });

  await syncPublicUserProfile(nextProfile);

  return nextProfile;
}

export interface UpdateUserVerificationStatusInput {
  userId: string;
  actorId: string;
  status: Extract<VerificationStatus, "pending" | "verified" | "rejected">;
  note?: string;
}

export async function updateUserVerificationStatus({
  userId,
  actorId,
  status,
  note,
}: UpdateUserVerificationStatusInput) {
  const firebase = ensureFirebaseConfigured();
  const [currentUser, actor] = await Promise.all([
    getUserProfileById(userId),
    getUserProfileById(actorId),
  ]);

  if (!currentUser) {
    throw new Error("Không tìm thấy người dùng cần cập nhật xác thực.");
  }

  if (!actor || actor.role !== "admin") {
    throw new Error("Chỉ quản trị viên mới có quyền duyệt hồ sơ xác thực.");
  }

  const nextProfile = normalizeUserProfile(userId, {
    ...currentUser,
    isVerified: status === "verified",
    verificationStatus: status,
    verificationNote: note?.trim() || undefined,
    verificationReviewedAt: new Date().toISOString(),
    verificationReviewedBy: actorId,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(firebase.db, COLLECTIONS.users, userId), nextProfile, {
    merge: true,
  });

  await syncPublicUserProfile(nextProfile);

  return nextProfile;
}

export async function getUsersPendingVerification() {
  if (!canUseFirebaseRead()) {
    return Object.values(demoUsers).filter(
      (user) => user.verificationStatus === "pending"
    );
  }

  const usersQuery = query(collection(db!, COLLECTIONS.users), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs
    .map((item) => normalizeUserProfile(item.id, item.data() as Partial<User>))
    .filter((user) => user.verificationStatus === "pending");
}

export async function getAllUsers() {
  if (!canUseFirebaseRead()) {
    return Object.values(demoUsers).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  const usersQuery = query(collection(db!, COLLECTIONS.users), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map((item) =>
    normalizeUserProfile(item.id, item.data() as Partial<User>)
  );
}
