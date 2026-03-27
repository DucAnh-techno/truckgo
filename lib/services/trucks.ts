import { v4 as uuidv4 } from "uuid";
import { FirebaseError } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { COLLECTIONS, type Booking, type Truck, type VehicleDocument } from "@/types";
import {
  db,
  ensureFirebaseConfigured,
  isFirebaseConfigured,
} from "@/lib/firebase/config";
import { getReviewSummariesForUsers } from "@/lib/services/reviews";
import { formatDate } from "@/lib/utils/format";
import {
  getPublicUserProfilesByIds,
  getUserProfileById,
} from "@/lib/services/users";

export interface TruckCatalogItem extends Truck {
  category: string;
  summary: string;
  gear: string;
  fuel: string;
  tags: string[];
  availabilityTag: string;
  accentFrom: string;
  accentTo: string;
  availableFrom: string;
  ownerName?: string;
  ownerIsVerified?: boolean;
  ownerAvgRating?: number;
  ownerTotalReviews?: number;
  ownerMemberSince?: string;
}

export interface TruckFilters {
  location?: string;
  maxPrice?: number;
  keyword?: string;
}

export type TruckDocumentReviewDecision = "approved" | "needsMore";

export interface ReviewTruckDocumentsInput {
  truckId: string;
  actorId: string;
  decision: TruckDocumentReviewDecision;
  note?: string;
}

export interface CreateTruckInput {
  ownerId: string;
  name: string;
  brand: string;
  year: number;
  vehicleType: string;
  pricePerDay: number;
  location: string;
  capacity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  fuelType: string;
  fuelConsumption: number;
  description: string;
  images: File[];
  primaryImageIndex: number;
  vehicleRegistrationFile: File;
  safetyInspectionFile: File;
}

export interface UpdateTruckInput {
  truckId: string;
  requesterId: string;
  name: string;
  brand: string;
  year: number;
  vehicleType: string;
  pricePerDay: number;
  location: string;
  capacity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  fuelType: string;
  fuelConsumption: number;
  description: string;
  existingImageUrls: string[];
  newImages: File[];
  primaryImageIndex: number;
  vehicleRegistrationFile?: File | null;
  safetyInspectionFile?: File | null;
}

const palette = [
  ["#ff8133", "#ff4d00"],
  ["#ffd166", "#f77f00"],
  ["#6c9a8b", "#275d63"],
  ["#5fbff9", "#1f6feb"],
  ["#8d99ae", "#2b2d42"],
  ["#f4acb7", "#c9184a"],
] as const;

function canUseFirebaseRead() {
  return isFirebaseConfigured && !!db;
}

function getPalette(seed: string) {
  const index =
    seed.split("").reduce((total, character) => total + character.charCodeAt(0), 0) %
    palette.length;

  return palette[index];
}

interface TruckAvailabilityState {
  isBookedNow: boolean;
  availableFrom?: string;
}

