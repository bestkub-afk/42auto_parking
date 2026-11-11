import type { ParkingData, Payment, Spot, Vehicle } from "@/data/types";
import { DEMO_START, EXIT_MINUTES, HOURLY_RATE, PAYMENT_METHODS } from "@/data/config";
import { durationText } from "./format";

// กติกาหลักของลานจอด ใช้ร่วมกันทั้ง User, Admin และ Kiosk

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// นาฬิกาเดโม = DEMO_START + เวลาที่ผ่านไปจริง
export const demoNow = (clockStartedAt: number) =>
  new Date(Date.parse(DEMO_START) + Math.max(0, Date.now() - clockStartedAt)).toISOString();

// ---------- ค่าจอด ----------

export const parkingMinutes = (entryAt: string, endAt: string) =>
  Math.max(0, Math.floor((Date.parse(endAt) - Date.parse(entryAt)) / MINUTE));

// ชั่วโมง (ปัดขึ้น) × 30 บาท เช่น 3 ชม. 21 นาที → 4 ชม. → 120 บาท
export const parkingFee = (entryAt: string, endAt: string) => {
  const hours = Math.ceil(Math.max(0, Date.parse(endAt) - Date.parse(entryAt)) / HOUR);
  return hours * HOURLY_RATE;
};

// ระยะเวลาจอด: ออกแล้วนับถึงเวลาออก ยังจอดนับถึงตอนนี้
export const parkingDuration = (vehicle: Vehicle, now: string) =>
  durationText(parkingMinutes(vehicle.entryAt, vehicle.exitAt ?? now));

// จ่ายแล้วใช้ยอดที่ล็อกไว้ ยังไม่จ่ายคำนวณถึงตอนนี้
export const vehicleTotal = (vehicle: Vehicle, payment: Payment | undefined, now: string) =>
  payment ? payment.amount : parkingFee(vehicle.entryAt, vehicle.exitAt ?? now);

export const addExitMinutes = (start: string) =>
  new Date(Date.parse(start) + EXIT_MINUTES * MINUTE).toISOString();

// ---------- หาข้อมูลที่เกี่ยวข้อง ----------

export const findPayment = (data: ParkingData, vehicleId: string | undefined) =>
  data.payments.find((payment) => payment.vehicleId === vehicleId);

export const findSpot = (data: ParkingData, spotId: string | undefined) =>
  data.spots.find((spot) => spot.id === spotId);

export const floorName = (data: ParkingData, floorId: number) =>
  data.floors.find((floor) => floor.id === floorId)?.name ?? `ชั้น ${floorId}`;

// "ชั้น 1 · ช่อง A3"
export const spotText = (data: ParkingData, vehicle: Vehicle) => {
  const spot = findSpot(data, vehicle.spotId);
  return spot ? `${floorName(data, spot.floor)} · ช่อง ${spot.name}` : "ไม่ระบุช่องจอด";
};

// " กก  1234 " → "กก1234" ใช้เทียบทะเบียน
export const normalizePlate = (plate: string) => plate.replace(/\s+/g, "").toLowerCase();

// ---------- สถานะรถ ----------

export type StatusCode = "unpaid" | "ready" | "approved" | "overdue" | "exited";
export type ParkingStatus = { code: StatusCode; label: string; canExit: boolean; deadline: string | null };

export const parkingStatus = (vehicle: Vehicle, payment: Payment | undefined, now: string): ParkingStatus => {
  if (vehicle.exitAt) return { code: "exited", label: "ออกแล้ว", canExit: false, deadline: null };
  if (!payment) return { code: "unpaid", label: "ยังไม่ชำระ", canExit: false, deadline: null };

  // จ่ายแล้ว ออกได้ภายใน 15 นาที
  const paidDeadline = addExitMinutes(payment.paidAt);
  if (Date.parse(now) <= Date.parse(paidDeadline)) {
    return { code: "ready", label: "ชำระแล้ว · พร้อมออก", canExit: true, deadline: paidDeadline };
  }

  // เกินเวลา แต่เจ้าหน้าที่อนุมัติ → ออกได้อีก 15 นาที
  const lastApproval = vehicle.approvals[vehicle.approvals.length - 1];
  if (lastApproval) {
    const approvedDeadline = addExitMinutes(lastApproval.approvedAt);
    if (Date.parse(now) <= Date.parse(approvedDeadline)) {
      return { code: "approved", label: "เจ้าหน้าที่อนุมัติให้ออก", canExit: true, deadline: approvedDeadline };
    }
  }
  return { code: "overdue", label: "ชำระแล้ว · เกินเวลาออก", canExit: false, deadline: paidDeadline };
};

// ---------- สถานะช่องจอด ----------

export type SpotStatus = "available" | "occupied" | "blocked" | "closed";
export const SPOT_LABELS: Record<SpotStatus, string> = {
  available: "ว่าง",
  occupied: "ไม่ว่าง",
  blocked: "กันช่องชั่วคราว",
  closed: "ปิดบริการ",
};

export const spotStatus = (data: ParkingData, spot: Spot): SpotStatus => {
  if (data.vehicles.some((vehicle) => !vehicle.exitAt && vehicle.spotId === spot.id)) return "occupied";
  if (!data.floors.find((floor) => floor.id === spot.floor)?.active) return "closed";
  if (spot.blocked) return "blocked";
  return "available";
};

// นับช่องแต่ละสถานะ (ส่ง floorId = นับเฉพาะชั้นนั้น)
export const countSpots = (data: ParkingData, floorId?: number) => {
  const count = { total: 0, available: 0, occupied: 0, blocked: 0, closed: 0 };
  data.spots
    .filter((spot) => floorId === undefined || spot.floor === floorId)
    .forEach((spot) => {
      count.total += 1;
      count[spotStatus(data, spot)] += 1;
    });
  return count;
};

// ---------- งานที่ใช้ทั้งหน้า QR และ Kiosk ----------

// จ่ายเงิน: บันทึกครั้งเดียว ยอดต้องตรงกับที่ผู้ใช้เห็น
export const payVehicle = (
  data: ParkingData,
  vehicleId: string,
  now: string,
  shownAmount: number,
): ParkingData => {
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) throw new Error("ไม่พบข้อมูลรถ");
  if (findPayment(data, vehicleId)) return data; // จ่ายแล้ว ไม่บันทึกซ้ำ
  if (vehicle.exitAt) throw new Error("รถออกจากลานแล้ว");

  const amount = parkingFee(vehicle.entryAt, now);
  if (amount !== shownAmount) throw new Error("ยอดค่าจอดเปลี่ยนแล้ว กรุณายืนยันยอดใหม่อีกครั้ง");

  const payment: Payment = {
    id: `TQ${Date.parse(now)}`, // เลขอ้างอิง
    vehicleId,
    amount,
    method: PAYMENT_METHODS[0],
    paidAt: now,
  };
  return { ...data, payments: [...data.payments, payment] };
};

// รถผ่านไม้กั้น: บันทึกเวลาออก (ช่องจอดว่างเองเพราะรถออกแล้ว)
export const passGate = (data: ParkingData, vehicleId: string, now: string): ParkingData => {
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) throw new Error("ไม่พบข้อมูลรถ");
  if (!parkingStatus(vehicle, findPayment(data, vehicleId), now).canExit) {
    throw new Error("ยังไม่ชำระเงินหรือพ้นเวลาออก");
  }
  return {
    ...data,
    vehicles: data.vehicles.map((item) => (item.id === vehicleId ? { ...item, exitAt: now } : item)),
  };
};
