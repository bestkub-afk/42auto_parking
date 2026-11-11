import type { ParkingData, Payment, Spot, User, Vehicle } from "./types";
import { DEFAULT_CAR_IMAGE, DEFAULT_PROVINCE, PAYMENT_METHODS, VEHICLE_TYPES } from "./config";
import { DEFAULT_ADMIN_PERMISSIONS } from "./permissions";
import { parkingFee } from "@/utils/parking";

// ข้อมูลตัวอย่างของเดโม (เหมือน data/products.ts ใน W09)

const FLOORS = [1, 2];
const ROWS = ["A", "B", "C"];
const SPOTS_PER_ROW = 10;

// 7 → "07"
const pad = (value: number) => String(value).padStart(2, "0");

// รถที่ยังจอดอยู่วันนี้ [ทะเบียน, จังหวัด, ประเภท, ช่อง, เวลาเข้า, รูป]
const PARKED: [string, string, Vehicle["type"], string, string, string][] = [
  ["กก 1234", "กรุงเทพมหานคร", "Sedan", "f1-A3", "09:24", DEFAULT_CAR_IMAGE],
  ["กก 1234", "ชลบุรี", "SUV", "f1-B9", "08:30", "/images/blue-car.jpg"], // ทะเบียนซ้ำต่างจังหวัด
  ["ขญ 9012", "นนทบุรี", "Pickup", "f1-A8", "10:15", DEFAULT_CAR_IMAGE],
  ["คค 7890", "กรุงเทพมหานคร", "SUV", "f1-B8", "11:20", DEFAULT_CAR_IMAGE],
  ["จค 2101", "กรุงเทพมหานคร", "Sedan", "f1-C3", "09:30", DEFAULT_CAR_IMAGE],
  ["จค 2102", "กรุงเทพมหานคร", "Pickup", "f1-C4", "10:30", DEFAULT_CAR_IMAGE],
  ["จค 2103", "กรุงเทพมหานคร", "Sedan", "f2-A2", "11:30", DEFAULT_CAR_IMAGE],
  ["จค 2104", "กรุงเทพมหานคร", "SUV", "f2-B4", "08:30", DEFAULT_CAR_IMAGE],
  ["จค 2105", "กรุงเทพมหานคร", "Pickup", "f2-B7", "09:30", DEFAULT_CAR_IMAGE],
  ["จค 2106", "กรุงเทพมหานคร", "Sedan", "f2-C6", "10:30", DEFAULT_CAR_IMAGE],
];

const USERS: User[] = [
  { id: "u1", name: "สมชาย ใจดี", username: "admin", password: "admin123", role: "Super Admin", active: true },
  { id: "u2", name: "กิตติพงษ์ สมบัติ", username: "kitti", password: "demo123", role: "Admin", active: true },
  { id: "u3", name: "ณิชากร ศรีสุข", username: "nicha", password: "demo123", role: "Admin", active: true },
];

const createSpots = () => {
  const spots: Spot[] = [];
  for (const floor of FLOORS) {
    for (const row of ROWS) {
      for (let number = 1; number <= SPOTS_PER_ROW; number++) {
        spots.push({ id: `f${floor}-${row}${number}`, name: `${row}${number}`, floor, blocked: false });
      }
    }
  }
  return spots;
};

const createVehicles = (spots: Spot[]) => {
  // รถที่จอดอยู่วันนี้
  const vehicles: Vehicle[] = PARKED.map(([plate, province, type, spotId, time, image], index) => ({
    id: `v${index + 1}`,
    plate,
    province,
    type,
    spotId,
    entryAt: `2025-10-14T${time}:00+07:00`,
    exitAt: null,
    image,
    approvals: [],
  }));

  // รถที่ออกไปแล้ววันนี้
  vehicles.push(
    {
      id: "v11",
      plate: "ขม 5678",
      province: DEFAULT_PROVINCE,
      type: "SUV",
      spotId: "f1-A7",
      entryAt: "2025-10-14T08:52:00+07:00",
      exitAt: "2025-10-14T12:20:00+07:00",
      image: DEFAULT_CAR_IMAGE,
      approvals: [],
    },
    {
      id: "v12",
      plate: "ญง 3456",
      province: "ปทุมธานี",
      type: "Sedan",
      spotId: "f1-B10",
      entryAt: "2025-10-14T11:03:00+07:00",
      exitAt: "2025-10-14T11:57:00+07:00",
      image: DEFAULT_CAR_IMAGE,
      approvals: [],
    },
  );

  // ประวัติย้อนหลัง ม.ค.–ต.ค. ไว้ใช้ในหน้า Reports
  for (let month = 1; month <= 10; month++) {
    const days = month === 10 ? [2, 5, 8, 11, 13] : [3, 8, 14, 20, 26];
    days.forEach((day, dayIndex) => {
      for (let count = 0; count < 2 + (month % 3); count++) {
        const date = `2025-${pad(month)}-${pad(day)}`;
        const inHour = 7 + count;
        const outHour = inHour + 1 + ((dayIndex + month) % 4);
        vehicles.push({
          id: `h-${month}-${day}-${count}`,
          plate: `ทด ${month}${day}${count}`,
          province: DEFAULT_PROVINCE,
          type: VEHICLE_TYPES[(dayIndex + count) % VEHICLE_TYPES.length],
          spotId: spots[(day + dayIndex * 7 + count * 13) % spots.length].id,
          entryAt: `${date}T${pad(inHour)}:00:00+07:00`,
          exitAt: `${date}T${pad(outHour)}:20:00+07:00`,
          image: DEFAULT_CAR_IMAGE,
          approvals: [],
        });
      }
    });
  }
  return vehicles;
};

// รถที่ออกแล้วถือว่าจ่ายตอนออก
const createPayments = (vehicles: Vehicle[]) => {
  const exited = vehicles.filter((vehicle) => vehicle.exitAt !== null);
  return exited.map((vehicle, index): Payment => ({
    id: `DEMO-SEED-${String(index + 1).padStart(4, "0")}`,
    vehicleId: vehicle.id,
    amount: parkingFee(vehicle.entryAt, vehicle.exitAt as string),
    method: index % 4 === 0 ? PAYMENT_METHODS[1] : PAYMENT_METHODS[0],
    paidAt: vehicle.exitAt as string,
  }));
};

export const createDemoData = (): ParkingData => {
  const spots = createSpots();
  const vehicles = createVehicles(spots);
  return {
    floors: FLOORS.map((id) => ({ id, order: id, name: `ชั้น ${id}`, active: true })),
    spots,
    vehicles,
    payments: createPayments(vehicles),
    users: [...USERS],
    adminPermissions: [...DEFAULT_ADMIN_PERMISSIONS],
    clockStartedAt: Date.now(),
  };
};
