// กรอบหน้ามือถือของผู้ใช้ (กว้างเท่าจอมือถือ ตรงกลางจอ)
export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="user-shell">
      <div className="user-app">{children}</div>
    </div>
  );
}
