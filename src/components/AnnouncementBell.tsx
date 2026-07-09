"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Ann = {
  id: string;
  title: string;
  body: string;
  target: string;
  pinned: boolean;
  createdAt: string;
  author: string;
  read: boolean;
};

const TARGET_LABEL: Record<string, string> = {
  ALL: "ทุกคน",
  STUDENT: "นักศึกษาฝึกงาน",
  MENTOR: "พี่เลี้ยง",
  ADMIN: "ผู้ดูแล",
  EXECUTIVE: "ผู้บริหาร",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AnnouncementBell() {
  const [items, setItems] = useState<Ann[]>([]);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: string) => {
    await fetch(`/api/announcements/${id}`, { method: "POST" });
    setItems(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const markAllRead = async (list = items) => {
    const unread = list.filter(a => !a.read);
    if (!unread.length) return;
    await Promise.all(unread.map(a => fetch(`/api/announcements/${a.id}`, { method: "POST" })));
    setItems(prev => prev.map(a => ({ ...a, read: true })));
  };

  const unreadCount = items.filter(a => !a.read).length;

  return (
    <div className="relative" ref={drawerRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => { if (!o) markAllRead(); return !o; }); }}
        className="relative p-2 rounded-xl transition-colors hover:bg-white/10"
        aria-label="ประกาศ"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(255,255,255,0.85)" }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: "#FFC000", color: "#002d7a" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer — viewport-fixed on mobile (avoid left overflow), anchored dropdown on desktop */}
      {open && (
        <div className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col"
          style={{ maxHeight: "78vh" }}>

          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100"
            style={{ background: "linear-gradient(135deg,#003E8E,#002d7a)" }}>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">📢 ประกาศ</span>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "#FFC000", color: "#002d7a" }}>
                  {unreadCount} ใหม่
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead()}
                className="text-xs text-white/60 hover:text-white transition-colors">
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">ไม่มีประกาศ</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map(a => (
                  <button key={a.id} onClick={() => !a.read && markRead(a.id)}
                    className="w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 block"
                    style={a.read ? {} : { background: "#F0F7FF" }}>
                    <div className="flex items-start gap-2.5">
                      {/* Unread dot */}
                      <div className="mt-1.5 shrink-0">
                        {a.pinned
                          ? <span className="text-sm">📌</span>
                          : <div className="w-2 h-2 rounded-full mt-0.5" style={{ background: a.read ? "#E5E7EB" : "#003E8E" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className={`text-sm leading-snug ${a.read ? "text-gray-600" : "font-semibold text-gray-900"}`}>
                            {a.title}
                          </p>
                          {a.target !== "ALL" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: "#EEF4FF", color: "#003E8E" }}>
                              {TARGET_LABEL[a.target] ?? a.target}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{a.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{a.author} · {fmtDate(a.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
