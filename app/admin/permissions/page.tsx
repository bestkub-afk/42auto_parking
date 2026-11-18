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

// หน้า Admin Perm: ตารางบัญชีผู้ดูแล + ป๊อปอัป "บัญชีผู้ดูแล" (แท็บข้อมูลบัญชี / แท็บตั้งค่าสิทธิ์ตามบทบาท)
export default function Page() {
  const { data, setData } = useGlobalData();
  const me = getCurrentUser(data)!;
  const [modalOpen, setModalOpen] = useState(false); // ป๊อปอัป "บัญชีผู้ดูแล"
  const [modalTab, setModalTab] = useState<"account" | "roles">("account");
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

  // แท็บในป๊อปอัป: ข้อมูลบัญชีมีเมื่อเปิดจากเพิ่ม/แก้ไขผู้ใช้ · สิทธิ์ตามบทบาทมีเมื่อมีสิทธิ์ edit-roles
  const showAccountTab = form !== null;
  const showRolesTab = canDo(data, "edit-roles");
  const activeTab = !showRolesTab ? "account" : !showAccountTab ? "roles" : modalTab;

  // เปิดป๊อปอัปที่แท็บที่ต้องการ (รีเซ็ต draft สิทธิ์ให้ตรงกับข้อมูลล่าสุดทุกครั้ง)
  const openModal = (tab: "account" | "roles", nextForm: User | null) => {
    setForm(nextForm);
    setModalTab(tab);
    setDraft([...data.adminPermissions]);
    setError("");
    setNotice("");
    setModalOpen(true);
  };

  // ปิดป๊อปอัป = ทิ้งสิ่งที่แก้ค้างไว้
  const closeModal = () => {
    setModalOpen(false);
    setForm(null);
    setDraft([...data.adminPermissions]);
  };

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
    if (saveUsers(users, "บันทึกบัญชีเรียบร้อยแล้ว")) {
      setModalOpen(false);
      setForm(null);
    }
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
  // draft เก็บทุกอย่างที่ติ๊กไว้ รวมถึงสิทธิ์ย่อยของเมนูที่ปิดอยู่ (เพื่อให้เปิดเมนูกลับมาแล้วสิทธิ์ย่อยเดิมยังอยู่)
  // แต่ค่าที่ "บันทึกจริง" จะตัดสิทธิ์ย่อยของเมนูที่ปิดอยู่ทิ้งเสมอ (ดู buildEffectivePermissions)

  // สิทธิ์ย่อยนี้อยู่ใต้เมนูไหน (ถ้าเป็นตัวเมนูเอง จะได้ undefined)
  const menuOf = (permission: Permission): Menu | undefined =>
    MENUS.find((item) => item.actions.some((action) => action.key === permission))?.menu;

  // สิทธิ์ที่มีผลจริง = เมนูต้องเปิดอยู่ จึงจะมีสิทธิ์ย่อยในเมนูนั้น
  const buildEffectivePermissions = (list: Permission[]): Permission[] =>
    Array.from(new Set(list)).filter((permission) => {
      const parent = menuOf(permission);
      return parent === undefined || list.includes(parent);
    });

  // เปิด/ปิดเมนู: ปิด → เอาเฉพาะตัวเมนูออก ส่วนสิทธิ์ย่อยยังจำไว้ใน draft (แต่จะไม่ถูกบันทึกตอนเมนูปิด)
  const toggleMenu = (menu: Menu) => {
    setDraft((current) =>
      current.includes(menu) ? current.filter((permission) => permission !== menu) : [...current, menu],
    );
    setNotice("");
  };

  const toggleAction = (permission: Permission) => {
    const parent = menuOf(permission);
    if (SUPER_ADMIN_ONLY.includes(permission)) return; // สิทธิ์เฉพาะ Super Admin แก้ไม่ได้
    if (parent && !draft.includes(parent)) return; // เมนูปิดอยู่ แก้สิทธิ์ย่อยไม่ได้
    setDraft((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
    setNotice("");
  };

  const handleSavePermissions = () => {
    setData({ ...data, adminPermissions: buildEffectivePermissions(draft) });
    setModalOpen(false);
    setForm(null);
    setNotice("บันทึกสิทธิ์ของ Admin แล้ว");
  };

  return (
    <>
      <AdminHeader title="จัดการสิทธิ์ผู้ใช้งาน" description="จัดการบัญชีผู้ดูแล และกำหนดเมนูที่ Admin ใช้ได้">
        <div className="heading-actions">
          {canDo(data, "edit-users") && (
            <button
              className="sp-button sp-button--primary"
              onClick={() => openModal("account", emptyUser())}
            >
              + เพิ่มผู้ใช้
            </button>
          )}
        </div>
      </AdminHeader>
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
                          onClick={() => openModal("account", { ...user })}
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

      {/* ป๊อปอัป: บัญชีผู้ดูแล (ข้อมูลบัญชี + ตั้งค่าสิทธิ์ตามบทบาท) */}
      <Modal open={modalOpen} title="บัญชีผู้ดูแล" onClose={closeModal}>
        {showAccountTab && showRolesTab && (
          <div className="admin-tabs permission-tabs">
            <button aria-pressed={activeTab === "account"} onClick={() => setModalTab("account")}>
              ข้อมูลบัญชี
            </button>
            <button aria-pressed={activeTab === "roles"} onClick={() => setModalTab("roles")}>
              ตั้งค่าสิทธิ์ตามบทบาท
            </button>
          </div>
        )}
        {activeTab === "account" && form && (
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
              <button type="button" className="sp-button sp-button--secondary" onClick={closeModal}>
                ยกเลิก
              </button>
              <button type="submit" className="sp-button sp-button--primary">
                บันทึก
              </button>
            </div>
          </form>
        )}
        {activeTab === "roles" && showRolesTab && (
          <div className="role-editor">
            <div className="admin-table-wrap">
              <table className="admin-table role-table" style={{ width: "100%", minWidth: 0 }}>
                <thead>
                  <tr>
                    <th style={{ whiteSpace: "nowrap" }}>เมนู</th>
                    <th style={{ whiteSpace: "nowrap", width: "1%" }}>เห็นเมนู</th>
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
                        <div className="role-actions" style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", minWidth: 0 }}>
                          {item.actions.length === 0 && <span className="section-description">ดูข้อมูลสรุป</span>}
                          {item.actions.map((action) => (
                            <label key={action.key} style={{ whiteSpace: "normal" }}>
                              <input
                                type="checkbox"
                                checked={draft.includes(item.menu) && draft.includes(action.key)}
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
                <button className="sp-button sp-button--secondary" onClick={closeModal}>
                  ยกเลิก
                </button>
                <button className="sp-button sp-button--primary" onClick={handleSavePermissions}>
                  บันทึกสิทธิ์
                </button>
              </div>
            </div>
          </div>
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
