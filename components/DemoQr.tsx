// QR สาธิต วาดลายเอง ไม่มีข้อมูลจ่ายเงินจริง
export function DemoQr({ small = false, id }: { small?: boolean; id?: string }) {
  const cells = [];
  const finder = (x: number, y: number, left: number, top: number) => {
    const dx = x - left;
    const dy = y - top;
    if (dx < 0 || dx > 7 || dy < 0 || dy > 7) return null;
    return (
      dx < 7 &&
      dy < 7 &&
      (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4))
    );
  };
  for (let y = 0; y < 29; y++) {
    for (let x = 0; x < 29; x++) {
      const marker = finder(x, y, 0, 0) ?? finder(x, y, 22, 0) ?? finder(x, y, 0, 22);
      if (marker ?? (x * y + x * 17 + y * 13) % 7 < 3)
        cells.push(<rect key={`${x}-${y}`} x={x + 2} y={y + 2} width="1" height="1" />);
    }
  }
  return (
    <svg
      id={id}
      width="330"
      height="330"
      xmlns="http://www.w3.org/2000/svg"
      className={small ? "demo-qr demo-qr--small" : "demo-qr"}
      viewBox="0 0 33 33"
      role="img"
      aria-label="QR จำลองสำหรับสาธิต ไม่สามารถชำระเงินจริง"
    >
      <rect width="33" height="33" fill="white" />
      <g fill="#141414">{cells}</g>
      <rect x="9" y="13" width="15" height="7" fill="white" />
      <text x="16.5" y="17.8" textAnchor="middle" fill="#49369D" fontSize="3.7" fontWeight="700">
        DEMO
      </text>
    </svg>
  );
}
