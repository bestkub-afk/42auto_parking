"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { REPORT_COLORS } from "@/utils/reports";
import { money } from "@/utils/format";

// กราฟในหน้า Reports (ใช้ข้อมูลจาก createReport)
type Series = { label: string; revenue: number; entries: number; exits: number }[];

// กราฟแท่งรายรับ
export function RevenueChart({ series }: { series: Series }) {
  return (
    <div className="report-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#ececf4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => [money(Number(value)), "รายรับ"]} />
          <Bar
            dataKey="revenue"
            name="รายรับ (บาท)"
            fill={REPORT_COLORS[0]}
            maxBarSize={52}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// กราฟแท่งรถเข้า–ออก
export function TrafficChart({ series }: { series: Series }) {
  return (
    <div className="report-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#ececf4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value, name) => [`${value} คัน`, name]} />
          <Legend verticalAlign="top" align="right" />
          <Bar
            dataKey="entries"
            name="รถเข้า"
            fill={REPORT_COLORS[0]}
            maxBarSize={26}
            isAnimationActive={false}
          />
          <Bar
            dataKey="exits"
            name="รถออก"
            fill={REPORT_COLORS[1]}
            maxBarSize={26}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// กราฟวงกลมสัดส่วน พร้อมตัวเลขรวมตรงกลาง
export function DonutChart({
  values,
  total,
  unit,
}: {
  values: { name: string; value: number }[];
  total: number;
  unit: string;
}) {
  const percent = (value: number) => (total ? Math.round((value / total) * 100) : 0);
  return (
    <>
      <div className="report-donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={values}
              dataKey="value"
              nameKey="name"
              innerRadius="66%"
              outerRadius="84%"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {values.map((item, index) => (
                <Cell key={item.name} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ${unit}`]} />
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="donut-total">
              {total.toLocaleString()}
            </text>
            <text x="50%" y="59%" textAnchor="middle" className="donut-unit">
              {unit}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="donut-legend">
        {values.map((item, index) => (
          <span key={item.name}>
            <i style={{ background: REPORT_COLORS[index % REPORT_COLORS.length] }} />
            {item.name} ({percent(item.value)}%)
          </span>
        ))}
      </div>
    </>
  );
}
