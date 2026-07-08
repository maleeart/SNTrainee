"use client";

import { useRef, useEffect, useState, useCallback } from "react";

type Person = { id: string; label: string; isMentor?: boolean };

// On-theme cool palette (cohesive blues/teal/indigo), gold reserved for the mentor
const PALETTE = ["#003E8E", "#1557B0", "#2273C9", "#0E6B8F", "#3B4F9E", "#1C88A8"];
const GOLD = "#FFC000";
const INK = "#0D1F3C";

function easeOut(t: number) { return 1 - Math.pow(1 - t, 4); }

function drawWheel(
  ctx: CanvasRenderingContext2D,
  people: Person[],
  angle: number,
  size: number,
) {
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 3;       // gold ring outer edge
  const r = size / 2 - 15;      // segment radius (gold ring shows between r and R)
  const n = people.length;
  if (n === 0) return;
  const seg = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, size, size);

  // Gold outer ring
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.restore();

  // Segments
  people.forEach((p, i) => {
    const start = angle + seg * i - Math.PI / 2;
    const end = start + seg;
    const fill = p.isMentor ? GOLD : PALETTE[i % PALETTE.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Labels — clipped to the segment area so nothing can cross the gold ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.clip();
  people.forEach((p, i) => {
    const start = angle + seg * i - Math.PI / 2;
    const mid = start + seg / 2;
    const flip = Math.cos(mid) < 0;   // pointing to the left half → rotate 180° to stay upright

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(flip ? mid + Math.PI : mid);
    ctx.textAlign = flip ? "left" : "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = p.isMentor ? INK : "#fff";

    const HOLE = 32;
    const RIM_PAD = 20;
    const maxW = r - HOLE - RIM_PAD;
    const weight = p.isMentor ? "800" : "700";
    let fontSize = n <= 6 ? 17 : n <= 9 ? 15 : n <= 13 ? 13 : n <= 18 ? 12 : 11;
    let label = p.label;

    const fits = (fs: number, txt: string) => {
      ctx.font = `${weight} ${fs}px 'TH Sarabun New', 'Tahoma', 'Leelawadee UI', sans-serif`;
      return ctx.measureText(txt).width <= maxW;
    };
    while (fontSize > 9 && !fits(fontSize, label)) fontSize--;
    if (!fits(fontSize, label)) {
      while (label.length > 2 && !fits(fontSize, label + "…")) label = label.slice(0, -1);
      label = label + "…";
    }
    ctx.font = `${weight} ${fontSize}px 'TH Sarabun New', 'Tahoma', 'Leelawadee UI', sans-serif`;
    const x = flip ? -(r - RIM_PAD) : (r - RIM_PAD);
    ctx.fillText(label, x, 0);
    ctx.restore();
  });
  ctx.restore();   // end label clip

  // Center hub — navy disc with gold ring
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  // small gold dot in the very center
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
}

function drawPointer(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  // Small triangle at the top, pointing DOWN into the wheel
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, 26);          // apex (points into wheel)
  ctx.lineTo(cx - 12, 0);
  ctx.lineTo(cx + 12, 0);
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 5;
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export default function SpinWheel({ people, onClose, filterSlot }: {
  people: Person[];
  onClose: () => void;
  filterSlot?: React.ReactNode;
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

  useEffect(() => {
    draw(angleRef.current);
    // Redraw once the Thai webfont is ready — canvas measureText uses fallback
    // metrics until then, which mis-sizes Thai labels (they overflow the rim).
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      fonts.load("700 16px 'TH Sarabun New', 'Tahoma'").catch(() => {});
      fonts.ready.then(() => draw(angleRef.current)).catch(() => {});
    }
  }, [draw]);

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

        // Winner = segment under the top pointer (canvas angle -π/2).
        // Segment i spans [angle - π/2 + seg*i, +seg); solving for the segment
        // containing -π/2 gives idx = floor( ((-angle) mod 2π) / seg ).
        const twoPi = Math.PI * 2;
        const n = people.length;
        const seg = twoPi / n;
        const phi = ((-angleRef.current % twoPi) + twoPi) % twoPi;
        const idx = Math.floor(phi / seg) % n;
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
        <div className="flex items-center gap-2">
          {filterSlot}
          <button onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
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
