"use client";

import { useRef, useEffect, useState, useCallback } from "react";

type Person = { id: string; label: string; isMentor?: boolean };

const PALETTE = [
  "#003E8E","#1a56c4","#2563eb","#1d4ed8","#0052a3",
  "#7C3AED","#6D28D9","#5B21B6",
  "#059669","#047857","#065f46",
  "#B45309","#92400E","#78350f",
  "#C2410C","#9A3412","#7c2d12",
];

function easeOut(t: number) { return 1 - Math.pow(1 - t, 4); }

function drawWheel(
  ctx: CanvasRenderingContext2D,
  people: Person[],
  angle: number,
  size: number,
) {
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 6;
  const n = people.length;
  if (n === 0) return;
  const seg = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, size, size);

  // Shadow under wheel
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();

  // Segments
  people.forEach((p, i) => {
    const start = angle + seg * i - Math.PI / 2;
    const end = start + seg;
    const color = p.isMentor ? "#FFC000" : PALETTE[i % PALETTE.length];

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + seg / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = p.isMentor ? "#003E8E" : "rgba(255,255,255,0.95)";
    const fontSize = n <= 6 ? 15 : n <= 10 ? 13 : 11;
    ctx.font = `${p.isMentor ? "800" : "600"} ${fontSize}px 'TH Sarabun New', sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 3;

    // Truncate long names
    const maxW = r * 0.72;
    let label = p.label;
    ctx.measureText(label).width > maxW && (label = label.slice(0, 8) + "…");
    ctx.fillText(label, r - 12, fontSize * 0.38);
    ctx.restore();
  });

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#0D1F3C";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center icon
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFC000";
  ctx.fillText("🎡", cx, cy);
}

function drawPointer(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const r = size / 2 - 6;
  // Triangle pointing down into the wheel from the top
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, r + 2);
  ctx.lineTo(cx - 13, -4);
  ctx.lineTo(cx + 13, -4);
  ctx.closePath();
  ctx.fillStyle = "#FFC000";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export default function SpinWheel({ people, onClose }: {
  people: Person[];
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const animRef = useRef<number>(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Person | null>(null);

  const SIZE = typeof window !== "undefined" && window.innerWidth < 500 ? 300 : 420;

  const draw = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    drawWheel(ctx, people, angle, SIZE);
    drawPointer(ctx, SIZE);
  }, [people, SIZE]);

  useEffect(() => { draw(angleRef.current); }, [draw]);

  const spin = useCallback(() => {
    if (spinning || people.length === 0) return;
    setWinner(null);
    setSpinning(true);

    const extraRotations = 6 + Math.random() * 5;           // 6-11 full turns
    const extraAngle = Math.random() * Math.PI * 2;          // random stop
    const totalDelta = extraRotations * Math.PI * 2 + extraAngle;
    const duration = 4200;
    const startAngle = angleRef.current;
    const targetAngle = startAngle + totalDelta;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOut(t);
      angleRef.current = startAngle + totalDelta * eased;
      draw(angleRef.current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        angleRef.current = targetAngle % (Math.PI * 2);
        setSpinning(false);

        // Determine winner: pointer is at top (–π/2 from canvas zero)
        // Segment i starts at: angle + seg*i - π/2
        // After full rotation, the pointer at angle 0 (top of canvas)
        // sits at relative angle: (0 - (angleRef.current - π/2) ) mod 2π
        const n = people.length;
        const seg = (Math.PI * 2) / n;
        const norm = ((Math.PI / 2 - (angleRef.current % (Math.PI * 2))) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const idx = Math.floor(norm / seg) % n;
        setWinner(people[idx]);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [spinning, people, draw]);

  useEffect(() => () => { animRef.current && cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(13,31,60,0.97)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎡</span>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Spin!</h2>
            <p className="text-white/40 text-xs">สุ่มเลือกผู้ลองปฏิบัติงาน</p>
          </div>
        </div>
        <button onClick={onClose}
          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Wheel area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: "block", filter: spinning ? "drop-shadow(0 0 24px rgba(255,192,0,0.35))" : "none", transition: "filter 0.3s" }} />
        </div>

        {/* Spin button */}
        <button onClick={spin} disabled={spinning || people.length === 0}
          className="px-12 py-4 rounded-2xl font-black text-lg tracking-wide transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: spinning ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#FFC000,#ffaa00)",
            color: spinning ? "rgba(255,255,255,0.4)" : "#0D1F3C",
            boxShadow: spinning ? "none" : "0 8px 32px rgba(255,192,0,0.4)",
          }}>
          {spinning ? "กำลังสุ่ม..." : "🎯  หมุนเลย!"}
        </button>

        {/* People count hint */}
        <p className="text-white/30 text-xs">{people.length} คนในวงล้อ</p>
      </div>

      {/* Winner popup */}
      {winner && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center"
            style={{ animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            {/* Color top strip */}
            <div className="py-6" style={{ background: winner.isMentor ? "#FFC000" : "linear-gradient(135deg,#003E8E,#1a56c4)" }}>
              <div className="text-5xl mb-2">{winner.isMentor ? "😂" : "🎉"}</div>
              <p className="text-sm font-semibold" style={{ color: winner.isMentor ? "#0D1F3C" : "rgba(255,255,255,0.8)" }}>
                {winner.isMentor ? "โอ้โห! พี่เลี้ยงเองโดน!" : "ถูกเลือกแล้ว!"}
              </p>
            </div>
            <div className="px-8 py-6">
              <p className="text-3xl font-black text-gray-900 mb-1">{winner.label}</p>
              <p className="text-sm text-gray-400 mb-6">
                {winner.isMentor ? "ครั้งนี้พี่ลองทำเองนะ 😄" : "คราวนี้เป็นคิวของคุณแล้ว!"}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setWinner(null)} className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white"
                  style={{ background: "linear-gradient(135deg,#003E8E,#1a56c4)" }}>
                  ตกลง
                </button>
                <button onClick={() => { setWinner(null); setTimeout(spin, 100); }}
                  className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">
                  สุ่มใหม่
                </button>
              </div>
            </div>
          </div>
          <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}`}</style>
        </div>
      )}
    </div>
  );
}
