// หัวข้อหน้า Admin พร้อมคำอธิบาย และปุ่มด้านขวา (children)
export default function AdminHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
