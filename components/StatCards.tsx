// แถวการ์ดตัวเลขสรุปด้านบนหน้า Admin
export default function StatCards({
  items,
  className = "",
}: {
  items: { label: string; value: string; note: string }[];
  className?: string;
}) {
  return (
    <div className={`admin-stats ${className}`}>
      {items.map((item, index) => (
        <div className={`admin-stat-card tone-${index}`} key={item.label}>
          <h2>{item.label}</h2>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </div>
      ))}
    </div>
  );
}
