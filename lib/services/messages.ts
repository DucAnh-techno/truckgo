import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db, ensureFirebaseConfigured, isFirebaseConfigured } from "@/lib/firebase/config";
import { getBookingById } from "@/lib/services/bookings";
import { COLLECTIONS, type Message, type OwnerMessage } from "@/types";

const demoMessages: Message[] = [
  {
    id: "message_01",
    bookingId: "booking_01",
    senderId: "renter_01",
    text: "Em cần nhận xe lúc 7h30 sáng, bên anh sắp xếp được không?",
    createdAt: "2026-03-19T09:15:00.000Z",
    updatedAt: "2026-03-19T09:15:00.000Z",
  },
  {
    id: "message_02",
    bookingId: "booking_01",
    senderId: "owner_01",
    text: "Được em, anh sẽ giao xe tại kho Long Biên và gửi vị trí trước 30 phút.",
    createdAt: "2026-03-19T09:18:00.000Z",
    updatedAt: "2026-03-19T09:18:00.000Z",
  },
  {
    id: "message_03",
    bookingId: "booking_03",
    senderId: "owner_02",
    text: "Xe đã sắp xếp xong, bên em có cần xuất hóa đơn điện tử không?",
    createdAt: "2026-03-16T11:00:00.000Z",
    updatedAt: "2026-03-16T11:00:00.000Z",
  },
];

const demoOwnerMessages: OwnerMessage[] = [];

function canUseFirebaseRead() {
  return isFirebaseConfigured && !!db;
}

function sortMessages<T extends Message>(messages: T[]) {
  return [...messages].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
}

export async function getMessagesForBooking(bookingId: string) {
  if (!canUseFirebaseRead()) {
    return sortMessages(
      demoMessages.filter((message) => message.bookingId === bookingId)
    );
  }

  const messagesQuery = query(
    collection(db!, COLLECTIONS.messages),
    where("bookingId", "==", bookingId)
  );
  const snapshot = await getDocs(messagesQuery);

  return sortMessages(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<Message, "id">),
    }))
  );
}

export async function getMessagesForOwner(ownerId: string) {
  if (!canUseFirebaseRead()) {
    return demoOwnerMessages.filter((m) => m.ownerId === ownerId);
  }

  const messagesQuery = query(
    collection(db!, COLLECTIONS.ownerMessages),
    where("ownerId", "==", ownerId)
  );
  const snapshot = await getDocs(messagesQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<OwnerMessage, "id">),
  }));
}

export async function getMessagesForOwnerByViewer(
  ownerId: string,
  viewerId: string
) {
  if (!canUseFirebaseRead()) {
    if (viewerId === ownerId) {
      return demoOwnerMessages.filter((m) => m.ownerId === ownerId);
    }
    return demoOwnerMessages.filter(
      (m) => m.ownerId === ownerId && m.senderId === viewerId
    );
  }

  const baseCollection = collection(db!, COLLECTIONS.ownerMessages);
  const messagesQuery =
    viewerId === ownerId
      ? query(baseCollection, where("ownerId", "==", ownerId))
      : query(
          baseCollection,
          where("ownerId", "==", ownerId),
          where("senderId", "==", viewerId)
        );

  const snapshot = await getDocs(messagesQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<OwnerMessage, "id">),
  }));
}

export function subscribeToBookingMessages(
  bookingId: string,
  onMessages: (messages: Message[]) => void
) {
  if (!canUseFirebaseRead()) {
    onMessages(
      sortMessages(demoMessages.filter((message) => message.bookingId === bookingId))
    );
    return () => undefined;
  }

  const messagesQuery = query(
    collection(db!, COLLECTIONS.messages),
    where("bookingId", "==", bookingId)
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const nextMessages = sortMessages(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Message, "id">),
      }))
    );
    onMessages(nextMessages);
  }, () => {
    // Fallback to demo data to avoid uncaught listener errors in UI when rules deny access.
    onMessages(
      sortMessages(demoMessages.filter((message) => message.bookingId === bookingId))
    );
  });
}

export function subscribeToOwnerMessages(
  ownerId: string,
  viewerId: string,
  onMessages: (messages: OwnerMessage[]) => void
) {
  if (!canUseFirebaseRead()) {
    if (viewerId === ownerId) {
      onMessages(demoOwnerMessages.filter((m) => m.ownerId === ownerId));
    } else {
      onMessages(
        demoOwnerMessages.filter(
          (m) => m.ownerId === ownerId && m.senderId === viewerId
        )
      );
    }
    return () => undefined;
  }

  const baseCollection = collection(db!, COLLECTIONS.ownerMessages);
  const messagesQuery =
    viewerId === ownerId
      ? query(baseCollection, where("ownerId", "==", ownerId))
      : query(
          baseCollection,
          where("ownerId", "==", ownerId),
          where("senderId", "==", viewerId)
        );

  return onSnapshot(messagesQuery, (snapshot) => {
    const nextMessages = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<OwnerMessage, "id">),
    }));
    onMessages(nextMessages);
  }, () => {
    // Fallback to demo data to avoid uncaught listener errors in UI when rules deny access.
    if (viewerId === ownerId) {
      onMessages(demoOwnerMessages.filter((m) => m.ownerId === ownerId));
    } else {
      onMessages(
        demoOwnerMessages.filter(
          (m) => m.ownerId === ownerId && m.senderId === viewerId
        )
      );
    }
  });
}

export interface SendMessageInput {
  bookingId: string;
  senderId: string;
  text: string;
}

export async function sendMessage(input: SendMessageInput) {
  const firebase = ensureFirebaseConfigured();
  const booking = await getBookingById(input.bookingId);

  if (!booking) {
    throw new Error("Không tìm thấy booking để gửi tin nhắn.");
  }

  if (booking.ownerId !== input.senderId && booking.renterId !== input.senderId) {
    throw new Error("Bạn không thuộc booking này nên không thể chat.");
  }

  const trimmedText = input.text.trim();
  if (!trimmedText) {
    throw new Error("Tin nhắn không được để trống.");
  }

  const payload: Omit<Message, "id"> = {
    bookingId: input.bookingId,
    senderId: input.senderId,
    text: trimmedText,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const reference = await addDoc(collection(firebase.db, COLLECTIONS.messages), payload);

  return {
    id: reference.id,
    ...payload,
  };
}

export interface SendOwnerMessageInput {
  ownerId: string;
  senderId: string;
  text: string;
}

export async function sendOwnerMessage(input: SendOwnerMessageInput) {
  const firebase = ensureFirebaseConfigured();

  const trimmedText = input.text.trim();
  if (!trimmedText) {
    throw new Error("Tin nhắn không được để trống.");
  }

  const payload: Omit<OwnerMessage, "id"> = {
    ownerId: input.ownerId,
    senderId: input.senderId,
    text: trimmedText,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const reference = await addDoc(collection(firebase.db, COLLECTIONS.ownerMessages), payload);

  return {
    id: reference.id,
    ...payload,
  };
}
