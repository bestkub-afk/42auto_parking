import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>ไม่พบหน้าที่ต้องการ</h1>
      <p>ลิงก์นี้อาจไม่ถูกต้อง กรุณาเลือกหน้าที่ต้องการใช้งาน</p>
      <Link className="sp-button sp-button--primary" href="/user/search">
        หน้าผู้ใช้
      </Link>
      <Link className="sp-button sp-button--secondary" href="/login">
        หน้าผู้ดูแล
      </Link>
    </main>
  );
}
