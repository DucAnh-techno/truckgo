import { v4 as uuidv4 } from "uuid";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { COLLECTIONS, type Truck } from "@/types";
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
  pricePerDay: number;
  location: string;
  capacity: number;
  description: string;
  images: File[];
}

const demoTrucks: TruckCatalogItem[] = [
  {
    id: "hino-500-long-bien",
    ownerId: "owner_01",
    name: "Hino 500 Mui Bạt Premium",
    pricePerDay: 1800000,
    location: "Long Biên, Hà Nội",
    capacity: 8000,
    images: ["hero", "cabin", "cargo"],
    description:
      "Dòng xe mui bạt giữ phong cách mạnh mẽ, hợp vận chuyển nội thành và liên tỉnh với khoang thùng rộng và đội xe được bảo dưỡng định kỳ.",
    createdAt: "2026-03-18T08:30:00.000Z",
    updatedAt: "2026-03-20T08:30:00.000Z",
    isAvailable: true,
    category: "Xe mui bạt",
    summary: "Giao nhanh cho đơn hàng thương mại và logistics nội thành.",
    gear: "Số sàn 6 cấp",
    fuel: "Diesel tiết kiệm",
    tags: ["Bảo hiểm đầy đủ", "Có tài xế", "Xuất hóa đơn"],
    accentFrom: "#ff8133",
    accentTo: "#ff4d00",
    availableFrom: "Có thể nhận xe trong 2 giờ",
  },
  {
    id: "isuzu-qkr-binh-tan",
    ownerId: "owner_01",
    name: "Isuzu QKR City Delivery",
    pricePerDay: 1250000,
    location: "Bình Tân, TP.HCM",
    capacity: 2500,
    images: ["hero", "cabin", "cargo"],
    description:
      "Phù hợp giao hàng siêu thị, điện máy và hàng tiêu dùng trong thành phố. Thân xe gọn, dễ vào hẻm và khu dân cư.",
    createdAt: "2026-03-17T10:00:00.000Z",
    updatedAt: "2026-03-20T08:30:00.000Z",
    isAvailable: true,
    category: "Xe tải nhỏ",
    summary: "Nhỏ gọn, linh hoạt, tối ưu cho chuyến giao hàng ngày.",
    gear: "Số tay",
    fuel: "Diesel",
    tags: ["Nhận xe sớm", "Phù hợp nội thành", "Kiểm định mới"],
    accentFrom: "#ffd166",
    accentTo: "#f77f00",
    availableFrom: "Còn 3 lịch trong hôm nay",
  },
  {
    id: "thaco-ollin-da-nang",
    ownerId: "owner_02",
    name: "Thaco Ollin Thùng Kín",
    pricePerDay: 1550000,
    location: "Hải Châu, Đà Nẵng",
    capacity: 5000,
    images: ["hero", "cabin", "cargo"],
    description:
      "Xe thùng kín chuyên chở hàng gia dụng và hàng cần tránh nắng mưa, phù hợp giao nhận cho doanh nghiệp vừa và nhỏ.",
    createdAt: "2026-03-15T09:00:00.000Z",
    updatedAt: "2026-03-19T14:10:00.000Z",
    isAvailable: true,
    category: "Xe thùng kín",
    summary: "An toàn cho hàng hóa cần bảo quản, chạy đường dài ổn định.",
    gear: "Số sàn 5 cấp",
    fuel: "Diesel",
    tags: ["Hỗ trợ đường dài", "Thùng kín sạch", "GPS theo dõi"],
    accentFrom: "#6c9a8b",
    accentTo: "#275d63",
    availableFrom: "Đặt trước 1 ngày",
  },
  {
    id: "hyundai-75s-ben-nghe",
    ownerId: "owner_03",
    name: "Hyundai 75S Lift Gate",
    pricePerDay: 2100000,
    location: "Bến Nghé, TP.HCM",
    capacity: 3500,
    images: ["hero", "cabin", "cargo"],
    description:
      "Trang bị bàn nâng sau xe, rất hợp với các đơn hàng cần bốc xếp nhanh tại kho, cửa hàng và trung tâm thương mại.",
    createdAt: "2026-03-11T11:15:00.000Z",
    updatedAt: "2026-03-20T07:00:00.000Z",
    isAvailable: true,
    category: "Xe nâng đuôi",
    summary: "Tăng tốc độ bốc xếp và giảm chi phí nhân công cho kho vận.",
    gear: "Số tự động",
    fuel: "Diesel Euro 5",
    tags: ["Bàn nâng sau", "Khoang thùng rộng", "Chăm sóc 24/7"],
    accentFrom: "#5fbff9",
    accentTo: "#1f6feb",
    availableFrom: "Nhận xe ngay trong ca tối",
  },
  {
    id: "jac-n650-hai-phong",
    ownerId: "owner_02",
    name: "JAC N650 Chở Hàng Nông Sản",
    pricePerDay: 1450000,
    location: "Hồng Bàng, Hải Phòng",
    capacity: 6500,
    images: ["hero", "cabin", "cargo"],
    description:
      "Thùng xe thoáng, động cơ bền bỉ, phù hợp chở nông sản, vật liệu và đơn hàng cần vận chuyển liên tỉnh.",
    createdAt: "2026-03-13T13:30:00.000Z",
    updatedAt: "2026-03-19T19:45:00.000Z",
    isAvailable: true,
    category: "Xe liên tỉnh",
    summary: "Cân bằng giữa tải trọng, chi phí và độ bền cho chuyến đường xa.",
    gear: "Số sàn",
    fuel: "Diesel",
    tags: ["Tuyến Bắc Ninh", "Tuyến Quảng Ninh", "Tải trọng lớn"],
    accentFrom: "#8d99ae",
    accentTo: "#2b2d42",
    availableFrom: "Còn lịch trong cuối tuần",
  },
  {
    id: "fuso-canter-go-vap",
    ownerId: "owner_04",
    name: "Fuso Canter Retail Box",
    pricePerDay: 1380000,
    location: "Gò Vấp, TP.HCM",
    capacity: 3200,
    images: ["hero", "cabin", "cargo"],
    description:
      "Xe cân đối cho các shop online và đơn vị phân phối cần luồng giao ổn định, khoang thùng sạch và đẹp để lên thương hiệu.",
    createdAt: "2026-03-12T15:00:00.000Z",
    updatedAt: "2026-03-20T06:10:00.000Z",
    isAvailable: true,
    category: "Xe phân phối",
    summary: "Tối ưu cho vận hành thương mại điện tử và giao nhanh nhiều điểm.",
    gear: "Số tay",
    fuel: "Diesel",
    tags: ["Shop online", "Giao nhiều điểm", "Nội thất đẹp"],
    accentFrom: "#f4acb7",
    accentTo: "#c9184a",
    availableFrom: "Đã sẵn sàng bàn giao",
  },
];

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
    category:
      truck.capacity >= 5000
        ? "Xe tải hạng nặng"
        : truck.capacity >= 3000
          ? "Xe giao vận trung"
          : "Xe giao vận nhỏ",
    summary,
    gear: "Sẵn sàng khai thác",
    fuel: "Máy dầu",
    tags: [
      truck.isAvailable ? "Có sẵn" : "Tạm hết lịch",
      truck.location,
      `${truck.capacity.toLocaleString("vi-VN")} kg`,
    ],
    accentFrom,
    accentTo,
    availableFrom: truck.isAvailable
      ? "Có thể nhận xe trong 24 giờ"
      : "Tạm thời đã kín lịch",
  };
}

