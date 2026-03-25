import { v4 as uuidv4 } from "uuid";
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

import { COLLECTIONS, type Truck, type VehicleDocument } from "@/types";
import {
  db,
  ensureFirebaseConfigured,
  isFirebaseConfigured,
} from "@/lib/firebase/config";
import { getReviewSummariesForUsers } from "@/lib/services/reviews";
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
  vehicleRegistrationFile?: File | null;
  safetyInspectionFile?: File | null;
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

function toTruckCatalogItem(truck: Truck): TruckCatalogItem {
  const [accentFrom, accentTo] = getPalette(truck.id || truck.name);
  const summary =
    truck.description.length > 96
      ? `${truck.description.slice(0, 93).trim()}...`
      : truck.description;

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
    gear: "Sẵn sàng khai thác",
    fuel: truck.fuelType || "Máy dầu",
    tags: [
      truck.isAvailable ? "Có sẵn" : "Tạm hết lịch",
      truck.location,
      `${truck.capacity.toLocaleString("vi-VN")} kg`,
      ...(truck.brand ? [truck.brand] : []),
      ...(truck.year ? [`${truck.year}`] : []),
    ],
    accentFrom,
    accentTo,
    availableFrom: truck.isAvailable
      ? "Có thể nhận xe trong 24 giờ"
      : "Tạm thời đã kín lịch",
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
  const snapshot = await uploadBytes(storageRef, file);

  return {
    id: uuidv4(),
    name: file.name,
    type: documentType,
    url: await getDownloadURL(snapshot.ref),
    uploadedAt: new Date().toISOString(),
    approved,
    approvedAt: approved ? new Date().toISOString() : undefined,
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

      return matchLocation && matchPrice && matchKeyword;
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
      toTruckCatalogItem({
        id: item.id,
        ...(item.data() as Omit<Truck, "id">),
      })
    );

    return enrichOwnerTrust(filterTrucks(trucks, filters));
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
      }),
    ]);

    return enrichedTruck ?? null;
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

    return enrichOwnerTrust(
      snapshot.docs
        .map((item) =>
          toTruckCatalogItem({
            id: item.id,
            ...(item.data() as Omit<Truck, "id">),
          })
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

  if (!isAdmin && (!input.vehicleRegistrationFile || !input.safetyInspectionFile)) {
    throw new Error("Chủ xe cần tải đủ đăng ký xe và kiểm định an toàn kỹ thuật.");
  }

  const imageUrls = await uploadTruckImages(input.ownerId, input.images);
  const primaryImageUrl = resolvePrimaryImageUrl(imageUrls, input.primaryImageIndex);
  const truckDocRef = doc(collection(firebase.db, COLLECTIONS.trucks));

  const vehicleDocuments: VehicleDocument[] = [];

  if (input.vehicleRegistrationFile) {
    vehicleDocuments.push(
      await uploadVehicleDocument(
        input.ownerId,
        truckDocRef.id,
        "vehicleRegistration",
        input.vehicleRegistrationFile,
        isAdmin
      )
    );
  }

  if (input.safetyInspectionFile) {
    vehicleDocuments.push(
      await uploadVehicleDocument(
        input.ownerId,
        truckDocRef.id,
        "safetyInspection",
        input.safetyInspectionFile,
        isAdmin
      )
    );
  }

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
    documentsApproved: isAdmin ? true : currentTruck.documentsApproved ?? false,
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
