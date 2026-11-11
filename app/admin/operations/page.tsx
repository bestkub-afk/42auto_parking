"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import type { Vehicle, VehicleType } from "@/data/types";
import { DEFAULT_CAR_IMAGE, DEFAULT_PROVINCE, EXIT_MINUTES, VEHICLE_TYPES } from "@/data/config";
import { dateKey, dateTime, money, time } from "@/utils/format";
import { canDo, getCurrentUser } from "@/utils/login";
import { downloadCsv } from "@/utils/csv";
import {
  findPayment,
  findSpot,
  floorName,
  normalizePlate,
  parkingDuration,
  parkingStatus,
  spotStatus,
  spotText,
  vehicleTotal,
} from "@/utils/parking";
import AdminHeader from "@/components/AdminHeader";
import StatusBadge, { ParkingBadge } from "@/components/StatusBadge";
import Modal from "@/components/Modal";

// หน้ารายการรถเข้า–ออก: ค้นหา/กรอง → เลือกรายการ → ดูรูปเข้า–ออก
export default function Page() {
  const { data, setData, now } = useGlobalData();
  const params = useSearchParams();
  const linked = data.vehicles.find((vehicle) => vehicle.id === params.get("vehicle"));

  const emptyFilter = {
    plate: "",
    date: dateKey(linked?.entryAt ?? now),
    start: "00:00",
    end: "23:59",
    status: "all",
    payment: "all",
  };
  const [filter, setFilter] = useState(emptyFilter); // ค่าที่กำลังกรอก
  const [applied, setApplied] = useState(emptyFilter); // ค่าที่กดค้นหาแล้ว
  const [selectedId, setSelectedId] = useState(linked?.id ?? "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // ฟอร์มในหน้าต่างป๊อปอัป
  const freeSpots = data.spots.filter((spot) => spotStatus(data, spot) === "available");
  const emptyEntry = {
    plate: "",
    province: DEFAULT_PROVINCE,
    type: VEHICLE_TYPES[0],
    spotId: freeSpots[0]?.id ?? "",
  };
  const [entry, setEntry] = useState<typeof emptyEntry | null>(null); // บันทึกรถเข้า
  const [editing, setEditing] = useState<Vehicle | null>(null); // แก้ไขรายการ
  const [approving, setApproving] = useState<Vehicle | null>(null); // อนุมัติออก
  const [reason, setReason] = useState("");

  // ---------- กรองรายการ ----------
  const rows = data.vehicles
    .filter((vehicle) => {
      const payment = findPayment(data, vehicle.id);
      const entryTime = time(vehicle.entryAt);
      if (!normalizePlate(vehicle.plate).includes(normalizePlate(applied.plate))) return false;
      if (dateKey(vehicle.entryAt) !== applied.date) return false;
      if (entryTime < applied.start || entryTime > applied.end) return false;
      if (applied.status === "in" && vehicle.exitAt) return false;
      if (applied.status === "out" && !vehicle.exitAt) return false;
      if (applied.payment === "unpaid" && payment) return false;
      if (applied.payment === "paid" && !payment) return false;
      if (applied.payment === "overdue" && parkingStatus(vehicle, payment, now).code !== "overdue")
        return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.entryAt) - Date.parse(a.entryAt));

  const selected = rows.find((vehicle) => vehicle.id === selectedId) ?? rows[0];
  const selectedPayment = findPayment(data, selected?.id);
  const selectedStatus = selected ? parkingStatus(selected, selectedPayment, now) : null;

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (filter.start > filter.end) return setError("เวลาเริ่มต้องไม่เกินเวลาสิ้นสุด");
    setError("");
    setApplied({ ...filter });
  };

  // ---------- บันทึกรถเข้า ----------
  const handleSaveEntry = (event: React.FormEvent) => {
    event.preventDefault();
    if (!entry) return;
    const plate = entry.plate.trim();
    const province = entry.province.trim();

    // validate
    if (plate === "" || province === "") return setError("กรุณากรอกทะเบียนและจังหวัด");
    const stillParked = data.vehicles.some(
      (vehicle) =>
        !vehicle.exitAt &&
        normalizePlate(vehicle.plate) === normalizePlate(plate) &&
        vehicle.province === province,
    );
    if (stillParked) return setError("ทะเบียนและจังหวัดนี้ยังจอดอยู่ในลาน");
    const spot = findSpot(data, entry.spotId);
    if (!spot || spotStatus(data, spot) !== "available") return setError("ช่องนี้ไม่ว่าง กรุณาเลือกช่องอื่น");

    // สร้างรายการใหม่ (รถที่เคยออกแล้วกลับมาได้ เป็นรายการใหม่)
    const newVehicle: Vehicle = {
      id: "v" + Date.now(),
      plate,
      province,
      type: entry.type,
      spotId: entry.spotId,
      entryAt: now,
      exitAt: null,
      image: DEFAULT_CAR_IMAGE,
      approvals: [],
    };
    setData({ ...data, vehicles: [...data.vehicles, newVehicle] });
    const today = { ...emptyFilter, date: dateKey(now) };
    setFilter(today);
    setApplied(today);
    setSelectedId(newVehicle.id);
    setEntry(null);
    setError("");
    setNotice(`บันทึกรถเข้า ${plate} แล้ว`);
  };

  // ---------- แก้ไขทะเบียน/จังหวัด/ประเภท ----------
  const handleSaveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (editing.plate.trim() === "" || editing.province.trim() === "") return setError("กรุณากรอกข้อมูลให้ครบ");
    const duplicate = data.vehicles.some(
      (vehicle) =>
        vehicle.id !== editing.id &&
        !vehicle.exitAt &&
        !editing.exitAt &&
        normalizePlate(vehicle.plate) === normalizePlate(editing.plate) &&
        vehicle.province === editing.province.trim(),
    );
    if (duplicate) return setError("ทะเบียนและจังหวัดนี้ยังจอดอยู่ในรายการอื่น");
    setData({
      ...data,
      vehicles: data.vehicles.map((vehicle) => (vehicle.id === editing.id ? editing : vehicle)),
    });
    setEditing(null);
    setError("");
    setNotice("แก้ไขรายการเรียบร้อยแล้ว");
  };

  // ---------- อนุมัติรถพ้นเวลาออก ----------
  const handleApprove = (event: React.FormEvent) => {
    event.preventDefault();
    if (!approving) return;
    if (reason.trim().length < 5) return setError("กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร");

    const approval = { staffName: getCurrentUser(data)!.name, approvedAt: now, reason: reason.trim() };
    setData({
      ...data,
      vehicles: data.vehicles.map((vehicle) =>
        vehicle.id === approving.id ? { ...vehicle, approvals: [...vehicle.approvals, approval] } : vehicle,
      ),
    });
    setApproving(null);
    setReason("");
    setError("");
    setNotice(`อนุมัติให้ออกได้อีก ${EXIT_MINUTES} นาที โดยไม่เก็บเงินเพิ่ม`);
  };

  // ---------- ส่งออก CSV ตามตัวกรอง ----------
  const handleExport = () => {
    const header = [
      "ทะเบียน",
      "จังหวัด",
      "ประเภท",
      "ช่องจอด",
      "เวลาเข้า",
      "เวลาออก",
      "ระยะเวลา",
      "ค่าจอด (บาท)",
      "สถานะ",
    ];
    const lines = rows.map((vehicle) => {
      const payment = findPayment(data, vehicle.id);
      return [
        vehicle.plate,
        vehicle.province,
        vehicle.type,
        spotText(data, vehicle),
        dateTime(vehicle.entryAt),
        vehicle.exitAt ? dateTime(vehicle.exitAt) : "—",
        parkingDuration(vehicle, now),
        vehicleTotal(vehicle, payment, now),
        parkingStatus(vehicle, payment, now).label,
      ];
    });
    downloadCsv(`operations-${applied.date}.csv`, [header, ...lines]);
  };

  const closeModals = () => {
    setEntry(null);
    setEditing(null);
    setApproving(null);
    setError("");
  };

  return (
    <>
      <AdminHeader title="รายการรถเข้า–ออก" description="ค้นหาทะเบียน วันที่ และช่วงเวลา แล้วเปิดดูรูปเข้า–ออก">
        <div className="heading-actions">
          {canDo(data, "record-entry") && (
            <button className="sp-button sp-button--primary" onClick={() => setEntry(emptyEntry)}>
              บันทึกรถเข้า
            </button>
          )}
          {canDo(data, "export-operations") && (
            <button className="sp-button sp-button--secondary" onClick={handleExport}>
              <Download size={15} />
              ส่งออก CSV
            </button>
          )}
        </div>
      </AdminHeader>
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}

      {/* ตัวกรอง */}
      <form className="admin-card filter-bar operation-filters" onSubmit={handleSearch} noValidate>
        <label>
          ค้นหาทะเบียน
          <input
            placeholder="ค้นหาทะเบียนรถ"
            value={filter.plate}
            onChange={(e) => setFilter({ ...filter, plate: e.target.value })}
          />
        </label>
        <label>
          วันที่
          <input
            type="date"
            value={filter.date}
            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
          />
        </label>
        <label>
          เวลาเริ่ม
          <input
            type="time"
            value={filter.start}
            onChange={(e) => setFilter({ ...filter, start: e.target.value })}
          />
        </label>
        <label>
          เวลาสิ้นสุด
          <input
            type="time"
            value={filter.end}
            onChange={(e) => setFilter({ ...filter, end: e.target.value })}
          />
        </label>
        <label>
          สถานะ
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="all">ทุกสถานะ</option>
            <option value="in">จอดอยู่</option>
            <option value="out">ออกแล้ว</option>
          </select>
        </label>
        <label>
          การชำระเงิน
          <select value={filter.payment} onChange={(e) => setFilter({ ...filter, payment: e.target.value })}>
            <option value="all">ทุกการชำระ</option>
            <option value="unpaid">ยังไม่ชำระ</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="overdue">พ้นเวลาออก</option>
          </select>
        </label>
        <button type="submit" className="sp-button sp-button--primary">
          ค้นหา
        </button>
        {error && !entry && !editing && !approving && (
          <p className="form-error full-width" role="alert">
            {error}
          </p>
        )}
      </form>

      {/* ตารางรายการ */}
      <section className="admin-card">
        <div className="card-heading">
          <h2>รายการที่พบ</h2>
          <span>{rows.length} รายการ</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table operations-table">
            <thead>
              <tr>
                <th>ช่องจอด</th>
                <th>ทะเบียน</th>
                <th>ประเภท</th>
                <th>เวลาเข้า</th>
                <th>เวลาออก</th>
                <th>ระยะเวลา</th>
                <th>ค่าจอด</th>
                <th>สถานะ</th>
                <th>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((vehicle) => {
                const payment = findPayment(data, vehicle.id);
                return (
                  <tr key={vehicle.id} className={vehicle.id === selected?.id ? "selected-row" : ""}>
                    <td>
                      <strong>{findSpot(data, vehicle.spotId)?.name}</strong>
                    </td>
                    <td>{vehicle.plate}</td>
                    <td>{vehicle.type}</td>
                    <td>{time(vehicle.entryAt)}</td>
                    <td>{vehicle.exitAt ? time(vehicle.exitAt) : "—"}</td>
                    <td>{parkingDuration(vehicle, now)}</td>
                    <td>{money(vehicleTotal(vehicle, payment, now))}</td>
                    <td>
                      <ParkingBadge status={parkingStatus(vehicle, payment, now)} />
                    </td>
                    <td>
                      <button className="text-button" onClick={() => setSelectedId(vehicle.id)}>
                        ดูรายละเอียด →
                      </button>
                      {canDo(data, "edit-operations") && (
                        <button className="text-button" onClick={() => setEditing({ ...vehicle })}>
                          แก้ไข
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-empty">
                    ไม่พบรายการตามตัวกรอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* รายละเอียดรถที่เลือก */}
      {selected && selectedStatus && (
        <section className="admin-card operation-details">
          <div className="card-heading">
            <h2>รายละเอียดรถ {selected.plate}</h2>
            <span>
              {selected.province} · {spotText(data, selected)}
            </span>
            <div className="heading-actions">
              <Link className="sp-button sp-button--secondary" href={`/kiosk?vehicle=${selected.id}`}>
                เปิดจุดทางออก
              </Link>
              <StatusBadge tone={selectedPayment ? "green" : "red"}>
                {selectedPayment ? "ชำระแล้ว" : "ยังไม่ชำระ"}
              </StatusBadge>
              <ParkingBadge status={selectedStatus} />
              {selectedStatus.code === "overdue" && canDo(data, "approve-exit") && (
                <button className="sp-button sp-button--primary" onClick={() => setApproving(selected)}>
                  อนุมัติออกเกินเวลา
                </button>
              )}
            </div>
          </div>

          {/* รูปขาเข้า–ขาออก พร้อมเวลา */}
          {canDo(data, "view-photos") && (
            <div className="operation-photos">
              <div>
                <div>
                  <strong>ภาพขาเข้า</strong>
                  <span>{dateTime(selected.entryAt)}</span>
                </div>
                <img src={selected.image} alt={`ภาพขาเข้า ${selected.plate}`} />
              </div>
              <div>
                <div>
                  <strong>ภาพขาออก</strong>
                  <span>{selected.exitAt ? dateTime(selected.exitAt) : "—"}</span>
                </div>
                {selected.exitAt ? (
                  <img src={selected.image} alt={`ภาพขาออก ${selected.plate}`} />
                ) : (
                  <div className="camera-empty">รถยังจอดอยู่ · ยังไม่มีภาพขาออก</div>
                )}
              </div>
            </div>
          )}

          <p className="section-description">
            ระยะเวลาจอด {parkingDuration(selected, now)} · ค่าจอด{" "}
            {money(vehicleTotal(selected, selectedPayment, now))}
            {selectedPayment && ` · ชำระเมื่อ ${dateTime(selectedPayment.paidAt)}`}
          </p>

          {selected.approvals.length > 0 && (
            <div className="approval-history">
              <h3>ประวัติอนุมัติออกเกินเวลา</h3>
              {selected.approvals.map((approval) => (
                <p key={approval.approvedAt}>
                  {dateTime(approval.approvedAt)} · {approval.staffName} · {approval.reason}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ป๊อปอัป: บันทึกรถเข้า */}
      <Modal open={entry !== null} title="บันทึกรถเข้า" onClose={closeModals}>
        {entry && (
          <form className="modal-form" onSubmit={handleSaveEntry} noValidate>
            <p className="form-hint">เวลาเข้าใช้เวลาเดโมปัจจุบัน และจับช่องจอดทันที</p>
            <label className="sp-field">
              ทะเบียนรถ
              <input
                value={entry.plate}
                maxLength={20}
                onChange={(e) => setEntry({ ...entry, plate: e.target.value })}
              />
            </label>
            <label className="sp-field">
              จังหวัด
              <input
                value={entry.province}
                onChange={(e) => setEntry({ ...entry, province: e.target.value })}
              />
            </label>
            <label className="sp-field">
              ประเภทรถ
              <select
                value={entry.type}
                onChange={(e) => setEntry({ ...entry, type: e.target.value as VehicleType })}
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="sp-field">
              ช่องจอด (เฉพาะช่องว่าง)
              <select value={entry.spotId} onChange={(e) => setEntry({ ...entry, spotId: e.target.value })}>
                {freeSpots.map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {floorName(data, spot.floor)} / {spot.name}
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="sp-button sp-button--secondary" onClick={closeModals}>
                ยกเลิก
              </button>
              <button type="submit" className="sp-button sp-button--primary">
                บันทึกรถเข้า
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ป๊อปอัป: แก้ไขรายการ */}
      <Modal open={editing !== null} title="แก้ไขข้อมูลรถ" onClose={closeModals}>
        {editing && (
          <form className="modal-form" onSubmit={handleSaveEdit} noValidate>
            <label className="sp-field">
              ทะเบียนรถ
              <input
                value={editing.plate}
                onChange={(e) => setEditing({ ...editing, plate: e.target.value })}
              />
            </label>
            <label className="sp-field">
              จังหวัด
              <input
                value={editing.province}
                onChange={(e) => setEditing({ ...editing, province: e.target.value })}
              />
            </label>
            <label className="sp-field">
              ประเภทรถ
              <select
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value as VehicleType })}
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="sp-button sp-button--secondary" onClick={closeModals}>
                ยกเลิก
              </button>
              <button type="submit" className="sp-button sp-button--primary">
                บันทึก
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ป๊อปอัป: อนุมัติออกเกินเวลา */}
      <Modal open={approving !== null} title="อนุมัติออกเกินเวลา" onClose={closeModals}>
        {approving && (
          <form className="modal-form" onSubmit={handleApprove} noValidate>
            <p>
              อนุมัติรถ {approving.plate} ให้ออกได้อีก {EXIT_MINUTES} นาที โดยไม่เก็บเงินเพิ่ม
            </p>
            <label className="sp-field">
              เหตุผล
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="sp-button sp-button--secondary" onClick={closeModals}>
                ยกเลิก
              </button>
              <button type="submit" className="sp-button sp-button--primary">
                ยืนยันอนุมัติ
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
