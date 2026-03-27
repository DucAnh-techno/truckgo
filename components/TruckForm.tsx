"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTransition } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  createTruck,
  updateTruck,
  type TruckCatalogItem,
} from "@/lib/services/trucks";
import { formatCurrency } from "@/lib/utils/format";
import { canManageTrucks } from "@/lib/utils/permissions";

interface TruckFormProps {
  mode?: "create" | "edit";
  truckId?: string;
  initialTruck?: TruckCatalogItem | null;
}

interface ImagePreviewItem {
  kind: "existing" | "new";
  label: string;
  src?: string;
}

export function TruckForm({
  mode = "create",
  truckId,
  initialTruck,
}: TruckFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { profile, isConfigured, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [year, setYear] = useState(2024);
  const [vehicleType, setVehicleType] = useState("");
  const [location, setLocation] = useState("");
  const [pricePerDay, setPricePerDay] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [length, setLength] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [fuelType, setFuelType] = useState("");
  const [fuelConsumption, setFuelConsumption] = useState(0);
  const [description, setDescription] = useState("");
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [vehicleRegistrationFile, setVehicleRegistrationFile] = useState<File | null>(
    null
  );
  const [safetyInspectionFile, setSafetyInspectionFile] = useState<File | null>(null);
  const [existingVehicleDocumentTypes, setExistingVehicleDocumentTypes] = useState<
    Array<"vehicleRegistration" | "safetyInspection">
  >([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const deferredName = useDeferredValue(name);
  const deferredDescription = useDeferredValue(description);
  const isEditMode = mode === "edit";
  const isAdmin = profile?.role === "admin";

  const cargoVolume = Number((length * width * height).toFixed(2));
  const allImageCount = existingImageUrls.length + newImageFiles.length;

  const imagePreviewItems = useMemo<ImagePreviewItem[]>(() => {
    const existingItems = existingImageUrls.map((url, index) => ({
      kind: "existing" as const,
      label: `Ảnh đã có ${index + 1}`,
      src: url,
    }));
    const newItems = newImageFiles.map((file) => ({
      kind: "new" as const,
      label: file.name,
    }));

    return [...existingItems, ...newItems];
  }, [existingImageUrls, newImageFiles]);

  const hasVehicleRegistration =
    existingVehicleDocumentTypes.includes("vehicleRegistration") ||
    Boolean(vehicleRegistrationFile);
  const hasSafetyInspection =
    existingVehicleDocumentTypes.includes("safetyInspection") ||
    Boolean(safetyInspectionFile);

  useEffect(() => {
    if (!initialTruck) {
      return;
    }

    setName(initialTruck.name ?? "");
    setBrand(initialTruck.brand ?? "");
    setYear(initialTruck.year ?? 2024);
    setVehicleType(initialTruck.vehicleType ?? "");
    setLocation(initialTruck.location ?? "");
    setPricePerDay(initialTruck.pricePerDay ?? 0);
    setCapacity(initialTruck.capacity ?? 0);
    setLength(initialTruck.dimensions?.length ?? 0);
    setWidth(initialTruck.dimensions?.width ?? 0);
    setHeight(initialTruck.dimensions?.height ?? 0);
    setFuelType(initialTruck.fuelType ?? "");
    setFuelConsumption(initialTruck.fuelConsumption ?? 0);
    setDescription(initialTruck.description ?? "");
    setExistingImageUrls(initialTruck.images ?? []);
    setNewImageFiles([]);
    setVehicleRegistrationFile(null);
    setSafetyInspectionFile(null);
    setExistingVehicleDocumentTypes(
      (initialTruck.vehicleDocuments ?? []).map((document) => document.type)
    );

    const primaryIndex =
      initialTruck.primaryImageUrl && initialTruck.images
        ? initialTruck.images.findIndex((url) => url === initialTruck.primaryImageUrl)
        : -1;

    setPrimaryImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
  }, [initialTruck]);

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

        if (allImageCount === 0) {
          throw new Error("Hãy chọn ít nhất 1 hình ảnh cho bài đăng.");
        }

        if (!isEditMode && newImageFiles.length === 0) {
          throw new Error("Khi đăng xe mới, bạn cần tải ít nhất 1 ảnh mới.");
        }

        if (!isEditMode && (primaryImageIndex < 0 || primaryImageIndex >= newImageFiles.length)) {
          throw new Error("Ảnh chính chưa hợp lệ. Hãy chọn lại ảnh chính.");
        }

        if (!name.trim()) {
          throw new Error("Hãy nhập tên xe.") 
        }

        if (!brand.trim()) {
          throw new Error("Hãy nhập hãng xe.");
        }

        if (!location.trim()) {
          throw new Error("Hãy nhập địa điểm.")
        }
         
        if (!pricePerDay || pricePerDay <= 0) {
          throw new Error("Hãy nhập giá cho thuê.")
        }

        if (!capacity || capacity <= 0) {
          throw new Error("Hãy nhập giá cho thuê.")
        }

        if (!year || year < 1900 || year > new Date().getFullYear() + 1) {
          throw new Error("Năm sản xuất không hợp lệ.");
        }

        if (!vehicleType.trim()) {
          throw new Error("Hãy chọn loại xe.");
        }

        if (!description.trim()) {
          throw new Error("Hãy nhập mô tả.");
        }

        if (!length || !width || !height) {
          throw new Error("Kích thước thùng xe phải lớn hơn 0.");
        }

        if (!fuelType.trim()) {
          throw new Error("Hãy chọn loại nhiên liệu.");
        }

        if (!fuelConsumption || fuelConsumption <= 0) {
          throw new Error("Mức tiêu hao nhiên liệu phải lớn hơn 0.");
        }

        if (!isEditMode && !vehicleRegistrationFile) {
          throw new Error("Khi đăng xe mới, giấy đăng ký xe là bắt buộc.");
        }

        if (!isEditMode && !safetyInspectionFile) {
          throw new Error("Khi đăng xe mới, giấy kiểm định an toàn kỹ thuật là bắt buộc.");
        }

        if (isEditMode && !isAdmin && !hasVehicleRegistration) {
          throw new Error("Chủ xe cần tải giấy đăng ký xe.");
        }

        if (isEditMode && !isAdmin && !hasSafetyInspection) {
          throw new Error("Chủ xe cần tải giấy kiểm định an toàn kỹ thuật.");
        }

        if (isEditMode) {
          if (!truckId) {
            throw new Error("Không xác định được xe cần chỉnh sửa.");
          }

          const truck = await updateTruck({
            truckId,
            requesterId: profile.id,
            name,
            brand,
            year,
            vehicleType,
            location,
            pricePerDay,
            capacity,
            dimensions: {
              length,
              width,
              height,
            },
            fuelType,
            fuelConsumption,
            description,
            existingImageUrls,
            newImages: newImageFiles,
            primaryImageIndex,
            vehicleRegistrationFile,
            safetyInspectionFile,
          });

          setSuccessMessage("Cập nhật xe thành công.");
          router.replace(`/trucks/${truck.id}/edit`);
        } else {
          const truck = await createTruck({
            ownerId: profile.id,
            name,
            brand,
            year,
            vehicleType,
            location,
            pricePerDay,
            capacity,
            dimensions: {
              length,
              width,
              height,
            },
            fuelType,
            fuelConsumption,
            description,
            images: newImageFiles,
            primaryImageIndex,
            vehicleRegistrationFile: vehicleRegistrationFile!,
            safetyInspectionFile: safetyInspectionFile!,
          });

          setSuccessMessage("Đăng xe thành công. Đang chuyển sang trang chi tiết...");
          router.push(`/trucks/${truck.id}`);
        }

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
            {isEditMode ? "Chỉnh sửa xe" : "Đăng xe"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-950">
            {isEditMode
              ? "Cập nhật thông tin và gallery xe"
              : "Tạo gian hàng cho đội xe của bạn"}
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
            <span className="text-sm font-medium text-stone-700">Hãng xe</span>
            <input
              value={brand}
              placeholder="VD: Hino, Isuzu, Thaco ..."
              onChange={(event) => setBrand(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Năm sản xuất</span>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Loại xe</span>
            <select
              value={vehicleType}
              onChange={(event) => setVehicleType(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            >
              <option value="">Chọn loại xe</option>
              <option value="Xe tải nhỏ">Xe tải nhỏ</option>
              <option value="Xe tải trung">Xe tải trung</option>
              <option value="Xe tải nặng">Xe tải nặng</option>
              <option value="Xe chuyên dụng">Xe chuyên dụng</option>
            </select>
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
            <span className="text-sm font-medium text-stone-700">Giá theo ngày</span>
            <input
              type="number"
              value={pricePerDay}
              onChange={(event) => setPricePerDay(Number(event.target.value))}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Tải trọng (kg)</span>
            <input
              type="number"
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Loại nhiên liệu</span>
            <select
              value={fuelType}
              onChange={(event) => setFuelType(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            >
              <option value="">Chọn nhiên liệu</option>
              <option value="Diesel">Diesel</option>
              <option value="Xăng">Xăng</option>
              <option value="Điện">Điện</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Mức tiêu hao (L/100km)</span>
            <input
              type="number"
              step="0.1"
              value={fuelConsumption}
              onChange={(event) => setFuelConsumption(Number(event.target.value))}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
            />
          </label>

          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-stone-700">Kích thước thùng xe (m)</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="number"
                step="0.01"
                value={length}
                onChange={(event) => setLength(Number(event.target.value))}
                placeholder="Dài"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
              />
              <input
                type="number"
                step="0.01"
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
                placeholder="Rộng"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
              />
              <input
                type="number"
                step="0.01"
                value={height}
                onChange={(event) => setHeight(Number(event.target.value))}
                placeholder="Cao"
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-orange-400"
              />
            </div>
          </label>

          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-stone-700">Thể tích thùng (m³)</span>
            <input
              type="number"
              value={cargoVolume}
              readOnly
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 bg-stone-100 outline-none"
            />
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
              if (nextFiles.length === 0) {
                return;
              }

              setNewImageFiles((previousFiles) => [...previousFiles, ...nextFiles]);

              // Reset input value to allow selecting the same file again if needed.
              event.currentTarget.value = "";
            }}
          />
        </label>

        <div className="space-y-3 rounded-2xl border border-stone-200 p-4">
          <p className="text-sm font-semibold text-stone-800">
            Danh sách ảnh theo thứ tự đã nhập
          </p>
          {imagePreviewItems.length > 0 ? (
            imagePreviewItems.map((item, index) => (
              <div
                key={`${item.kind}-${item.label}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-stone-500">#{index + 1}</span>
                  <span className="text-sm text-stone-700">{item.label}</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="radio"
                      name="primary-image"
                      checked={primaryImageIndex === index}
                      onChange={() => setPrimaryImageIndex(index)}
                    />
                    Ảnh chính
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (item.kind === "existing") {
                        const nextImages = [...existingImageUrls];
                        nextImages.splice(index, 1);
                        setExistingImageUrls(nextImages);
                      } else {
                        const newIndex = index - existingImageUrls.length;
                        const nextFiles = [...newImageFiles];
                        nextFiles.splice(newIndex, 1);
                        setNewImageFiles(nextFiles);
                      }

                      setPrimaryImageIndex((previous) => {
                        if (previous === index) {
                          return Math.max(0, index - 1);
                        }
                        if (previous > index) {
                          return previous - 1;
                        }
                        return previous;
                      });
                    }}
                    className="text-sm font-semibold text-red-600 transition hover:text-red-700"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">Chưa có ảnh nào được chọn</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block rounded-[28px] border border-dashed border-stone-300 bg-stone-50 p-5">
            <span className="text-sm font-semibold text-stone-800">Giấy đăng ký xe</span>
            <p className="mt-1 text-sm text-stone-600">
              {isAdmin
                ? "Tài khoản admin có thể bỏ qua mục này và mặc định được chấp thuận."
                : "Bắt buộc đối với chủ xe."}
            </p>
            <input
              type="file"
              className="mt-3 block w-full text-sm text-stone-600 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:font-semibold file:text-white"
              onChange={(event) =>
                setVehicleRegistrationFile(event.target.files?.[0] ?? null)
              }
            />
            <p className="mt-2 text-xs text-stone-500">
              {vehicleRegistrationFile
                ? `Đã chọn: ${vehicleRegistrationFile.name}`
                : existingVehicleDocumentTypes.includes("vehicleRegistration")
                  ? "Đã có giấy tờ trước đó"
                  : "Chưa có giấy tờ"}
            </p>
          </label>

          <label className="block rounded-[28px] border border-dashed border-stone-300 bg-stone-50 p-5">
            <span className="text-sm font-semibold text-stone-800">
              Giấy kiểm định an toàn kỹ thuật
            </span>
            <p className="mt-1 text-sm text-stone-600">
              {isAdmin
                ? "Tài khoản admin có thể bỏ qua mục này và mặc định được chấp thuận."
                : "Bắt buộc đối với chủ xe."}
            </p>
            <input
              type="file"
              className="mt-3 block w-full text-sm text-stone-600 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:font-semibold file:text-white"
              onChange={(event) =>
                setSafetyInspectionFile(event.target.files?.[0] ?? null)
              }
            />
            <p className="mt-2 text-xs text-stone-500">
              {safetyInspectionFile
                ? `Đã chọn: ${safetyInspectionFile.name}`
                : existingVehicleDocumentTypes.includes("safetyInspection")
                  ? "Đã có giấy tờ trước đó"
                  : "Chưa có giấy tờ"}
            </p>
          </label>
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
          {isPending
            ? "Đang upload..."
            : isEditMode
              ? "Lưu thay đổi"
              : "Đăng bài ngay"}
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
            <p className="mt-1 text-sm text-white/70">{brand || "Hãng chưa điền"} • {year || "Năm"}</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(pricePerDay)}</p>
            <p className="mt-1 text-sm text-white/70">
              {vehicleType || "Loại xe chưa chọn"} • Tải {capacity.toLocaleString("vi-VN")} kg
            </p>
            <p className="mt-1 text-sm text-white/70">
              {fuelType ? `${fuelType} • ${fuelConsumption} L/100km` : "Nhiên liệu chưa chọn"}
            </p>
            <p className="mt-1 text-sm text-white/70">
              Thể tích: {cargoVolume} m³
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
