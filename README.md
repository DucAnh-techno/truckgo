# TMDT Web Temp

Nen tang thuong mai dien tu cho thue xe tai, xay dung bang `Next.js 16 App Router + Firebase`.

## Tech stack

- Frontend: Next.js 16
- UI: React 19 + Tailwind CSS 4
- Auth: Firebase Auth
- Database: Firestore
- Storage: Firebase Storage
- Deploy: Vercel

## Phase 1 da chot

- Mo hinh du lieu cho `users`, `trucks`, `bookings`, `reviews`
- Kien truc tong quan cho App Router + Firebase
- Rule truy cap ban dau cho Firestore va Storage
- Cau truc thu muc de xuat cho cac phase tiep theo

Tai lieu chi tiet nam o [docs/system-design.md](./docs/system-design.md).

## Domain model

### `users`

```ts
{
  id,
  name,
  email,
  role,
  isVerified,
  createdAt
}
```

### `trucks`

```ts
{
  id,
  ownerId,
  name,
  pricePerDay,
  location,
  capacity,
  images: [],
  description,
  createdAt
}
```

### `bookings`

```ts
{
  id,
  truckId,
  renterId,
  startDate,
  endDate,
  status,
  createdAt
}
```

### `reviews`

```ts
{
  id,
  bookingId,
  rating,
  comment
}
```

## Cac file nen xem dau tien

- `docs/system-design.md`: tai lieu Phase 1
- `types/index.ts`: type dung chung cho domain
- `lib/firebase/rules.ts`: rule mau cho Firestore va Storage

## Chay du an

```bash
npm install
npm run dev
```

Mo `http://localhost:3000`.

## Ghi chu cho phase tiep theo

- Hoan thien `lib/firebase/config.ts`
- Tao services hoac DAL cho auth, trucks, bookings
- Build form dang nhap, dang ky, tao xe, tao booking
- Dua rules trong `lib/firebase/rules.ts` len Firebase console de su dung that
