import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
      <section className="overflow-hidden rounded-[40px] bg-[linear-gradient(135deg,#ff8a3d,#ff5a1f)] p-8 text-white shadow-[0_28px_80px_rgba(255,98,39,0.24)] sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
          Chào mừng quay lại
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Khu đăng nhập cho chủ xe và người thuê
        </h1>
        <div className="mt-8 space-y-6">
          <div>
            <p className="text-lg font-semibold">💼 Professional</p>
            <p className="mt-2 text-base leading-6 text-white/80">
              Đăng nhập để quản lý hoạt động vận chuyển, theo dõi đơn hàng và tối ưu hiệu suất khai thác xe.
            </p>
          </div>

          <div>
            <p className="text-lg font-semibold">⚡ Nhanh gọn</p>
            <p className="mt-2 text-base leading-6 text-white/80">
              Truy cập hệ thống chỉ trong vài giây.
            </p>
          </div>

          <div>
            <p className="text-lg font-semibold">🚚 Logistics-focused</p>
            <p className="mt-2 text-base leading-6 text-white/80">
              Nền tảng kết nối vận chuyển giúp bạn tìm xe và khai thác xe hiệu quả hơn.
            </p>
          </div>

          <div>
            <p className="text-lg font-semibold">💡 Công nghệ</p>
            <p className="mt-2 text-base leading-6 text-white/80">
              Ứng dụng công nghệ để đơn giản hóa việc thuê và cho thuê xe tải.
            </p>
          </div>
        </div>
      </section>

      <AuthForm mode="login" />
    </div>
  );
}
