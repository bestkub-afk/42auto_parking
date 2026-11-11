"use client";

import { useState } from "react";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useGlobalData } from "@/utils/context";
import type { Menu, Permission, Role, User } from "@/data/types";
import { MENUS, ROLES, SUPER_ADMIN_ONLY } from "@/data/permissions";
import { canDo, getCurrentUser } from "@/utils/login";
import AdminHeader from "@/components/AdminHeader";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";

const emptyUser = (): User => ({
  id: "u" + Date.now(),
  name: "",
  username: "",
  password: "",
  role: "Admin",
  active: true,
});

// หน้า Admin Perm: แท็บบัญชีผู้ดูแล + แท็บตั้งสิทธิ์ของ Admin
export default function Page() {
  const { data, setData } = useGlobalData();
  const me = getCurrentUser(data)!;
  const [tab, setTab] = useState<"accounts" | "roles">("accounts");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<User | null>(null); // ฟอร์มเพิ่ม/แก้ไขบัญชี
  const [deleting, setDeleting] = useState<User | null>(null);
  const [draft, setDraft] = useState<Permission[]>([...data.adminPermissions]); // สิทธิ์ Admin ที่กำลังแก้
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSuperAdmin = me.role === "Super Admin";
  const rows = data.users.filter((user) =>
    (user.name + user.username).toLowerCase().includes(search.toLowerCase()),
  );

  // ต้องเหลือ Super Admin ที่เปิดใช้งานอย่างน้อย 1 คน
  const hasSuperAdmin = (users: User[]) => users.some((user) => user.role === "Super Admin" && user.active);

  // Admin แตะบัญชี Super Admin ไม่ได้
  const canEdit = (user: User) => canDo(data, "edit-users") && (isSuperAdmin || user.role !== "Super Admin");

  const saveUsers = (users: User[], message: string) => {
    if (!hasSuperAdmin(users)) {
      setError("ต้องมี Super Admin ที่เปิดใช้งานอย่างน้อย 1 คน");
      return false;
    }
    setData({ ...data, users });
    setError("");
    setNotice(message);
    return true;
  };

  // ---------- บัญชี ----------
  const handleSaveUser = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const username = form.username.trim().toLowerCase();

    // validate
    if (form.name.trim() === "" || username.length < 3) return setError("กรุณากรอกชื่อ และชื่อผู้ใช้อย่างน้อย 3 ตัว");
    if (form.password.length < 6) return setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    if (data.users.some((user) => user.id !== form.id && user.username === username)) {
      return setError("ชื่อผู้ใช้นี้มีอยู่แล้ว");
    }

    const saved = { ...form, name: form.name.trim(), username };
    const exists = data.users.some((user) => user.id === saved.id);
    const users = exists
      ? data.users.map((user) => (user.id === saved.id ? saved : user))
      : [...data.users, saved];
    if (saveUsers(users, "บันทึกบัญชีเรียบร้อยแล้ว")) setForm(null);
  };

  const handleToggle = (target: User) => {
    const users = data.users.map((user) =>
      user.id === target.id ? { ...user, active: !user.active } : user,
    );
    saveUsers(users, `อัปเดตสถานะของ ${target.name} แล้ว`);
  };

  const handleDelete = () => {
    if (!deleting) return;
    if (
      saveUsers(
        data.users.filter((user) => user.id !== deleting.id),
        "ลบบัญชีเรียบร้อยแล้ว",
      )
    )
      setDeleting(null);
  };

  // ---------- สิทธิ์ของ Admin ----------
  // ปิดเมนู → ปิดสิทธิ์ย่อยในเมนูนั้นด้วย
  const toggleMenu = (menu: Menu) => {
    if (draft.includes(menu)) {
      const children = MENUS.find((item) => item.menu === menu)!.actions.map((action) => action.key);
      setDraft(draft.filter((permission) => permission !== menu && !children.includes(permission)));
    } else {
      setDraft([...draft, menu]);
    }
    setNotice("");
  };

  const toggleAction = (permission: Permission) => {
    setDraft(
      draft.includes(permission) ? draft.filter((item) => item !== permission) : [...draft, permission],
    );
    setNotice("");
  };

  const handleSavePermissions = () => {
    setData({ ...data, adminPermissions: draft });
    setNotice("บันทึกสิทธิ์ของ Admin แล้ว");
  };

  return (
    <>
      <AdminHeader title="จัดการสิทธิ์ผู้ใช้งาน" description="จัดการบัญชีผู้ดูแล และกำหนดเมนูที่ Admin ใช้ได้">
        {tab === "accounts" && canDo(data, "edit-users") && (
          <button
            className="sp-button sp-button--primary"
            onClick={() => {
              setForm(emptyUser());
              setError("");
            }}
          >
            + เพิ่มผู้ใช้
          </button>
        )}
      </AdminHeader>

      <div className="admin-tabs permission-tabs">
        <button aria-pressed={tab === "accounts"} onClick={() => setTab("accounts")}>
          บัญชีผู้ดูแล
        </button>
        {canDo(data, "edit-roles") && (
          <button aria-pressed={tab === "roles"} onClick={() => setTab("roles")}>
            ตั้งค่าสิทธิ์ตามบทบาท
          </button>
        )}
      </div>
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}
      {error && !form && !deleting && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {tab === "accounts" && (
        <section className="admin-card">
          <div className="card-heading">
            <h2>บัญชีผู้ดูแล</h2>
            <input
              className="table-search"
              placeholder="ค้นหาชื่อหรือชื่อผู้ใช้"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table permissions-table">
              <thead>
                <tr>
                  <th>ชื่อผู้ดูแล</th>
                  <th>ชื่อผู้ใช้</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                    </td>
                    <td>{user.username}</td>
                    <td>{user.role}</td>
                    <td>
                      <div className="account-status">
                        <StatusBadge tone={user.active ? "green" : "gray"}>
                          {user.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </StatusBadge>
                        {canEdit(user) && (
                          <button
                            role="switch"
                            aria-checked={user.active}
                            aria-label={`เปิดปิดบัญชี ${user.name}`}
                            className={`permission-toggle ${user.active ? "is-on" : ""}`}
                            onClick={() => handleToggle(user)}
                          >
                            <span />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {canEdit(user) && (
                        <div className="table-actions">
                          <button
                            className="sp-button sp-button--ghost icon-button"
                            aria-label={`แก้ไข ${user.name}`}
                            onClick={() => {
                              setForm({ ...user });
                              setError("");
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="sp-button sp-button--ghost icon-button"
                            aria-label={`ลบ ${user.name}`}
                            onClick={() => {
                              setDeleting(user);
                              setError("");
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "roles" && (
        <section className="admin-card role-editor">
          <h2>สิทธิ์ตามบทบาท</h2>
          <p className="purple-note">Super Admin มีสิทธิ์ครบทุกเมนู · ด้านล่างคือสิทธิ์ของ Admin (ปิดเมนูแล้วสิทธิ์ย่อยปิดตาม)</p>
          <div className="admin-table-wrap">
            <table className="admin-table role-table">
              <thead>
                <tr>
                  <th>เมนู</th>
                  <th>เห็นเมนู</th>
                  <th>การทำงานที่อนุญาต</th>
                </tr>
              </thead>
              <tbody>
                {MENUS.map((item) => (
                  <tr key={item.menu}>
                    <td>
                      <strong>{item.label}</strong>
                    </td>
                    <td>
                      <button
                        role="switch"
                        aria-checked={draft.includes(item.menu)}
                        aria-label={`เปิดเมนู ${item.label}`}
                        className={`permission-toggle ${draft.includes(item.menu) ? "is-on" : ""}`}
                        onClick={() => toggleMenu(item.menu)}
                      >
                        <span />
                      </button>
                    </td>
                    <td>
                      <div className="role-actions">
                        {item.actions.length === 0 && <span className="section-description">ดูข้อมูลสรุป</span>}
                        {item.actions.map((action) => (
                          <label key={action.key}>
                            <input
                              type="checkbox"
                              checked={draft.includes(action.key)}
                              disabled={!draft.includes(item.menu) || SUPER_ADMIN_ONLY.includes(action.key)}
                              onChange={() => toggleAction(action.key)}
                            />
                            {action.label}
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="role-footer">
            <span>
              <ShieldCheck size={18} />
              เฉพาะ Super Admin ที่แก้ไขสิทธิ์ได้
            </span>
            <div className="heading-actions">
              <button
                className="sp-button sp-button--secondary"
                onClick={() => setDraft([...data.adminPermissions])}
              >
                ยกเลิก
              </button>
              <button className="sp-button sp-button--primary" onClick={handleSavePermissions}>
                บันทึกสิทธิ์
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ป๊อปอัป: เพิ่ม/แก้ไขบัญชี */}
      <Modal open={form !== null} title="บัญชีผู้ดูแล" onClose={() => setForm(null)}>
        {form && (
          <form className="modal-form" onSubmit={handleSaveUser} noValidate>
            <label className="sp-field">
              ชื่อ–นามสกุล
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="sp-field">
              ชื่อผู้ใช้ (ภาษาอังกฤษ)
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </label>
            <label className="sp-field">
              รหัสผ่าน
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="sp-field">
              บทบาท
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {/* Admin ตั้งบัญชีเป็น Super Admin ไม่ได้ */}
                {ROLES.filter((role) => isSuperAdmin || role === "Admin").map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              เปิดใช้งานบัญชีนี้
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="sp-button sp-button--secondary" onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className="sp-button sp-button--primary">
                บันทึก
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ป๊อปอัป: ยืนยันลบ */}
      <Modal open={deleting !== null} title="ยืนยันการลบบัญชี" onClose={() => setDeleting(null)}>
        <p>ต้องการลบบัญชี {deleting?.name} หรือไม่?</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="sp-button sp-button--secondary" onClick={() => setDeleting(null)}>
            ยกเลิก
          </button>
          <button className="sp-button sp-button--danger" onClick={handleDelete}>
            ยืนยันลบ
          </button>
        </div>
      </Modal>
    </>
  );
}
