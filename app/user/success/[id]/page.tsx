"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CircleCheck, House } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import { APP_NAME } from "@/data/config";
import { findPayment } from "@/utils/parking";
import { DemoQr } from "@/components/DemoQr";
import UserHeader from "@/components/UserHeader";
import VehicleNotFound from "@/components/VehicleNotFound";
import { VehicleCard, VehicleFacts } from "@/components/VehicleInfo";

// หน้าชำระเงินเสร็จ: สรุปการจอด + รหัสอ้างอิง → กลับหน้าหลัก
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useGlobalData();
  const vehicle = data.vehicles.find((item) => item.id === id);
  const payment = findPayment(data, id);

  // ยังไม่จ่าย → กลับไปหน้า QR
  useEffect(() => {
    if (vehicle && !payment) router.replace(`/user/payment/${id}`);
  }, [vehicle, payment, id, router]);

  if (!vehicle) return <VehicleNotFound />;
  if (!payment) return null;

  return (
    <>
      <UserHeader title="รายละเอียดรถ" backTo={`/user/vehicle/${vehicle.id}`} />
      <main className="user-page-content">
        <div className="done-box">
          <CircleCheck size={56} strokeWidth={1.5} />
          <h1>ชำระเงินเสร็จ</h1>
          <p>ขอบคุณที่ใช้บริการ</p>
        </div>

        <VehicleCard vehicle={vehicle} label />
        {/* เวลาออก = เวลาที่ชำระ (ยอดล็อกแล้ว) */}
        <VehicleFacts
          vehicle={vehicle}
          endAt={vehicle.exitAt ?? payment.paidAt}
          fee={payment.amount}
          fullDate
        />

        {/* แถบรหัสอ้างอิง */}
        <div className="receipt-strip">
          <DemoQr small />
          <div>
            <small>ชำระผ่าน</small>
            <span>{payment.method} Payment</span>
          </div>
          <div>
            <small>รหัสอ้างอิง</small>
            <strong>{payment.id}</strong>
          </div>
        </div>

        <div className="saved-note">
          <CircleCheck size={30} />
          <p>
            ระบบได้บันทึกข้อมูลการชำระเงินเรียบร้อยแล้ว
            <br />
            ขอบคุณที่ใช้บริการ {APP_NAME}
          </p>
        </div>

        <Link className="sp-button sp-button--primary full-width big-button" href="/user/search">
          <House size={20} />
          กลับไปหน้าหลัก
        </Link>
      </main>
    </>
  );
}
