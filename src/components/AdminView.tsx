"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { exportPptx } from "@/lib/exportPptx";
import AppNav from "./AppNav";
import { ROLE_LABEL, LEVEL_LABEL, STATUS_LABEL, STATUS_COLOR, SCORE_CRITERIA, weightedScore, passBar, withQuizBonus, QUIZ_BONUS_MAX } from "@/lib/labels";

type EvalRecord = { id: string; mentorId: string; scores: Record<string, number>; comment: string | null; mentor: { id: string; name: string | null; nickname: string | null } };
type U = { id: string; name: string | null; nickname: string | null; email: string | null; image: string | null; role: string; level: string | null; school: string | null; advisor: string | null; startDate: string | null; endDate: string | null; profileDone: boolean };
type Rep = {
  id: string; date: string; title: string; description: string; location: string | null;
  learned: string | null; solution: string | null; result: string | null;
  ppe: string[] | null; tools: string[] | null; images: string[];
  status: string;
  user: { id: string; name: string | null; nickname: string | null; level: string | null; school: string | null };
  evaluations: EvalRecord[];
};

type FieldQuiz = { id: string; title: string; createdAt: string; firstScores: Record<string, number> };

type Tab = "overview" | "logs" | "export" | "users" | "announce" | "attendance";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function batchKey(s: U) {
  if (!s.startDate || !s.endDate) return null;
  return `${s.startDate.slice(0, 7)}|${s.endDate.slice(0, 7)}`;
}
function batchLabel(key: string, n: number) {
  const [start, end] = key.split("|");
  const sm = parseInt(start.split("-")[1]) - 1;
  const [ey, em] = end.split("-").map(Number);
  return `รุ่น ${n} (${THAI_MONTHS[sm]} - ${THAI_MONTHS[em - 1]} พ.ศ. ${ey + 543})`;
}

function overallAvg(evals: EvalRecord[]): number | null {
  if (!evals.length) return null;
  const all = evals.flatMap(e => Object.values(e.scores).filter(Boolean) as number[]);
  return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
}

// เฉลี่ยคะแนน quiz ครั้งแรก 0-100 ของโจทย์ที่ตั้ง "ช่วงที่นักศึกษาคนนี้ฝึกอยู่" (ไม่ทำ = 0)
// ไม่มีโจทย์ในช่วงของเขาเลย → null → ไม่มีโบนัส คะแนนเท่าเดิม
function quizAvgFor(s: U, quizzes: FieldQuiz[]): number | null {
  const from = s.startDate?.slice(0, 10);
  const to = s.endDate?.slice(0, 10);
  const mine = quizzes.filter(q => {
    const d = q.createdAt.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  });
  if (!mine.length) return null;
  return mine.reduce((sum, q) => sum + (q.firstScores[s.id] ?? 0), 0) / mine.length;
}

