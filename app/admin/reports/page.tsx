"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Vehicle } from "@/data/types";
import { EXIT_MINUTES } from "@/data/config";
import { useGlobalData } from "@/utils/context";
import { createReport, reportDates } from "@/utils/reports";
import type { ReportPeriod } from "@/utils/reports";
import { dateKey, dateTime, money } from "@/utils/format";
import { currentRate, findPayment, floorName, parkingDuration, parkingStatus, vehicleTotal } from "@/utils/parking";
import { canDo, getCurrentUser } from "@/utils/login";
import { DonutChart, RevenueChart, TrafficChart } from "@/components/ReportCharts";
import StatusBadge, { ParkingBadge } from "@/components/StatusBadge";
import Modal from "@/components/Modal";

type Tab = "Finance" | "Activity" | "Vehicle Types" | "Heat Map";
type Period = ReportPeriod | "custom";

const TABS: Tab[] = ["Finance", "Activity", "Vehicle Types", "Heat Map"];
const TAB_TITLES: Record<Tab, [string, string]> = {
  Finance: ["รายงานรายรับ", "ดูยอดรับชำระและรายการชำระเงินในช่วงที่เลือก"],
  Activity: ["รายงานรถเข้า–ออก", "เปรียบเทียบจำนวนรถเข้า–ออก ดูช่วงเวลาที่หนาแน่น และรายการรถทุกคัน"],
  "Vehicle Types": ["รายงานประเภทรถ", "ดูจำนวนและสัดส่วนของรถแต่ละประเภท"],
  "Heat Map": ["ความถี่การใช้ช่องจอด", "ดูว่าช่องจอดแต่ละช่องถูกใช้กี่ครั้งในช่วงที่เลือก"],
};
// สีของ Heat Map จากใช้น้อย (อ่อน) ไปใช้มาก (เข้ม)
const HEAT_COLORS = ["#f2eef9", "#e2d8f4", "#c6b5e8", "#a58bd6", "#775aba", "#493290"];
const FINANCE_ROWS_SHOWN = 10;
const VISITS_PER_PAGE = 10; // ตารางรถเข้า–ออก: หน้าละ 10 คัน

