"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// ไม่ใช้หน้านี้แล้ว (Figma ไปหน้า QR ตรง) ลิงก์เก่าจะพาไปหน้า QR แทน
// ลบโฟลเดอร์ app/user/summary ทิ้งได้
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => router.replace(`/user/payment/${id}`), [id, router]);
  return null;
}
