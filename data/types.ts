// ชนิดข้อมูลของระบบลานจอด (ดูว่าข้อมูลแต่ละอย่างมีช่องอะไร)

export type VehicleType = "Sedan" | "SUV" | "Pickup";
export type PaymentMethod = "Thai QR" | "บัตรเครดิต";

// มี 2 บทบาท: Super Admin ทำได้ทุกอย่าง / Admin ทำได้ตามสิทธิ์ที่ตั้งให้
export type Role = "Super Admin" | "Admin";

// เมนูของ Admin
export type Menu = "dashboard" | "parking-layout" | "operations" | "reports" | "permissions";

// สิทธิ์ = เมนู + การกระทำในเมนู
export type Permission =
  | Menu
  | "add-spots"
  | "edit-spots"
  | "delete-spots"
  | "manage-floors"
  | "record-entry"
  | "approve-exit"
  | "view-photos"
  | "edit-operations"
  | "export-operations"
  | "export-reports"
  | "edit-users"
  | "edit-roles"
  | "reset";

export type Floor = {
  id: number;
  order: number;
  name: string;
  active: boolean; // ปิดชั้น = รับรถเข้าไม่ได้ แต่รถที่จอดอยู่ยังออกได้
};

export type Spot = {
  id: string;
  name: string; // เช่น A1
  floor: number;
  blocked: boolean; // เจ้าหน้าที่กันช่องไว้
};

export type ExitApproval = {
  staffName: string;
  approvedAt: string;
  reason: string;
};

// 1 รายการ = รถเข้าจอด 1 ครั้ง
export type Vehicle = {
  id: string;
  plate: string;
  province: string;
  type: VehicleType;
  spotId: string;
  entryAt: string;
  exitAt: string | null; // null = ยังจอดอยู่
  image: string;
  approvals: ExitApproval[];
};

export type Payment = {
  id: string; // เลขอ้างอิง
  vehicleId: string;
  amount: number; // ยอดที่ล็อกแล้ว
  method: PaymentMethod;
  paidAt: string;
};

export type User = {
  id: string;
  name: string;
  username: string;
  password: string; // เดโมเท่านั้น
  role: Role;
  active: boolean;
};

// ข้อมูลทั้งระบบ เก็บใน localStorage ก้อนเดียว
export type ParkingData = {
  floors: Floor[];
  spots: Spot[];
  vehicles: Vehicle[];
  payments: Payment[];
  users: User[];
  adminPermissions: Permission[]; // สิทธิ์ของบทบาท Admin
  clockStartedAt: number; // เวลาจริงตอนเริ่มเดโม ใช้เดินนาฬิกาเดโม
};

// ข้อมูลผู้ที่ login อยู่ (เก็บใน localStorage เหมือน W09)
export type Credential = {
  userId: string;
  name: string;
  role: Role;
};
