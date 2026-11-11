import { TIME_ZONE } from "@/data/config";

// จัดรูปแบบตัวเลขและเวลาสำหรับแสดงผล

// 120 → "120 บาท"
export const money = (amount: number) => amount.toLocaleString("th-TH") + " บาท";

// 120 → "120.00 บาท"
export const moneyExact = (amount: number) =>
  amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " บาท";

// "09:24"
export const time = (value: string) =>
  new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(new Date(value));

// "14 ต.ค. 2568 09:24 น."
export const dateTime = (value: string) => {
  const date = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
  return `${date.format(new Date(value))} ${time(value)} น.`;
};

// "2025-10-14" ใช้กับช่องเลือกวันที่
export const dateKey = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(value));

// 201 นาที → "3 ชม. 21 นาที"
export const durationText = (minutes: number) => `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`;

// 598 วินาที → "09:58"
export const countdown = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
