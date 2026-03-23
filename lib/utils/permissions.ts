import type { UserRole } from "@/types";

export function canManageTrucks(role?: UserRole | null) {
  return role === "owner" || role === "admin";
}

export function canCreateBookings(role?: UserRole | null) {
  return role === "owner" || role === "renter" || role === "admin";
}

export function isAdminRole(role?: UserRole | null) {
  return role === "admin";
}
