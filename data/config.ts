import type { PaymentMethod, VehicleType } from "./types";

// ค่าตั้งค่าของระบบ แก้ที่นี่ที่เดียว ทุกหน้าเปลี่ยนตาม

export const APP_NAME = "Auto Parking";
export const BUILDING = "อาคาร A";
export const SITE_NAME = "ลานจอด" + BUILDING;

export const HOURLY_RATE = 30; // บาทต่อชั่วโมง (เศษชั่วโมงปัดขึ้น)
export const EXIT_MINUTES = 15; // หลังจ่ายต้องออกภายในกี่นาที
export const QR_MINUTES = 10; // อายุ QR

export const TIME_ZONE = "Asia/Bangkok";
// นาฬิกาเดโมเริ่มที่เวลานี้ แล้วเดินตามเวลาจริง
export const DEMO_START = "2025-10-14T12:45:00+07:00";

export const VEHICLE_TYPES: VehicleType[] = ["Sedan", "SUV", "Pickup"];
export const PAYMENT_METHODS: PaymentMethod[] = ["Thai QR", "บัตรเครดิต"];
export const DEFAULT_PROVINCE = "กรุงเทพมหานคร";
export const DEFAULT_CAR_IMAGE = "/images/white-car.jpg";
export const STAFF_CONTACT = "รปภ. ประจำไม้กั้นทางออก";

export const BANK_APPS = [
  { name: "K PLUS", detail: "ธนาคารกสิกรไทย", logo: "/images/banks/kplus.png" },
  { name: "Krungthai NEXT", detail: "ธนาคารกรุงไทย", logo: "/images/banks/krungthai-next.png" },
];

// key ที่ใช้เก็บข้อมูลในเบราว์เซอร์
export const DATA_KEY = "auto-parking-data";
export const CREDENTIAL_KEY = "credential";
export const REMEMBER_KEY = "remember-username";
