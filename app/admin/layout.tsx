"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CarFront, LogOut, RotateCcw, ShieldAlert, UserRound } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import { SITE_NAME, APP_NAME } from "@/data/config";
import { createDemoData } from "@/data/mockData";
import { firstAllowedPath, MENUS } from "@/data/permissions";
import type { Permission } from "@/data/types";
import { canDo, checkLogin, doLogout, getCurrentUser } from "@/utils/login";
import { dateTime } from "@/utils/format";
import Modal from "@/components/Modal";

// กรอบหน้า Admin: sidebar ซ้าย + แถบบน + เนื้อหา
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, setData, now } = useGlobalData();
  const [resetOpen, setResetOpen] = useState(false);

  // ยังไม่ login → ไปหน้า login (เหมือน checkLogin ใน W09)
  useEffect(() => checkLogin(router, pathname + window.location.search, data), [router, pathname, data]);

  const user = getCurrentUser(data);
  if (!user) return null;

  const can = (permission: Permission) => canDo(data, permission);

  // หน้าที่เปิดอยู่ต้องใช้สิทธิ์อะไร (/admin/floors ใช้สิทธิ์จัดการชั้น)
  const page = pathname.split("/")[2] ?? "";
  const pagePermission = (page === "floors" ? "manage-floors" : page) as Permission;
  const allowed = page === "" || can(pagePermission);
  const title =
    page === "floors" ? "Parking Layout / จัดการชั้น" : MENUS.find((item) => item.menu === page)?.label;

  const handleReset = () => {
    setData(createDemoData());
    setResetOpen(false);
    doLogout(router);
  };

  return (
    <div className="admin-shell">
      {/* sidebar: แสดงเฉพาะเมนูที่มีสิทธิ์ */}
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-logo">
          <span className="brand-icon">
            <CarFront size={22} />
          </span>
          <span>
            <strong>{APP_NAME}</strong>
            <small>Admin console</small>
          </span>
        </Link>
        <p className="sidebar-label">จัดการลานจอด</p>
        <nav>
          {MENUS.filter((item) => can(item.menu)).map((item) => {
            const active = page === item.menu || (item.menu === "parking-layout" && page === "floors");
            return (
              <Link key={item.menu} href={`/admin/${item.menu}`} className={active ? "is-active" : ""}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-bottom">
          {can("reset") && (
            <button className="sp-button sp-button--ghost" onClick={() => setResetOpen(true)}>
              <RotateCcw size={14} />
              รีเซ็ตข้อมูล Demo
            </button>
          )}
          <button className="sp-button sp-button--ghost" onClick={() => doLogout(router)}>
            <LogOut size={15} />
            ออกจากระบบ
          </button>
          <div className="parking-site">
            <i />
            {SITE_NAME}
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span>{title ?? APP_NAME}</span>
          <div>
            <span className="topbar-avatar">
              <UserRound size={15} fill="currentColor" />
            </span>
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
        </header>

        <main className="admin-content">
          {allowed ? (
            children
          ) : (
            <div className="admin-empty">
              <ShieldAlert size={42} />
              <h1>ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
              <p>เมนูและการทำงานขึ้นอยู่กับสิทธิ์ของบัญชีนี้</p>
              <Link
                href={firstAllowedPath(user.role, data.adminPermissions)}
                className="sp-button sp-button--primary"
              >
                กลับหน้าที่มีสิทธิ์
              </Link>
            </div>
          )}
        </main>
        <footer className="admin-demo-footer">ข้อมูลสาธิต · เวลาเดโม {dateTime(now)}</footer>
      </div>

      <Modal open={resetOpen} title="รีเซ็ตข้อมูล Demo" onClose={() => setResetOpen(false)}>
        <p>ข้อมูลทั้งหมดจะกลับเป็นค่าเริ่มต้น และคุณจะออกจากระบบ</p>
        <div className="modal-actions">
          <button className="sp-button sp-button--secondary" onClick={() => setResetOpen(false)}>
            ยกเลิก
          </button>
          <button className="sp-button sp-button--danger" onClick={handleReset}>
            ยืนยันรีเซ็ต
          </button>
        </div>
      </Modal>
    </div>
  );
}
