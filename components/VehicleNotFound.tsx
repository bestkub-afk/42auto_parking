import Link from "next/link";
import { CarFront } from "lucide-react";
import UserHeader from "./UserHeader";

// แสดงเมื่อเปิดลิงก์รถที่ไม่มีในระบบ
export default function VehicleNotFound() {
  return (
    <>
      <UserHeader title="ไม่พบข้อมูลรถ" backTo="/user/search" />
      <main className="user-empty">
        <CarFront size={44} />
        <h2>ไม่พบรายการนี้</h2>
        <p>กรุณาค้นหาด้วยทะเบียนรถอีกครั้ง</p>
        <Link className="sp-button sp-button--primary" href="/user/search">
          กลับหน้าค้นหา
        </Link>
      </main>
    </>
  );
}
