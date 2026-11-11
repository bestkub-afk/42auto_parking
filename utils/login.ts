import type { useRouter } from "next/navigation";
import type { Credential, ParkingData, Permission } from "@/data/types";
import { CREDENTIAL_KEY } from "@/data/config";
import { hasPermission } from "@/data/permissions";

type Router = ReturnType<typeof useRouter>;

// อ่าน credential ที่เก็บไว้ (เหมือน W09)
export const getCredential = (): Credential | null => {
  const text = localStorage.getItem(CREDENTIAL_KEY);
  return text ? JSON.parse(text) : null;
};

// หาบัญชีที่ login อยู่ (ต้องยังเปิดใช้งาน)
export const getCurrentUser = (data: ParkingData) => {
  const credential = getCredential();
  return data.users.find((user) => user.id === credential?.userId && user.active);
};

// ตรวจชื่อผู้ใช้และรหัสผ่าน ถ้าถูกเก็บ credential
export const doLogin = (data: ParkingData, username: string, password: string) => {
  const user = data.users.find(
    (item) => item.username === username.trim().toLowerCase() && item.password === password,
  );
  if (!user || !user.active) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน");

  const credential: Credential = { userId: user.id, name: user.name, role: user.role };
  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(credential));
};

// ผู้ที่ login อยู่ทำสิ่งนี้ได้ไหม
export const canDo = (data: ParkingData, permission: Permission) =>
  hasPermission(getCurrentUser(data)?.role, permission, data.adminPermissions);

// ยังไม่ login (หรือบัญชีถูกปิด) → ไปหน้า login แล้วจำหน้าที่จะกลับมา
export const checkLogin = (router: Router, returnPath: string, data: ParkingData) => {
  if (!getCurrentUser(data)) {
    localStorage.removeItem(CREDENTIAL_KEY);
    localStorage.setItem("returnPath", returnPath);
    router.replace("/login");
  }
};

export const doLogout = (router: Router) => {
  localStorage.removeItem(CREDENTIAL_KEY);
  router.replace("/login");
};
