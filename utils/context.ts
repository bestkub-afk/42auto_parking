import { createContext, useContext } from "react";
import type { ParkingData } from "@/data/types";

// ข้อมูลกลางที่ทุกหน้าใช้ร่วมกัน (เหมือน globalDataContext ใน W09)
// แยกไว้ไฟล์นี้เพราะ Next.js ไม่ให้ export อย่างอื่นจาก layout.tsx
type GlobalData = {
  data: ParkingData;
  setData: (data: ParkingData) => void;
  now: string; // เวลาเดโมปัจจุบัน (เดินทุก 1 วินาที)
};

export const globalDataContext = createContext<GlobalData | null>(null);

// ใช้ในหน้าต่าง ๆ: const { data, setData, now } = useGlobalData();
export const useGlobalData = () => useContext(globalDataContext) as GlobalData;
