"use client";

import "./globals.css";
import "@/styles/common.css";
import "@/styles/user.css";
import "@/styles/admin.css";
import "@/styles/reports.css";
import "@/styles/kiosk.css";

import { Suspense, useEffect, useState } from "react";
import type { ParkingData } from "@/data/types";
import { DATA_KEY } from "@/data/config";
import { createDemoData } from "@/data/mockData";
import { demoNow } from "@/utils/parking";
import { globalDataContext } from "@/utils/context";

// อ่านข้อมูลที่บันทึกไว้ ถ้าไม่มีหรืออ่านไม่ได้ใช้ข้อมูลตัวอย่าง
const loadData = (): ParkingData => {
  try {
    const saved = JSON.parse(localStorage.getItem(DATA_KEY) ?? "null");
    if (saved && Array.isArray(saved.vehicles)) return saved;
  } catch {}
  return createDemoData();
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ParkingData | null>(null);
  const [now, setNow] = useState("");

  // โหลดข้อมูลครั้งแรก
  useEffect(() => {
    setData(loadData());
  }, []);

  // data เปลี่ยน → บันทึกลง localStorage
  useEffect(() => {
    if (data) localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }, [data]);

  // เดินนาฬิกาเดโมทุก 1 วินาที
  const clockStartedAt = data?.clockStartedAt;
  useEffect(() => {
    if (!clockStartedAt) return;
    const tick = () => setNow(demoNow(clockStartedAt));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [clockStartedAt]);

  // อีกแท็บบันทึก (เช่น เปิด Kiosk คู่กับหน้า User) → แท็บนี้อัปเดตตาม
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DATA_KEY && event.newValue) setData(JSON.parse(event.newValue));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <html lang="th">
      <head>
        <title>Auto Parking</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {/* รอโหลดข้อมูลเสร็จก่อนค่อยแสดงหน้า */}
        {data && now && (
          <globalDataContext.Provider value={{ data, setData, now }}>
            <Suspense>{children}</Suspense>
          </globalDataContext.Provider>
        )}
      </body>
    </html>
  );
}