// ตารางในหน้า Reports
// onRowClick (ไม่บังคับ) = กดแถวได้ · selectedRow = แถวที่เลือกอยู่ · footer = ส่วนท้ายตาราง เช่น ตัวแบ่งหน้า
function ReportTable({
  heading,
  columns,
  rows,
  empty,
  onRowClick,
  selectedRow,
  footer,
}: {
  heading: string;
  columns: string[];
  rows: React.ReactNode[][];
  empty: string;
  onRowClick?: (rowIndex: number) => void;
  selectedRow?: number;
  footer?: React.ReactNode;
}) {
  return (
    <section className="reports-card">
      <h2>{heading}</h2>
      <div className="reports-table-scroll">
        <table className="reports-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={onRowClick ? (rowIndex === selectedRow ? "is-clickable is-selected" : "is-clickable") : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick && (() => onRowClick(rowIndex))}
                onKeyDown={
                  onRowClick &&
                  ((event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(rowIndex);
                    }
                  })
                }
              >
                {row.map((value, columnIndex) => (
                  <td key={columnIndex}>{value}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}

// หน้ารายงาน 4 แท็บ: ตัวกรองมีผลเมื่อกด "แสดงรายงาน" (กราฟ ตาราง ใช้ชุดเดียวกัน)
export default function Page() {
  const { data, setData, now } = useGlobalData();
  const can = (permission: "parking-layout" | "approve-exit") => canDo(data, permission);
  // มาจาก Kiosk / Parking Layout (?vehicle=) → เปิดแท็บ Activity ตั้งแต่วันที่รถคันนั้นเข้า
  const params = useSearchParams();
  const linked = data.vehicles.find((vehicle) => vehicle.id === params.get("vehicle"));
  const [tab, setTab] = useState<Tab>(linked || params.get("tab") === "Activity" ? "Activity" : "Finance");
  const [period, setPeriod] = useState<Period>(linked ? "custom" : "month");
  const [dates, setDates] = useState(() => ({
    ...(linked ? { start: dateKey(linked.entryAt), end: dateKey(now) } : reportDates("month", now)),
    startTime: "00:00",
    endTime: "23:59",
  })); // ค่าที่กำลังเลือก
  const [appliedDates, setAppliedDates] = useState(dates); // ค่าที่กดแสดงรายงานแล้ว
  const [floor, setFloor] = useState(data.floors[0]?.id ?? 1);
  const [appliedFloor, setAppliedFloor] = useState(floor);
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [error, setError] = useState("");
  const [approving, setApproving] = useState<Vehicle | null>(null); // รถที่กำลังอนุมัติออก
  const [reason, setReason] = useState("");
  const [approveError, setApproveError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState(linked?.id ?? ""); // รถที่เปิดดูรายละเอียด
  const [visitPage, setVisitPage] = useState(0); // หน้าของตารางรถเข้า–ออก (เริ่มที่ 0)

  const report = createReport(data, appliedDates);

  // ---------- Finance ----------
  const financeColumns = ["วัน–เวลาชำระ", "รหัสอ้างอิง", "ทะเบียนรถ", "ยอดชำระ (บาท)", "สถานะ"];
  const financeRows = [...report.payments]
    .sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt))
    .map((payment) => [
      dateTime(payment.paidAt),
      payment.id,
      data.vehicles.find((vehicle) => vehicle.id === payment.vehicleId)?.plate ?? "—",
      payment.amount,
      "สำเร็จ",
    ]);
  const averagePayment = report.payments.length
    ? Math.round((report.total / report.payments.length) * 100) / 100
    : 0;

  // ---------- Activity: ช่วงที่มีรถเข้า–ออก เรียงจากหนาแน่นสุด ----------
  const activityColumns = ["ช่วงเวลา", "รถเข้า", "รถออก", "รวมเหตุการณ์"];
  const busyPeriods = report.series
    .filter((point) => point.entries + point.exits > 0)
    .sort((a, b) => b.entries + b.exits - (a.entries + a.exits));
  const activityRows = busyPeriods.map((point) => [
    point.label,
    point.entries,
    point.exits,
    point.entries + point.exits,
  ]);

  // ---------- Activity: รายการรถเข้า–ออกทีละคัน หน้าละ 10 คัน กดแถวเพื่อดูรายละเอียดรถ ----------
  const rate = currentRate(data); // อัตราค่าจอดที่ตั้งไว้ในหน้า Pricing
  const visitColumns = ["ทะเบียนรถ", "เวลาเข้า", "เวลาออก", "ระยะเวลา", "ค่าจอด", "สถานะ"];
  const pageCount = Math.max(1, Math.ceil(report.visits.length / VISITS_PER_PAGE));
  const page = Math.min(visitPage, pageCount - 1); // ช่วงวันที่เปลี่ยนจนหน้าน้อยลง → ไม่ให้เกินหน้าสุดท้าย
  const firstVisit = page * VISITS_PER_PAGE;
  const pageVisits = report.visits.slice(firstVisit, firstVisit + VISITS_PER_PAGE);
  const visitRows = pageVisits.map((vehicle) => {
    const payment = findPayment(data, vehicle.id);
    return [
      `${vehicle.plate} ${vehicle.province}`,
      dateTime(vehicle.entryAt),
      vehicle.exitAt ? dateTime(vehicle.exitAt) : "—",
      parkingDuration(vehicle, now),
      money(vehicleTotal(vehicle, payment, now, rate)),
      <ParkingBadge key="status" status={parkingStatus(vehicle, payment, now)} />,
    ];
  });
  const selectedVisitRow = pageVisits.findIndex((vehicle) => vehicle.id === selectedVehicleId);

  // รายละเอียดรถที่เลือก (ภาพเข้า–ออก ค่าจอด การชำระ ประวัติอนุมัติ)
  const selected = data.vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  const selectedPayment = findPayment(data, selected?.id);
  const selectedStatus = selected ? parkingStatus(selected, selectedPayment, now) : null;

  // ---------- Vehicle Types ----------
  const vehicleColumns = ["ประเภทรถ", "จำนวน (คัน)", "สัดส่วน"];
  const vehicleRows = report.types.map((item) => {
    const share = report.vehicleCount ? ((item.value / report.vehicleCount) * 100).toFixed(1) : "0.0";
    return [item.name, item.value, share + "%"];
  });
  const topType = [...report.types].sort((a, b) => b.value - a.value)[0];

  // ---------- Heat Map: จำนวนครั้งที่ใช้แต่ละช่องในชั้นที่เลือก ----------
  const heatSpots = data.spots
    .filter((spot) => spot.floor === appliedFloor)
    .map((spot) => ({ ...spot, count: report.spotUsage[spot.id] ?? 0 }));
  const mostUsed = [...heatSpots].sort((a, b) => b.count - a.count)[0];
  const leastUsed = [...heatSpots].sort((a, b) => a.count - b.count)[0];
  const selectedSpot = heatSpots.find((spot) => spot.id === selectedSpotId) ?? mostUsed;
  const totalUsage = heatSpots.reduce((sum, spot) => sum + spot.count, 0);
  const spotLabel = (spot?: { name: string; count: number }) =>
    spot ? `${spot.name} · ${spot.count} ครั้ง` : "—";

  // เลือกระดับสีจากจำนวนครั้งเทียบกับช่องที่ใช้มากที่สุด
  function heatLevel(count: number) {
    if (!mostUsed?.count) return 0;
    return Math.ceil((count / mostUsed.count) * (HEAT_COLORS.length - 1));
  }

  // การ์ดสรุปด้านบนของแต่ละแท็บ
  const summary: Record<Tab, [string, string][]> = {
    Finance: [
      ["รายรับรวม", money(report.total)],
      ["ชำระสำเร็จ", `${report.payments.length} รายการ`],
      ["ยอดเฉลี่ยต่อรายการ", money(averagePayment)],
    ],
    Activity: [
      ["รถเข้าทั้งหมด", `${report.vehicleCount} คัน`],
      ["รถออกทั้งหมด", `${report.exitCount} คัน`],
      ["ช่วงที่หนาแน่นที่สุด", busyPeriods[0]?.label ?? "—"],
    ],
    "Vehicle Types": [
      ["รถเข้าทั้งหมด", `${report.vehicleCount} คัน`],
      ["ประเภทที่พบมากที่สุด", report.vehicleCount ? topType.name : "—"],
      ["ประเภทที่พบ", `${report.types.filter((item) => item.value > 0).length} ประเภท`],
    ],
    "Heat Map": [
      ["การใช้งานรวม", `${totalUsage} ครั้ง`],
      ["ช่องที่ใช้มากที่สุด", mostUsed?.count ? spotLabel(mostUsed) : "—"],
      ["ช่องที่ใช้น้อยที่สุด", mostUsed?.count ? spotLabel(leastUsed) : "—"],
    ],
  };

  function handleChangePeriod(next: Period) {
    setPeriod(next);
    setError("");
    if (next !== "custom") setDates({ ...dates, ...reportDates(next, now) });
  }

  function handleChangeDate(key: "start" | "end", value: string) {
    setPeriod("custom");
    setDates({ ...dates, [key]: value });
  }

  function handleShowReport(event: React.FormEvent) {
    event.preventDefault();
    if (!dates.start || !dates.end || dates.start > dates.end) {
      setError("กรุณาเลือกวันที่เริ่มและวันที่สิ้นสุดให้ถูกต้อง");
      return;
    }
    if (!dates.startTime || !dates.endTime || dates.startTime > dates.endTime) {
      setError("กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุดให้ถูกต้อง");
      return;
    }
    setError("");
    setAppliedDates(dates);
    setAppliedFloor(floor);
    setSelectedSpotId("");
    setVisitPage(0);
  }

  function showDetail(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    // เลื่อนลงไปที่กล่องรายละเอียด
    setTimeout(() => document.getElementById("vehicle-detail")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function openApprove(vehicle: Vehicle) {
    setApproving(vehicle);
    setReason("");
    setApproveError("");
  }

  // อนุมัติรถที่จ่ายแล้วแต่เกินเวลาออก → ออกได้อีก 15 นาทีโดยไม่เก็บเงินเพิ่ม
  function handleApprove(event: React.FormEvent) {
    event.preventDefault();
    if (!approving) return;
    if (reason.trim().length < 5) return setApproveError("กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร");
    const approval = { staffName: getCurrentUser(data)!.name, approvedAt: now, reason: reason.trim() };
    setData({
      ...data,
      vehicles: data.vehicles.map((vehicle) =>
        vehicle.id === approving.id ? { ...vehicle, approvals: [...vehicle.approvals, approval] } : vehicle,
      ),
    });
    setNotice(`อนุมัติรถ ${approving.plate} ให้ออกได้อีก ${EXIT_MINUTES} นาที โดยไม่เก็บเงินเพิ่ม`);
    setApproving(null);
  }

  return (
    <div className="reports-page">
      <header className="reports-heading">
        <div>
          <h1>{TAB_TITLES[tab][0]}</h1>
          <p>{TAB_TITLES[tab][1]}</p>
        </div>
      </header>

      <div className="reports-tabs" role="group" aria-label="ประเภทรายงาน">
        {TABS.map((item) => (
          <button type="button" key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      <form className="reports-filters" onSubmit={handleShowReport}>
        <label>
          ช่วงเวลารายงาน
          <select value={period} onChange={(event) => handleChangePeriod(event.target.value as Period)}>
            <option value="day">รายวัน</option>
            <option value="month">รายเดือน</option>
            <option value="year">รายปี</option>
            <option value="custom">กำหนดเอง</option>
          </select>
        </label>
        <label>
          วันที่เริ่ม
          <input
            type="date"
            value={dates.start}
            onChange={(event) => handleChangeDate("start", event.target.value)}
          />
        </label>
        <label>
          วันที่สิ้นสุด
          <input
            type="date"
            value={dates.end}
            onChange={(event) => handleChangeDate("end", event.target.value)}
          />
        </label>
        <label>
          เวลาเริ่ม
          <input
            type="time"
            value={dates.startTime}
            onChange={(event) => setDates({ ...dates, startTime: event.target.value })}
          />
        </label>
        <label>
          เวลาสิ้นสุด
          <input
            type="time"
            value={dates.endTime}
            onChange={(event) => setDates({ ...dates, endTime: event.target.value })}
          />
        </label>
        {tab === "Heat Map" && (
          <label>
            ชั้นจอด
            <select value={floor} onChange={(event) => setFloor(Number(event.target.value))}>
              {data.floors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="sp-button sp-button--primary">
          แสดงรายงาน
        </button>
        {error && (
          <p role="alert" className="reports-error">
            {error}
          </p>
        )}
      </form>

      <div className="reports-summary">
        {summary[tab].map(([label, value]) => (
          <div className="reports-card reports-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      {tab === "Finance" && (
        <>
          <section className="reports-card">
            <h2>รายรับตามช่วงเวลา</h2>
            <RevenueChart series={report.series} />
          </section>
          <ReportTable
            heading="รายการรับชำระล่าสุด"
            columns={financeColumns}
            rows={financeRows.slice(0, FINANCE_ROWS_SHOWN)}
            empty="ยังไม่มีรายรับในช่วงเวลานี้"
          />
        </>
      )}

      {tab === "Activity" && (
        <>
          <section className="reports-card">
            <h2>สถิติรถเข้า–ออกตามช่วงเวลา</h2>
            <TrafficChart series={report.series} />
          </section>
          <ReportTable
            heading="รายละเอียดช่วงหนาแน่น"
            columns={activityColumns}
            rows={activityRows}
            empty="ยังไม่มีรถเข้า–ออกในช่วงเวลานี้"
          />
          {notice && (
            <p className="reports-notice" role="status">
              {notice}
            </p>
          )}
          <ReportTable
            heading={`รายการรถเข้า–ออก (${report.visits.length} คัน)`}
            columns={visitColumns}
            rows={visitRows}
            empty="ยังไม่มีรถเข้า–ออกในช่วงเวลานี้"
            onRowClick={(rowIndex) => showDetail(pageVisits[rowIndex].id)}
            selectedRow={selectedVisitRow}
            footer={
              report.visits.length > VISITS_PER_PAGE && (
                <div className="reports-pagination">
                  <span>
                    แสดง {firstVisit + 1}–{firstVisit + pageVisits.length} จาก {report.visits.length} รายการ
                  </span>
                  <button type="button" aria-label="หน้าก่อน" disabled={page === 0} onClick={() => setVisitPage(page - 1)}>
                    ‹
                  </button>
                  <span>
                    หน้า {page + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    aria-label="หน้าถัดไป"
                    disabled={page === pageCount - 1}
                    onClick={() => setVisitPage(page + 1)}
                  >
                    ›
                  </button>
                </div>
              )
            }
          />

          {selected && selectedStatus && (
            <section className="reports-card operation-details" id="vehicle-detail">
              <div className="card-heading">
                <h2>
                  รายละเอียดรถ {selected.plate} {selected.province}
                </h2>
                <div className="heading-actions">
                  <StatusBadge tone={selectedPayment ? "green" : "red"}>
                    {selectedPayment ? "ชำระแล้ว" : "ยังไม่ชำระ"}
                  </StatusBadge>
                  <ParkingBadge status={selectedStatus} />
                  {selectedStatus.code === "overdue" && can("approve-exit") && (
                    <button type="button" className="sp-button sp-button--primary" onClick={() => openApprove(selected)}>
                      อนุมัติออกเกินเวลา
                    </button>
                  )}
                </div>
              </div>

              {/* รูปขาเข้า–ขาออก พร้อมเวลา */}
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

              <p className="section-description">
                ระยะเวลาจอด {parkingDuration(selected, now)} · ค่าจอด{" "}
                {money(vehicleTotal(selected, selectedPayment, now, rate))}
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
        </>
      )}

      {tab === "Vehicle Types" && (
        <div className="reports-split reports-split--vehicles">
          <section className="reports-card">
            <h2>สัดส่วนประเภทรถ</h2>
            <DonutChart values={report.types} total={report.vehicleCount} unit="คัน" />
          </section>
          <ReportTable
            heading="จำนวนและสัดส่วน"
            columns={vehicleColumns}
            rows={vehicleRows}
            empty="ยังไม่มีข้อมูลประเภทรถ"
          />
        </div>
      )}

      {tab === "Heat Map" && (
        <div className="reports-split">
          <section className="reports-card" aria-labelledby="heat-map-heading">
            <h2 id="heat-map-heading">Heat Map · {floorName(data, appliedFloor)}</h2>
            <div className="reports-heat-grid">
              {heatSpots.map((spot) => {
                const level = heatLevel(spot.count);
                return (
                  <button
                    key={spot.id}
                    type="button"
                    aria-label={`${spot.name} ${spot.count} ครั้ง`}
                    aria-pressed={spot.id === selectedSpot?.id}
                    style={{
                      backgroundColor: HEAT_COLORS[level],
                      color: level >= 4 ? "#fff" : undefined,
                    }}
                    onClick={() => setSelectedSpotId(spot.id)}
                  >
                    <strong>{spot.name}</strong>
                    <span>{spot.count} ครั้ง</span>
                  </button>
                );
              })}
            </div>
            <div className="reports-heat-legend">
              น้อย{" "}
              {HEAT_COLORS.map((color) => (
                <i key={color} style={{ backgroundColor: color }} />
              ))}{" "}
              มาก
            </div>
            {totalUsage === 0 && <p className="section-description">ไม่มีประวัติการใช้ช่องจอดในช่วงนี้</p>}
          </section>

          <section className="reports-card reports-spot" aria-labelledby="report-spot-heading">
            <h2 id="report-spot-heading">รายละเอียดช่องจอด</h2>
            {selectedSpot ? (
              <>
                <div>
                  <strong className="reports-spot-code">{selectedSpot.name}</strong>{" "}
                  {floorName(data, selectedSpot.floor)}
                </div>
                <p>จำนวนครั้งที่ใช้งาน</p>
                <strong className="reports-spot-count">{selectedSpot.count} ครั้ง</strong>
                {can("parking-layout") && (
                  <Link href={`/admin/parking-layout?spot=${selectedSpot.id}`}>ดูตำแหน่งในผัง →</Link>
                )}
              </>
            ) : (
              <p>ยังไม่มีช่องจอดในชั้นนี้</p>
            )}
          </section>
        </div>
      )}

      {/* ป๊อปอัป: อนุมัติรถที่จ่ายแล้วแต่เกินเวลาออก */}
      <Modal open={approving !== null} title="อนุมัติออกเกินเวลา" onClose={() => setApproving(null)}>
        {approving && (
          <form className="modal-form" onSubmit={handleApprove} noValidate>
            <p>
              อนุมัติรถ {approving.plate} ให้ออกได้อีก {EXIT_MINUTES} นาที โดยไม่เก็บเงินเพิ่ม
            </p>
            <label className="sp-field">
              เหตุผล
              <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            {approveError && (
              <p className="form-error" role="alert">
                {approveError}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="sp-button sp-button--secondary" onClick={() => setApproving(null)}>
                ยกเลิก
              </button>
              <button type="submit" className="sp-button sp-button--primary">
                ยืนยันอนุมัติ
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
