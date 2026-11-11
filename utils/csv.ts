// สร้างและดาวน์โหลดไฟล์ CSV (เปิดใน Excel ได้ ภาษาไทยไม่เพี้ยน)

export type CsvRow = (string | number)[];

function csvCell(value: string | number) {
  let cell = String(value);
  // กันสูตร Excel: ข้อความที่ขึ้นต้นด้วย = + - @ จะถูกใส่ ' นำหน้า
  if (typeof value === "string" && /^\s*[=+\-@]/.test(cell)) cell = "'" + cell;
  return '"' + cell.replaceAll('"', '""') + '"';
}

export function csvText(rows: CsvRow[]) {
  const lines = rows.map((row) => row.map(csvCell).join(","));
  // BOM ข้างหน้าบอก Excel ว่าไฟล์เป็น UTF-8 (ภาษาไทยจะไม่เพี้ยน)
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const blob = new Blob([csvText(rows)], { type: "text/csv;charset=utf-8" });
  downloadBlob(filename, blob);
}

// ดาวน์โหลดไฟล์จากข้อมูลในหน้าเว็บ (ใช้กับ CSV และรูป QR)
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // รอให้เบราว์เซอร์เริ่มดาวน์โหลดก่อน แล้วค่อยคืนหน่วยความจำ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
