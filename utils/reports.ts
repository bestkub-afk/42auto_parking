import type { ParkingData } from "@/data/types";
import { PAYMENT_METHODS, VEHICLE_TYPES } from "@/data/config";
import { dateKey, time } from "./format";

// รวมตัวเลขให้ Dashboard และ Reports (กราฟ ตาราง CSV ใช้ชุดเดียวกัน)

export type ReportPeriod = "day" | "month" | "year";
export type ReportDates = { start: string; end: string };

// สีกราฟ: ม่วง เขียว เหลือง
export const REPORT_COLORS = ["#5441a6", "#19857e", "#d5a73e"];

const MONTH_NAMES = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
const ONE_DAY = 24 * 60 * 60 * 1000;
const HOURS_PER_BAR = 2; // รายงานรายวันแบ่งกราฟเป็นช่วงละ 2 ชั่วโมง
const BUDDHIST_YEAR_OFFSET = 543;

// ช่วงวันที่ตามประเภทรายงาน (วันนี้ / เดือนนี้ / ปีนี้)
export function reportDates(period: ReportPeriod, now: string): ReportDates {
  const today = dateKey(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  if (period === "day") return { start: today, end: today };
  if (period === "year") return { start: `${year}-01-01`, end: `${year}-12-31` };

  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthText = today.slice(0, 7);
  return { start: `${monthText}-01`, end: `${monthText}-${lastDayOfMonth}` };
}

// เลขเดือนต่อเนื่อง ใช้นับเดือนระหว่างสองวันที่
function monthNumber(day: string) {
  return Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;
}

export function createReport(data: ParkingData, dates: ReportDates) {
  const { start, end } = dates;
  const isInRange = (value: string) => dateKey(value) >= start && dateKey(value) <= end;

  // 1) เลือกข้อมูลที่อยู่ในช่วงวันที่
  const payments = data.payments.filter((payment) => isInRange(payment.paidAt));
  const vehicles = data.vehicles.filter((vehicle) => isInRange(vehicle.entryAt));
  const exitTimes: string[] = [];
  for (const vehicle of data.vehicles) {
    if (vehicle.exitAt && isInRange(vehicle.exitAt)) exitTimes.push(vehicle.exitAt);
  }

  // 2) เลือกว่าแกน X แบ่งเป็นช่วงชั่วโมง / รายวัน / รายเดือน
  const dayCount = Math.round((Date.parse(end) - Date.parse(start)) / ONE_DAY) + 1;
  let mode: "hour" | "day" | "month" = "day";
  if (dayCount === 1) mode = "hour";
  if (dayCount > 45) mode = "month";

  const labels: string[] = [];
  if (mode === "hour") {
    for (let hour = 0; hour < 24; hour += HOURS_PER_BAR) {
      labels.push(String(hour).padStart(2, "0") + ":00");
    }
  } else if (mode === "month") {
    for (let month = monthNumber(start); month <= monthNumber(end); month++) {
      const year = Math.floor(month / 12) + BUDDHIST_YEAR_OFFSET;
      labels.push(`${MONTH_NAMES[month % 12]} ${year}`);
    }
  } else {
    for (let index = 0; index < dayCount; index++) {
      const day = new Date(Date.parse(start) + index * ONE_DAY);
      labels.push(`${day.getUTCDate()} ${MONTH_NAMES[day.getUTCMonth()]}`);
    }
  }

  // หาว่าเวลานี้ตกอยู่ในแท่งที่เท่าไร
  function barIndex(value: string) {
    if (mode === "hour") return Math.floor(Number(time(value).slice(0, 2)) / HOURS_PER_BAR);
    if (mode === "month") return monthNumber(dateKey(value)) - monthNumber(start);
    return Math.round((Date.parse(dateKey(value)) - Date.parse(start)) / ONE_DAY);
  }

  // 3) นับรายรับ รถเข้า และรถออก ลงในแต่ละแท่ง
  const series = labels.map((label) => ({
    label,
    revenue: 0,
    transactions: 0,
    entries: 0,
    exits: 0,
  }));
  for (const payment of payments) {
    series[barIndex(payment.paidAt)].revenue += payment.amount;
    series[barIndex(payment.paidAt)].transactions += 1;
  }
  for (const vehicle of vehicles) series[barIndex(vehicle.entryAt)].entries += 1;
  for (const exitAt of exitTimes) series[barIndex(exitAt)].exits += 1;

  // 4) สรุปตามช่องทางชำระและประเภทรถ
  const channels = PAYMENT_METHODS.map((method) => ({
    name: method,
    value: payments
      .filter((payment) => payment.method === method)
      .reduce((sum, payment) => sum + payment.amount, 0),
  }));
  const types = VEHICLE_TYPES.map((type) => ({
    name: type,
    value: vehicles.filter((vehicle) => vehicle.type === type).length,
  }));

  // 5) นับว่าแต่ละช่องจอดถูกใช้กี่ครั้ง (ใช้ทำ Heat Map)
  const spotUsage: Record<string, number> = {};
  for (const vehicle of vehicles) {
    spotUsage[vehicle.spotId] = (spotUsage[vehicle.spotId] ?? 0) + 1;
  }

  return {
    series,
    channels,
    types,
    payments,
    spotUsage,
    total: payments.reduce((sum, payment) => sum + payment.amount, 0),
    vehicleCount: vehicles.length,
    exitCount: exitTimes.length,
  };
}
