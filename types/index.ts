export type UserRole = "admin" | "owner" | "renter";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export type BookingPaymentStatus = "unpaid" | "paid";

export type VerificationStatus =
  | "unsubmitted"
  | "pending"
  | "verified"
  | "rejected";

export type VerificationDocumentType =
  | "identity"
  | "driverLicense"
  | "vehicleRegistration"
  | "businessLicense"
  | "authorizationLetter"
  | "other";

export type VehicleDocumentType = "vehicleRegistration" | "safetyInspection";

export type ReportStatus =
  | "open"
  | "investigating"
  | "resolved"
  | "rejected";

export type ReportTargetType = "truck" | "user";

export interface TimestampFields {
  createdAt: string;
  updatedAt?: string;
}

export interface VerificationDocument {
  id: string;
  name: string;
  type: VerificationDocumentType;
  url: string;
  uploadedAt: string;
}

export interface VehicleDocument {
  id: string;
  name: string;
  type: VehicleDocumentType;
  url: string;
  uploadedAt: string;
  approved: boolean;
  approvedAt?: string;
}

export interface User extends TimestampFields {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  emailVerified: boolean;
  verificationDocs: VerificationDocument[];
  verificationStatus: VerificationStatus;
  verificationNote?: string;
  verificationReviewedAt?: string;
  verificationReviewedBy?: string;
  avgRating: number;
  totalReviews: number;
  phone?: string;
  avatarUrl?: string;
}

export interface PublicUserProfile extends TimestampFields {
  id: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  avgRating: number;
  totalReviews: number;
  avatarUrl?: string;
}

export interface Truck extends TimestampFields {
  id: string;
  ownerId: string;
  name: string;
  brand?: string;
  year?: number;
  vehicleType?: string;
  pricePerDay: number;
  location: string;
  capacity: number;
  dimensions?: {
    length: number; // m
    width: number; // m
    height: number; // m
  };
  cargoVolume?: number; // m³
  fuelType?: string;
  fuelConsumption?: number; // L/100km
  images: string[];
  primaryImageUrl?: string;
  vehicleDocuments?: VehicleDocument[];
  documentsApproved?: boolean;
  description: string;
  isAvailable: boolean;
  rentalCount?: number;
}

export interface Booking extends TimestampFields {
  id: string;
  truckId: string;
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  loadingService?: boolean;
  loadingServiceFee?: number;
  status: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  paidAt?: string;
  paymentMethod?: string;
  paymentNote?: string;
}

export interface Review extends TimestampFields {
  id: string;
  bookingId: string;
  truckId: string;
  reviewerId: string;
  targetUserId: string;
  rating: number;
  comment: string;
}

export interface Message extends TimestampFields {
  id: string;
  bookingId: string;
  senderId: string;
  text: string;
}

export interface OwnerMessage extends TimestampFields {
  id: string;
  ownerId: string;
  senderId: string;
  text: string;
}

export interface Report extends TimestampFields {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  status: ReportStatus;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface FirestoreCollections {
  users: User;
  publicProfiles: PublicUserProfile;
  trucks: Truck;
  bookings: Booking;
  reviews: Review;
  messages: Message;
  ownerMessages: OwnerMessage;
  reports: Report;
}

export const COLLECTIONS = {
  users: "users",
  publicProfiles: "publicProfiles",
  trucks: "trucks",
  bookings: "bookings",
  reviews: "reviews",
  messages: "messages",
  ownerMessages: "ownerMessages",
  reports: "reports",
} as const;
