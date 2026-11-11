"use client";

import { X } from "lucide-react";

// หน้าต่างป๊อปอัป (คลิกพื้นหลังหรือปุ่ม X เพื่อปิด)
export default function Modal({
  open,
  title,
  onClose,
  children,
  className = "",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`sp-modal ${className}`}
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sp-modal-inner">
          <header>
            <h2>{title}</h2>
            <button
              className="sp-button sp-button--ghost icon-button"
              onClick={onClose}
              aria-label="ปิดหน้าต่าง"
            >
              <X size={20} />
            </button>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
