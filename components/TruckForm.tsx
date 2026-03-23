"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { useTransition } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { createTruck } from "@/lib/services/trucks";
import { formatCurrency } from "@/lib/utils/format";
import { canManageTrucks } from "@/lib/utils/permissions";

export function TruckForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { profile, isConfigured, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pricePerDay, setPricePerDay] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [description, setDescription] = useState(
    ""
  );
  const [fileObjects, setFileObjects] = useState<File[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const deferredName = useDeferredValue(name);
  const deferredDescription = useDeferredValue(description);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        if (!isConfigured) {
          throw new Error(
            "Firebase chưa được cấu hình. Hãy điền `.env.local` trước khi đăng xe."
          );
        }

        if (!profile) {
          throw new Error("Bạn cần đăng nhập trước khi đăng xe.");
        }

        if (!canManageTrucks(profile.role)) {
          throw new Error("Chỉ tài khoản chủ xe mới có quyền đăng xe.");
        }

        if (fileObjects.length === 0) {
          throw new Error("Hãy chọn ít nhất 1 hình ảnh cho bài đăng.");
        }

        const truck = await createTruck({
          ownerId: profile.id,
          name,
          location,
          pricePerDay,
          capacity,
          description,
          images: fileObjects,
        });

        setSuccessMessage("Đăng xe thành công. Đang chuyển sang trang chi tiết...");
        router.push(`/trucks/${truck.id}`);
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể đăng xe lúc này."
        );
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-4xl border border-white/70 bg-white p-7 shadow-[0_20px_60px_rgba(41,24,12,0.08)]"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
            Đăng xe
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-950">
            Tạo gian hàng cho đội xe của bạn
          </h2>
        </div>

        {!isConfigured ? (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            Firebase chưa được cấu hình. Bạn hãy tạo file `.env.local` từ
            `.env.example` để sử dụng tính năng đăng xe thật.
          </div>
        ) : null}

        {!isLoading && !profile ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            Bạn cần đăng nhập trước khi đăng xe.{" "}
            <Link href="/login" className="font-semibold text-orange-600">
              Đến trang đăng nhập
            </Link>
          </div>
        ) : null}

        {!isLoading && profile && !canManageTrucks(profile.role) ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tài khoản người thuê không có chức năng đăng xe. Nếu bạn muốn mở gian
            xe, hãy đăng ký bằng vai trò chủ xe.
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-stone-700">Tên xe</span>
            <input
              value={name}
              placeholder="Nhập tên xe ..."
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Khu vực</span>
            <input
              value={location}
              placeholder="VD: Bình Thạnh, TP.HCM"
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">
              Giá theo ngày
            </span>
            <input
              type="number"
              value={pricePerDay}
              onChange={(event) => setPricePerDay(Number(event.target.value))}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">
              Tải trọng (kg)
            </span>
            <input
              type="number"
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">
              Loại thùng xe
            </span>
            <select className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400">
              <option>Mui bạt</option>
              <option>Thùng kín</option>
              <option>Đông lạnh</option>
              <option>Bàn nâng sau</option>
            </select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Mô tả</span>
          <textarea
            rows={5}
            value={description}
            placeholder={`Mô tả chi tiết về xe của bạn sẽ gia tăng tỷ lệ đơn hàng.
VD: Xe tải 2.5 tấn, thùng kín, phù hợp vận chuyển hàng hóa nội thành và liên tỉnh, ...`}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
          />
        </label>

        <label className="block rounded-[28px] border border-dashed border-orange-300 bg-orange-50/80 p-5">
          <span className="text-sm font-semibold text-stone-800">
            Upload hình ảnh xe
          </span>
          <p className="mt-2 text-sm text-stone-600">
            Kéo thả hoặc chọn tối đa 8 ảnh để tạo gallery cho bài đăng.
          </p>
          <input
            type="file"
            multiple
            className="mt-4 block w-full text-sm text-stone-600 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:font-semibold file:text-white"
            onChange={(event) => {
              const nextFiles = Array.from(event.target.files ?? []);
              setFileObjects(nextFiles);
              setFiles(nextFiles.map((file) => file.name));
            }}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          {files.length > 0 ? (
            files.map((file) => (
              <span
                key={file}
                className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700"
              >
                {file}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-500">
              Chưa có ảnh nào được chọn
            </span>
          )}
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-stone-950 px-6 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Đang upload..." : "Đăng bài ngay"}
        </button>
      </form>

      <aside className="space-y-5 rounded-4xl border border-stone-200 bg-[#1f1612] p-7 text-white shadow-[0_24px_70px_rgba(31,22,18,0.18)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">
            Xem trước
          </p>
          <h3 className="mt-2 text-2xl font-semibold">{deferredName}</h3>
          <p className="mt-2 text-sm text-white/70">{deferredDescription}</p>
        </div>

        <div className="rounded-[28px] bg-[linear-gradient(135deg,#ff7a18,#ff4d00)] p-6">
          <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
            Sàn trường tải xe
          </div>
          <div className="mt-10 rounded-3xl border border-white/20 bg-black/10 p-4 backdrop-blur">
            <p className="text-sm text-white/70">{location}</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(pricePerDay)}</p>
            <p className="mt-1 text-sm text-white/70">
              Tải trọng {capacity.toLocaleString("vi-VN")} kg
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/60">Tỉ lệ bài đăng được duyệt</p>
            <p className="mt-2 text-3xl font-semibold">92%</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/60">Giá đề xuất theo khu vực</p>
            <p className="mt-2 text-3xl font-semibold">1.4M - 1.9M</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
