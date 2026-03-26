import type {
  BookingPaymentStatus,
  BookingStatus,
  ReportStatus,
  ReportTargetType,
  UserRole,
  VerificationDocumentType,
  VerificationStatus,
} from "@/types";

export function getRoleLabel(role?: UserRole | null) {
  switch (role) {
    case "admin":
      return "Quản trị viên";
    case "owner":
      return "Chủ xe";
    case "renter":
      return "Người thuê";
    default:
      return "Người dùng";
  }
}

export function getBookingStatusLabel(status: BookingStatus | string) {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "cancelled":
      return "Đã hủy";
    case "completed":
      return "Hoàn tất";
    default:
      return status;
  }
}

export function getPaymentStatusLabel(status: BookingPaymentStatus | string) {
  switch (status) {
    case "paid":
      return "Đã thanh toán";
    case "unpaid":
      return "Chưa thanh toán";
    default:
      return status;
  }
}

export function getVerificationStatusLabel(status: VerificationStatus) {
  switch (status) {
    case "verified":
      return "Đã xác minh";
    case "pending":
      return "Đang chờ duyệt";
    case "rejected":
      return "Cần bổ sung hồ sơ";
    case "unsubmitted":
    default:
      return "Chưa gửi hồ sơ";
  }
}

export function getVerificationDocumentTypeLabel(
  type: VerificationDocumentType
) {
  switch (type) {
    case "identity":
      return "CCCD";
    case "driverLicense":
      return "Giấy phép lái xe";
    case "vehicleRegistration":
      return "Giấy đăng ký xe";
    case "businessLicense":
      return "Giấy phép kinh doanh";
    case "authorizationLetter":
      return "Giấy ủy quyền";
    case "other":
    default:
      return "Giấy tờ khác";
  }
}

export function getReportStatusLabel(status: ReportStatus) {
  switch (status) {
    case "open":
      return "Mới tiếp nhận";
    case "investigating":
      return "Đang xử lý";
    case "resolved":
      return "Đã xử lý";
    case "rejected":
      return "Đã từ chối";
    default:
      return status;
  }
}

export function getReportTargetLabel(targetType: ReportTargetType) {
  return targetType === "truck" ? "Báo cáo phương tiện" : "Báo cáo người dùng";
}
