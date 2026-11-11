"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CarFront, Plus } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import type { Spot } from "@/data/types";
import { SITE_NAME } from "@/data/config";
import { time } from "@/utils/format";
import { canDo } from "@/utils/login";
import { countSpots, floorName, SPOT_LABELS, spotStatus } from "@/utils/parking";
import AdminHeader from "@/components/AdminHeader";
import StatCards from "@/components/StatCards";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";

const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

// ผังลานจอด: เลือกชั้น → คลิกช่อง → ดูรายละเอียด / เพิ่ม–แก้ไขช่อง
export default function Page() {
  const { data, setData } = useGlobalData();
  const params = useSearchParams();

  // เปิดจากลิงก์ ?spot= หรือ ?floor= ได้
  const linkedSpot = data.spots.find((spot) => spot.id === params.get("spot"));
  const [floor, setFloor] = useState(linkedSpot?.floor ?? (Number(params.get("floor")) || data.floors[0].id));
  const [selectedId, setSelectedId] = useState(linkedSpot?.id ?? "");
  const [form, setForm] = useState<Spot | null>(null); // ฟอร์มเพิ่ม/แก้ไขช่อง (null = ปิด)
  const [deleting, setDeleting] = useState<Spot | null>(null); // ช่องที่กำลังยืนยันลบ (null = ปิด)
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ช่องในชั้นนี้ เรียง A1, A2 ... A10
  const spots = data.spots
    .filter((spot) => spot.floor === floor)
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  const rows = [...new Set(spots.map((spot) => spot.name[0]))]; // แถว A, B, C

  const selected = spots.find((spot) => spot.id === selectedId);
  const parkedCar = data.vehicles.find((vehicle) => !vehicle.exitAt && vehicle.spotId === selected?.id);
  const count = countSpots(data, floor);
  const notFree = count.total - count.available;

  const stats = [
    { label: "ช่องจอด" + floorName(data, floor), value: `${count.total} ช่อง`, note: `${rows.length} แถว` },
    {
      label: "ช่องว่าง",
      value: `${count.available} ช่อง`,
      note: `${percent(count.available, count.total)}% ของชั้นนี้`,
    },
    { label: "ไม่ว่าง", value: `${notFree} ช่อง`, note: `${percent(notFree, count.total)}% ของชั้นนี้` },
  ];

  const handleSaveSpot = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const name = form.name.trim().toUpperCase();

    // validate
    if (name === "") return setError("กรุณากรอกชื่อช่องจอด");
    if (data.spots.some((spot) => spot.id !== form.id && spot.floor === form.floor && spot.name === name)) {
      return setError("มีชื่อช่องจอดนี้ในชั้นเดียวกันแล้ว");
    }
    const hasCar = data.vehicles.some((vehicle) => !vehicle.exitAt && vehicle.spotId === form.id);
    const oldSpot = data.spots.find((spot) => spot.id === form.id);
    if (hasCar && oldSpot && oldSpot.floor !== form.floor) return setError("ช่องที่มีรถจอดอยู่ ย้ายชั้นไม่ได้");

    // บันทึก: มีอยู่แล้ว = แก้ไข / ยังไม่มี = เพิ่มใหม่
    const saved = { ...form, name };
    const newSpots = oldSpot
      ? data.spots.map((spot) => (spot.id === saved.id ? saved : spot))
      : [...data.spots, saved];
    setData({ ...data, spots: newSpots });
    setForm(null);
    setNotice("บันทึกช่องจอดเรียบร้อยแล้ว");
  };

  const handleDeleteSpot = () => {
    if (!deleting) return;

    // ลบได้เฉพาะช่องที่ไม่เคยมีรถจอด (Operation, ใบเสร็จ และ Heat Map ยังอ้างอิง spotId อยู่)
    const usedBy = data.vehicles.filter((vehicle) => vehicle.spotId === deleting.id);
    if (usedBy.some((vehicle) => !vehicle.exitAt)) return setError("ช่องนี้มีรถจอดอยู่ ลบไม่ได้");
    if (usedBy.length > 0) return setError("ช่องนี้มีประวัติการจอด ลบไม่ได้ ใช้ 'กันช่องชั่วคราว' แทน");

    setData({ ...data, spots: data.spots.filter((spot) => spot.id !== deleting.id) });
    setDeleting(null);
    setSelectedId("");
    setNotice("ลบช่องจอดเรียบร้อยแล้ว");
  };

  const openForm = (spot: Spot) => {
    setForm(spot);
    setError("");
  };

  return (
    <>
      <AdminHeader title="ผังลานจอดรถ" description="เลือกชั้นแล้วคลิกช่องจอดเพื่อดูสถานะและข้อมูลรถ">
        <div className="heading-actions">
          {canDo(data, "manage-floors") && (
            <Link href="/admin/floors" className="sp-button sp-button--secondary">
              จัดการชั้น
            </Link>
          )}
          {canDo(data, "add-spots") && (
            <button
              className="sp-button sp-button--primary"
              onClick={() => openForm({ id: crypto.randomUUID(), name: "", floor, blocked: false })}
            >
              <Plus size={16} />
              เพิ่มช่องจอด
            </button>
          )}
        </div>
      </AdminHeader>

      <div className="admin-card parking-toolbar">
        <select
          aria-label="เลือกชั้น"
          value={floor}
          onChange={(event) => {
            setFloor(Number(event.target.value));
            setSelectedId("");
          }}
        >
          {data.floors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} {item.active ? "" : "(ปิดใช้งาน)"}
            </option>
          ))}
        </select>
        <span>{SITE_NAME}</span>
      </div>
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}

      <StatCards items={stats} className="three-stats" />
      <p className="section-description">
        รถจอด {count.occupied} · กันช่อง {count.blocked} · ปิดบริการ {count.closed} ช่อง
      </p>

      <div className="layout-panels">
        {/* ผังช่องจอด */}
        <section className="admin-card parking-map">
          <div className="card-heading">
            <h2>ผังช่องจอด · {floorName(data, floor)}</h2>
            <div className="parking-legend">
              <span>
                <i className="available-dot" />
                ว่าง
              </span>
              <span>
                <i className="occupied-dot" />
                ไม่ว่าง
              </span>
              <span>
                <i className="selected-dot" />
                เลือกอยู่
              </span>
              <span>
                <i className="blocked-dot" />
                กันช่อง
              </span>
              <span>
                <i className="closed-dot" />
                ปิดบริการ
              </span>
            </div>
          </div>
          <div className="parking-grid-scroll">
            {rows.map((row) => (
              <div key={row} className="parking-row">
                <div className="parking-grid">
                  {spots
                    .filter((spot) => spot.name[0] === row)
                    .map((spot) => {
                      const status = spotStatus(data, spot);
                      return (
                        <button
                          key={spot.id}
                          className={`parking-spot is-${status} ${spot.id === selectedId ? "is-selected" : ""}`}
                          aria-label={`${spot.name} ${SPOT_LABELS[status]}`}
                          onClick={() => setSelectedId(spot.id)}
                        >
                          <strong>{spot.name}</strong>
                          {status === "occupied" ? (
                            <CarFront size={16} />
                          ) : (
                            <small>{SPOT_LABELS[status]}</small>
                          )}
                        </button>
                      );
                    })}
                </div>
                <div className="parking-lane" />
              </div>
            ))}
          </div>
          <div className="map-directions">
            <span>ทางเข้า →</span>
            <span>→ ทางออก</span>
          </div>
        </section>

        {/* รายละเอียดช่องที่เลือก */}
        <section className="admin-card parking-detail">
          <h2>รายละเอียดช่องจอด</h2>
          {selected ? (
            <>
              <div className="spot-detail-heading">
                <strong>{selected.name}</strong>
                <StatusBadge
                  tone={parkedCar ? "red" : spotStatus(data, selected) === "available" ? "green" : "gray"}
                >
                  {SPOT_LABELS[spotStatus(data, selected)]}
                </StatusBadge>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>ชั้น</dt>
                  <dd>{floorName(data, selected.floor)}</dd>
                </div>
                <div>
                  <dt>ทะเบียนรถ</dt>
                  <dd>{parkedCar ? `${parkedCar.plate} · ${parkedCar.province}` : "—"}</dd>
                </div>
                <div>
                  <dt>เวลาเข้า</dt>
                  <dd>{parkedCar ? time(parkedCar.entryAt) + " น." : "—"}</dd>
                </div>
                <div>
                  <dt>ประเภทรถ</dt>
                  <dd>{parkedCar?.type ?? "—"}</dd>
                </div>
              </dl>
              <div className="spot-detail-actions">
                {parkedCar && canDo(data, "operations") && (
                  <Link
                    className="sp-button sp-button--primary"
                    href={`/admin/operations?vehicle=${parkedCar.id}`}
                  >
                    ดูข้อมูลรถ
                  </Link>
                )}
                {canDo(data, "edit-spots") && (
                  <button
                    className="sp-button sp-button--secondary"
                    onClick={() => openForm({ ...selected })}
                  >
                    แก้ไขช่องจอด
                  </button>
                )}
                {canDo(data, "delete-spots") && (
                  <button
                    className="sp-button sp-button--danger"
                    onClick={() => {
                      setDeleting(selected);
                      setError("");
                    }}
                  >
                    ลบช่องจอด
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="section-description">คลิกช่องจอดในผังเพื่อดูรายละเอียด</p>
          )}
        </section>
      </div>

      {/* ฟอร์มเพิ่ม/แก้ไขช่อง */}
      <Modal
        open={form !== null}
        title={data.spots.some((spot) => spot.id === form?.id) ? "แก้ไขช่องจอด" : "เพิ่มช่องจอด"}
        onClose={() => setForm(null)}
      >
        {form && (
          <form className="modal-form" onSubmit={handleSaveSpot} noValidate>
            <label className="sp-field">
              ชื่อช่องจอด
              <input
                placeholder="เช่น A11"
                maxLength={8}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.blocked}
                onChange={(event) => setForm({ ...form, blocked: event.target.checked })}
              />
              กันช่องชั่วคราว (รับรถเข้าไม่ได้)
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="sp-button sp-button--secondary" onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className="sp-button sp-button--primary">
                บันทึกช่องจอด
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ยืนยันลบช่อง */}
      <Modal open={deleting !== null} title="ยืนยันการลบช่องจอด" onClose={() => setDeleting(null)}>
        <p>
          ต้องการลบช่อง {deleting?.name} ({deleting && floorName(data, deleting.floor)}) หรือไม่? ลบแล้วกู้คืนไม่ได้
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="sp-button sp-button--secondary" onClick={() => setDeleting(null)}>
            ยกเลิก
          </button>
          <button className="sp-button sp-button--danger" onClick={handleDeleteSpot}>
            ยืนยันลบ
          </button>
        </div>
      </Modal>
    </>
  );
}
