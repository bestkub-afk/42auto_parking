"use client";

import { useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGlobalData } from "@/utils/context";
import { BUILDING } from "@/data/config";
import { dateKey, money, time } from "@/utils/format";
import { countSpots, findSpot } from "@/utils/parking";
import { createReport, REPORT_COLORS } from "@/utils/reports";
import { canDo } from "@/utils/login";
import AdminHeader from "@/components/AdminHeader";
import StatCards from "@/components/StatCards";
import StatusBadge from "@/components/StatusBadge";

// หน้าภาพรวม: การ์ดสถิติ + กราฟแท่งรถเข้า–ออก + ช่องว่างแต่ละชั้น + รถล่าสุด
export default function Page() {
  const { data, now } = useGlobalData();
  const [date, setDate] = useState(dateKey(now)); // วันที่ของรายรับและกราฟ
  const [floor, setFloor] = useState("all");

  // กรองรถและการจ่ายเงินตามชั้นที่เลือก
  const inFloor = (floorId: number | undefined) => floor === "all" || floorId === Number(floor);
  const vehicles = data.vehicles.filter((vehicle) => inFloor(findSpot(data, vehicle.spotId)?.floor));
  const payments = data.payments.filter((payment) =>
    vehicles.some((vehicle) => vehicle.id === payment.vehicleId),
  );
  const report = createReport({ ...data, vehicles, payments }, { start: date, end: date });

  // สถานะช่อง = ข้อมูลตอนนี้ (ไม่ขึ้นกับวันที่ที่เลือก)
  const spots = countSpots(data, floor === "all" ? undefined : Number(floor));

  const stats = [
    { label: "ช่องจอดทั้งหมด", value: `${spots.total} ช่อง`, note: `${data.floors.length} ชั้นใน${BUILDING}` },
    { label: "ช่องพร้อมใช้", value: `${spots.available} ช่อง`, note: "ว่างขณะนี้" },
    {
      label: "ช่องไม่ว่าง",
      value: `${spots.total - spots.available} ช่อง`,
      note: `รถจอด ${spots.occupied} · กันช่อง ${spots.blocked} · ปิด ${spots.closed}`,
    },
    {
      label: "รายรับ",
      value: money(report.total),
      note: `รถเข้า ${report.vehicleCount} · ออก ${report.exitCount} คัน`,
    },
  ];

  // รถที่เข้าหรือออกในวันที่เลือก ล่าสุด 5 คัน
  const recent = vehicles
    .filter(
      (vehicle) => dateKey(vehicle.entryAt) === date || (vehicle.exitAt && dateKey(vehicle.exitAt) === date),
    )
    .sort((a, b) => Date.parse(b.exitAt ?? b.entryAt) - Date.parse(a.exitAt ?? a.entryAt))
    .slice(0, 5);

  return (
    <>
      <AdminHeader title="ภาพรวมระบบ" description="ติดตามช่องจอด รถเข้า–ออก และรายรับของลานจอด">
        <div className="heading-filters">
          <input
            aria-label="วันที่"
            type="date"
            value={date}
            onChange={(event) => event.target.value && setDate(event.target.value)}
          />
          <select aria-label="ชั้น" value={floor} onChange={(event) => setFloor(event.target.value)}>
            <option value="all">ทุกชั้น</option>
            {data.floors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </AdminHeader>
      <p className="section-description">สถานะช่องจอดเป็นข้อมูลปัจจุบัน · วันที่ที่เลือกใช้กับรายรับและกราฟ</p>

      <StatCards items={stats} />

      <div className="dashboard-panels">
        <section className="admin-card dashboard-activity">
          <div className="card-heading">
            <h2>สถิติรถเข้า–ออก</h2>
            <div className="chart-legend">
              <span>
                <i />
                รถเข้า
              </span>
              <span>
                <i />
                รถออก
              </span>
            </div>
          </div>
          {/* กราฟแท่ง: รถเข้า (ม่วง) รถออก (เขียว) ทุก 2 ชั่วโมง */}
          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.series} margin={{ top: 14, left: -22, right: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e6e8f2" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value, name) => [`${value} คัน`, name]} />
                <Bar
                  dataKey="entries"
                  name="รถเข้า"
                  fill={REPORT_COLORS[0]}
                  maxBarSize={18}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="exits"
                  name="รถออก"
                  fill={REPORT_COLORS[1]}
                  maxBarSize={18}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="admin-card floor-availability">
          <h2>ช่องจอดตามชั้น</h2>
          <p className="section-description">จำนวนช่องว่างเทียบกับทั้งหมด</p>
          {data.floors
            .filter((item) => inFloor(item.id))
            .map((item) => {
              const count = countSpots(data, item.id);
              return (
                <div className="floor-bar" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.active ? `${count.available} / ${count.total} ช่องว่าง` : "ปิดใช้งาน"}</span>
                  </div>
                  <progress max={count.total || 1} value={count.available} />
                </div>
              );
            })}
        </section>
      </div>

      <section className="admin-card latest-vehicles">
        <div className="card-heading">
          <h2>รายการรถล่าสุด</h2>
          {canDo(data, "operations") && <Link href="/admin/operations">ดูรายการทั้งหมด →</Link>}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ทะเบียนรถ</th>
                <th>ช่องจอด</th>
                <th>ประเภท</th>
                <th>เวลาเข้า</th>
                <th>เวลาออก</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <strong>{vehicle.plate}</strong>
                  </td>
                  <td>{findSpot(data, vehicle.spotId)?.name}</td>
                  <td>{vehicle.type}</td>
                  <td>{time(vehicle.entryAt)}</td>
                  <td>{vehicle.exitAt ? time(vehicle.exitAt) : "—"}</td>
                  <td>
                    <StatusBadge tone={vehicle.exitAt ? "blue" : "green"}>
                      {vehicle.exitAt ? "ออกแล้ว" : "จอดอยู่"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-empty">
                    ไม่มีข้อมูลรถในวันที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
