import { TruckForm } from "@/components/TruckForm";

export default function CreateTruckPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 rounded-[40px] border border-white/70 bg-white/80 p-7 shadow-[0_24px_70px_rgba(41,24,12,0.06)] lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
            Dashboard chủ xe
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-950">
            Đăng xe nhanh chóng – bắt đầu nhận đơn ngay hôm nay
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-stone-600">
            Chỉ với vài bước đơn giản, bạn có thể đăng thông tin xe, cập nhật hình ảnh và đưa xe của mình lên hệ thống để tiếp cận khách hàng.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            "Nhập thông tin xe",
            "Tải ảnh hiện trạng xe",
            "Cung cấp giấy tờ và chờ xác minh",
          ].map((step, index) => (
            <div key={step} className="rounded-[26px] bg-orange-50 p-5">
              <p className="text-sm font-semibold text-orange-600">
                Bước 0{index + 1}
              </p>
              <p className="mt-8 text-lg font-semibold text-stone-950">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <TruckForm />
    </div>
  );
}
