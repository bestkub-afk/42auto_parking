"use client";

import { CarFront, CircleDollarSign, Clock3, Timer } from "lucide-react";
import type { Vehicle } from "@/data/types";
import { dateTime, durationText, money, time } from "@/utils/format";
import { parkingMinutes } from "@/utils/parking";

// การ์ดทะเบียนรถ (วงกลมไอคอน + ทะเบียน + จังหวัด)
export function VehicleCard({ vehicle, label = false }: { vehicle: Vehicle; label?: boolean }) {
  return (
    <div className="plate-card">
      <span className="user-car-circle">
        <CarFront size={30} />
      </span>
      <div>
        {label && <span>เลขทะเบียน</span>}
        <strong>{vehicle.plate}</strong>
        <small>{vehicle.province}</small>
      </div>
    </div>
  );
}

// แถวเวลาเข้า เวลาออก ระยะเวลาจอด (และค่าจอดถ้าส่ง fee มา)
// endAt = เวลาออก (รถยังจอดอยู่ใช้เวลาปัจจุบัน), fullDate = แสดงวันที่ด้วย
export function VehicleFacts({
  vehicle,
  endAt,
  fee,
  fullDate = false,
}: {
  vehicle: Vehicle;
  endAt: string;
  fee?: number;
  fullDate?: boolean;
}) {
  const show = (value: string) => (fullDate ? dateTime(value) : time(value) + " น.");
  return (
    <dl className="user-facts">
      <div>
        <dt>
          <Clock3 />
          เวลาเข้า
        </dt>
        <dd>{show(vehicle.entryAt)}</dd>
      </div>
      <div>
        <dt>
          <Clock3 />
          เวลาออก
        </dt>
        <dd>{show(endAt)}</dd>
      </div>
      <div>
        <dt>
          <Timer />
          ระยะเวลาจอด
        </dt>
        <dd>{durationText(parkingMinutes(vehicle.entryAt, endAt))}</dd>
      </div>
      {fee !== undefined && (
        <div>
          <dt>
            <CircleDollarSign />
            ค่าจอด
          </dt>
          <dd>{money(fee)}</dd>
        </div>
      )}
    </dl>
  );
}
