"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

export default function LocationPage() {
  const searchParams = useSearchParams();
  const truckId = searchParams.get("truckId");

  // 🔥 fake data
  const truck = {
    name: "Hyundai H150 - 1.5 tấn",
    plate: "51C-123.45",
  location: "Cat Lai Port, Nguyễn Thị Định, Cát Lái, Hồ Chí Minh, Vietnam",
    status: "Đang di chuyển",
    image: "/uploads/trucks/images.jpg",
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold text-stone-900">
        Vị trí xe hiện tại
      </h1>

      <p className="mt-2 text-sm text-stone-500">
        Mã xe: {truckId}
      </p>

 {/* Card */}
<div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg">
  
  {/* Image */}
  <div className="h-56 w-full rounded-2xl bg-stone-100 flex items-center justify-center">
    <img
      src={truck.image}
      alt="truck"
      className="h-55 object-contain"
    />
  </div>

  {/* Info */}
  <div className="mt-5 space-y-2">
    <h2 className="text-xl font-semibold text-stone-900">
      {truck.name}
    </h2>

    <p className="text-sm text-stone-600">
      Biển số: <span className="font-medium">{truck.plate}</span>
    </p>

    <p className="text-sm text-stone-600">
      Trạng thái:{" "}
      <span className="font-medium text-orange-600">
        {truck.status}
      </span>
    </p>

    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
      Đang chờ bốc hàng
    </span>

    <p className="text-sm text-stone-600 flex items-center">
      <MapPin className="inline w-4 h-4 mr-1" />
      <span className="font-semibold text-stone-900">
        {truck.location}
      </span>
    </p>
  </div>

  {/* Map */}
  <MapWithTruck />
</div>

       
      </div>
    
  );
}
function MapWithTruck() {
  const [progress, setProgress] = useState(0);

  // 🎯 vị trí chấm đỏ (đã canh theo ảnh của bạn)
  const targetX = 48;
  const targetY = 43;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // 🚚 chạy từ trái → tới marker
  const currentX = (progress / 100) * targetX;

  // 🎯 đi theo đường cong rồi hạ xuống đúng marker
  const currentY =
    55 - (progress / 100) * (55 - targetY) +
    Math.sin(progress / 12) * 3;

  return (
    <div className="relative mt-6 h-[300px] w-full overflow-hidden rounded-2xl border">
      
      {/* Map */}
    <iframe
  width="100%"
  height="100%"
  className="absolute inset-0"
  loading="lazy"
  src="https://www.google.com/maps?q=Cat+Lai+Port,+Nguyễn+Thị+Định,+Cát+Lái,+Hồ+Chí+Minh&z=16&output=embed"
/>

      {/* 🚚 Xe */}
      <div
        className="absolute text-2xl transition-all duration-75"
        style={{
          left: `${currentX}%`,
          top: `${currentY}%`,
        }}
      >
        🚚
      </div>

      {/* Status */}
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-3 py-1 text-xs text-white">
        {progress >= 100 ? "Đã đến Cát Lái" : "Đang di chuyển..."}
      </div>
    </div>
  );
}