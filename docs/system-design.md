# PHASE 1 - THIET KE HE THONG

## 1. Muc tieu

Xay dung nen tang cho san thuong mai dien tu thue xe tai bang:

- Frontend: Next.js 16 App Router
- Backend: Firebase
- Database: Firestore
- Storage: Firebase Storage
- Auth: Firebase Auth
- Deploy: Vercel

Muc tieu cua phase nay la chot:

- mo hinh du lieu
- cau truc thu muc
- quyen truy cap
- luong nghiep vu chinh
- danh sach viec se code o phase tiep theo

## 2. Kien truc tong quan

### Thanh phan

- Next.js App Router xu ly UI, route, server actions va route handlers khi can
- Firebase Auth quan ly dang ky, dang nhap, xac minh email
- Firestore luu users, trucks, bookings, reviews
- Firebase Storage luu avatar va hinh anh xe
- Vercel dung de deploy frontend

### Nguyen tac

- UI public co the xem danh sach xe ma khong can dang nhap
- Moi thao tac ghi du lieu deu can xac thuc
- Authorization khong dat o client; phai kiem tra bang Firestore rules va server layer
- Pages trong `app/` uu tien la Server Components, chi dung Client Components cho form va interactive UI

## 3. Database design

### `users`

```ts
{
  id: string
  name: string
  email: string
  role: "admin" | "owner" | "renter"
  isVerified: boolean
  phone?: string
  avatarUrl?: string
  createdAt: string
  updatedAt?: string
}
```

### `trucks`

```ts
{
  id: string
  ownerId: string
  name: string
  pricePerDay: number
  location: string
  capacity: number
  images: string[]
  description: string
  isAvailable: boolean
  createdAt: string
  updatedAt?: string
}
```

### `bookings`

```ts
{
  id: string
  truckId: string
  renterId: string
  ownerId: string
  startDate: string
  endDate: string
  totalPrice: number
  status: "pending" | "confirmed" | "cancelled" | "completed"
  createdAt: string
  updatedAt?: string
}
```

### `reviews` - phase 2

```ts
{
  id: string
  bookingId: string
  truckId: string
  reviewerId: string
  rating: number
  comment: string
  createdAt: string
  updatedAt?: string
}
```

## 4. Quan he du lieu

- `users.id` map truc tiep voi `Firebase Auth UID`
- `trucks.ownerId` tro toi `users.id`
- `bookings.truckId` tro toi `trucks.id`
- `bookings.renterId` tro toi `users.id`
- `bookings.ownerId` duoc duplicate tu truck owner de query nhanh dashboard
- `reviews.bookingId` tro toi `bookings.id`

## 5. Cac query chinh can ho tro

### Public

- lay danh sach xe
- loc theo `location`
- loc theo `capacity`
- sap xep theo `pricePerDay`

### Owner

- tao xe
- sua xe cua minh
- xem booking cua xe minh
- xac nhan hoac tu choi booking

### Renter

- tao booking
- xem lich su booking cua minh
- huy booking khi hop le

### Admin

- xem toan bo users, trucks, bookings
- khoa tai khoan hoac xu ly noi dung vi pham

## 6. Firestore collections va indexing goi y

Nen tao index som cho:

- `trucks`: `location + pricePerDay`
- `trucks`: `ownerId + createdAt desc`
- `bookings`: `renterId + createdAt desc`
- `bookings`: `ownerId + createdAt desc`
- `bookings`: `truckId + startDate`

## 7. Security design

### Auth

- dang ky bang email/password
- sau dang ky tao document `users/{uid}`
- `isVerified = false` cho toi khi email duoc verify

### Authorization

- public chi duoc doc truck va review
- user chi duoc sua `users/{uid}` cua chinh minh
- owner chi duoc sua truck cua minh
- renter chi duoc tao booking bang UID cua minh
- admin co quyen override

## 8. Cau truc thu muc de xuat

Theo huong dan Next 16 App Router, de routing nam trong `app/` va logic dung chung nam o `components/`, `lib/`, `types/`.

```txt
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  trucks/
    page.tsx
    [id]/page.tsx
    create/page.tsx
  bookings/
    page.tsx
  dashboard/
    owner/page.tsx
    renter/page.tsx
  api/
    uploads/route.ts

components/
  auth/
  bookings/
  trucks/
  ui/

lib/
  firebase/
    config.ts
    rules.ts
  dal/
    auth.ts
    users.ts
    trucks.ts
    bookings.ts
  validations/
    auth.ts
    truck.ts
    booking.ts

types/
  index.ts
```

## 9. Luong nghiep vu chinh

### Dang ky

1. User dang ky qua Firebase Auth
2. App tao document `users/{uid}`
3. Gui email verification
4. User dang nhap lai va duoc cap role

### Dang xe

1. Owner dang nhap
2. Upload anh len Firebase Storage
3. Luu metadata truck vao Firestore
4. Truck xuat hien tren danh sach cong khai

### Dat xe

1. Renter chon truck
2. Nhap `startDate`, `endDate`
3. App tinh `totalPrice`
4. Tao booking voi status `pending`
5. Owner xac nhan hoac huy

## 10. Quy uoc du lieu

- Dung `string ISO date` cho UI layer neu chua can timestamp native
- Khi implement Firestore, nen convert `createdAt` va `updatedAt` sang `serverTimestamp()`
- Moi collection deu nen co `createdAt`
- Booking nen duplicate `ownerId` de tranh phai join qua truck khi query

## 11. Viec nen lam tiep ngay sau phase nay

1. Tao `types` va schema validate cho truck, booking, auth
2. Hoan thien `lib/firebase/config.ts`
3. Viet DAL hoac service cho users, trucks, bookings
4. Tao Firestore rules va Storage rules that su trong Firebase console
5. Build man hinh auth, truck list, truck detail, create truck, bookings
