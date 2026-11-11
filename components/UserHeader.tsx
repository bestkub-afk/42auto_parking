import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// แถบหัวสีม่วงของหน้ามือถือ (มี backTo = มีปุ่มย้อนกลับ)
export default function UserHeader({ title, backTo }: { title: string; backTo?: string }) {
  return (
    <header className="user-page-header">
      {backTo && (
        <Link href={backTo} className="user-back" aria-label="ย้อนกลับ">
          <ArrowLeft size={21} />
        </Link>
      )}
      <div>
        <h1>{title}</h1>
      </div>
    </header>
  );
}
