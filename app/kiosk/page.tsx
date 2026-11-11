"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CarFront, Check, ShieldCheck } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import { SITE_NAME, STAFF_CONTACT } from "@/data/config";
import { dateTime, money, time } from "@/utils/format";
import {
  findPayment,
  parkingDuration,
  parkingStatus,
  passGate,
  payVehicle,
  spotText,
  vehicleTotal,
} from "@/utils/parking";
import { DemoQr } from "@/components/DemoQr";

// จอทางออก: ไม้กั้นเปิดเมื่อจ่ายแล้วและยังไม่เกินเวลา (หรือเจ้าหน้าที่อนุมัติ)
export default function Page() {
  const { data, setData, now } = useGlobalData();
  const params = useSearchParams();
  const firstParked = data.vehicles.find((vehicle) => !vehicle.exitAt);
  const [vehicleId, setVehicleId] = useState(params.get("vehicle") ?? firstParked?.id ?? "");
  const [error, setError] = useState("");

  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  const payment = findPayment(data, vehicleId);
  const status = vehicle ? parkingStatus(vehicle, payment, now) : null;
  const gateOpen = status?.canExit ?? false;

  // ข้อความตามสถานะ
  let heading = "ชำระค่าจอดรถ";
  let gateText = "กรุณาชำระค่าจอดก่อนออก";
  if (status?.code === "ready") {
    heading = "ชำระเงินเรียบร้อยแล้ว";
    gateText = "พร้อมออก · กดจำลองรถผ่านไม้กั้น";
  } else if (status?.code === "approved") {
    heading = "เจ้าหน้าที่อนุมัติให้ออก";
    gateText = "พร้อมออก · กดจำลองรถผ่านไม้กั้น";
  } else if (status?.code === "overdue") {
    heading = "พ้นกำหนดเวลาออก";
    gateText = "กรุณาติดต่อ " + STAFF_CONTACT;
  } else if (status?.code === "exited") {
    heading = "รถออกจากลานแล้ว";
    gateText = "บันทึกเวลาออกและคืนช่องจอดแล้ว";
  }

  const handlePay = () => {
    if (!vehicle) return;
    try {
      setData(payVehicle(data, vehicle.id, now, vehicleTotal(vehicle, undefined, now)));
      setError("");
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  // รถผ่านไม้กั้น → บันทึกเวลาออก (หน้า User, Operation, Dashboard เห็นผลทันที)
  const handlePassGate = () => {
    try {
      setData(passGate(data, vehicleId, now));
      setError("");
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  return (
    <main className="kiosk-shell">
      <header className="kiosk-header">
        <div>
          <CarFront size={32} />
          <strong>Door Parking</strong>
          <span>{SITE_NAME}</span>
        </div>
        <span>{dateTime(now)}</span>
      </header>

      <div className="kiosk-toolbar">
        <span>จุดชำระเงินและทางออก · สาธิต</span>
        <label>
          เลือกรถที่ไม้กั้น
          <select
            value={vehicleId}
            onChange={(event) => {
              setVehicleId(event.target.value);
              setError("");
            }}
          >
            {data.vehicles
              .filter((item) => !item.exitAt || item.id === vehicleId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.plate} · {item.province}
                </option>
              ))}
          </select>
        </label>
        <Link href="/user/search">หน้าผู้ใช้ →</Link>
      </div>

      {vehicle && status && (
        <div className="kiosk-panels">
          {/* ภาพกล้อง CCTV ตัวอย่าง */}
          <section className="kiosk-camera">
            <div className="camera-label">
              <i />
              ภาพตัวอย่างจากกล้องทางออก
            </div>
            <img src={vehicle.image} alt={`รถที่ไม้กั้น ${vehicle.plate}`} />
            <div className="kiosk-plate">
              <CarFront size={38} />
              <div>
                <strong>{vehicle.plate}</strong>
                <span>{vehicle.province}</span>
              </div>
            </div>
          </section>

          <section className="kiosk-payment">
            <h1>{heading}</h1>
            <dl className="detail-list">
              <div>
                <dt>ตำแหน่งจอด</dt>
                <dd>{spotText(data, vehicle)}</dd>
              </div>
              <div>
                <dt>เวลาเข้า</dt>
                <dd>{time(vehicle.entryAt)} น.</dd>
              </div>
              <div>
                <dt>เวลาออก</dt>
                <dd>{vehicle.exitAt ? time(vehicle.exitAt) + " น." : "—"}</dd>
              </div>
              <div>
                <dt>ระยะเวลาจอด</dt>
                <dd>{parkingDuration(vehicle, now)}</dd>
              </div>
              <div>
                <dt>สถานะชำระ</dt>
                <dd>{payment ? "ชำระแล้ว" : "ยังไม่ชำระ"}</dd>
              </div>
            </dl>

            {/* ยังไม่จ่าย → ยอด + QR / จ่ายแล้ว → ยอดที่ล็อกและเวลาที่ต้องออก */}
            {status.code === "unpaid" ? (
              <>
                <strong className="kiosk-amount">{money(vehicleTotal(vehicle, payment, now))}</strong>
                <DemoQr />
                <p className="section-description">QR สาธิต ไม่สามารถชำระเงินจริง</p>
                <button className="sp-button sp-button--primary" onClick={handlePay}>
                  จำลองการชำระเงิน
                </button>
              </>
            ) : (
              <div className="kiosk-paid">
                <span>
                  <Check size={36} />
                </span>
                <strong>{payment ? money(payment.amount) : "—"}</strong>
                {status.deadline && status.canExit && <p>ออกจากลานภายใน {time(status.deadline)} น.</p>}
                <small>{payment?.id}</small>
              </div>
            )}

            <button
              className="sp-button sp-button--primary full-width"
              disabled={!gateOpen}
              onClick={handlePassGate}
            >
              จำลองรถผ่านไม้กั้น
            </button>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {status.code === "overdue" && (
              <Link href={`/admin/operations?vehicle=${vehicle.id}`} className="text-button">
                สำหรับเจ้าหน้าที่: ตรวจสอบและอนุมัติออก →
              </Link>
            )}
          </section>
        </div>
      )}

      {/* แถบสถานะไม้กั้น: เขียว = เปิด / แดง = ปิด */}
      <div className={`kiosk-gate ${gateOpen ? "is-open" : ""}`} role="status">
        <ShieldCheck size={28} />
        <strong>{gateOpen ? "ไม้กั้นเปิด · เชิญออกจากลานจอด" : "ไม้กั้นปิด"}</strong>
        <span>{gateText}</span>
      </div>
    </main>
  );
}
