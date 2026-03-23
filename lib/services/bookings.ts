import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { COLLECTIONS, type Booking } from "@/types";
import { db, ensureFirebaseConfigured, isFirebaseConfigured } from "@/lib/firebase/config";
import { getTruckById } from "@/lib/services/trucks";
import { getUserProfileById } from "@/lib/services/users";
import { calculateRentalDays } from "@/lib/utils/format";

const demoBookings: Booking[] = [
  {
    id: "booking_01",
    truckId: "hino-500-long-bien",
    renterId: "renter_01",
    ownerId: "owner_01",
    startDate: "2026-03-24",
    endDate: "2026-03-27",
    totalPrice: 5400000,
    status: "confirmed",
    createdAt: "2026-03-19T09:00:00.000Z",
    updatedAt: "2026-03-19T11:00:00.000Z",
  },
  {
    id: "booking_02",
    truckId: "isuzu-qkr-binh-tan",
    renterId: "renter_02",
    ownerId: "owner_01",
    startDate: "2026-03-28",
    endDate: "2026-03-29",
    totalPrice: 1250000,
    status: "pending",
    createdAt: "2026-03-20T07:30:00.000Z",
    updatedAt: "2026-03-20T07:30:00.000Z",
  },
  {
    id: "booking_03",
    truckId: "thaco-ollin-da-nang",
    renterId: "renter_03",
    ownerId: "owner_02",
    startDate: "2026-03-22",
    endDate: "2026-03-24",
    totalPrice: 3100000,
    status: "completed",
    createdAt: "2026-03-16T10:15:00.000Z",
    updatedAt: "2026-03-18T18:00:00.000Z",
  },
];

function canUseFirebaseRead() {
  return isFirebaseConfigured && !!db;
}

function sortBookings<T extends Booking>(bookings: T[]) {
  return [...bookings].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export async function getBookingsForOwner(ownerId: string) {
  if (!canUseFirebaseRead()) {
    return sortBookings(
      demoBookings.filter((booking) => booking.ownerId === ownerId)
    );
  }

  const bookingsQuery = query(
    collection(db!, COLLECTIONS.bookings),
    where("ownerId", "==", ownerId)
  );
  const snapshot = await getDocs(bookingsQuery);

  return sortBookings(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<Booking, "id">),
    }))
  );
}

export async function getBookingsForRenter(renterId: string) {
  if (!canUseFirebaseRead()) {
    return sortBookings(
      demoBookings.filter((booking) => booking.renterId === renterId)
    );
  }

  const bookingsQuery = query(
    collection(db!, COLLECTIONS.bookings),
    where("renterId", "==", renterId)
  );
  const snapshot = await getDocs(bookingsQuery);

  return sortBookings(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<Booking, "id">),
    }))
  );
}

export async function getBookingById(bookingId: string) {
  if (!canUseFirebaseRead()) {
    return demoBookings.find((booking) => booking.id === bookingId) ?? null;
  }

  const snapshot = await getDoc(doc(db!, COLLECTIONS.bookings, bookingId));
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Booking, "id">),
  };
}

export async function getBookingByTruckId(truckId: string) {
  if (!canUseFirebaseRead()) {
    return demoBookings.find((booking) => booking.truckId === truckId) ?? null;
  }

  const bookingsQuery = query(
    collection(db!, COLLECTIONS.bookings),
    where("truckId", "==", truckId)
  );
  const snapshot = await getDocs(bookingsQuery);
  const booking = snapshot.docs[0];

  if (!booking) {
    return null;
  }

  return {
    id: booking.id,
    ...(booking.data() as Omit<Booking, "id">),
  };
}

export interface CreateBookingInput {
  truckId: string;
  renterId: string;
  startDate: string;
  endDate: string;
}

export async function createBooking(input: CreateBookingInput) {
  const firebase = ensureFirebaseConfigured();
  const truck = await getTruckById(input.truckId);
  const renter = await getUserProfileById(input.renterId);

  if (!truck) {
    throw new Error("Không tìm thấy xe để đặt.");
  }

  if (!renter) {
    throw new Error("Không tìm thấy tài khoản đặt xe.");
  }

  if (
    renter.role !== "renter" &&
    renter.role !== "owner" &&
    renter.role !== "admin"
  ) {
    throw new Error("Chỉ tài khoản đã đăng nhập mới có quyền tạo yêu cầu thuê xe.");
  }

  const start = new Date(input.startDate).getTime();
  const end = new Date(input.endDate).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error("Ngày bắt đầu và ngày kết thúc không hợp lệ.");
  }

  if (truck.ownerId === input.renterId) {
    throw new Error("Bạn không thể tự đặt chính xe do mình đăng.");
  }

  if (!truck.isAvailable) {
    throw new Error("Xe này hiện tạm thời không khả dụng để đặt.");
  }

  const rentalDays = calculateRentalDays(input.startDate, input.endDate);

  const payload: Omit<Booking, "id"> = {
    truckId: truck.id,
    renterId: input.renterId,
    ownerId: truck.ownerId,
    startDate: input.startDate,
    endDate: input.endDate,
    totalPrice: truck.pricePerDay * rentalDays,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const reference = await addDoc(
    collection(firebase.db, COLLECTIONS.bookings),
    payload
  );

  return {
    id: reference.id,
    ...payload,
  };
}

export async function updateBookingStatus(
  bookingId: string,
  actorId: string,
  status: Booking["status"]
) {
  const firebase = ensureFirebaseConfigured();
  const booking = await getBookingById(bookingId);
  const actor = await getUserProfileById(actorId);

  if (!booking) {
    throw new Error("Không tìm thấy booking cần cập nhật.");
  }

  if (!actor) {
    throw new Error("Không tìm thấy tài khoản đang thao tác.");
  }

  const isAdmin = actor.role === "admin";
  const isOwner = booking.ownerId === actorId;
  const isRenter = booking.renterId === actorId;

  if (!isAdmin && !isOwner && !isRenter) {
    throw new Error("Bạn không có quyền cập nhật booking này.");
  }

  if (isRenter && status !== "cancelled") {
    throw new Error("Người thuê chỉ có thể hủy booking của mình.");
  }

  if (status === "completed" && !isAdmin && !isOwner) {
    throw new Error("Chỉ chủ xe hoặc quản trị viên mới có thể hoàn tất booking.");
  }

  if (status === "confirmed" && !isAdmin && !isOwner) {
    throw new Error("Chỉ chủ xe hoặc quản trị viên mới có thể xác nhận booking.");
  }

  const nextBooking: Booking = {
    ...booking,
    status,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(firebase.db, COLLECTIONS.bookings, bookingId), nextBooking, {
    merge: true,
  });

  return nextBooking;
}
