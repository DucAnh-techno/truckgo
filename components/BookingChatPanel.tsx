"use client";

import { useEffect, useState, useTransition } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  sendMessage,
  subscribeToBookingMessages,
} from "@/lib/services/messages";
import { formatDate } from "@/lib/utils/format";
import type { Message } from "@/types";

interface BookingChatPanelProps {
  bookingId: string;
  partnerLabel: string;
}

export function BookingChatPanel({
  bookingId,
  partnerLabel,
}: BookingChatPanelProps) {
  const { profile, isConfigured } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    let isActive = true;
  
    const unsubscribe = subscribeToBookingMessages(
      bookingId,
      (messages) => {
        if (!isActive) return;
        setMessages(messages);
      }
    );
  
    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [bookingId, isOpen]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      try {
        if (!isConfigured) {
          throw new Error("Firebase chưa được cấu hình để chat realtime.");
        }

        if (!profile) {
          throw new Error("Bạn cần đăng nhập để gửi tin nhắn.");
        }

        await sendMessage({
          bookingId,
          senderId: profile.id,
          text: draft,
        });
        setDraft("");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể gửi tin nhắn."
        );
      }
    });
  }

  if (!isOpen) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
            Chat 
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Trao đổi trực tiếp với {partnerLabel} trong booking này.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-stone-900 border border-stone-200 hover:bg-stone-100 transition"
        >
          Mở tin nhắn
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
            Chat 
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Trao đổi trực tiếp với {partnerLabel} trong booking này.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full bg-stone-200 px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-300 transition"
        >
          Đóng
        </button>
      </div>

      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
        {messages.length > 0 ? (
          messages.map((message) => {
            const isOwnMessage = message.senderId === profile?.id;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm ${
                    isOwnMessage
                      ? "bg-stone-950 text-white"
                      : "bg-white text-stone-700"
                  }`}
                >
                  <p>{message.text}</p>
                  <p
                    className={`mt-2 text-xs ${
                      isOwnMessage ? "text-white/60" : "text-stone-400"
                    }`}
                  >
                    {formatDate(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500">
            Chưa có tin nhắn nào trong booking này.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Nhập nội dung cần trao đổi với đối tác..."
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-900 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Đang gửi..." : "Gửi tin nhắn"}
        </button>
      </form>
    </div>
  );
}
