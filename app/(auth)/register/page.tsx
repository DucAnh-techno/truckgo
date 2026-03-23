import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
      <section className="overflow-hidden rounded-[40px] bg-[linear-gradient(135deg,#1f1612,#472d21)] p-8 text-white shadow-[0_28px_80px_rgba(31,22,18,0.18)] sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-200">
          Tạo tài khoản
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Tạo tài khoản để đăng xe hoặc đặt xe bằng email và mật khẩu
        </h1>
        <div className="mt-8 space-y-6">
          <div>
            <p className="text-lg font-semibold">💼 Professional</p>
            <p className="mt-2 text-base leading-6 text-white/80">
              Đăng ký để quản lý hoạt động vận chuyển, theo dõi đơn hàng và tối ưu hiệu suất khai thác xe.
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

      <AuthForm mode="register" />
    </div>
  );
}
