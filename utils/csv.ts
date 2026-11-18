// ดาวน์โหลดไฟล์จากข้อมูลในหน้าเว็บ (ใช้กับรูป QR)
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // รอให้เบราว์เซอร์เริ่มดาวน์โหลดก่อน แล้วค่อยคืนหน่วยความจำ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