async function enrichOwnerTrust(trucks: TruckCatalogItem[]) {
  const ownerIds = Array.from(new Set(trucks.map((truck) => truck.ownerId)));
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
    return enrichOwnerTrust(filterTrucks(demoTrucks, filters));
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
    return enrichOwnerTrust(filterTrucks(demoTrucks, filters));
  }
}

export async function getFeaturedTrucks() {
  const trucks = await getMarketplaceTrucks();
  return trucks.slice(0, 4);
}

export async function getTruckById(id: string) {
  if (!canUseFirebaseRead()) {
    const truck = demoTrucks.find((item) => item.id === id);
    if (!truck) {
      return null;
    }

    const [enrichedTruck] = await enrichOwnerTrust([truck]);
    return enrichedTruck ?? null;
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
    const truck = demoTrucks.find((item) => item.id === id);
    if (!truck) {
      return null;
    }

    const [enrichedTruck] = await enrichOwnerTrust([truck]);
    return enrichedTruck ?? null;
  }
}

export async function getOwnerTrucks(ownerId: string) {
  if (!canUseFirebaseRead()) {
    return enrichOwnerTrust(demoTrucks.filter((truck) => truck.ownerId === ownerId));
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
    return enrichOwnerTrust(demoTrucks.filter((truck) => truck.ownerId === ownerId));
  }
}

export async function getPopularLocations() {
  const trucks = await getMarketplaceTrucks();
  return Array.from(new Set(trucks.map((truck) => truck.location)));
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

  const imageUrls = await uploadTruckImages(input.ownerId, input.images);

  const payload: Omit<Truck, "id"> = {
    ownerId: input.ownerId,
    name: input.name,
    pricePerDay: input.pricePerDay,
    location: input.location,
    capacity: input.capacity,
    images: imageUrls,
    description: input.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAvailable: true,
  };

  const reference = await addDoc(collection(firebase.db, COLLECTIONS.trucks), payload);

  const [truck] = await enrichOwnerTrust([
    toTruckCatalogItem({
      id: reference.id,
      ...payload,
    }),
  ]);

  return truck;
}