function dateOnlyToTimestamp(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function getTruckAvailability(
  truck: Truck,
  bookingsByTruckId?: Map<string, Booking[]>
): TruckAvailabilityState {
  const today = new Date();
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  const bookings = bookingsByTruckId?.get(truck.id) ?? [];

  const activeBooking = bookings
    .filter((booking) => {
      const start = dateOnlyToTimestamp(booking.startDate);
      const end = dateOnlyToTimestamp(booking.endDate);
      return start <= todayDate && todayDate < end;
    })
    .sort((left, right) => left.endDate.localeCompare(right.endDate))[0];

  if (activeBooking) {
    return {
      isBookedNow: true,
      availableFrom: activeBooking.endDate,
    };
  }

  return {
    isBookedNow: false,
  };
}

function toTruckCatalogItem(
  truck: Truck,
  availability?: TruckAvailabilityState
): TruckCatalogItem {
  const [accentFrom, accentTo] = getPalette(truck.id || truck.name);
  const summary =
    truck.description.length > 96
      ? `${truck.description.slice(0, 93).trim()}...`
      : truck.description;
  const isBookedNow = availability?.isBookedNow ?? false;
  const availableFromDate = availability?.availableFrom;
  const availabilityLabel =
    isBookedNow && availableFromDate
      ? `Có thể thuê từ ngày ${formatDate(availableFromDate)}`
      : "Có thể nhận xe trong 24 giờ";
  const availabilityTag =
    isBookedNow && availableFromDate
      ? `Bận đến hết ngày ${formatDate(availableFromDate)}`
      : "Có thể thuê ngay";

  return {
    ...truck,
    primaryImageUrl: truck.primaryImageUrl ?? truck.images[0],
    documentsApproved: truck.documentsApproved ?? false,
    category:
      truck.capacity >= 5000
        ? "Xe tải hạng nặng"
        : truck.capacity >= 3000
          ? "Xe giao vận trung"
          : "Xe giao vận nhỏ",
    summary,
    gear: isBookedNow ? "Đang được thuê" : "Sẵn sàng khai thác",
    fuel: truck.fuelType || "--",
    tags: [
      availabilityTag,
      truck.location,
      `${truck.capacity.toLocaleString("vi-VN")} kg`,
      ...(truck.brand ? [truck.brand] : []),
      ...(truck.year ? [`${truck.year}`] : []),
    ],
    availabilityTag,
    accentFrom,
    accentTo,
    availableFrom: availabilityLabel,
  };
}

function resolvePrimaryImageUrl(images: string[], primaryImageIndex: number) {
  if (images.length === 0) {
    return undefined;
  }

  const safeIndex = Math.max(0, Math.min(primaryImageIndex, images.length - 1));
  return images[safeIndex];
}

function hasDocumentType(documents: VehicleDocument[], type: VehicleDocument["type"]) {
  return documents.some((document) => document.type === type);
}

async function uploadVehicleDocument(
  ownerId: string,
  truckId: string,
  documentType: VehicleDocument["type"],
  file: File,
  approved: boolean
) {
  const firebase = ensureFirebaseConfigured();
  const extension = file.name.split(".").pop();
  const storageRef = ref(
    firebase.storage,
    `truck-docs/${ownerId}/${truckId}/${documentType}-${uuidv4()}${
      extension ? `.${extension}` : ""
    }`
  );
  let snapshot;

  try {
    snapshot = await uploadBytes(storageRef, file);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "storage/unauthorized") {
      throw new Error(
        "Khong co quyen tai giay to xe len Firebase Storage. Hay cap nhat Storage Rules cho duong dan truck-docs/{uid}/... va dam bao ban dang dang nhap dung tai khoan chu xe."
      );
    }

    throw error;
  }

  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name: file.name,
    type: documentType,
    url: await getDownloadURL(snapshot.ref),
    uploadedAt: now,
    approved,
    ...(approved ? { approvedAt: now } : {}),
  } satisfies VehicleDocument;
}

async function enrichOwnerTrust(trucks: TruckCatalogItem[]) {
  // Bước 1: Thu thập tất cả ownerIds duy nhất
  const ownerIds = Array.from(new Set(trucks.map((truck) => truck.ownerId)));

  // Bước 2: Lấy dữ liệu public profiles và review summaries
  const [publicProfiles, reviewSummaries] = await Promise.all([
    getPublicUserProfilesByIds(ownerIds),
    getReviewSummariesForUsers(ownerIds),
  ]);

  return trucks.map((truck) => {
    const owner = publicProfiles.get(truck.ownerId);
    const reviewSummary = reviewSummaries.get(truck.ownerId);

    return {
      ...truck,
      ownerName: owner?.name,
      ownerIsVerified: owner?.isVerified ?? false,
      ownerAvgRating: reviewSummary?.avgRating ?? owner?.avgRating ?? 0,
      ownerTotalReviews: reviewSummary?.totalReviews ?? owner?.totalReviews ?? 0,
      ownerMemberSince: owner?.createdAt,
    };
  });
}

