"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CircleCheck, Clock3, ChevronRight } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import { BANK_APPS, QR_MINUTES } from "@/data/config";
import { countdown, money } from "@/utils/format";
import { findPayment, payVehicle, vehicleTotal } from "@/utils/parking";
import { downloadBlob } from "@/utils/csv";
import { DemoQr } from "@/components/DemoQr";
import UserHeader from "@/components/UserHeader";
import VehicleNotFound from "@/components/VehicleNotFound";

const QR_TIME = QR_MINUTES * 60 * 1000;

// อ่านเวลาหมดอายุ QR ที่เก็บไว้ (รีเฟรชแล้วไม่เริ่มนับใหม่) ถ้าไม่มีสร้างใหม่
const loadQrDeadline = (key: string) => {
  const saved = Number(localStorage.getItem(key));
  if (saved > 0) return saved;
  const deadline = Date.now() + QR_TIME;
  localStorage.setItem(key, String(deadline));
  return deadline;
};

// หน้า QR: กดไอคอนแอปธนาคาร = จ่ายจำลอง → สถานะเปลี่ยนเป็นสำเร็จ → กดยืนยัน
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, setData, now } = useGlobalData();
  const vehicle = data.vehicles.find((item) => item.id === id);
  const payment = findPayment(data, id);
  const qrKey = `qr-deadline-${id}`;

  const [deadline, setDeadline] = useState(() => loadQrDeadline(qrKey));
  const [secondsLeft, setSecondsLeft] = useState(QR_MINUTES * 60);
  const [error, setError] = useState("");

  // นับถอยหลังอายุ QR
  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!vehicle) return <VehicleNotFound />;

  const paid = payment !== undefined;
  const expired = !paid && secondsLeft === 0;
  const amount = vehicleTotal(vehicle, payment, now);

  // กดแอปธนาคาร (เดโม) = จ่ายเงินสำเร็จ
  const handlePay = () => {
    if (expired) return;
    try {
      setData(payVehicle(data, vehicle.id, now, amount));
      localStorage.removeItem(qrKey);
      setError("");
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  const handleNewQr = () => {
    const newDeadline = Date.now() + QR_TIME;
    localStorage.setItem(qrKey, String(newDeadline));
    setDeadline(newDeadline);
  };

  const handleSaveQr = () => {
    const svg = document.getElementById("payment-qr");
    if (!svg) return;
    const text = new XMLSerializer().serializeToString(svg);
    downloadBlob("auto-parking-qr.svg", new Blob([text], { type: "image/svg+xml" }));
  };

  return (
    <>
      <UserHeader title="รายละเอียดรถ" backTo={`/user/vehicle/${vehicle.id}`} />
      <main className="user-page-content">
        <section className="qr-card">
          <p>ยอดที่ต้องชำระ</p>
          <strong className="qr-amount">{money(amount)}</strong>

          {/* กล่อง QR */}
          <div className={`qr-box ${expired ? "is-expired" : ""}`}>
            <small>QR code</small>
            <DemoQr id="payment-qr" />
            <small>สแกน QR เพื่อชำระเงินผ่านแอปธนาคาร</small>
            {!paid && (
              <p className="qr-timer" role="timer">
                <Clock3 size={16} />
                {expired ? "QR หมดอายุแล้ว" : `หมดอายุใน ${countdown(secondsLeft)} นาที`}
              </p>
            )}
            {expired && (
              <button className="text-button" onClick={handleNewQr}>
                สร้าง QR ใหม่
              </button>
            )}
          </div>

          {/* ยังไม่จ่าย: ไอคอนแอปธนาคาร + บันทึกรูป QR */}
          {!paid && (
            <>
              <div className="bank-row">
                {BANK_APPS.map((bank) => (
                  <button key={bank.name} onClick={handlePay} disabled={expired} aria-label={bank.name}>
                    <img src={bank.logo} alt={bank.name} />
                  </button>
                ))}
              </div>
              <small className="bank-caption">เลือกแอปธนาคาร</small>
              <button className="save-qr" onClick={handleSaveQr}>
                บันทึกรูป QR
              </button>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {/* สถานะการชำระ */}
          <div className={`pay-status ${paid ? "is-paid" : ""}`}>
            {paid ? <CircleCheck size={30} /> : <Clock3 size={30} />}
            <div>
              <strong>{paid ? "ชำระเงินเสร็จสิ้น" : "รอชำระเงิน"}</strong>
              <small>ระบบจะอัปเดตสถานะอัตโนมัติ</small>
            </div>
          </div>
        </section>

        {/* ปุ่มยืนยัน กดได้เมื่อจ่ายแล้ว */}
        <button
          className="sp-button sp-button--primary full-width big-button"
          disabled={!paid}
          onClick={() => router.push(`/user/success/${vehicle.id}`)}
        >
          ยืนยัน
          <ChevronRight size={20} />
        </button>
      </main>
    </>
  );
}