export default function AdminView({ readOnly, meId, meName, meNickname, meEmail, meImage, users: initUsers, reports: initReports, quizzes = [] }: {
  readOnly: boolean; meId: string; meName: string; meNickname?: string | null; meEmail?: string | null; meImage?: string | null; users: U[]; reports: Rep[]; quizzes?: FieldQuiz[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState<U[]>(initUsers);
  const [reports, setReports] = useState<Rep[]>(initReports);
  const [tab, setTab] = useState<Tab>("overview");
  const [sideOpen, setSideOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<U | null>(null);
  const [evalTarget, setEvalTarget] = useState<Rep | null>(null);

  const [batchFilter, setBatchFilter] = useState("ALL");

  const allStudents = users.filter(u => u.role === "STUDENT");
  const mentors = users.filter(u => u.role === "MENTOR" || u.role === "ADMIN");

  // Build sorted batch list from students with start/end dates
  const batchKeys = [...new Set(allStudents.map(s => batchKey(s)).filter(Boolean) as string[])].sort();
  const batchMap = Object.fromEntries(batchKeys.map((k, i) => [k, batchLabel(k, i + 1)]));

  const students = batchFilter === "ALL" ? allStudents : allStudents.filter(s => batchKey(s) === batchFilter);
  const studentIds = new Set(students.map(s => s.id));
  const filteredReportsByBatch = batchFilter === "ALL" ? reports : reports.filter(r => studentIds.has(r.user.id));
  const pending = filteredReportsByBatch.filter(r => r.status === "PENDING").length;

  const onEvalDone = (reportId: string, ev: EvalRecord) => {
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      const idx = r.evaluations.findIndex(e => e.mentorId === meId);
      const evals = idx >= 0 ? r.evaluations.map((e, i) => i === idx ? ev : e) : [...r.evaluations, ev];
      return { ...r, evaluations: evals, status: "SCORED" };
    }));
    setEvalTarget(null);
  };

  const setRole = async (userId: string, role: string) => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "role", userId, role }) });
    if (res.ok) setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
    else alert("เปลี่ยนสิทธิ์ไม่สำเร็จ");
  };

  const editUser = async (userId: string, data: Partial<U>): Promise<boolean> => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "edit", userId, ...data }) });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "แก้ไขไม่สำเร็จ"); return false; }
    const u = await res.json();
    setUsers(prev => prev.map(x => (x.id === userId ? { ...x, ...u } : x)));
    setDetailUser(prev => (prev && prev.id === userId ? { ...prev, ...u } : prev));
    return true;
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "delete", userId }) });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "ลบไม่สำเร็จ"); return false; }
    setUsers(prev => prev.filter(x => x.id !== userId));
    setReports(prev => prev.filter(r => r.user.id !== userId));
    return true;
  };

  const NAV: { id: Tab; label: string; badge?: number; icon: React.ReactNode }[] = [
    { id: "overview",  label: "ภาพรวม",           icon: <IconGrid /> },
    { id: "logs",      label: "บันทึกการฝึกงาน",  badge: pending, icon: <IconClipboard /> },
    { id: "export",    label: "รายงาน",            icon: <IconExport /> },
    { id: "users",     label: "ผู้ใช้งาน",         icon: <IconUsers /> },
    { id: "announce",   label: "ประกาศ",            icon: <IconMega /> },
    { id: "attendance", label: "บันทึกลงเวลา",     icon: <IconClock /> },
  ];

  const activeNav = NAV.find(n => n.id === tab);

  return (
    <div className="md:h-screen md:overflow-hidden flex" style={{ background: "#F0F2F8" }}>
      {/* Mobile overlay */}
      {sideOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSideOpen(false)} />}

      {/* ─── Sidebar (full height on desktop, off-canvas drawer on mobile) ─── */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto flex-shrink-0 flex flex-col md:h-screen transition-transform duration-250 ease-in-out ${sideOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ width: 236, background: "#0D1F3C" }}>

        {/* Brand header — aligns with AppNav height */}
        <div className="flex items-center gap-2.5 px-4 h-14 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
            <Image src="/logi.png" alt="กบห-ธ." width={34} height={34} style={{ objectFit: "cover", display: "block" }} />
          </div>
          <div className="leading-tight flex-1 min-w-0">
            <p className="font-black italic text-white text-sm tracking-wide" style={{ fontFamily: "'Arial Black',sans-serif" }}>กบห-ธ.</p>
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>กฟผ. สนง.ไทรน้อย</p>
          </div>
          <button onClick={() => setSideOpen(false)} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 md:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Nav section label */}
        <div className="px-4 pt-5 pb-2">
          <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>เมนูหลัก</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(n => {
            const active = tab === n.id;
            return (
              <button key={n.id} onClick={() => { setTab(n.id); setSideOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left relative"
                style={active
                  ? { background: "rgba(255,255,255,0.10)", color: "#fff", fontWeight: 700 }
                  : { color: "rgba(255,255,255,0.5)" }}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: "#FFC000" }} />}
                <span className="shrink-0" style={{ color: active ? "#FFC000" : "rgba(255,255,255,0.4)" }}>{n.icon}</span>
                <span className="flex-1 truncate">{n.label}</span>
                {n.badge ? (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{ background: "#FFC000", color: "#0D1F3C" }}>
                    {n.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          <div className="pt-3 pb-1">
            <p className="text-[11px] font-semibold tracking-widest uppercase px-3 mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>หลักสูตร</p>
            <a href="/training" onClick={() => setSideOpen(false)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative"
              style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>
              <span className="shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </span>
              <span className="flex-1 truncate">เนื้อหาอบรม</span>
            </a>
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 pb-5 pt-3 space-y-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={() => router.refresh()}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>
            </svg>
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </aside>

      {/* ─── Right column: AppNav + scrollable main ─── */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen">
        {/* AppNav confined to content column — brand hidden on desktop (sidebar has it), page title on left */}
        <div className="shrink-0">
          <AppNav name={meName} nickname={meNickname} email={meEmail} image={meImage} role={readOnly ? "EXECUTIVE" : "ADMIN"} profileHref="/profile"
            fullWidth hideBrandDesktop
            desktopTitle={
              <div className="flex items-center gap-2.5 text-white">
                <span style={{ color: "#FFC000" }}>{activeNav?.icon}</span>
                <span className="font-bold text-base">{activeNav?.label}</span>
              </div>
            } />
        </div>

        {/* Mobile hamburger FAB */}
        <button className="md:hidden fixed bottom-5 left-4 z-20 w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center"
          style={{ background: "#003E8E" }}
          onClick={() => setSideOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Scrollable content */}
        <main className="flex-1 md:overflow-auto">
          {/* Context sub-topbar — title on mobile (desktop shows it in AppNav); filter when applicable.
              Hidden on desktop entirely when there's no filter to show. */}
          {(() => {
            const hasFilter = tab !== "users" && batchKeys.length > 0;
            return (
              <div className={`sticky top-0 z-10 border-b border-gray-200/70 px-5 md:px-6 h-12 items-center gap-3 ${hasFilter ? "flex" : "flex md:hidden"}`}
                style={{ background: "rgba(240,242,248,0.85)", backdropFilter: "blur(8px)" }}>
                <span className="text-sm font-bold text-gray-800 md:hidden">{activeNav?.label}</span>
                {hasFilter && (
                  <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs bg-white shadow-sm">
                    <option value="ALL">ทุกรุ่น</option>
                    {batchKeys.map(k => <option key={k} value={k}>{batchMap[k]}</option>)}
                  </select>
                )}
              </div>
            );
          })()}

          <div className="p-5 md:p-6 max-w-6xl mx-auto">
            {tab === "overview" && <OverviewTab reports={filteredReportsByBatch} students={students} quizzes={quizzes} />}
            {tab === "logs"     && <LogsTab reports={filteredReportsByBatch} meId={meId} readOnly={readOnly} onEval={setEvalTarget} />}
            {tab === "export"   && <ExportTab reports={filteredReportsByBatch} students={students} quizzes={quizzes} />}
            {tab === "users"    && <UsersTab users={users} readOnly={readOnly} onSetRole={setRole} onDetail={setDetailUser} />}
            {tab === "announce"   && <AnnounceTab readOnly={readOnly} />}
            {tab === "attendance" && <AttendanceTab />}
          </div>
        </main>
      </div>
      {detailUser && <UserDetailModal user={detailUser} reports={reports} readOnly={readOnly} meId={meId}
        onEdit={editUser} onDelete={deleteUser} onClose={() => setDetailUser(null)} />}
      {evalTarget && (
        <EvalModal
          report={evalTarget}
          myExisting={evalTarget.evaluations.find(e => e.mentorId === meId) ?? null}
          onClose={() => setEvalTarget(null)}
          onDone={onEvalDone}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ reports, students, quizzes }: { reports: Rep[]; students: U[]; quizzes: FieldQuiz[] }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const scored = reports.filter(r => r.status === "SCORED");
  const pending = reports.filter(r => r.status === "PENDING");

  // Internship period from students' dates
  const startDates = students.map(s => s.startDate).filter(Boolean) as string[];
  const endDates   = students.map(s => s.endDate).filter(Boolean) as string[];
  const batchStart = startDates.length ? startDates.reduce((a, b) => a < b ? a : b) : null;
  const batchEnd   = endDates.length   ? endDates.reduce((a, b) => a > b ? a : b)   : null;
  let daysLeft: number | null = null;
  let progressPct = 0;
  if (batchStart && batchEnd) {
    const s = new Date(batchStart).getTime();
    const e = new Date(batchEnd).getTime();
    const t = now.getTime();
    daysLeft = Math.max(0, Math.ceil((e - t) / 86400000));
    progressPct = Math.min(100, Math.max(0, Math.round(((t - s) / (e - s)) * 100)));
  }

  // Students with no report in last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const inactive = students.filter(s => {
    const recent = reports.filter(r => r.user.id === s.id && r.date.slice(0, 10) >= sevenDaysAgo);
    return recent.length === 0;
  });

  // Recent activity (last 8 reports by date)
  const recent = [...reports]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 8);

  const nMax = Math.max(1, ...students.map(s => reports.filter(r => r.user.id === s.id).length));
  const bar = passBar(nMax); // เกณฑ์ผ่าน = 80% ของคนส่งสูงสุด
  const studentStats = students.map(s => {
    const mine = reports.filter(r => r.user.id === s.id).sort((a, b) => b.date.localeCompare(a.date));
    const allEvals = mine.flatMap(r => r.evaluations);
    const mentorAvg = overallAvg(allEvals);
    const quizAvg = quizAvgFor(s, quizzes);
    const avg = withQuizBonus(mentorAvg, quizAvg); // คะแนนดิบ = พี่เลี้ยง + โบนัส quiz (ตัดที่ 5)
    return {
      student: s, reportCount: mine.length, evalCount: allEvals.length, avg, mentorAvg, quizAvg,
      weighted: weightedScore(avg, mine.length, nMax),
      lastDate: mine[0]?.date.slice(0, 10),
      shortBy: Math.max(0, bar - mine.length), // ขาดอีกกี่ฉบับถึงเกณฑ์
    };
  }).sort((a, b) => (b.weighted ?? -1) - (a.weighted ?? -1));
  const scoredStats = studentStats.filter(s => s.reportCount > 0);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#003E8E" }}>ภาพรวม</h1>
        <p className="text-sm text-gray-400">อัปเดต {new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "👩‍🎓", label: "นักศึกษา", value: students.length, bg: "#EEF4FF", fg: "#003E8E" },
          { icon: "📋", label: "รายงานทั้งหมด", value: reports.length, bg: "#F0FDF4", fg: "#059669" },
          { icon: "⏳", label: "รอประเมิน", value: pending.length, bg: "#FFFBEB", fg: "#D97706" },
          { icon: "✅", label: "ประเมินแล้ว", value: scored.length, bg: "#F5F3FF", fg: "#7C3AED" },
        ].map(({ icon, label, value, bg, fg }) => (
          <div key={label} className="rounded-2xl p-4 shadow-sm border border-white" style={{ background: bg }}>
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-2xl font-bold" style={{ color: fg }}>{value}</div>
            <div className="text-xs font-medium mt-0.5" style={{ color: fg + "CC" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Internship progress bar */}
      {batchStart && batchEnd && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800">ระยะเวลาฝึกงาน</p>
              <p className="text-xs text-gray-400">{fmtDate(batchStart)} – {fmtDate(batchEnd)}</p>
            </div>
            <div className="text-right">
              {daysLeft !== null && daysLeft > 0
                ? <><p className="text-2xl font-bold" style={{ color: "#003E8E" }}>{daysLeft}</p><p className="text-xs text-gray-400">วันที่เหลือ</p></>
                : daysLeft === 0
                  ? <span className="text-sm font-bold text-red-500">สิ้นสุดวันนี้</span>
                  : <span className="text-sm font-bold text-gray-400">สิ้นสุดแล้ว</span>
              }
            </div>
          </div>
          <div className="w-full rounded-full h-3 overflow-hidden" style={{ background: "#EEF4FF" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#1a56c4,#003E8E)" }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>เริ่มแล้ว {progressPct}%</span>
            <span>เหลือ {100 - progressPct}%</span>
          </div>
        </div>
      )}

      {/* Inactive students alert */}
      {inactive.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: "#FFF7ED", borderColor: "#FED7AA" }}>
          <p className="text-sm font-bold mb-2" style={{ color: "#C2410C" }}>⚠️ ยังไม่ส่งรายงาน 7 วันที่ผ่านมา ({inactive.length} คน)</p>
          <div className="flex flex-wrap gap-2">
            {inactive.map(s => (
              <span key={s.id} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#FFEDD5", color: "#9A3412" }}>
                {s.name}{s.nickname ? ` (${s.nickname})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recent.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">🕐</span>
            <h2 className="text-sm font-bold text-gray-800">กิจกรรมล่าสุด</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5" style={{ background: r.status === "PENDING" ? "#F59E0B" : "#10B981" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.user.name}{r.user.nickname ? ` (${r.user.nickname})` : ""}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">{fmtDate(r.date.slice(0, 10))}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score chart */}
      {scoredStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold mb-0.5" style={{ color: "#003E8E" }}>คะแนนถ่วงน้ำหนักรายนักศึกษาฝึกงาน</h2>
          <p className="text-xs text-gray-400 mb-6">ถ่วงน้ำหนักตามจำนวนรายงานที่ส่ง (ยิ่งส่งเยอะยิ่งน่าเชื่อถือ) · เรียงจากสูงสุด</p>
          <ScoreBarChart stats={scoredStats} />
        </div>
      )}

      {/* Student summary table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800">สรุปรายนักศึกษา</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            เกณฑ์: ส่งรายงานอย่างน้อย 80% ของคนที่ส่งสูงสุด · <span style={{ color: "#16A34A" }}>●</span> = ปกติ · ถึงเกณฑ์แล้วได้น้ำหนักเต็ม ส่งเกินไม่ได้แต้มเพิ่ม
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "#F4F6FB" }}>
              <tr><Th>อันดับ</Th><Th>ชื่อ</Th><Th>ระดับ</Th><Th>รายงาน</Th><Th>ถูกประเมิน</Th><Th>quiz</Th><Th>คะแนนดิบ</Th><Th>ถ่วงน้ำหนัก</Th><Th>ล่าสุด</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentStats.map(({ student: s, reportCount, evalCount, avg, mentorAvg, quizAvg, weighted, lastDate, shortBy }, i) => {
                const isInactive = !lastDate || lastDate < sevenDaysAgo;
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <Td><span className="text-gray-400">{reportCount > 0 ? i + 1 : "—"}</span></Td>
                    <Td>
                      <span className="font-medium text-gray-800">{s.name}</span>
                      {s.nickname && <span className="text-xs text-gray-400 ml-1">({s.nickname})</span>}
                    </Td>
                    <Td>{s.level ? LEVEL_LABEL[s.level] : "—"}</Td>
                    <Td>
                      <span className={shortBy > 0 ? "font-semibold" : ""} style={shortBy > 0 ? { color: "#C2410C" } : {}}>{reportCount}</span>
                      {reportCount > 0 && (shortBy > 0
                        ? <span className="block text-xs mt-0.5 whitespace-nowrap" style={{ color: "#C2410C" }}>⚠️ ควรส่งรายงานเพิ่ม</span>
                        : <span className="ml-1.5 text-xs" style={{ color: "#16A34A" }} title="ส่งรายงานตามเกณฑ์">●</span>
                      )}
                    </Td>
                    <Td>{evalCount} ครั้ง</Td>
                    <Td>
                      {quizAvg == null
                        ? <span className="text-gray-300 text-xs" title="ไม่มีโจทย์หน้างานในช่วงที่ฝึก">—</span>
                        : <span className="text-xs">
                            {Math.round(quizAvg)}%
                            {avg != null && mentorAvg != null && avg > mentorAvg && (
                              <span className="ml-1" style={{ color: "#16A34A" }}>+{(avg - mentorAvg).toFixed(2)}</span>
                            )}
                          </span>}
                    </Td>
                    <Td><span className="text-gray-500">{avg != null ? avg.toFixed(2) : "—"}</span></Td>
                    <Td><span className="font-semibold" style={{ color: "#003E8E" }}>{weighted != null ? weighted.toFixed(2) : "—"}</span></Td>
                    <Td>
                      {lastDate
                        ? <span className={`text-xs ${isInactive ? "font-semibold" : "text-gray-400"}`} style={isInactive ? { color: "#C2410C" } : {}}>
                            {fmtDate(lastDate)}{isInactive ? " ⚠️" : ""}
                          </span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScoreBarChart({ stats }: { stats: { student: U; reportCount: number; evalCount: number; avg: number | null; weighted: number | null }[] }) {
  const maxScore = 5;
  const BAR_H = 44;
  const GAP = 14;
  const NAME_W = 130;
  const BAR_AREA = 320;
  const SCORE_W = 48;
  const TOTAL_W = NAME_W + BAR_AREA + SCORE_W + 16;
  const TOTAL_H = stats.length * (BAR_H + GAP) + 20;

  const colors = [
    ["#003E8E", "#0066CC"],
    ["#005BB8", "#0077DD"],
    ["#0052A3", "#006FD6"],
    ["#00419A", "#0060C4"],
    ["#002d7a", "#0055B8"],
  ];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} width="100%" style={{ maxWidth: TOTAL_W, display: "block", margin: "0 auto" }}>
        <defs>
          {stats.map((_, i) => (
            <linearGradient key={i} id={`bar-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors[i % colors.length][0]} />
              <stop offset="100%" stopColor={colors[i % colors.length][1]} />
            </linearGradient>
          ))}
          <linearGradient id="bar-bg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F4F6FB" />
            <stop offset="100%" stopColor="#EEF2FF" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[1,2,3,4,5].map(v => {
          const x = NAME_W + 8 + (v / maxScore) * BAR_AREA;
          return (
            <g key={v}>
              <line x1={x} y1={10} x2={x} y2={TOTAL_H - 10} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4,3" />
              <text x={x} y={TOTAL_H - 2} textAnchor="middle" fontSize="9" fill="#9CA3AF">{v}</text>
            </g>
          );
        })}

        {stats.map(({ student, evalCount, avg, weighted }, i) => {
          const y = 10 + i * (BAR_H + GAP);
          const barW = weighted != null ? (weighted / maxScore) * BAR_AREA : 0;
          const shortName = (student.name ?? "").split(" ").slice(-1)[0] || student.name || "";
          const displayName = student.nickname ? `${shortName} (${student.nickname})` : shortName;

          return (
            <g key={student.id}>
              {/* Name */}
              <text x={NAME_W - 8} y={y + BAR_H / 2 + 1} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="#374151" fontWeight="500">
                {displayName}
              </text>

              {/* Background track */}
              <rect x={NAME_W + 8} y={y + 4} width={BAR_AREA} height={BAR_H - 8} rx="8" fill="url(#bar-bg)" />

              {/* Score bar */}
              {weighted != null && barW > 0 && (
                <rect x={NAME_W + 8} y={y + 4} width={barW} height={BAR_H - 8} rx="8" fill={`url(#bar-grad-${i})`}>
                  <animate attributeName="width" from="0" to={barW} dur="0.7s" fill="freeze" begin={`${i * 0.1}s`} />
                </rect>
              )}

              {/* Eval count badge inside bar */}
              {weighted != null && evalCount > 0 && barW > 60 && (
                <text x={NAME_W + 16} y={y + BAR_H / 2 + 1} dominantBaseline="middle" fontSize="10" fill="rgba(255,255,255,0.8)">
                  {evalCount} ครั้ง
                </text>
              )}

              {/* Score label: weighted (big) + raw avg (small) */}
              <text x={NAME_W + 8 + BAR_AREA + 8} y={y + BAR_H / 2 - 4} dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#003E8E">
                {weighted != null ? weighted.toFixed(2) : "—"}
              </text>
              {avg != null && (
                <text x={NAME_W + 8 + BAR_AREA + 8} y={y + BAR_H / 2 + 10} dominantBaseline="middle" fontSize="9" fill="#9CA3AF">
                  ดิบ {avg.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Logs Tab (บันทึกการฝึกงาน) ──────────────────────────────────────────────

function LogsTab({ reports, meId, readOnly, onEval }: { reports: Rep[]; meId: string; readOnly: boolean; onEval: (r: Rep) => void }) {
  const [filter, setFilter] = useState("ALL");
  const [studentFilter, setStudentFilter] = useState("ALL");

  // unique students from reports
  const studentList = Array.from(new Map(reports.map(r => [r.user.id, r.user])).values());

  const filtered = reports.filter(r =>
    (filter === "ALL" || r.status === filter) &&
    (studentFilter === "ALL" || r.user.id === studentFilter)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#003E8E" }}>บันทึกการฝึกงาน</h1>
          <p className="text-sm text-gray-500">{filtered.length} รายการ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="ALL">นักศึกษาทุกคน</option>
            {studentList.map(u => <option key={u.id} value={u.id}>{u.name}{u.nickname ? ` (${u.nickname})` : ""}</option>)}
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="ALL">ทุกสถานะ</option>
            <option value="PENDING">รอประเมิน</option>
            <option value="SCORED">ประเมินแล้ว</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(r => {
          const avg = overallAvg(r.evaluations);
          const myEval = r.evaluations.find(e => e.mentorId === meId);
          const tools = r.tools ?? [];
          const ppe = r.ppe ?? [];
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-3 flex items-start justify-between gap-3 flex-wrap"
                style={{ background: "linear-gradient(135deg,#003E8E,#0052b4)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-base leading-snug">{r.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-blue-200 text-xs">
                      👤 {r.user.name}{r.user.nickname ? ` (${r.user.nickname})` : ""}{r.user.level ? ` · ${LEVEL_LABEL[r.user.level]}` : ""}
                    </span>
                    <span className="text-blue-200 text-xs">📅 {r.date.slice(0, 10)}</span>
                    {r.location && <span className="text-blue-200 text-xs">📍 {r.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {!readOnly && (
                    <button onClick={() => onEval(r)}
                      className="text-xs px-3 py-1 rounded-lg font-medium text-white border border-white/30 hover:bg-white/10 whitespace-nowrap">
                      {myEval ? "แก้ไขคะแนน" : "ประเมิน"}
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="divide-y divide-gray-50 text-sm">
                {/* รายละเอียดงาน */}
                <div className="px-5 py-3">
                  <p className="text-xs font-semibold text-gray-400 mb-1">📋 รายละเอียดงาน</p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{r.description || <span className="text-gray-300 italic">—</span>}</p>
                </div>

                {/* ปัญหา / วิธีแก้ / ผลลัพธ์ */}
                {(r.learned || r.solution || r.result) && (
                  <div className="px-5 py-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
                    {r.learned && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">⚠️ ปัญหาที่พบ</p>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{r.learned}</p>
                      </div>
                    )}
                    {r.solution && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">🔧 วิธีแก้ไข</p>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{r.solution}</p>
                      </div>
                    )}
                    {r.result && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">✅ ผลลัพธ์</p>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{r.result}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tools + PPE */}
                {(tools.length > 0 || ppe.length > 0) && (
                  <div className="px-5 py-3 flex flex-wrap gap-4">
                    {tools.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1.5">🔩 เครื่องมือ/อุปกรณ์ที่ใช้</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tools.map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#EEF2FF", color: "#003E8E" }}>{t}</span>)}
                        </div>
                      </div>
                    )}
                    {ppe.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1.5">🦺 อุปกรณ์ป้องกันที่ใช้</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ppe.map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#FEF9C3", color: "#92400E" }}>{t}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Images */}
                {r.images?.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-xs font-semibold text-gray-400 mb-2">📷 รูปภาพประกอบ</p>
                    <div className="flex flex-wrap gap-2">
                      {r.images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`รูป ${i + 1}`} className="h-28 w-auto rounded-xl object-cover border border-gray-200 hover:opacity-90 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evaluation summary */}
                {r.evaluations.length > 0 && (
                  <div className="px-5 py-3 bg-gray-50/50 flex items-center gap-4 flex-wrap">
                    <span className="text-xs text-gray-500">👥 ประเมินแล้ว {r.evaluations.length} คน</span>
                    {avg != null && (
                      <span className="text-sm font-bold" style={{ color: "#003E8E" }}>คะแนนรายงานฉบับนี้ {avg.toFixed(2)} / 5.00</span>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                      {r.evaluations.map(e => (
                        <span key={e.mentorId}>{e.mentor.nickname ?? e.mentor.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">ไม่พบรายการ</div>
        )}
      </div>
    </div>
  );
}

// ─── Export Tab ───────────────────────────────────────────────────────────────

function avgPerCriteria(evals: EvalRecord[]): Record<string, number> {
  if (!evals.length) return {};
  return Object.fromEntries(SCORE_CRITERIA.map(c => [
    c.key,
    evals.reduce((s, e) => s + (e.scores[c.key] ?? 0), 0) / evals.length,
  ]));
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n) + "…" : s; }

// Short labels for radar chart vertices
const CRITERIA_SHORT = ["ทักษะ", "ปลอดภัย", "รับผิดชอบ", "คุณภาพ", "รายงาน"];

function RadarChart({ scores, size = 160 }: { scores: Record<string, number>; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.34;
  const n = SCORE_CRITERIA.length;
  const angle = (i: number) => Math.PI * (-0.5 + (2 * i) / n);
  const pt = (i: number, val: number) => {
    const a = angle(i);
    const rr = r * Math.max(0, val) / 5;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  const outerPt = (i: number, scale = 1) => {
    const a = angle(i);
    return [cx + r * scale * Math.cos(a), cy + r * scale * Math.sin(a)];
  };
  const levelPoints = (level: number) =>
    SCORE_CRITERIA.map((_, i) => outerPt(i, level / 5).join(",")).join(" ");
  const dataPoints = SCORE_CRITERIA.map((c, i) => pt(i, scores[c.key] ?? 0).join(",")).join(" ");

  // label anchor logic per axis
  const anchor = (i: number): React.SVGAttributes<SVGTextElement>["textAnchor"] => {
    if (i === 0) return "middle";
    if (i === 1 || i === 2) return "start";
    return "end";
  };
  const labelOffset = (i: number) => {
    const a = angle(i);
    const lr = r + 14;
    return [cx + lr * Math.cos(a), cy + lr * Math.sin(a)];
  };

  const hasData = SCORE_CRITERIA.some(c => (scores[c.key] ?? 0) > 0);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {/* Background levels */}
      {[1,2,3,4,5].map(level => (
        <polygon key={level} points={levelPoints(level)}
          fill={level === 5 ? "#EEF2FF" : "none"}
          stroke="#E2E8F0" strokeWidth="0.6" />
      ))}
      {/* Axis lines */}
      {SCORE_CRITERIA.map((_, i) => {
        const [ox, oy] = outerPt(i);
        return <line key={i} x1={cx} y1={cy} x2={ox} y2={oy} stroke="#CBD5E1" strokeWidth="0.6" />;
      })}
      {/* Data polygon */}
      {hasData && (
        <polygon points={dataPoints}
          fill="rgba(0,62,142,0.18)" stroke="#003E8E" strokeWidth="1.8"
          strokeLinejoin="round" />
      )}
      {/* Data dots */}
      {hasData && SCORE_CRITERIA.map((c, i) => {
        const [px, py] = pt(i, scores[c.key] ?? 0);
        return <circle key={i} cx={px} cy={py} r="2.8" fill="#003E8E" />;
      })}
      {/* Axis labels */}
      {SCORE_CRITERIA.map((_, i) => {
        const [lx, ly] = labelOffset(i);
        return (
          <text key={i} x={lx} y={ly} textAnchor={anchor(i)} dominantBaseline="middle"
            fontSize="9.5" fill="#64748B" fontWeight="500">
            {CRITERIA_SHORT[i]}
          </text>
        );
      })}
      {/* Center score */}
      {hasData && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fill="#003E8E" fontWeight="700">
          {(SCORE_CRITERIA.reduce((s, c) => s + (scores[c.key] ?? 0), 0) / n).toFixed(1)}
        </text>
      )}
    </svg>
  );
}

function ScoreColor(v: number | null): { bg: string; fg: string } {
  if (v == null) return { bg: "#F3F4F6", fg: "#9CA3AF" };
  if (v >= 4.5) return { bg: "#DCFCE7", fg: "#15803D" };
  if (v >= 3.5) return { bg: "#D1FAE5", fg: "#16A34A" };
  if (v >= 3)   return { bg: "#FEF9C3", fg: "#A16207" };
  if (v >= 2)   return { bg: "#FEE2E2", fg: "#DC2626" };
  return { bg: "#FEE2E2", fg: "#B91C1C" };
}

function ExportTab({ reports, students, quizzes }: { reports: Rep[]; students: U[]; quizzes: FieldQuiz[] }) {
  const [selectedStudentId, setSelectedStudentId] = useState("ALL");

  // ถ่วงน้ำหนักด้วยสูตร + nMax เดียวกับหน้าภาพรวม เพื่อให้ตัวเลขตรงกันทุกหน้า
  const nMax = Math.max(1, ...students.map(s => reports.filter(r => r.user.id === s.id).length));
  const studentStats = students.map(s => {
    const mine = reports.filter(r => r.user.id === s.id);
    const allEvals = mine.flatMap(r => r.evaluations);
    const rawCriteria = avgPerCriteria(allEvals);
    const criteria: Record<string, number> = {};
    for (const c of SCORE_CRITERIA) {
      const w = weightedScore(rawCriteria[c.key] ?? null, mine.length, nMax);
      if (w != null) criteria[c.key] = w;
    }
    // โบนัส quiz เสริมที่คะแนนรวม ไม่แตะรายหมวดของพี่เลี้ยง
    const quizAvg = quizAvgFor(s, quizzes);
    const rawOverall = withQuizBonus(overallAvg(allEvals), quizAvg);
    const overall = weightedScore(rawOverall, mine.length, nMax);
    return { student: s, mine, allEvals, criteria, quizAvg, rawOverall, overall };
  }).sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

  // Summary stats
  const totalReports = reports.length;
  const scoredReports = reports.filter(r => r.status === "SCORED").length;
  const allEvals = reports.flatMap(r => r.evaluations);
  const allScores = allEvals.flatMap(e => Object.values(e.scores).filter(Boolean) as number[]);
  const globalAvg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;

  const exportXlsx = (studentId: string) => {
    const date = new Date().toISOString().slice(0, 10);
    const name = studentId === "ALL" ? "ทั้งหมด" : (students.find(s => s.id === studentId)?.name ?? studentId);

    // ── Sheet 1: ผลการประเมินรายบุคคล ──────────────────────────────────────────
    const s1Head = ["อันดับ", "ชื่อ-สกุล", "ชื่อเล่น", "ระดับ", "สถานศึกษา",
      "บันทึก", "การประเมิน",
      ...CRITERIA_SHORT.map(s => `ถ่วงน้ำหนัก: ${s}`),
      "quiz (%)", "เฉลี่ยรวม (ถ่วงน้ำหนัก)", "เฉลี่ยรวม (ดิบ+โบนัส)"];
    const s1Rows: (string | number)[][] = [s1Head];
    studentStats.forEach(({ student: s, mine, allEvals, criteria, quizAvg, rawOverall, overall }, i) => {
      s1Rows.push([
        i + 1, s.name ?? "", s.nickname ?? "",
        s.level ? LEVEL_LABEL[s.level] : "", s.school ?? "",
        mine.length, allEvals.length,
        ...SCORE_CRITERIA.map(c => criteria[c.key] != null ? +criteria[c.key].toFixed(2) : ""),
        quizAvg != null ? Math.round(quizAvg) : "",
        overall != null ? +overall.toFixed(2) : "",
        rawOverall != null ? +rawOverall.toFixed(2) : "",
      ]);
    });
    const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
    ws1["!cols"] = [
      { wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 7 }, { wch: 20 },
      { wch: 7 }, { wch: 9 },
      ...CRITERIA_SHORT.map(() => ({ wch: 14 })),
      { wch: 9 }, { wch: 20 }, { wch: 20 },
    ];

    // ── Sheet 2: รายการบันทึกฝึกงาน ────────────────────────────────────────────
    const targetStudents = studentId === "ALL"
      ? studentStats.filter(ss => ss.mine.length > 0)
      : studentStats.filter(ss => ss.student.id === studentId && ss.mine.length > 0);

    const detailCols = [
      "วันที่", "หัวข้องาน", "สถานที่",
      "รายละเอียดงาน", "ปัญหาที่พบ", "วิธีแก้ไข", "ผลลัพธ์",
      "เครื่องมือ/อุปกรณ์", "อุปกรณ์ป้องกัน",
      "สถานะ", "ผู้ประเมิน", "เฉลี่ยรวม",
      ...CRITERIA_SHORT.map(s => `คะแนน: ${s}`),
    ];
    const s2Rows: (string | number)[][] = [];
    const merges: XLSX.Range[] = [];
    let ri = 0;

    targetStudents.forEach(({ student: s, mine }) => {
      // Student section header row (merged across all columns)
      const info = [
        s.name ?? "", s.nickname ? `(${s.nickname})` : "",
        s.level ? LEVEL_LABEL[s.level] : "", s.school ?? "",
      ].filter(Boolean).join("  ·  ");
      const sectionRow: (string | number)[] = [info, ...Array(detailCols.length - 1).fill("")];
      s2Rows.push(sectionRow);
      merges.push({ s: { r: ri, c: 0 }, e: { r: ri, c: detailCols.length - 1 } });
      ri++;

      // Column header
      s2Rows.push(detailCols);
      ri++;

      // Report rows sorted by date
      [...mine].sort((a, b) => a.date.localeCompare(b.date)).forEach(r => {
        const crit = avgPerCriteria(r.evaluations);
        const ov = overallAvg(r.evaluations);
        s2Rows.push([
          r.date.slice(0, 10),
          truncate(r.title, 50),
          truncate(r.location ?? "", 25),
          truncate(r.description, 100),
          truncate(r.learned ?? "", 80),
          truncate(r.solution ?? "", 80),
          truncate(r.result ?? "", 80),
          truncate((r.tools ?? []).join(", "), 50),
          truncate((r.ppe ?? []).join(", "), 60),
          STATUS_LABEL[r.status] ?? r.status,
          r.evaluations.length,
          ov != null ? +ov.toFixed(2) : "",
          ...SCORE_CRITERIA.map(c => crit[c.key] != null ? +crit[c.key].toFixed(2) : ""),
        ]);
        ri++;
      });

      // Blank separator
      s2Rows.push(Array(detailCols.length).fill(""));
      ri++;
    });

    const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
    ws2["!merges"] = merges;
    ws2["!cols"] = [
      { wch: 12 }, { wch: 38 }, { wch: 20 },
      { wch: 42 }, { wch: 38 }, { wch: 38 }, { wch: 38 },
      { wch: 32 }, { wch: 38 },
      { wch: 12 }, { wch: 9 }, { wch: 10 },
      ...CRITERIA_SHORT.map(() => ({ wch: 12 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "ผลการประเมินรายบุคคล");
    XLSX.utils.book_append_sheet(wb, ws2, "รายการบันทึกฝึกงาน");
    XLSX.writeFile(wb, `SNTrainee_${name}_${date}.xlsx`);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "#003E8E" }}>รายงาน</h1>
      <p className="text-sm text-gray-500 mb-5">วิเคราะห์และดาวน์โหลดข้อมูลการฝึกงาน</p>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "บันทึกทั้งหมด", value: totalReports, sub: `ประเมินแล้ว ${scoredReports}`, icon: "📋", color: "#003E8E" },
          { label: "คะแนนเฉลี่ยรวม", value: globalAvg != null ? globalAvg.toFixed(2) : "—", sub: "จากทุกรายการ", icon: "⭐", color: "#059669" },
          { label: "นักศึกษาฝึกงาน", value: students.length, sub: `${allEvals.length} การประเมิน`, icon: "👤", color: "#7C3AED" },
        ].map(({ label, value, sub, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
            <span className="text-lg">{icon}</span>
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs font-medium text-gray-600">{label}</div>
            <div className="text-xs text-gray-400">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Radar chart cards per student ── */}
      {studentStats.some(s => s.allEvals.length > 0) && (
        <div className="mb-6">
          <h2 className="text-base font-bold mb-3" style={{ color: "#003E8E" }}>ผลการประเมินรายบุคคล</h2>
          <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
            {studentStats.filter(s => s.allEvals.length > 0).map(({ student: s, mine, criteria, overall }) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                {/* Student header */}
                <div className="flex items-center gap-2 mb-3">
                  {s.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={s.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: "#003E8E" }}>
                      {(s.name ?? "?")[0]}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-800 text-sm leading-tight">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.nickname ? `(${s.nickname}) · ` : ""}{s.level ? LEVEL_LABEL[s.level] : ""}</div>
                  </div>
                  {overall != null && (
                    <div className="ml-auto text-right">
                      <div className="text-xl font-bold" style={{ color: "#003E8E" }}>{overall.toFixed(1)}</div>
                      <div className="text-xs text-gray-400">/ 5.0</div>
                    </div>
                  )}
                </div>

                {/* Radar + scores side by side */}
                <div className="flex items-center gap-3">
                  <RadarChart scores={criteria} size={148} />
                  <div className="flex-1 space-y-1.5">
                    {SCORE_CRITERIA.map((c, i) => {
                      const v = criteria[c.key] ?? null;
                      const { bg, fg } = ScoreColor(v);
                      return (
                        <div key={c.key} className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 w-14 shrink-0 truncate">{CRITERIA_SHORT[i]}</span>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            {v != null && (
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${(v / 5) * 100}%`, background: fg }} />
                            )}
                          </div>
                          <span className="text-xs font-bold w-6 text-right" style={{ color: fg }}>
                            {v != null ? v.toFixed(1) : "—"}
                          </span>
                        </div>
                      );
                    })}
                    <div className="text-xs text-gray-400 pt-1">{mine.length} บันทึก</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Comparison table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "#003E8E" }}>ตารางเปรียบเทียบรายหมวด</h2>
            <p className="text-xs text-gray-400">ถ่วงน้ำหนักตามจำนวนรายงานที่ส่ง · ตรงกับหน้าภาพรวม · สเกล 1–5</p>
          </div>
          <button onClick={() => exportXlsx("ALL")}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium text-white"
            style={{ background: "#003E8E" }}>
            ⬇ ดาวน์โหลด Excel (.xlsx)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr style={{ background: "#F8FAFF" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-40">นักศึกษาฝึกงาน</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500">บันทึก</th>
                {SCORE_CRITERIA.map((c, i) => (
                  <th key={c.key} className="px-3 py-3 text-center text-xs font-semibold text-gray-500">{CRITERIA_SHORT[i]}</th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">เฉลี่ยรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {studentStats.map(({ student: s, mine, criteria, overall }, rank) => {
                const { bg: overallBg, fg: overallFg } = ScoreColor(overall);
                return (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-300 w-4">#{rank + 1}</span>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{s.name}</div>
                          {s.nickname && <div className="text-xs text-gray-400">({s.nickname})</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-500 text-sm">{mine.length}</td>
                    {SCORE_CRITERIA.map(c => {
                      const v = criteria[c.key] ?? null;
                      const { bg, fg } = ScoreColor(v);
                      return (
                        <td key={c.key} className="px-3 py-3 text-center">
                          {v != null ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color: fg }}>
                                {v.toFixed(1)}
                              </span>
                              <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(v / 5) * 100}%`, background: fg }} />
                              </div>
                            </div>
                          ) : <span className="text-gray-200 text-xs">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      {overall != null ? (
                        <span className="font-bold text-sm px-2.5 py-1 rounded-full" style={{ background: overallBg, color: overallFg }}>
                          {overall.toFixed(2)}
                        </span>
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Export ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-bold mb-1" style={{ color: "#003E8E" }}>ดาวน์โหลดข้อมูล</h2>
        <p className="text-xs text-gray-400 mb-4">ไฟล์ Excel 2 sheets — ผลการประเมินรายบุคคล + รายการบันทึกฝึกงาน (จัดหมวดตามนักศึกษา)</p>
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white flex-1 min-w-[180px]">
            <option value="ALL">ทุกคน (รวมทั้งหมด)</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}{s.nickname ? ` (${s.nickname})` : ""}</option>)}
          </select>
          <button onClick={() => exportXlsx(selectedStudentId)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium text-white whitespace-nowrap"
            style={{ background: "#059669" }}>
            ⬇ Excel (.xlsx)
          </button>
          <button onClick={() => exportPptx(selectedStudentId, reports, students).catch(e => alert(e.message))}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium text-white whitespace-nowrap"
            style={{ background: "#7C3AED" }}>
            ⬇ PowerPoint (.pptx)
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Excel: สรุปคะแนน + รายการบันทึก · PowerPoint: ใช้แบบฟอร์มรายงาน (ข้อมูลส่วนตัว + บันทึกรายงานทีละสไลด์)
        </p>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

const ROLE_ORDER = ["ADMIN", "MENTOR", "STUDENT", "EXECUTIVE"] as const;
const ROLE_SECTION_LABEL: Record<string, string> = { ADMIN: "ผู้ดูแลระบบ", MENTOR: "พี่เลี้ยง", STUDENT: "นักศึกษาฝึกงาน", EXECUTIVE: "ผู้สังเกตการณ์" };
const ROLE_SECTION_COLOR: Record<string, string> = { ADMIN: "#7C3AED", MENTOR: "#003E8E", STUDENT: "#059669", EXECUTIVE: "#B45309" };

function UsersTab({ users, readOnly, onSetRole, onDetail }: { users: U[]; readOnly: boolean; onSetRole: (id: string, role: string) => void; onDetail: (u: U) => void }) {
  const grouped = ROLE_ORDER.map(role => ({ role, list: users.filter(u => u.role === role) })).filter(g => g.list.length > 0);

  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "#003E8E" }}>ผู้ใช้งาน</h1>
      <p className="text-sm text-gray-500 mb-6">คลิกชื่อเพื่อดูรายละเอียด</p>

      <div className="space-y-6">
        {grouped.map(({ role, list }) => (
          <div key={role}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: ROLE_SECTION_COLOR[role] }}>
                {ROLE_SECTION_LABEL[role]}
              </span>
              <span className="text-xs text-gray-400">{list.length} คน</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "#F4F6FB" }}>
                  <tr><Th>ชื่อ</Th><Th>ชื่อเล่น</Th><Th>อีเมล</Th><Th>ระดับ</Th><Th>สถานศึกษา</Th><Th>สิทธิ์</Th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map(u => (
                    <tr key={u.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => onDetail(u)}>
                      <Td>
                        <div className="flex items-center gap-2">
                          {u.image ? <img src={u.image} className="w-6 h-6 rounded-full" alt="" /> : <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">{u.name?.[0]}</div>}
                          <span className="font-medium text-gray-800 hover:underline">{u.name}</span>
                        </div>
                      </Td>
                      <Td className="text-gray-500">{u.nickname ?? <span className="text-gray-300">—</span>}</Td>
                      <Td className="text-gray-500 text-xs">{u.email}</Td>
                      <Td>{u.level ? LEVEL_LABEL[u.level] : <span className="text-gray-300">—</span>}</Td>
                      <Td>{u.school ?? <span className="text-gray-300">—</span>}</Td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {readOnly
                          ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#EEF2FF", color: "#003E8E" }}>{ROLE_LABEL[u.role]}</span>
                          : (
                            <select value={u.role} onChange={e => onSetRole(u.id, e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

function UserDetailModal({ user: u, reports, readOnly, meId, onEdit, onDelete, onClose }: {
  user: U; reports: Rep[]; readOnly: boolean; meId: string;
  onEdit: (userId: string, data: Partial<U>) => Promise<boolean>;
  onDelete: (userId: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const mine = reports.filter(r => r.user.id === u.id);
  const allEvals = mine.flatMap(r => r.evaluations);
  const avg = overallAvg(allEvals);

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: u.name ?? "", nickname: u.nickname ?? "", role: u.role,
    level: u.level ?? "PVC", school: u.school ?? "", advisor: u.advisor ?? "",
    startDate: u.startDate ? u.startDate.slice(0, 10) : "",
    endDate: u.endDate ? u.endDate.slice(0, 10) : "",
  });
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  const isStudent = form.role === "STUDENT";

  const save = async () => {
    if (!form.name.trim()) return alert("กรุณากรอกชื่อ");
    setBusy(true);
    const ok = await onEdit(u.id, {
      name: form.name, nickname: form.nickname, role: form.role,
      level: isStudent ? form.level : null,
      school: isStudent ? form.school : null,
      advisor: isStudent ? form.advisor : null,
      startDate: isStudent && form.startDate ? form.startDate : null,
      endDate: isStudent && form.endDate ? form.endDate : null,
    });
    setBusy(false);
    if (ok) setEditing(false);
  };

  const del = async () => {
    if (!confirm(`ลบผู้ใช้ "${u.name}" ?\nรายงานและการประเมินทั้งหมดของผู้ใช้จะถูกลบด้วย และไม่สามารถกู้คืนได้`)) return;
    setBusy(true);
    const ok = await onDelete(u.id);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4" style={{ background: "linear-gradient(135deg, #003E8E, #002d7a)" }}>
          <div className="flex items-center gap-4">
            {u.image ? <img src={u.image} className="w-16 h-16 rounded-full ring-2 ring-white/30" alt="" />
              : <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">{u.name?.[0]}</div>}
            <div>
              <p className="text-white font-bold text-lg">{u.name}</p>
              {u.nickname && <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>&quot;{u.nickname}&quot;</p>}
              <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block" style={{ background: "rgba(255,192,0,0.25)", color: "#FFC000" }}>{ROLE_LABEL[u.role]}</span>
            </div>
          </div>
        </div>

        {editing ? (
          /* ── Edit form ── */
          <div className="p-6 space-y-3">
            <Field label="ชื่อ-สกุล *">
              <input value={form.name} onChange={e => set({ name: e.target.value })} className="ipt" />
            </Field>
            <Field label="ชื่อเล่น">
              <input value={form.nickname} onChange={e => set({ nickname: e.target.value })} className="ipt" />
            </Field>
            <Field label="สิทธิ์การใช้งาน">
              <select value={form.role} onChange={e => set({ role: e.target.value })} className="ipt">
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            {isStudent && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ระดับ">
                    <select value={form.level} onChange={e => set({ level: e.target.value })} className="ipt">
                      {Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="สถานศึกษา">
                    <input value={form.school} onChange={e => set({ school: e.target.value })} className="ipt" />
                  </Field>
                </div>
                <Field label="อาจารย์นิเทศ">
                  <input value={form.advisor} onChange={e => set({ advisor: e.target.value })} className="ipt" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="เริ่มฝึก">
                    <input type="date" value={form.startDate} onChange={e => set({ startDate: e.target.value })} className="ipt" />
                  </Field>
                  <Field label="สิ้นสุด">
                    <input type="date" value={form.endDate} onChange={e => set({ endDate: e.target.value })} className="ipt" />
                  </Field>
                </div>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <button disabled={busy} onClick={save} className="flex-1 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#1a56c4,#003E8E)" }}>{busy ? "กำลังบันทึก..." : "บันทึก"}</button>
              <button disabled={busy} onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">ยกเลิก</button>
            </div>
            <style jsx>{`.ipt{width:100%;border:1px solid #e5e7eb;border-radius:0.6rem;padding:0.5rem 0.7rem;font-size:0.875rem;outline:none;background:#fff}.ipt:focus{border-color:#1a56c4}`}</style>
          </div>
        ) : (
          /* ── View ── */
          <>
            <div className="p-6 space-y-3 text-sm">
              <DR label="อีเมล" value={u.email} />
              {u.level && <DR label="ระดับ" value={LEVEL_LABEL[u.level]} />}
              {u.school && <DR label="สถานศึกษา" value={u.school} />}
              {u.advisor && <DR label="อ.นิเทศ" value={u.advisor} />}
              {u.startDate && <DR label="เริ่มฝึก" value={new Date(u.startDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })} />}
              {u.endDate && <DR label="สิ้นสุด" value={new Date(u.endDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })} />}

              <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: "1px solid #f3f4f6" }}>
                <StatCard label="รายงาน" value={mine.length} />
                <StatCard label="ถูกประเมิน" value={allEvals.length + " ครั้ง"} />
                <StatCard label="คะแนนดิบ" value={avg != null ? avg.toFixed(2) : "—"} />
              </div>
            </div>

            <div className="px-6 pb-6 space-y-2">
              {!readOnly && (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(true)} className="flex-1 text-white py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: "linear-gradient(135deg,#1a56c4,#003E8E)" }}>✏️ แก้ไขข้อมูล</button>
                  {u.id !== meId && (
                    <button disabled={busy} onClick={del} className="px-4 py-2.5 rounded-xl font-medium text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                      ลบ
                    </button>
                  )}
                </div>
              )}
              <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm">ปิด</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

// ─── Eval Modal ───────────────────────────────────────────────────────────────

function EvalModal({ report, myExisting, onClose, onDone }: {
  report: Rep; myExisting: EvalRecord | null;
  onClose: () => void; onDone: (reportId: string, ev: EvalRecord) => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>(
    myExisting?.scores ?? Object.fromEntries(SCORE_CRITERIA.map(c => [c.key, 3]))
  );
  const [comment, setComment] = useState(myExisting?.comment ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, scores, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error ?? `บันทึกไม่สำเร็จ (${res.status})`); return; }
      onDone(report.id, data);
    } catch (e) {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-0.5">ประเมินงาน</h2>
        <p className="text-sm text-gray-500 mb-1">{report.user.name}{report.user.nickname ? ` (${report.user.nickname})` : ""}</p>
        <p className="text-xs text-gray-400 mb-4">{report.date.slice(0, 10)}</p>

        {/* Report details */}
        <div className="rounded-xl border border-blue-100 mb-5 overflow-hidden text-sm">
          <div className="px-4 py-3" style={{ background: "linear-gradient(135deg,#003E8E,#0052b4)" }}>
            <p className="font-bold text-white text-base leading-snug">{report.title}</p>
            {report.location && <p className="text-blue-200 text-xs mt-0.5">📍 {report.location}</p>}
          </div>
          <div className="divide-y divide-gray-100">
            <RDa label="รายละเอียดงาน" icon="📋">{report.description}</RDa>
            {report.learned && <RDa label="ปัญหาที่พบ" icon="⚠️">{report.learned}</RDa>}
            {report.solution && <RDa label="วิธีแก้ปัญหา" icon="🔧">{report.solution}</RDa>}
            {report.result && <RDa label="ผลลัพธ์และสิ่งที่ได้รับ" icon="✅">{report.result}</RDa>}
            {(report.tools ?? []).length > 0 && (
              <div className="px-4 py-3 bg-white">
                <p className="text-xs font-semibold text-gray-500 mb-2">🔩 เครื่องมือ/อุปกรณ์ที่ใช้</p>
                <div className="flex flex-wrap gap-1.5">
                  {(report.tools ?? []).map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#EEF2FF", color: "#003E8E" }}>{t}</span>)}
                </div>
              </div>
            )}
            {(report.ppe ?? []).length > 0 && (
              <div className="px-4 py-3 bg-white">
                <p className="text-xs font-semibold text-gray-500 mb-2">🦺 อุปกรณ์ป้องกันที่ใช้</p>
                <div className="flex flex-wrap gap-1.5">
                  {(report.ppe ?? []).map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#FEF9C3", color: "#92400E" }}>{t}</span>)}
                </div>
              </div>
            )}
            {report.images?.length > 0 && (
              <div className="px-4 py-3 bg-white">
                <p className="text-xs font-semibold text-gray-500 mb-2">📷 รูปภาพประกอบ</p>
                <div className="flex flex-wrap gap-2">
                  {report.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`รูป ${i + 1}`} className="h-24 w-auto rounded-lg object-cover border border-gray-200" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm font-medium text-gray-700 mb-3">คะแนนแต่ละหมวด (1–5)</p>
        <div className="space-y-4 mb-4">
          {SCORE_CRITERIA.map(c => (
            <div key={c.key}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">{c.label}</span>
                <span className="font-bold text-lg" style={{ color: "#003E8E" }}>{scores[c.key]}</span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(v => (
                  <button key={v} onClick={() => setScores({ ...scores, [c.key]: v })}
                    className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={scores[c.key] === v ? { background: "#003E8E", color: "#fff" } : { background: "#F4F6FB", color: "#6b7280" }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">ความเห็น / ข้อเสนอแนะ</label>
        <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none mb-5"
          placeholder="ข้อเสนอแนะสำหรับนักศึกษา..." />

        <div className="flex gap-3">
          <button disabled={busy} onClick={submit}
            className="flex-1 text-white py-2.5 rounded-xl font-medium disabled:opacity-50"
            style={{ background: "#003E8E" }}>
            {busy ? "กำลังบันทึก..." : myExisting ? "อัปเดตคะแนน" : "บันทึกคะแนน"}
          </button>
          <button disabled={busy} onClick={onClose} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">ปิด</button>
        </div>
      </div>
    </div>
  );
}

function RDa({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 bg-white">
      <p className="text-xs font-semibold text-gray-500 mb-1">{icon} {label}</p>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{children as string}</p>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function DR({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}

// ─── Announce Tab ─────────────────────────────────────────────────────────────

type AnnItem = { id: string; title: string; body: string; target: string; pinned: boolean; createdAt: string; author: string; read: boolean };

const TARGET_OPTIONS = [
  { value: "ALL",       label: "ทุกคน" },
  { value: "STUDENT",   label: "นักศึกษาฝึกงาน" },
  { value: "MENTOR",    label: "พี่เลี้ยง" },
  { value: "ADMIN",     label: "ผู้ดูแล" },
  { value: "EXECUTIVE", label: "ผู้บริหาร" },
];
const TARGET_BADGE: Record<string, { bg: string; fg: string }> = {
  ALL:       { bg: "#EEF4FF", fg: "#003E8E" },
  STUDENT:   { bg: "#ECFDF5", fg: "#059669" },
  MENTOR:    { bg: "#FFF7ED", fg: "#C2410C" },
  ADMIN:     { bg: "#F5F3FF", fg: "#7C3AED" },
  EXECUTIVE: { bg: "#FEF3C7", fg: "#92400E" },
};

function AnnounceTab({ readOnly }: { readOnly: boolean }) {
  const [items, setItems] = useState<AnnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("ALL");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/announcements");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, target, pinned }),
    });
    if (res.ok) {
      setTitle(""); setBody(""); setTarget("ALL"); setPinned(false);
      setShowForm(false);
      await load();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`เกิดข้อผิดพลาด: ${err.error ?? res.status}`);
    }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("ลบประกาศนี้?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(a => a.id !== id));
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#003E8E" }}>📢 ประกาศ</h1>
          <p className="text-sm text-gray-400">ส่งประกาศถึงผู้ใช้งานในระบบ</p>
        </div>
        {!readOnly && (
          <button onClick={() => setShowForm(o => !o)}
            className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-sm"
            style={{ background: "linear-gradient(135deg,#1a56c4,#003E8E)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            สร้างประกาศ
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">สร้างประกาศใหม่</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">หัวข้อ *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="หัวข้อประกาศ"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">เนื้อหา *</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="รายละเอียดประกาศ..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">ส่งถึง</label>
                <select value={target} onChange={e => setTarget(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                  {TARGET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="w-4 h-4 accent-blue-700" />
                  <span className="text-sm text-gray-600">📌 ปักหมุด</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={submit} disabled={saving || !title.trim() || !body.trim()}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#1a56c4,#003E8E)" }}>
                {saving ? "กำลังส่ง..." : "ส่งประกาศ"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">ยังไม่มีประกาศ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => {
            const badge = TARGET_BADGE[a.target] ?? { bg: "#F3F4F6", fg: "#6B7280" };
            const targetLabel = TARGET_OPTIONS.find(o => o.value === a.target)?.label ?? a.target;
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {a.pinned && <span className="text-sm">📌</span>}
                        <h3 className="font-semibold text-gray-800 text-sm">{a.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: badge.bg, color: badge.fg }}>
                          {targetLabel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                      <p className="text-xs text-gray-400 mt-2">{a.author} · {fmtDate(a.createdAt)}</p>
                    </div>
                    {!readOnly && (
                      <button onClick={() => del(a.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg border border-red-100 hover:border-red-300 transition-colors shrink-0">
                        ลบ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
const I = (d: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
function IconGrid()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function IconClipboard() { return I("M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"); }
function IconExport()    { return I("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"); }
function IconUsers()     { return I("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7 4a4 4 0 0 1 4 4v2"); }
function IconMega()      { return I("M3 11l19-9-9 19-2-8-8-2zM22 2 11 13"); }
function IconQuiz()      { return I("M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6m-6 4h4"); }
function IconClock()     { return I("M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v5l3 3"); }

// ─── Attendance Tab ───────────────────────────────────────────────────────────
type AttendanceStudent = {
  id: string; name: string | null; nickname: string | null;
  checkedIn: boolean; checkInTime: string | null; onLeave: boolean; status: "มา" | "ลา" | "ขาด";
};
type AttendanceLeave = {
  id: string; userId: string; startDate: string; endDate: string; reason: string; createdAt: string;
  user: { id: string; name: string | null; nickname: string | null };
};

type MonthlyCheckIn = { userId: string; date: string };
type MonthlyLeave = { id: string; userId: string; startDate: string; endDate: string; reason: string; user: { id: string; name: string | null; nickname: string | null } };
type MonthlyData = { students: { id: string; name: string | null; nickname: string | null; startDate: string | null; endDate: string | null }[]; checkIns: MonthlyCheckIn[]; leaves: MonthlyLeave[] };

function statusLabel(s: "มา" | "ลา" | "ขาด") {
  return s === "มา" ? "✅ มา" : s === "ลา" ? "📋 ลา" : "❌ ขาด";
}
function statusStyle(s: "มา" | "ลา" | "ขาด") {
  return s === "มา" ? { bg: "#DCFCE7", color: "#16A34A" }
    : s === "ลา" ? { bg: "#FEF3C7", color: "#D97706" }
    : { bg: "#FEE2E2", color: "#DC2626" };
}

function AttendanceTab() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const thisMonth = today.slice(0, 7);

  const [view, setView] = useState<"daily" | "monthly">("daily");

  // ── Daily state ──────────────────────────────────────────────────────────────
  const [date, setDate] = useState(today);
  const [dailyData, setDailyData] = useState<{ students: AttendanceStudent[]; leaves: AttendanceLeave[] } | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // userId being edited
  const [saving, setSaving] = useState(false);
  const [cancellingLeave, setCancellingLeave] = useState<string | null>(null);
  const [leaveView, setLeaveView] = useState<"today" | "all">("today");

  const loadDaily = (d: string) => {
    setDailyLoading(true);
    fetch(`/api/attendance?date=${d}`).then(r => r.json()).then(setDailyData).finally(() => setDailyLoading(false));
  };
  useEffect(() => { loadDaily(date); }, [date]);

  const cancelLeave = async (id: string) => {
    if (!confirm("ยกเลิกวันลานี้?")) return;
    setCancellingLeave(id);
    try {
      const res = await fetch(`/api/leave/${id}`, { method: "DELETE" });
      if (res.ok) loadDaily(date);
      else alert((await res.json().catch(() => ({}))).error ?? "ยกเลิกไม่สำเร็จ");
    } finally { setCancellingLeave(null); }
  };

  const changeStatus = async (userId: string, currentStatus: string) => {
    if (currentStatus === "ลา") return; // leave-managed, can't override here
    const action = currentStatus === "มา" ? "uncheckin" : "checkin";
    setSaving(true);
    await fetch("/api/attendance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, date, action }) });
    setSaving(false);
    setEditing(null);
    loadDaily(date);
  };

  // ── Monthly state ─────────────────────────────────────────────────────────────
  const [month, setMonth] = useState(thisMonth);
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => {
    if (view !== "monthly") return;
    setMonthlyLoading(true);
    fetch(`/api/attendance?month=${month}`).then(r => r.json()).then(setMonthlyData).finally(() => setMonthlyLoading(false));
  }, [month, view]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  const fmtTime = (s: string) => new Date(s).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  // ── Monthly helpers ───────────────────────────────────────────────────────────
  function daysInMonth(ym: string) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }

  function getDayStatus(data: MonthlyData, userId: string, dayStr: string): "มา" | "ลา" | "ขาด" {
    const d = new Date(dayStr);
    const onLeave = data.leaves.some(l => l.userId === userId && new Date(l.startDate) <= d && d <= new Date(l.endDate));
    if (onLeave) return "ลา";
    const checkedIn = data.checkIns.some(c => c.userId === userId && c.date.slice(0, 10) === dayStr);
    return checkedIn ? "มา" : "ขาด";
  }

  const exportMonthly = () => {
    if (!monthlyData) return;
    const [y, m] = month.split("-").map(Number);
    const days = daysInMonth(month);
    const dayNums = Array.from({ length: days }, (_, i) => i + 1);

    // Build rows
    const headerRow = ["ชื่อ-สกุล", "ชื่อเล่น", ...dayNums.map(d => String(d)), "มา", "ลา", "ขาด"];
    const dataRows = monthlyData.students.map(s => {
      const counts = { มา: 0, ลา: 0, ขาด: 0 };
      const dayCells = dayNums.map(d => {
        const dayStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const st = getDayStatus(monthlyData, s.id, dayStr);
        counts[st]++;
        return st === "มา" ? "✓" : st === "ลา" ? "ลา" : "×";
      });
      return [s.name ?? "", s.nickname ?? "", ...dayCells, counts.มา, counts.ลา, counts.ขาด];
    });

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    // Column widths
    ws["!cols"] = [{ wch: 22 }, { wch: 12 }, ...dayNums.map(() => ({ wch: 4 })), { wch: 5 }, { wch: 5 }, { wch: 5 }];
    const wb = XLSX.utils.book_new();
    const monthLabel = new Date(`${month}-01`).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
    XLSX.utils.book_append_sheet(wb, ws, `เข้างาน ${monthLabel}`);
    XLSX.writeFile(wb, `attendance_${month}.xlsx`);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header + view toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-800 flex-1">บันทึกลงเวลา</h2>
        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm">
          {(["daily", "monthly"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-1.5 transition-colors"
              style={view === v ? { background: "#003E8E", color: "#fff" } : { color: "#6B7280" }}>
              {v === "daily" ? "รายวัน" : "รายเดือน"}
            </button>
          ))}
        </div>
      </div>

      {/* ── DAILY VIEW ── */}
      {view === "daily" && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={today}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm" />
            {date !== today && (
              <button onClick={() => setDate(today)} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">วันนี้</button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 justify-between">
              <p className="font-semibold text-gray-700 text-sm">การเข้างาน — {fmtDate(date)}</p>
              {!dailyLoading && dailyData && (
                <div className="flex gap-3 text-xs">
                  <span style={{ color: "#16A34A" }}>มา {dailyData.students.filter(s => s.status === "มา").length}</span>
                  <span style={{ color: "#D97706" }}>ลา {dailyData.students.filter(s => s.status === "ลา").length}</span>
                  <span style={{ color: "#DC2626" }}>ขาด {dailyData.students.filter(s => s.status === "ขาด").length}</span>
                </div>
              )}
            </div>
            {dailyLoading ? (
              <div className="py-10 text-center text-gray-400 text-sm">กำลังโหลด...</div>
            ) : !dailyData?.students.length ? (
              <div className="py-10 text-center text-gray-400 text-sm">ไม่มีนักศึกษา</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dailyData.students.map(s => {
                  const st = statusStyle(s.status as "มา" | "ลา" | "ขาด");
                  const isEditing = editing === s.id;
                  return (
                    <div key={s.id} className="flex items-center gap-2 px-3 sm:px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.nickname ?? s.name ?? "—"}</p>
                        {s.name && s.nickname && <p className="text-xs text-gray-400 truncate">{s.name}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {s.status === "มา" && s.checkInTime && (
                          <span className="text-xs text-gray-400 hidden sm:inline">{fmtTime(s.checkInTime)}</span>
                        )}
                        {isEditing ? (
                          <div className="flex gap-1">
                            {s.status !== "ลา" && (
                              <>
                                <button disabled={saving} onClick={() => changeStatus(s.id, s.status)}
                                  className="text-xs px-2 py-1 rounded-lg font-semibold border transition-colors disabled:opacity-40"
                                  style={s.status === "ขาด" ? { background: "#DCFCE7", color: "#16A34A", borderColor: "#16A34A" } : { background: "#FEE2E2", color: "#DC2626", borderColor: "#DC2626" }}>
                                  {saving ? "..." : s.status === "ขาด" ? "บันทึกมา" : "ลบการมา"}
                                </button>
                                <button onClick={() => setEditing(null)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-400">✕</button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>
                              {statusLabel(s.status as "มา" | "ลา" | "ขาด")}
                            </span>
                            {s.status !== "ลา" && (
                              <button onClick={() => setEditing(s.id)} className="text-xs text-gray-400 hover:text-gray-600 p-1">✏️</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leave requests */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
              <p className="font-semibold text-gray-700 text-sm flex-1">คำขอลา</p>
              {(["today", "all"] as const).map(v => (
                <button key={v} onClick={() => setLeaveView(v)}
                  className="text-xs px-3 py-1 rounded-full transition-colors"
                  style={leaveView === v ? { background: "#003E8E", color: "#fff" } : { color: "#6B7280" }}>
                  {v === "today" ? "วันที่เลือก" : "ทั้งหมด"}
                </button>
              ))}
            </div>
            {dailyLoading ? (
              <div className="py-8 text-center text-gray-400 text-sm">กำลังโหลด...</div>
            ) : (() => {
              const d = new Date(date);
              const displayed = leaveView === "today"
                ? (dailyData?.leaves ?? []).filter(l => new Date(l.startDate) <= d && d <= new Date(l.endDate))
                : (dailyData?.leaves ?? []);
              return !displayed.length ? (
                <div className="py-8 text-center text-gray-400 text-sm">ไม่มีคำขอลา</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {displayed.map(l => (
                    <div key={l.id} className="px-3 sm:px-5 py-3 flex items-start gap-2 sm:gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold" style={{ background: "#FEF3C7", color: "#D97706" }}>
                        {(l.user.nickname ?? l.user.name ?? "?").slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{l.user.nickname ?? l.user.name ?? "—"}</p>
                          <button onClick={() => cancelLeave(l.id)} disabled={cancellingLeave === l.id}
                            className="text-xs px-2 py-0.5 rounded-lg border shrink-0 disabled:opacity-40"
                            style={{ borderColor: "#DC2626", color: "#DC2626" }}>
                            {cancellingLeave === l.id ? "..." : "ยกเลิก"}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{l.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* ── MONTHLY VIEW ── */}
      {view === "monthly" && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} max={thisMonth}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm flex-1 min-w-[140px]" />
            <button onClick={exportMonthly} disabled={!monthlyData || monthlyLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg,#16A34A,#15803D)" }}>
              ⬇ Export Excel
            </button>
          </div>

          {monthlyLoading ? (
            <div className="py-16 text-center text-gray-400">กำลังโหลด...</div>
          ) : !monthlyData ? null : (() => {
            const [y, m] = month.split("-").map(Number);
            const days = daysInMonth(month);
            const dayNums = Array.from({ length: days }, (_, i) => i + 1);

            return (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-700 text-sm">
                    {new Date(`${month}-01`).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr style={{ background: "#F8FAFF" }}>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[100px] max-w-[140px]">ชื่อ</th>
                        {dayNums.map(d => (
                          <th key={d} className="px-1 py-2 font-semibold text-gray-500 text-center min-w-[28px]">{d}</th>
                        ))}
                        <th className="px-2 py-2 font-semibold text-center min-w-[32px]" style={{ color: "#16A34A" }}>มา</th>
                        <th className="px-2 py-2 font-semibold text-center min-w-[32px]" style={{ color: "#D97706" }}>ลา</th>
                        <th className="px-2 py-2 font-semibold text-center min-w-[32px]" style={{ color: "#DC2626" }}>ขาด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.students.map((s, si) => {
                        const counts = { มา: 0, ลา: 0, ขาด: 0 };
                        const cells = dayNums.map(d => {
                          const dayStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const st = getDayStatus(monthlyData, s.id, dayStr);
                          counts[st]++;
                          return { dayStr, st };
                        });
                        return (
                          <tr key={s.id} className={si % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                            <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 z-10 max-w-[140px]" style={{ background: si % 2 === 0 ? "#fff" : "#f9fafb" }}>
                              <div className="truncate">{s.nickname ?? s.name ?? "—"}</div>
                              {s.name && s.nickname && <div className="text-[10px] text-gray-400 truncate">{s.name}</div>}
                            </td>
                            {cells.map(({ dayStr, st }) => {
                              const c = st === "มา" ? "#16A34A" : st === "ลา" ? "#D97706" : "#E5E7EB";
                              const txt = st === "มา" ? "✓" : st === "ลา" ? "ล" : "×";
                              return (
                                <td key={dayStr} className="text-center py-2 px-0.5">
                                  <span className="text-[11px] font-bold" style={{ color: c }}>{txt}</span>
                                </td>
                              );
                            })}
                            <td className="text-center py-2 font-bold" style={{ color: "#16A34A" }}>{counts.มา}</td>
                            <td className="text-center py-2 font-bold" style={{ color: "#D97706" }}>{counts.ลา}</td>
                            <td className="text-center py-2 font-bold" style={{ color: "#DC2626" }}>{counts.ขาด}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Leave requests for month */}
                {monthlyData.leaves.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 mb-3">คำขอลาในเดือนนี้</p>
                    <div className="space-y-2">
                      {monthlyData.leaves.map(l => (
                        <div key={l.id} className="flex items-start justify-between gap-2 text-xs text-gray-600">
                          <div className="min-w-0">
                            <span className="font-medium text-gray-800">{l.user.nickname ?? l.user.name}</span>
                            <span className="text-gray-400 ml-2">{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</span>
                            <p className="text-gray-500 mt-0.5">{l.reason}</p>
                          </div>
                          <button onClick={async () => {
                            if (!confirm("ยกเลิกวันลานี้?")) return;
                            const res = await fetch(`/api/leave/${l.id}`, { method: "DELETE" });
                            if (res.ok) setMonthlyData(d => d ? { ...d, leaves: d.leaves.filter(x => x.id !== l.id) } : d);
                            else alert((await res.json().catch(() => ({}))).error ?? "ยกเลิกไม่สำเร็จ");
                          }} className="px-2 py-0.5 rounded border shrink-0" style={{ borderColor: "#DC2626", color: "#DC2626" }}>
                            ยกเลิก
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── Quiz Results Tab ─────────────────────────────────────────────────────────
type QuizAttemptRow = {
  id: string; score: number; passed: boolean; createdAt: string;
  user: { id: string; name: string | null; nickname: string | null; role: string };
  quiz: { lesson: { title: string; course: { title: string } } };
};

function QuizResultsTab() {
  const [rows, setRows] = useState<QuizAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/training/results").then(r => r.json()).then(d => { setRows(d); setLoading(false); });
  }, []);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q
      || (r.user.name ?? "").toLowerCase().includes(q)
      || (r.user.nickname ?? "").toLowerCase().includes(q)
      || r.quiz.lesson.course.title.toLowerCase().includes(q)
      || r.quiz.lesson.title.toLowerCase().includes(q);
  });

  if (loading) return <div className="py-20 text-center text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#003E8E" }}>ผลแบบทดสอบ</h2>
          <p className="text-xs text-gray-400">{rows.length} ครั้งที่ทำทั้งหมด</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ / หลักสูตร..."
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-blue-400 w-60" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400 text-sm">ไม่มีข้อมูล</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F8FAFF" }}>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">ผู้ทำ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">หลักสูตร / บทเรียน</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs">คะแนน</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs">ผล</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">วันที่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.user.nickname || r.user.name || "-"}</p>
                      {r.user.nickname && <p className="text-xs text-gray-400">{r.user.name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{r.quiz.lesson.course.title}</p>
                      <p className="text-xs text-gray-400">{r.quiz.lesson.title}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-base" style={{ color: r.passed ? "#10B981" : "#EF4444" }}>{r.score}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {r.passed ? "ผ่าน" : "ไม่ผ่าน"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-2xl font-bold" style={{ color: accent ? "#FFC000" : "#003E8E" }}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 whitespace-nowrap">{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-4 py-2.5 ${className}`}>{children}</td>; }