function filterTrucks(trucks: TruckCatalogItem[], filters: TruckFilters = {}) {
  const normalizedLocation = filters.location?.trim().toLowerCase();
  const normalizedKeyword = filters.keyword?.trim().toLowerCase();

  return [...trucks]
    .filter((truck) => {
      const matchApproved = truck.documentsApproved === true;
      const matchLocation = normalizedLocation
        ? truck.location.toLowerCase().includes(normalizedLocation)
        : true;
      const matchPrice = filters.maxPrice
        ? truck.pricePerDay <= filters.maxPrice
        : true;
      const searchable = `${truck.name} ${truck.location} ${truck.description}`.toLowerCase();
      const matchKeyword = normalizedKeyword
        ? searchable.includes(normalizedKeyword)
        : true;

      return matchApproved && matchLocation && matchPrice && matchKeyword;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function uploadTruckImages(ownerId: string, images: File[]) {
  const firebase = ensureFirebaseConfigured();
  const uploadedUrls: string[] = [];

  for (const image of images) {
    const extension = image.name.split(".").pop();
    const storageRef = ref(
      firebase.storage,
      `trucks/${ownerId}/${uuidv4()}${extension ? `.${extension}` : ""}`
    );
    const snapshot = await uploadBytes(storageRef, image);
    uploadedUrls.push(await getDownloadURL(snapshot.ref));
  }

  return uploadedUrls;
}

async function getActiveBookingsByTruckIds(truckIds: string[]) {
  if (truckIds.length === 0) {
    return new Map<string, Booking[]>();
  }

  const uniqueTruckIds = Array.from(new Set(truckIds));
  const groupedBookings = new Map<string, Booking[]>();
  const chunks: string[][] = [];

  for (let index = 0; index < uniqueTruckIds.length; index += 10) {
    chunks.push(uniqueTruckIds.slice(index, index + 10));
  }

  try {
    for (const chunk of chunks) {
      const bookingsQuery = query(
        collection(db!, COLLECTIONS.bookings),
        where("truckId", "in", chunk)
      );
      const snapshot = await getDocs(bookingsQuery);

      for (const item of snapshot.docs) {
        const booking = {
          id: item.id,
          ...(item.data() as Omit<Booking, "id">),
        };

        if (booking.status !== "accepted" && booking.status !== "in_progress") {
          continue;
        }

        const existing = groupedBookings.get(booking.truckId) ?? [];
        existing.push(booking);
        groupedBookings.set(booking.truckId, existing);
      }
    }
  } catch (error) {
    console.warn("[trucks] Bỏ qua lịch thuê khi không thể đọc bookings", error);
    return new Map<string, Booking[]>();
  }

  return groupedBookings;
}

export async function getMarketplaceTrucks(filters: TruckFilters = {}) {
  if (!canUseFirebaseRead()) {
    console.warn("[trucks] Firebase chưa cấu hình, dùng demoTrucks");
    throw new Error("Firebase chưa được cấu hình để đọc dữ liệu xe tải.");
  }

  try {
    const constraints: QueryConstraint[] = [
      where("isAvailable", "==", true),
    ];

    if (filters.maxPrice) {
      constraints.push(where("pricePerDay", "<=", filters.maxPrice));
    }

    const trucksQuery = query(collection(db!, COLLECTIONS.trucks), ...constraints);
    const snapshot = await getDocs(trucksQuery);

    console.debug("[trucks] firestore result", snapshot.size, "items");

    const trucks = snapshot.docs.map((item) =>
      ({
        id: item.id,
        ...(item.data() as Omit<Truck, "id">),
      })
    );

    const activeBookingsByTruckId = await getActiveBookingsByTruckIds(
      trucks.map((truck) => truck.id)
    );

    const trucksWithAvailability = trucks.map((truck) =>
      toTruckCatalogItem(truck, getTruckAvailability(truck, activeBookingsByTruckId))
    );

    return enrichOwnerTrust(filterTrucks(trucksWithAvailability, filters));
  } catch (error) {
    console.error("[trucks] lỗi getMarketplaceTrucks", error);
    throw new Error("Lỗi khi truy vấn dữ liệu xe tải từ Firebase.");
  }
}

export async function getFeaturedTrucks() {
  const trucks = await getMarketplaceTrucks();
  return trucks.slice(0, 4);
}

export async function getTruckById(id: string) {
  if (!canUseFirebaseRead()) {
    throw new Error("Firebase chưa được cấu hình để đọc dữ liệu xe tải.");
  }

  try {
    const snapshot = await getDoc(doc(db!, COLLECTIONS.trucks, id));

    if (!snapshot.exists()) {
      return null;
    }

    const [enrichedTruck] = await enrichOwnerTrust([
      toTruckCatalogItem({
        id: snapshot.id,
        ...(snapshot.data() as Omit<Truck, "id">),
      })
    ]);

    if (!enrichedTruck) {
      return null;
    }

    const activeBookingsByTruckId = await getActiveBookingsByTruckIds([
      enrichedTruck.id,
    ]);

    return {
      ...enrichedTruck,
      ...toTruckCatalogItem(
        enrichedTruck,
        getTruckAvailability(enrichedTruck, activeBookingsByTruckId)
      ),
    };
  } catch {
    throw new Error("Lỗi khi truy vấn dữ liệu xe tải từ Firebase.");
  }
}

export async function getOwnerTrucks(ownerId: string) {
  if (!canUseFirebaseRead()) {
    throw new Error("Firebase chưa được cấu hình để đọc dữ liệu xe tải.");
  }

  try {
    const trucksQuery = query(
      collection(db!, COLLECTIONS.trucks),
      where("ownerId", "==", ownerId)
    );
    const snapshot = await getDocs(trucksQuery);

    const trucks = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<Truck, "id">),
    }));

    const activeBookingsByTruckId = await getActiveBookingsByTruckIds(
      trucks.map((truck) => truck.id)
    );

    return enrichOwnerTrust(
      trucks
        .map((truck) =>
          toTruckCatalogItem(
            truck,
            getTruckAvailability(truck, activeBookingsByTruckId)
          )
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    );
  } catch {
    throw new Error("Lỗi khi truy vấn dữ liệu xe tải từ Firebase.");
  }
}

