import { redirect } from "next/navigation";

// เปิดหน้าแรก → ไปหน้าค้นหาทะเบียน
export default function Home() {
  redirect("/user/search");
}
