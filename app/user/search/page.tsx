"use client";

import { useState } from "react";
import Link from "next/link";
import { CarFront, Info, Search } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import { APP_NAME } from "@/data/config";
import { time } from "@/utils/format";
import { normalizePlate } from "@/utils/parking";

const DEMO_PLATE = "กก 1234"; // ตัวอย่างใน placeholder (มี 2 คันต่างจังหวัด)

// หน้าค้นหาทะเบียน: กรอกทะเบียน → แสดงทุกคันที่ตรง → เลือกคันของตัวเอง
export default function Page() {
  const { data } = useGlobalData();
  const [plate, setPlate] = useState("");
  const [searched, setSearched] = useState(""); // ทะเบียนที่กดค้นหาแล้ว
  const [error, setError] = useState("");

  // รถที่ยังจอดอยู่และทะเบียนตรง (เทียบแบบไม่สนช่องว่าง)
  const results = data.vehicles.filter(
    (vehicle) => !vehicle.exitAt && normalizePlate(vehicle.plate) === searched,
  );

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = normalizePlate(plate);
    setSearched(query);

    if (query === "") {
      setError("กรุณากรอกทะเบียนรถ");
      return;
    }
    const found = data.vehicles.some((vehicle) => !vehicle.exitAt && normalizePlate(vehicle.plate) === query);
    setError(found ? "" : "ไม่พบข้อมูลเลขทะเบียน กรุณาลองใหม่ หรือติดต่อเจ้าหน้าที่");
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPlate(event.target.value);
    setSearched("");
    setError("");
  };

  return (
    <>
      <div className="user-search-band" />
      <header className="user-welcome">
        <div className="user-brand">
          <CarFront size={32} />
          <span>{APP_NAME}</span>
        </div>
        <h1>ยินดีต้อนรับ</h1>
        <p>ค้นหาทะเบียนรถของคุณ</p>
      </header>

      <main className="user-search-main">
        {/* ช่องค้นหา */}
        <div className={`sp-card user-search-card ${error ? "has-error" : ""}`}>
          <form onSubmit={handleSearch} noValidate>
            <div className="sp-field">
              <label htmlFor="plate" className="visually-hidden">
                ทะเบียนรถ
              </label>
              <div className="sp-input-wrap has-icon">
                <span className="sp-input-icon">
                  <CarFront size={26} />
                </span>
                <input
                  id="plate"
                  placeholder={`กรอกเลขทะเบียนรถ เช่น ${DEMO_PLATE}`}
                  value={plate}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>
            </div>
            <button type="submit" className="sp-button sp-button--primary full-width">
              <Search size={21} />
              ค้นหา
            </button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        </div>

        {/* ผลการค้นหา: การ์ดรูปรถทุกคันที่ทะเบียนตรง */}
        {results.length > 0 && (
          <section className="user-results">
            <div className="user-result-grid">
              {results.map((vehicle) => (
                <Link key={vehicle.id} href={`/user/vehicle/${vehicle.id}`} className="user-result-card">
                  <img src={vehicle.image} alt={`รถ ${vehicle.plate} ${vehicle.province}`} />
                  <strong>
                    {vehicle.plate} · {vehicle.province}
                  </strong>
                  <small>{time(vehicle.entryAt)} น.</small>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* วิธีใช้งาน (สถานะเริ่มต้น) */}
        <div className="sp-card user-instructions">
          <Info size={24} />
          <div>
            <h2>วิธีการใช้งาน</h2>
            <ol>
              <li>กรอกเลขทะเบียนรถ</li>
              <li>กดปุ่มค้นหาเพื่อดูรายละเอียด</li>
              <li>ชำระค่าจอดรถผ่าน QR Code</li>
            </ol>
          </div>
        </div>
      </main>

      <footer className="user-footer">
        <span>{APP_NAME}</span>
        <p>จอดง่าย · ชำระสะดวก · ปลอดภัย</p>
      </footer>
    </>
  );
}