export async function getPopularLocations() {
  const trucks = await getMarketplaceTrucks();
  return Array.from(new Set(trucks.map((truck) => truck.location)));
}

export async function deleteTruck(truckId: string, requesterId: string) {
  const firebase = ensureFirebaseConfigured();

  const truckDocRef = doc(firebase.db, COLLECTIONS.trucks, truckId);
  const truckSnapshot = await getDoc(truckDocRef);

  if (!truckSnapshot.exists()) {
    throw new Error("Xe không tồn tại hoặc đã bị xóa.");
  }

  const truck = truckSnapshot.data() as Omit<Truck, "id">;
  const requester = await getUserProfileById(requesterId);

  if (!requester) {
    throw new Error("Không tìm thấy thông tin người dùng.");
  }

  if (requester.role !== "admin" && requesterId !== truck.ownerId) {
    throw new Error("Bạn không có quyền xóa xe này.");
  }

  await deleteDoc(truckDocRef);

  return true;
}

export async function createTruck(input: CreateTruckInput) {
  const firebase = ensureFirebaseConfigured();
  const owner = await getUserProfileById(input.ownerId);

  if (!owner) {
    throw new Error("Không tìm thấy tài khoản chủ xe.");
  }

  if (owner.role !== "owner" && owner.role !== "admin") {
    throw new Error("Chỉ tài khoản chủ xe hoặc quản trị viên mới có quyền đăng xe.");
  }

  const isAdmin = owner.role === "admin";

  if (input.images.length === 0) {
    throw new Error("Cần ít nhất 1 hình ảnh để đăng xe.");
  }

  const imageUrls = await uploadTruckImages(input.ownerId, input.images);
  const primaryImageUrl = resolvePrimaryImageUrl(imageUrls, input.primaryImageIndex);
  if (!primaryImageUrl) {
    throw new Error("Cần chọn ảnh chính cho xe.");
  }
  const truckDocRef = doc(collection(firebase.db, COLLECTIONS.trucks));

  const vehicleDocuments: VehicleDocument[] = [
    await uploadVehicleDocument(
      input.ownerId,
      truckDocRef.id,
      "vehicleRegistration",
      input.vehicleRegistrationFile,
      isAdmin
    ),
    await uploadVehicleDocument(
      input.ownerId,
      truckDocRef.id,
      "safetyInspection",
      input.safetyInspectionFile,
      isAdmin
    ),
  ];

  const cargoVolume =
    input.dimensions.length * input.dimensions.width * input.dimensions.height;

  const payload: Omit<Truck, "id"> = {
    ownerId: input.ownerId,
    name: input.name,
    brand: input.brand,
    year: input.year,
    vehicleType: input.vehicleType,
    pricePerDay: input.pricePerDay,
    location: input.location,
    capacity: input.capacity,
    dimensions: input.dimensions,
    cargoVolume: Number(cargoVolume.toFixed(2)),
    fuelType: input.fuelType,
    fuelConsumption: input.fuelConsumption,
    images: imageUrls,
    primaryImageUrl,
    vehicleDocuments,
    documentsApproved: isAdmin,
    documentsReviewStatus: isAdmin ? "approved" : "pending",
    documentsReviewNote: "",
    ...(isAdmin
      ? {
          documentsReviewedAt: new Date().toISOString(),
          documentsReviewedBy: owner.id,
        }
      : {}),
    description: input.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAvailable: true,
    rentalCount: 0,
  };

  await setDoc(truckDocRef, payload);

  const [truck] = await enrichOwnerTrust([
    toTruckCatalogItem({
      id: truckDocRef.id,
      ...payload,
    }),
  ]);

  return truck;
}

