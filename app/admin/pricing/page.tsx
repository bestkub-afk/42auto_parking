"use client";

import { useState } from "react";
import { useGlobalData } from "@/utils/context";
import { HOURLY_RATE } from "@/data/config";
import { money } from "@/utils/format";
import { canDo } from "@/utils/login";
import AdminHeader from "@/components/AdminHeader";

// หน้าปรับราคาค่าจอดรถ: ตั้งอัตราต่อชั่วโมง (เศษของชั่วโมงปัดขึ้นเป็น 1 ชั่วโมงเต็ม)
export default function Page() {
  const { data, setData } = useGlobalData();
  // อัตราที่ใช้อยู่ (เก็บใน data → บันทึกลง localStorage โดย layout)
  // ข้อมูลเก่าที่บันทึกไว้ก่อนมีหน้านี้จะยังไม่มี hourlyRate จึงใช้ค่าเริ่มต้นแทน
  const rate = data.hourlyRate ?? HOURLY_RATE;

  const canEdit = canDo(data, "edit-rate"); // Admin ที่ไม่มีสิทธิ์ดูอัตราได้อย่างเดียว
  const [rateInput, setRateInput] = useState(String(rate)); // ค่าที่กำลังกรอก
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const saveRate = (value: number, message: string) => {
    setData({ ...data, hourlyRate: value });
    setRateInput(String(value));
    setError("");
    setNotice(message);
  };

  // ---------- บันทึกอัตราใหม่ ----------
  const handleSaveRate = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(rateInput);
    if (rateInput.trim() === "" || !Number.isFinite(value) || value <= 0)
      return setError("กรุณากรอกอัตราค่าจอดเป็นตัวเลขที่มากกว่า 0");
    saveRate(value, `ปรับอัตราค่าจอดเป็นชั่วโมงละ ${money(value)} แล้ว`);
  };

  const handleResetRate = () =>
    saveRate(HOURLY_RATE, `คืนค่าเริ่มต้น ชั่วโมงละ ${money(HOURLY_RATE)} แล้ว`);

  return (
    <>
      <AdminHeader
        title="ปรับราคาค่าจอดรถ"
        description={`คิดค่าจอดชั่วโมงละ ${money(rate)} · เศษของชั่วโมงปัดขึ้นเป็น 1 ชั่วโมงเต็ม`}
      />
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}

      {/* ตั้งอัตราค่าจอด */}
      <form className="admin-card filter-bar" onSubmit={handleSaveRate} noValidate>
        <label>
          อัตราค่าจอด (บาทต่อชั่วโมง)
          <input
            type="number"
            min={1}
            step={1}
            value={rateInput}
            readOnly={!canEdit}
            onChange={(e) => setRateInput(e.target.value)}
          />
        </label>
        {canEdit && (
          <>
            <button type="submit" className="sp-button sp-button--primary">
              บันทึกอัตรา
            </button>
            <button type="button" className="sp-button sp-button--secondary" onClick={handleResetRate}>
              คืนค่าเริ่มต้น ({HOURLY_RATE} บาท)
            </button>
          </>
        )}
        {error && (
          <p className="form-error full-width" role="alert">
            {error}
          </p>
        )}
      </form>

      {/* ตัวอย่างวิธีคิด */}
      <section className="admin-card">
        <div className="card-heading">
          <h2>วิธีคิดค่าจอด</h2>
          <span>อัตราปัจจุบัน {money(rate)} / ชั่วโมง</span>
        </div>
        <p className="section-description">
          จอด 1 ชั่วโมง 1 นาที คิดเป็น 2 ชั่วโมง = {money(2 * rate)} · จอดไม่ถึง 1 ชั่วโมงคิดเป็น 1 ชั่วโมง ={" "}
          {money(rate)}
        </p>
      </section>
    </>
  );
}
