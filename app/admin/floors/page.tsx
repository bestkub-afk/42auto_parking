"use client";

import { useState } from "react";
import Link from "next/link";
import { useGlobalData } from "@/utils/context";
import type { Floor } from "@/data/types";
import AdminHeader from "@/components/AdminHeader";
import StatusBadge from "@/components/StatusBadge";

// จัดการชั้น: ตารางชั้นด้านซ้าย + ฟอร์มแก้ไขด้านขวา
export default function Page() {
  const { data, setData } = useGlobalData();
  const [form, setForm] = useState<Floor>({ ...data.floors[0] });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isNew = !data.floors.some((floor) => floor.id === form.id);
  const spotCount = (floorId: number) => data.spots.filter((spot) => spot.floor === floorId).length;

  const handleSelect = (floor: Floor) => {
    setForm({ ...floor });
    setError("");
    setNotice("");
  };

  // ชั้นใหม่ใช้ id และลำดับถัดจากชั้นสุดท้าย
  const handleAdd = () => {
    const nextId = Math.max(...data.floors.map((floor) => floor.id)) + 1;
    const nextOrder = Math.max(...data.floors.map((floor) => floor.order)) + 1;
    handleSelect({ id: nextId, order: nextOrder, name: "", active: true });
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();

    // validate
    if (name === "" || form.order < 1) return setError("กรุณากรอกชื่อชั้นและลำดับให้ถูกต้อง");
    const duplicate = data.floors.some(
      (floor) => floor.id !== form.id && (floor.order === form.order || floor.name === name),
    );
    if (duplicate) return setError("ชื่อชั้นหรือลำดับซ้ำกับชั้นอื่น");

    // บันทึก แล้วเรียงตามลำดับ
    const saved = { ...form, name };
    const floors = isNew
      ? [...data.floors, saved]
      : data.floors.map((floor) => (floor.id === saved.id ? saved : floor));
    setData({ ...data, floors: floors.sort((a, b) => a.order - b.order) });
    setForm(saved);
    setError("");
    setNotice("บันทึกข้อมูลชั้นเรียบร้อยแล้ว");
  };

  return (
    <>
      <AdminHeader title="จัดการชั้นจอดรถ" description="เพิ่มและแก้ไขชื่อชั้น ลำดับ และสถานะของชั้นจอด">
        <Link className="sp-button sp-button--secondary" href="/admin/parking-layout">
          ← กลับไปที่ผังลานจอด
        </Link>
      </AdminHeader>
      {notice && (
        <p role="status" className="success-notice">
          {notice}
        </p>
      )}

      <div className="floor-panels">
        <section className="admin-card">
          <div className="card-heading">
            <div>
              <h2>รายการชั้นจอดรถ</h2>
              <p className="section-description">
                {data.floors.length} ชั้น · {data.spots.length} ช่องจอด
              </p>
            </div>
            <button className="sp-button sp-button--primary" onClick={handleAdd}>
              + เพิ่มชั้น
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>ชื่อชั้น</th>
                  <th>ช่องจอด</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.floors.map((floor) => (
                  <tr key={floor.id} className={floor.id === form.id ? "selected-row" : ""}>
                    <td>
                      <strong>{String(floor.order).padStart(2, "0")}</strong>
                    </td>
                    <td>{floor.name}</td>
                    <td>{spotCount(floor.id)} ช่อง</td>
                    <td>
                      <StatusBadge tone={floor.active ? "green" : "gray"}>
                        {floor.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </StatusBadge>
                    </td>
                    <td>
                      <button className="text-button" onClick={() => handleSelect(floor)}>
                        แก้ไข →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card floor-editor">
          <h2>{isNew ? "เพิ่มข้อมูลชั้น" : "แก้ไขข้อมูลชั้น"}</h2>
          <form className="modal-form" onSubmit={handleSave} noValidate>
            <label className="sp-field">
              ลำดับชั้น
              <input
                type="number"
                min={1}
                value={form.order}
                onChange={(event) => setForm({ ...form, order: Number(event.target.value) })}
              />
            </label>
            <label className="sp-field">
              ชื่อชั้น
              <input
                value={form.name}
                maxLength={40}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="sp-field">
              สถานะการใช้งาน
              <select
                value={String(form.active)}
                onChange={(event) => setForm({ ...form, active: event.target.value === "true" })}
              >
                <option value="true">เปิดใช้งาน</option>
                <option value="false">ปิดใช้งาน</option>
              </select>
            </label>
            <div className="purple-note">
              <strong>จำนวนช่องจอดของชั้นนี้: {spotCount(form.id)} ช่อง</strong>
              <small>ปิดชั้นแล้วรับรถเข้าใหม่ไม่ได้ แต่รถที่จอดอยู่ยังออกได้</small>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button type="submit" className="sp-button sp-button--primary">
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </form>
          {!isNew && (
            <Link
              className="sp-button sp-button--secondary full-width"
              href={`/admin/parking-layout?floor=${form.id}`}
            >
              ดูผังชั้นนี้ →
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
