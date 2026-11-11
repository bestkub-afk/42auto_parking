# 42 Auto Parking

Frontend Demo ระบบลานจอดรถ: หน้า User (มือถือ), Admin และจอทางออก Kiosk
ข้อมูลทั้งหมดเป็นข้อมูลจำลอง เก็บใน localStorage ของเบราว์เซอร์

## วิธีรัน

```bash
npm install
npm run dev      # เปิด http://localhost:3000
```

บัญชีเดโม: `admin / admin123` (Super Admin), `kitti / demo123` (Admin)

## หน้าที่มี

| URL | หน้า |
| --- | --- |
| `/user/search` | ค้นทะเบียน (ลอง `กก 1234` จะเจอ 2 คัน) |
| `/user/vehicle/[id]` → `/user/summary/[id]` → `/user/payment/[id]` → `/user/success/[id]` | รายละเอียด → สรุป → QR → ผลชำระ |
| `/login` | เข้าสู่ระบบผู้ดูแล |
| `/admin/dashboard` `parking-layout` `floors` `operations` `reports` `permissions` | Admin |
| `/kiosk?vehicle=v1` | จอทางออก |

## โครงสร้าง (เหมือน W09)

```
app/         หน้าเว็บ 1 โฟลเดอร์ = 1 หน้า, layout.tsx เก็บข้อมูลกลาง
components/  ชิ้นส่วนที่ใช้ซ้ำ
data/        config.ts (ค่าตั้งค่า), mockData.ts (ข้อมูลตัวอย่าง), permissions.ts, types.ts
utils/       parking.ts (คิดเงิน/สถานะ), login.ts, reports.ts, format.ts, csv.ts, context.ts
styles/      CSS ของหน้า User, Admin, Kiosk, Reports
```

## อ่านโค้ดตามลำดับนี้

1. `data/config.ts` ค่าตั้งค่า (30 บาท/ชม., 15 นาที, QR 10 นาที)
2. `app/layout.tsx` โหลด/บันทึกข้อมูล และส่งให้ทุกหน้าผ่าน context
3. `app/user/search/page.tsx` หน้าง่ายสุด: `useState` → `handleSearch` → `filter` → `map`
4. `utils/parking.ts` คิดค่าจอด (`parkingFee`) และสถานะรถ (`parkingStatus`)
5. หน้าที่ตัวเองรับผิดชอบใน `app/`

ทุกหน้าที่แก้ข้อมูลเขียนแบบเดียวกับ `addToCart` ใน W09:
`setData({ ...data, vehicles: [...data.vehicles, newVehicle] })`
