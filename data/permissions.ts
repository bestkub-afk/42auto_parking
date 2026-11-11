import type { Menu, Permission, Role } from "./types";

export const ROLES: Role[] = ["Super Admin", "Admin"];

// เมนูของ Admin และการกระทำในแต่ละเมนู (sidebar กับหน้าตั้งสิทธิ์ใช้รายการนี้)
export const MENUS: { menu: Menu; label: string; actions: { key: Permission; label: string }[] }[] = [
  { menu: "dashboard", label: "Dashboard", actions: [] },
  {
    menu: "parking-layout",
    label: "Parking Layout",
    actions: [
      { key: "add-spots", label: "เพิ่มช่องจอด" },
      { key: "edit-spots", label: "แก้ไขช่องจอด" },
      { key: "delete-spots", label: "ลบช่องจอด" },
      { key: "manage-floors", label: "จัดการชั้น" },
    ],
  },
  {
    menu: "operations",
    label: "Operation",
    actions: [
      { key: "record-entry", label: "บันทึกรถเข้า" },
      { key: "approve-exit", label: "อนุมัติออกเกินเวลา" },
      { key: "view-photos", label: "ดูรูปเข้า–ออก" },
      { key: "edit-operations", label: "แก้ไขรายการ" },
      { key: "export-operations", label: "ส่งออก CSV" },
    ],
  },
  { menu: "reports", label: "Reports", actions: [{ key: "export-reports", label: "ส่งออก CSV" }] },
  {
    menu: "permissions",
    label: "Admin Perm",
    actions: [
      { key: "edit-users", label: "จัดการบัญชี" },
      { key: "edit-roles", label: "ตั้งค่าสิทธิ์" },
    ],
  },
];

// สิทธิ์เริ่มต้นของ Admin (Super Admin ได้ทุกอย่างอยู่แล้ว)
export const DEFAULT_ADMIN_PERMISSIONS: Permission[] = [
  "dashboard",
  "parking-layout",
  "operations",
  "reports",
  "add-spots",
  "edit-spots",
  "record-entry",
  "approve-exit",
  "view-photos",
  "export-operations",
  "export-reports",
];

// สิทธิ์ที่ให้ Admin ไม่ได้
export const SUPER_ADMIN_ONLY: Permission[] = ["edit-roles", "reset"];

// สิทธิ์นี้อยู่ใต้เมนูไหน
export const parentMenu = (permission: Permission) =>
  MENUS.find((item) => item.actions.some((action) => action.key === permission))?.menu;

// เช็กว่าบทบาทนี้ทำได้ไหม
export const hasPermission = (
  role: Role | undefined,
  permission: Permission,
  adminPermissions: Permission[],
) => {
  if (role === "Super Admin") return true;
  if (role !== "Admin") return false;
  if (!adminPermissions.includes(permission)) return false;
  // ปิดเมนูแม่ = สิทธิ์ย่อยใช้ไม่ได้
  const menu = parentMenu(permission);
  return !menu || adminPermissions.includes(menu);
};

// เมนูแรกที่บทบาทนี้เปิดได้ (ใช้หลัง login)
export const firstAllowedPath = (role: Role, adminPermissions: Permission[]) => {
  const first = MENUS.find((item) => hasPermission(role, item.menu, adminPermissions));
  return "/admin/" + (first?.menu ?? "dashboard");
};
