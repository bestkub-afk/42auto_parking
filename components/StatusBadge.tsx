import type { ParkingStatus } from "@/utils/parking";

type Tone = "green" | "blue" | "red" | "gray";

// ป้ายสถานะสี ๆ เช่น "จอดอยู่" "ออกแล้ว"
export default function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`sp-badge sp-badge--${tone}`}>{children}</span>;
}

// ป้ายสถานะรถ: ออกแล้ว = น้ำเงิน / ออกได้ = เขียว / ออกไม่ได้ = แดง
export function ParkingBadge({ status }: { status: ParkingStatus }) {
  let tone: Tone = "red";
  if (status.code === "exited") tone = "blue";
  else if (status.canExit) tone = "green";
  return <StatusBadge tone={tone}>{status.label}</StatusBadge>;
}