export async function updateTruck(input: UpdateTruckInput) {
  const firebase = ensureFirebaseConfigured();

  const [requester, truckSnapshot] = await Promise.all([
    getUserProfileById(input.requesterId),
    getDoc(doc(firebase.db, COLLECTIONS.trucks, input.truckId)),
  ]);

  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    throw new Error("Bạn không có quyền chỉnh sửa xe này.");
  }

  if (!truckSnapshot.exists()) {
    throw new Error("Xe không tồn tại.");
  }

  const currentTruck = {
    id: truckSnapshot.id,
    ...(truckSnapshot.data() as Omit<Truck, "id">),
  };

  if (requester.role !== "admin" && currentTruck.ownerId !== requester.id) {
    throw new Error("Bạn không có quyền chỉnh sửa xe này.");
  }

  const ownerId = currentTruck.ownerId;
  const isAdmin = requester.role === "admin";
  const uploadedNewImages = await uploadTruckImages(ownerId, input.newImages);
  const mergedImages = [...input.existingImageUrls, ...uploadedNewImages];
  const hasNewVehicleDocuments = Boolean(
    input.vehicleRegistrationFile || input.safetyInspectionFile
  );

  const baseVehicleDocuments = currentTruck.vehicleDocuments ?? [];
  const nextVehicleDocuments = [...baseVehicleDocuments];

  if (input.vehicleRegistrationFile) {
    const uploadedDoc = await uploadVehicleDocument(
      ownerId,
      currentTruck.id,
      "vehicleRegistration",
      input.vehicleRegistrationFile,
      isAdmin
    );
    const filtered = nextVehicleDocuments.filter(
      (document) => document.type !== "vehicleRegistration"
    );
    nextVehicleDocuments.length = 0;
    nextVehicleDocuments.push(...filtered, uploadedDoc);
  }

  if (input.safetyInspectionFile) {
    const uploadedDoc = await uploadVehicleDocument(
      ownerId,
      currentTruck.id,
      "safetyInspection",
      input.safetyInspectionFile,
      isAdmin
    );
    const filtered = nextVehicleDocuments.filter(
      (document) => document.type !== "safetyInspection"
    );
    nextVehicleDocuments.length = 0;
    nextVehicleDocuments.push(...filtered, uploadedDoc);
  }

  if (
    !isAdmin &&
    (!hasDocumentType(nextVehicleDocuments, "vehicleRegistration") ||
      !hasDocumentType(nextVehicleDocuments, "safetyInspection"))
  ) {
    throw new Error("Chủ xe cần tải đủ đăng ký xe và kiểm định an toàn kỹ thuật.");
  }

  const payload: Omit<Truck, "id"> = {
    ...currentTruck,
    name: input.name,
    brand: input.brand,
    year: input.year,
    vehicleType: input.vehicleType,
    pricePerDay: input.pricePerDay,
    location: input.location,
    capacity: input.capacity,
    dimensions: input.dimensions,
    cargoVolume: Number(
      (input.dimensions.length * input.dimensions.width * input.dimensions.height).toFixed(2)
    ),
    fuelType: input.fuelType,
    fuelConsumption: input.fuelConsumption,
    images: mergedImages,
    primaryImageUrl: resolvePrimaryImageUrl(mergedImages, input.primaryImageIndex),
    vehicleDocuments: nextVehicleDocuments,
    documentsApproved: isAdmin
      ? true
      : hasNewVehicleDocuments
        ? false
        : currentTruck.documentsApproved ?? false,
    documentsReviewStatus: isAdmin
      ? "approved"
      : hasNewVehicleDocuments
        ? "pending"
        : currentTruck.documentsReviewStatus ?? "pending",
    documentsReviewNote: isAdmin
      ? ""
      : hasNewVehicleDocuments
        ? ""
        : currentTruck.documentsReviewNote ?? "",
    ...(isAdmin
      ? {
          documentsReviewedAt: new Date().toISOString(),
          documentsReviewedBy: requester.id,
        }
      : currentTruck.documentsReviewedAt && currentTruck.documentsReviewedBy
        ? {
            documentsReviewedAt: currentTruck.documentsReviewedAt,
            documentsReviewedBy: currentTruck.documentsReviewedBy,
          }
        : {}),
    description: input.description,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(firebase.db, COLLECTIONS.trucks, currentTruck.id), payload, {
    merge: true,
  });

  const [truck] = await enrichOwnerTrust([
    toTruckCatalogItem({
      id: currentTruck.id,
      ...payload,
    }),
  ]);

  return truck;
}

