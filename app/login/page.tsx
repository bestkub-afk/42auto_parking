"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CarFront, Eye, EyeOff, UserRound } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import { APP_NAME, REMEMBER_KEY, SITE_NAME } from "@/data/config";
import { firstAllowedPath } from "@/data/permissions";
import { doLogin, getCurrentUser } from "@/utils/login";

// หน้าเข้าสู่ระบบผู้ดูแล (แบบ handleLogin ใน W09)
export default function Page() {
  const router = useRouter();
  const { data } = useGlobalData();
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => localStorage.getItem(REMEMBER_KEY) !== null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();

    // validate
    if (username.trim() === "" || password === "") {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    try {
      doLogin(data, username, password);
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }

    // จดจำเฉพาะชื่อผู้ใช้ (ไม่จำรหัสผ่าน)
    if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
    else localStorage.removeItem(REMEMBER_KEY);

    // กลับไปหน้าที่ตั้งใจเปิด หรือเมนูแรกที่มีสิทธิ์
    const user = getCurrentUser(data)!;
    const returnPath = localStorage.getItem("returnPath");
    localStorage.removeItem("returnPath");
    router.replace(returnPath ?? firstAllowedPath(user.role, data.adminPermissions));
  };

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <span className="brand-icon">
            <CarFront size={27} />
          </span>
          <strong>{APP_NAME}</strong>
          <span>Admin console</span>
          <div className="login-brand-copy">
            <h2>ระบบจัดการลานจอดรถ</h2>
            <p>ตรวจช่องจอด รถเข้า–ออก และรายรับ</p>
          </div>
        </div>

        <form className="admin-login-form" onSubmit={handleLogin} noValidate>
          <h1>เข้าสู่ระบบผู้ดูแล</h1>
          <p>ใช้บัญชีที่ได้รับจากผู้ดูแลระบบ</p>

          <div className="sp-field">
            <label htmlFor="user">ชื่อผู้ใช้งาน</label>
            <div className="sp-input-wrap has-icon">
              <span className="sp-input-icon">
                <UserRound size={16} />
              </span>
              <input
                id="user"
                placeholder="กรอกชื่อผู้ใช้"
                value={username}
                autoComplete="username"
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError("");
                }}
              />
            </div>
          </div>

          <div className="password-field">
            <div className="sp-field">
              <label htmlFor="pass">รหัสผ่าน</label>
              <div className="sp-input-wrap">
                <input
                  id="pass"
                  type={showPassword ? "text" : "password"}
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            จดจำชื่อผู้ใช้
          </label>
          <button type="submit" className="sp-button sp-button--primary full-width">
            เข้าสู่ระบบ
          </button>
          <small>ติดต่อผู้ดูแลระบบหากเข้าใช้งานไม่ได้</small>
          <details className="login-demo">
            <summary>บัญชีสำหรับทดลอง</summary>
            <p>
              admin / admin123 · Super Admin
              <br />
              kitti / demo123 · Admin
            </p>
          </details>
        </form>
      </div>
      <p className="admin-login-caption">
        {APP_NAME} / {SITE_NAME}
      </p>
      <Link className="admin-login-back" href="/user/search">
        กลับหน้าผู้ใช้
      </Link>
    </main>
  );
}
