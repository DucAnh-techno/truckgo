export const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function currentUser() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isAdmin() {
      return isSignedIn() && currentUser().role == "admin";
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isOwnerRole() {
      return isSignedIn() && (currentUser().role == "owner" || currentUser().role == "admin");
    }

    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if isSignedIn()
        && request.auth.uid == userId
        && request.resource.data.role in ["owner", "renter"]
        && request.resource.data.isVerified == false
        && request.resource.data.verificationStatus == "unsubmitted"
        && request.resource.data.totalReviews == 0
        && request.resource.data.avgRating == 0;
      allow update: if isAdmin() || (
        isOwner(userId)
        && request.resource.data.role == resource.data.role
        && request.resource.data.isVerified == resource.data.isVerified
        && request.resource.data.totalReviews == resource.data.totalReviews
        && request.resource.data.avgRating == resource.data.avgRating
        && request.resource.data.email == resource.data.email
        && request.resource.data.diff(resource.data).changedKeys().hasOnly([
          "name",
          "phone",
          "avatarUrl",
          "emailVerified",
          "verificationDocs",
          "verificationStatus",
          "updatedAt"
        ])
        && request.resource.data.verificationStatus in ["unsubmitted", "pending"]
      );
      allow delete: if isAdmin();
    }

    match /publicProfiles/{userId} {
      allow read: if true;
      allow create: if isSignedIn()
        && request.auth.uid == userId
        && request.resource.data.role in ["owner", "renter"]
        && request.resource.data.isVerified == false;
      allow update: if isAdmin() || (
        isOwner(userId)
        && request.resource.data.role == resource.data.role
        && request.resource.data.isVerified == resource.data.isVerified
        && request.resource.data.avgRating == resource.data.avgRating
        && request.resource.data.totalReviews == resource.data.totalReviews
        && request.resource.data.diff(resource.data).changedKeys().hasOnly([
          "name",
          "avatarUrl",
          "updatedAt"
        ])
      );
      allow delete: if isAdmin();
    }

    match /trucks/{truckId} {
      allow read: if true;
      allow create: if isSignedIn()
        && isOwnerRole()
        && request.resource.data.ownerId == request.auth.uid
        && request.resource.data.pricePerDay > 0
        && request.resource.data.capacity > 0;
      allow update, delete: if isAdmin() || (
        isSignedIn()
        && resource.data.ownerId == request.auth.uid
        && request.resource.data.ownerId == resource.data.ownerId
        && request.resource.data.documentsApproved == resource.data.documentsApproved
        && request.resource.data.documentsReviewedAt == resource.data.documentsReviewedAt
        && request.resource.data.documentsReviewedBy == resource.data.documentsReviewedBy
      );
    }

    match /bookings/{bookingId} {
      allow read: if isSignedIn()
        && (
          resource.data.renterId == request.auth.uid ||
          resource.data.ownerId == request.auth.uid ||
          isAdmin()
        );

      allow create: if isSignedIn()
        && request.resource.data.renterId == request.auth.uid
        && currentUser().role in ["owner", "renter", "admin"]
        && request.resource.data.status == "pending"
        && request.resource.data.paymentStatus == "unpaid"
        && request.resource.data.deliveryAddress is string
        && request.resource.data.deliveryAddress.size() > 0
        && request.resource.data.deliveryLat is number
        && request.resource.data.deliveryLng is number
        && request.resource.data.renterId != request.resource.data.ownerId
        && get(/databases/$(database)/documents/trucks/$(request.resource.data.truckId)).data.ownerId
          == request.resource.data.ownerId
        && request.resource.data.totalPrice > 0;

      allow update: if isAdmin() || (
        isSignedIn()
        && resource.data.ownerId == request.auth.uid
        && (
          (
            request.resource.data.diff(resource.data).changedKeys().hasOnly(["status", "acceptedAt", "updatedAt"])
            && resource.data.status == "pending"
            && request.resource.data.status == "accepted"
            && request.resource.data.acceptedAt is string
            && request.resource.data.paymentStatus == "paid"
          ) || (
            request.resource.data.diff(resource.data).changedKeys().hasOnly(["status", "completedAt", "updatedAt"])
            && resource.data.status == "in_progress"
            && request.resource.data.status == "completed"
            && request.resource.data.completedAt is string
          )
        )
      ) || (
        isSignedIn()
        && resource.data.renterId == request.auth.uid
        && (
          (
            request.resource.data.diff(resource.data).changedKeys().hasOnly(["status", "updatedAt"])
            && resource.data.status == "pending"
            && request.resource.data.status == "cancelled"
          ) || (
            request.resource.data.diff(resource.data).changedKeys().hasOnly(["status", "receivedAt", "updatedAt"])
            && resource.data.status == "accepted"
            && request.resource.data.status == "in_progress"
            && request.resource.data.receivedAt is string
          ) || (
            request.resource.data.diff(resource.data).changedKeys().hasOnly([
              "paymentStatus",
              "paidAt",
              "paymentMethod",
              "paymentNote",
              "updatedAt"
            ])
            && (!("paymentStatus" in resource.data) || resource.data.paymentStatus == "unpaid")
            && request.resource.data.paymentStatus == "paid"
          )
        )
      );

      allow delete: if isAdmin();
    }

    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if isSignedIn()
        && request.resource.data.reviewerId == request.auth.uid
        && request.resource.data.rating >= 1
        && request.resource.data.rating <= 5
        && get(/databases/$(database)/documents/bookings/$(request.resource.data.bookingId)).data.status
          == "completed"
        && get(/databases/$(database)/documents/bookings/$(request.resource.data.bookingId)).data.truckId
          == request.resource.data.truckId
        && (
          get(/databases/$(database)/documents/bookings/$(request.resource.data.bookingId)).data.ownerId
            == request.auth.uid ||
          get(/databases/$(database)/documents/bookings/$(request.resource.data.bookingId)).data.renterId
            == request.auth.uid
        )
        && (
          request.resource.data.targetUserId
            == get(/databases/$(database)/documents/bookings/$(request.resource.data.bookingId)).data.ownerId ||
          request.resource.data.targetUserId
            == get(/databases/$(database)/documents/bookings/$(request.resource.data.bookingId)).data.renterId
        );
      allow update, delete: if isAdmin() || (
        isSignedIn() && resource.data.reviewerId == request.auth.uid
      );
    }

    match /messages/{messageId} {
      allow read: if isSignedIn() && (
        get(/databases/$(database)/documents/bookings/$(resource.data.bookingId)).data.ownerId
          == request.auth.uid ||
        get(/databases/$(database)/documents/bookings/$(resource.data.bookingId)).data.renterId
          == request.auth.uid ||
        isAdmin()
      );
      allow create: if isSignedIn()
        && request.resource.data.senderId == request.auth.uid
        && request.resource.data.text.size() > 0
        && (
          get(/databases/$(database)/documents/bookings/$(request.resource.data.bookingId)).data.ownerId
            == request.auth.uid ||
          get(/databases/$(database)/documents/bookings/$(request.resource.data.bookingId)).data.renterId
            == request.auth.uid
        );
      allow update, delete: if isAdmin() || (
        isSignedIn() && resource.data.senderId == request.auth.uid
      );
    }

    match /ownerMessages/{messageId} {
      allow read: if isSignedIn() && (
        resource.data.ownerId == request.auth.uid ||
        resource.data.senderId == request.auth.uid ||
        isAdmin()
      );
      allow create: if isSignedIn()
        && request.resource.data.senderId == request.auth.uid
        && request.resource.data.text.size() > 0;
      allow update, delete: if isAdmin() || (
        isSignedIn() && resource.data.senderId == request.auth.uid
      );
    }

    match /reports/{reportId} {
      allow read: if isAdmin() || (
        isSignedIn() && resource.data.reporterId == request.auth.uid
      );
      allow create: if isSignedIn()
        && request.resource.data.reporterId == request.auth.uid
        && request.resource.data.status == "open"
        && request.resource.data.reason.size() > 0
        && request.resource.data.targetType in ["truck", "user"];
      allow update: if isAdmin()
        && request.resource.data.diff(resource.data).changedKeys().hasOnly([
          "status",
          "reviewNote",
          "reviewedAt",
          "reviewedBy",
          "updatedAt"
        ]);
      allow delete: if isAdmin();
    }
  }
}
`.trim();

export const storageRules = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() {
      return request.auth != null;
    }

    match /trucks/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if isSignedIn() && request.auth.uid == userId;
    }

    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if isSignedIn() && request.auth.uid == userId;
    }

    match /verification-docs/{userId}/{allPaths=**} {
      allow read: if isSignedIn() && (request.auth.uid == userId || (
        get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == "admin"
      ));
      allow write: if isSignedIn() && request.auth.uid == userId;
    }

    match /truck-docs/{userId}/{allPaths=**} {
      allow read: if isSignedIn() && (request.auth.uid == userId || (
        get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == "admin"
      ));
      allow write: if isSignedIn() && request.auth.uid == userId;
    }
  }
}
`.trim();

export const firebaseRulesNotes = {
  firestore:
    "Tách `users` riêng tư và `publicProfiles` công khai để không lộ giấy tờ xác thực. Rules đã khóa fake booking, chặn nâng quyền trái phép và chỉ cho participant thao tác review/chat.",
  storage:
    "Bổ sung `verification-docs/{userId}/...` để người dùng tự tải hồ sơ, quản trị viên đọc được khi duyệt và tài liệu không bị công khai.",
};