export async function getTrucksPendingDocumentReview() {
  if (!canUseFirebaseRead()) {
    throw new Error("Firebase chưa được cấu hình để đọc dữ liệu xe tải.");
  }

  try {
    const trucksQuery = query(
      collection(db!, COLLECTIONS.trucks),
      where("documentsApproved", "==", false)
    );
    const snapshot = await getDocs(trucksQuery);

    const trucks = snapshot.docs
      .map((item) =>
        toTruckCatalogItem({
          id: item.id,
          ...(item.data() as Omit<Truck, "id">),
        })
      )
      .filter((truck) => (truck.vehicleDocuments ?? []).length > 0)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return enrichOwnerTrust(trucks);
  } catch {
    throw new Error("Không thể tải danh sách xe đang chờ duyệt giấy tờ.");
  }
}

export async function reviewTruckDocuments({
  truckId,
  actorId,
  decision,
  note,
}: ReviewTruckDocumentsInput) {
  const firebase = ensureFirebaseConfigured();
  const [actor, truckSnapshot] = await Promise.all([
    getUserProfileById(actorId),
    getDoc(doc(firebase.db, COLLECTIONS.trucks, truckId)),
  ]);

  if (!actor || actor.role !== "admin") {
    throw new Error("Chỉ quản trị viên mới có quyền duyệt giấy tờ xe.");
  }

  if (!truckSnapshot.exists()) {
    throw new Error("Không tìm thấy xe cần duyệt giấy tờ.");
  }

  const currentTruck = {
    id: truckSnapshot.id,
    ...(truckSnapshot.data() as Omit<Truck, "id">),
  };

  const vehicleDocuments = currentTruck.vehicleDocuments ?? [];
  if (vehicleDocuments.length === 0) {
    throw new Error("Xe này chưa có giấy tờ để duyệt.");
  }

  const now = new Date().toISOString();
  const nextDocuments = vehicleDocuments.map((document) => {
    if (decision === "approved") {
      return {
        ...document,
        approved: true,
        approvedAt: now,
      };
    }

    return {
      id: document.id,
      name: document.name,
      type: document.type,
      url: document.url,
      uploadedAt: document.uploadedAt,
      approved: false,
    } satisfies VehicleDocument;
  });

  const payload: Partial<Truck> = {
    vehicleDocuments: nextDocuments,
    documentsApproved: decision === "approved",
    documentsReviewStatus: decision === "approved" ? "approved" : "needsMore",
    documentsReviewNote: note?.trim() ?? "",
    documentsReviewedAt: now,
    documentsReviewedBy: actor.id,
    updatedAt: now,
  };

  await setDoc(doc(firebase.db, COLLECTIONS.trucks, truckId), payload, {
    merge: true,
  });

  const [reviewedTruck] = await enrichOwnerTrust([
    toTruckCatalogItem({
      ...currentTruck,
      ...payload,
      id: currentTruck.id,
    }),
  ]);

  return reviewedTruck;
}
