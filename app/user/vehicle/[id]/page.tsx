"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import { HOURLY_RATE } from "@/data/config";
import { money } from "@/utils/format";
import { findPayment, vehicleTotal } from "@/utils/parking";
import UserHeader from "@/components/UserHeader";
import VehicleNotFound from "@/components/VehicleNotFound";
import { VehicleCard, VehicleFacts } from "@/components/VehicleInfo";

// หน้ารายละเอียดรถ: รูป + ทะเบียน + เวลา + ค่าจอด → ปุ่มชำระเงิน
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, now } = useGlobalData();
  const vehicle = data.vehicles.find((item) => item.id === id);
  const payment = findPayment(data, id);

  if (!vehicle) return <VehicleNotFound />;

  // อัตราค่าจอดที่ตั้งไว้ในหน้า pricing (ถ้าไม่มีใช้ค่าเริ่มต้น)
  const rate = data.hourlyRate ?? HOURLY_RATE;

  // จ่ายแล้วใช้เวลาที่จ่าย ยังไม่จ่ายใช้เวลาปัจจุบัน
  const endAt = vehicle.exitAt ?? payment?.paidAt ?? now;

  // จ่ายแล้วใช้ยอดที่ล็อก ยังไม่จ่ายคิดตามอัตราปัจจุบัน
  const total = vehicleTotal(vehicle, payment, now, rate);

  return (
    <>
      <UserHeader title="รายละเอียดรถ" backTo="/user/search" />
      <main className="user-page-content">
        <img className="detail-photo" src={vehicle.image} alt={`รถ ${vehicle.plate}`} />

        {/* แสดงรายละเอียดรถ + เวลาออก */}
        <section className="detail-card">
          <VehicleCard vehicle={vehicle} />
          <VehicleFacts vehicle={vehicle} endAt={endAt} fullDate />
        </section>

        <div className="fee-total">
          <span>ค่าจอดรถ</span>
          <strong>{money(total)}</strong>
        </div>

        <Link
          className="sp-button sp-button--primary full-width big-button"
          href={payment ? `/user/success/${vehicle.id}` : `/user/payment/${vehicle.id}`}
        >
          {payment ? "ดูใบเสร็จ" : "ชำระเงิน"}
          <ChevronRight size={20} />
        </Link>
      </main>
    </>
  );
}