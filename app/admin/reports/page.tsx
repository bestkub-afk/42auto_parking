"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import { createReport, reportDates } from "@/utils/reports";
import type { ReportPeriod } from "@/utils/reports";
import { dateTime, money } from "@/utils/format";
import { floorName } from "@/utils/parking";
import { canDo } from "@/utils/login";
import { downloadCsv } from "@/utils/csv";
import { DonutChart, RevenueChart, TrafficChart } from "@/components/ReportCharts";

type Tab = "Finance" | "Activity" | "Vehicle Types" | "Heat Map";
type Period = ReportPeriod | "custom";

const TABS: Tab[] = ["Finance", "Activity", "Vehicle Types", "Heat Map"];
const TAB_TITLES: Record<Tab, [string, string]> = {
  Finance: ["รายงานรายรับ", "ดูยอดรับชำระและรายการชำระเงินในช่วงที่เลือก"],
  Activity: ["รายงานรถเข้า–ออก", "เปรียบเทียบจำนวนรถเข้า–ออกและดูช่วงเวลาที่หนาแน่น"],
  "Vehicle Types": ["รายงานประเภทรถ", "ดูจำนวนและสัดส่วนของรถแต่ละประเภท"],
  "Heat Map": ["ความถี่การใช้ช่องจอด", "ดูว่าช่องจอดแต่ละช่องถูกใช้กี่ครั้งในช่วงที่เลือก"],
};
// สีของ Heat Map จากใช้น้อย (อ่อน) ไปใช้มาก (เข้ม)
const HEAT_COLORS = ["#f2eef9", "#e2d8f4", "#c6b5e8", "#a58bd6", "#775aba", "#493290"];
const FINANCE_ROWS_SHOWN = 10;

// ตารางในหน้า Reports
function ReportTable({
  heading,
  columns,
  rows,
  empty,
}: {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
  empty: string;
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
              <tr key={rowIndex}>
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
    </section>
  );
}

// หน้ารายงาน 4 แท็บ: ตัวกรองมีผลเมื่อกด "แสดงรายงาน" (กราฟ ตาราง CSV ใช้ชุดเดียวกัน)
export default function Page() {
  const { data, now } = useGlobalData();
  const can = (permission: "export-reports" | "parking-layout") => canDo(data, permission);
  const [tab, setTab] = useState<Tab>("Finance");
  const [period, setPeriod] = useState<Period>("month");
  const [dates, setDates] = useState(() => reportDates("month", now)); // ค่าที่กำลังเลือก
  const [appliedDates, setAppliedDates] = useState(dates); // ค่าที่กดแสดงรายงานแล้ว
  const [floor, setFloor] = useState(data.floors[0]?.id ?? 1);
  const [appliedFloor, setAppliedFloor] = useState(floor);
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [error, setError] = useState("");

  const report = createReport(data, appliedDates);

  // ---------- Finance ----------
  const financeColumns = ["วัน–เวลาชำระ", "รหัสอ้างอิง", "ทะเบียนรถ", "วิธีชำระ", "ยอดชำระ (บาท)", "สถานะ"];
  const financeRows = [...report.payments]
    .sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt))
    .map((payment) => [
      dateTime(payment.paidAt),
      payment.id,
      data.vehicles.find((vehicle) => vehicle.id === payment.vehicleId)?.plate ?? "—",
      payment.method,
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

  // ข้อมูลที่ส่งออกเป็น CSV ตามแท็บที่เปิดอยู่
  const csvRows = {
    Finance: [financeColumns, ...financeRows],
    Activity: [activityColumns, ...activityRows],
    "Vehicle Types": [vehicleColumns, ...vehicleRows],
    "Heat Map": [
      ["ชั้น", "ช่องจอด", "จำนวนครั้ง"],
      ...heatSpots.map((spot) => [spot.floor, spot.name, spot.count]),
    ],
  };

  function handleChangePeriod(next: Period) {
    setPeriod(next);
    setError("");
    if (next !== "custom") setDates(reportDates(next, now));
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
    setError("");
    setAppliedDates(dates);
    setAppliedFloor(floor);
    setSelectedSpotId("");
  }

  function handleExportCsv() {
    const tabName = tab.toLowerCase().replaceAll(" ", "-");
    downloadCsv(`auto-parking-${tabName}-${appliedDates.start}-${appliedDates.end}.csv`, csvRows[tab]);
  }

  return (
    <div className="reports-page">
      <header className="reports-heading">
        <div>
          <h1>{TAB_TITLES[tab][0]}</h1>
          <p>{TAB_TITLES[tab][1]}</p>
        </div>
        {can("export-reports") && (
          <button className="sp-button sp-button--secondary" onClick={handleExportCsv}>
            <Download size={16} /> ส่งออก CSV
          </button>
        )}
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
    </div>
  );
}
