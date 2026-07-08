import JSZip from "jszip";
import { SCORE_CRITERIA, LEVEL_LABEL, STATUS_LABEL } from "./labels";

// ─── EMU constants ────────────────────────────────────────────────────────────
const SLD_W = 12192000;
const SLD_H = 6858000;
// Left "white" content area (slideLayout2 has decoration on the right)
const CONTENT_X = 457200;   // left margin
const CONTENT_Y = 1650000;  // below title
const CONTENT_W = 6800000;  // safe area width (ends before diagonal decoration)
const CONTENT_H = SLD_H - CONTENT_Y - 200000; // to bottom margin

// ─── XML helpers ─────────────────────────────────────────────────────────────
function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// TH Sarabun New run (Unicode Thai, matches theme accent colors)
function run(
  text: string,
  opts: { bold?: boolean; sz?: number; color?: string; italic?: boolean } = {}
) {
  const { bold = false, sz = 1800, color = "2D2D2D", italic = false } = opts;
  if (!text) return "";
  return `<a:r><a:rPr lang="th-TH" sz="${sz}"${bold ? ' b="1"' : ""}${italic ? ' i="1"' : ""} dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="TH Sarabun New"/><a:cs typeface="TH Sarabun New"/></a:rPr><a:t>${esc(text)}</a:t></a:r>`;
}

function p(content: string, spacePts = 0) {
  const spc = spacePts > 0 ? `<a:pPr><a:spcBef><a:spcPts val="${spacePts * 100}"/></a:spcBef></a:pPr>` : "";
  return `<a:p>${spc}${content}</a:p>`;
}

// Hanging-indent paragraph: label + tab + value, wrapped lines align after the colon
function labelLine(label: string, value: string, sz = 1600) {
  if (!value?.trim()) return "";
  // tab stop at ~1350000 EMU (~1.5") — wide enough for longest Thai label at sz1600
  const TAB = 1350000;
  const pPr = `<a:pPr marL="${TAB}" indent="-${TAB}"><a:spcBef><a:spcPts val="200"/></a:spcBef><a:tabLst><a:tab pos="${TAB}" algn="l"/></a:tabLst></a:pPr>`;
  const tabRun = `<a:r><a:rPr lang="th-TH" sz="${sz}" dirty="0"><a:latin typeface="TH Sarabun New"/><a:cs typeface="TH Sarabun New"/></a:rPr><a:t>&#9;</a:t></a:r>`;
  return `<a:p>${pPr}${run(label, { bold: true, sz, color: "1F4E79" })}${tabRun}${run(value, { sz })}</a:p>`;
}

function sectionHeader(label: string) {
  return p(run(label, { bold: true, sz: 1800, color: "1F4E79" }), 6);
}

function textBox(x: number, y: number, cx: number, cy: number, bodyXml: string, id = 10) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Body${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" rtlCol="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>${bodyXml}</p:txBody></p:sp>`;
}

function picShape(rId: string, x: number, y: number, cx: number, cy: number, id: number) {
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Img${id}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

function injectShapes(slideXml: string, shapesXml: string) {
  return slideXml.replace("</p:spTree>", shapesXml + "</p:spTree>");
}

// Replace the title text in a cloned slide2 XML
function replaceTitleText(slideXml: string, newTitle: string) {
  return slideXml.replace(
    /(<p:sp>[\s\S]*?ph type="title"[\s\S]*?<a:t>)[^<]*([\s\S]*?<\/a:t>[\s\S]*?<\/p:sp>)/,
    `$1${esc(newTitle)}$2`
  );
}

// Replace subtitle body in slide1
function replaceSubtitle(slide1Xml: string, newTxBody: string) {
  return slide1Xml.replace(
    /(<p:sp>(?:(?!<\/p:sp>)[\s\S])*?Subtitle 2(?:(?!<\/p:sp>)[\s\S])*?)<p:txBody>[\s\S]*?<\/p:txBody>(<\/p:sp>)/,
    `$1${newTxBody}$2`
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Rep = {
  id: string; date: string; title: string; description: string;
  location: string | null; tools: string[] | null; ppe: string[] | null; images: string[];
  learned: string | null; solution: string | null; result: string | null;
  status: string;
  user: { id: string; name: string | null; nickname: string | null; level: string | null; school: string | null };
  evaluations: { id: string; mentorId: string; scores: Record<string, number>; comment: string | null; mentor: { id: string; name: string | null; nickname: string | null } }[];
};
type U = { id: string; name: string | null; nickname: string | null; level: string | null; school: string | null };

function avgPerCriteria(evals: Rep["evaluations"]) {
  if (!evals.length) return {} as Record<string, number>;
  return Object.fromEntries(SCORE_CRITERIA.map(c => [
    c.key,
    evals.reduce((s, e) => s + (e.scores[c.key] ?? 0), 0) / evals.length,
  ]));
}

// ─── Image helpers ────────────────────────────────────────────────────────────
function parseImageDims(data: Uint8Array, ext: string): { w: number; h: number } {
  try {
    if (ext === "png") {
      // PNG IHDR: bytes 16-19 = width, 20-23 = height (big-endian)
      const w = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
      const h = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
      if (w > 0 && h > 0) return { w, h };
    } else {
      // JPEG: scan for SOF0/SOF1/SOF2 marker (FF C0/C1/C2)
      for (let i = 0; i < data.length - 8; i++) {
        if (data[i] === 0xff && (data[i + 1] === 0xc0 || data[i + 1] === 0xc1 || data[i + 1] === 0xc2)) {
          const h = (data[i + 5] << 8) | data[i + 6];
          const w = (data[i + 7] << 8) | data[i + 8];
          if (w > 0 && h > 0) return { w, h };
        }
      }
    }
  } catch { /* ignore */ }
  return { w: 4, h: 3 }; // fallback 4:3
}

// Fit image into slot maintaining aspect ratio; returns EMU x/y offsets and dims
function fitInSlot(
  imgW: number, imgH: number,
  slotX: number, slotY: number, slotW: number, slotH: number
): { x: number; y: number; cx: number; cy: number } {
  const scale = Math.min(slotW / imgW, slotH / imgH);
  const cx = Math.round(imgW * scale);
  const cy = Math.round(imgH * scale);
  const x = slotX + Math.round((slotW - cx) / 2);
  const y = slotY + Math.round((slotH - cy) / 2);
  return { x, y, cx, cy };
}

async function fetchImageBytes(url: string): Promise<{ data: Uint8Array; ext: string; dims: { w: number; h: number } } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    const ext = ct.includes("png") ? "png" : "jpg";
    const buf = await res.arrayBuffer();
    const data = new Uint8Array(buf);
    const dims = parseImageDims(data, ext);
    return { data, ext, dims };
  } catch {
    return null;
  }
}

// ─── Build a single report slide ─────────────────────────────────────────────
async function buildReportSlide(
  base: string,
  r: Rep,
  showStudent: boolean,
  zip: JSZip,
  slideIndex: number,
): Promise<{ xml: string; rels: string }> {
  const tools = r.tools ?? [];
  const ppe = r.ppe ?? [];
  const evals = r.evaluations ?? [];
  const criteria = avgPerCriteria(evals);
  const allNums = evals.flatMap(e => Object.values(e.scores).filter(Boolean) as number[]);
  const overall = allNums.length ? allNums.reduce((a, b) => a + b, 0) / allNums.length : null;
  const images = r.images ?? [];

  // ── Fetch and embed images ─────────────────────────────────────────────────
  const embeddedImages: { rId: string; ext: string; dims: { w: number; h: number } }[] = [];
  const relEntries: string[] = [
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/>`,
  ];

  for (let i = 0; i < images.length; i++) {
    const img = await fetchImageBytes(images[i]);
    if (!img) continue;
    const mediaName = `export_s${slideIndex}_i${i}.${img.ext}`;
    zip.file(`ppt/media/${mediaName}`, img.data);
    const rId = `rId${10 + i}`;
    relEntries.push(
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName}"/>`
    );
    embeddedImages.push({ rId, ext: img.ext, dims: img.dims });
  }

  const rels = `<?xml version="1.0" encoding="utf-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relEntries.join("")}</Relationships>`;

  // ── Update slide title to report date + title ───────────────────────────────
  let slideXml = replaceTitleText(base, `${r.date.slice(0, 10)}  ${r.title}`);

  // ── Build body text ─────────────────────────────────────────────────────────
  let body = "";

  if (showStudent) {
    const nm = r.user.name ?? "";
    const nn = r.user.nickname ? ` (${r.user.nickname})` : "";
    body += sectionHeader(`นักศึกษา: ${nm}${nn}`);
  }

  if (r.location) body += labelLine("สถานที่: ", r.location);
  if (r.description) body += labelLine("รายละเอียด: ", r.description, 1600);

  if (r.learned || r.solution || r.result) {
    if (r.learned) body += labelLine("ปัญหาที่พบ: ", r.learned, 1500);
    if (r.solution) body += labelLine("วิธีแก้ไข: ", r.solution, 1500);
    if (r.result) body += labelLine("ผลลัพธ์: ", r.result, 1500);
  }

  if (tools.length)
    body += p(run("เครื่องมือ: ", { bold: true, sz: 1500, color: "1F4E79" }) + run(tools.join(", "), { sz: 1500 }), 3);
  if (ppe.length)
    body += p(run("อุปกรณ์ป้องกัน: ", { bold: true, sz: 1500, color: "1F4E79" }) + run(ppe.join(", "), { sz: 1500 }), 1);

  if (evals.length > 0 && overall != null) {
    body += p(
      run("ผลการประเมิน: ", { bold: true, sz: 1500, color: "1F4E79" }) +
      run(`${evals.length} คน · เฉลี่ย ${overall.toFixed(2)}/5.00`, { sz: 1500, color: "444444" }),
      4
    );
    const scoreStr = SCORE_CRITERIA.map(c => criteria[c.key] != null ? `${c.label} ${criteria[c.key].toFixed(1)}` : null).filter(Boolean).join("  ·  ");
    if (scoreStr) body += p(run(scoreStr, { sz: 1300, color: "666666", italic: true }), 1);
  }

  // ── Layout: text box + image shapes ────────────────────────────────────────
  let shapes = "";
  const hasImages = embeddedImages.length > 0;
  const IMG_GAP = 120000; // gap between images (EMU ~0.13")
  // Hard bottom limit — must not exceed slide height minus bottom margin
  const BOTTOM_LIMIT = SLD_H - 250000;

  if (!hasImages) {
    shapes += textBox(CONTENT_X, CONTENT_Y, CONTENT_W, CONTENT_H, body, 10);
  } else if (embeddedImages.length <= 2) {
    // Text left ~54%, images stacked right — aspect-ratio fitted, centered in slot
    const textCx = Math.round(CONTENT_W * 0.54);
    const imgAreaX = CONTENT_X + textCx + IMG_GAP;
    const imgAreaW = CONTENT_W - textCx - IMG_GAP;
    const n = embeddedImages.length;
    const slotH = Math.floor((CONTENT_H - (n - 1) * IMG_GAP) / n);

    shapes += textBox(CONTENT_X, CONTENT_Y, textCx, CONTENT_H, body, 10);
    embeddedImages.forEach(({ rId, dims }, i) => {
      const slotY = CONTENT_Y + i * (slotH + IMG_GAP);
      const fit = fitInSlot(dims.w, dims.h, imgAreaX, slotY, imgAreaW, slotH);
      // Clamp bottom edge
      if (fit.y + fit.cy > BOTTOM_LIMIT) {
        const overflow = fit.y + fit.cy - BOTTOM_LIMIT;
        fit.cy = Math.max(fit.cy - overflow, 100000);
      }
      shapes += picShape(rId, fit.x, fit.y, fit.cx, fit.cy, 20 + i);
    });
  } else {
    // Text top ~46%, images in a centered row at bottom — max 4, aspect-ratio fitted
    const textCy = Math.round(CONTENT_H * 0.46);
    const imgAreaY = CONTENT_Y + textCy + IMG_GAP;
    const imgAreaH = Math.min(CONTENT_H - textCy - IMG_GAP, BOTTOM_LIMIT - imgAreaY);
    const shown = embeddedImages.slice(0, 4);
    const n = shown.length;
    const slotW = Math.floor((CONTENT_W - (n - 1) * IMG_GAP) / n);

    shapes += textBox(CONTENT_X, CONTENT_Y, CONTENT_W, textCy, body, 10);

    // First pass: compute each image's fitted height within its slot
    // then use the tallest to set uniform row height, re-clamped to imgAreaH
    const fits = shown.map(({ dims }, i) => {
      const slotX = CONTENT_X + i * (slotW + IMG_GAP);
      return fitInSlot(dims.w, dims.h, slotX, imgAreaY, slotW, imgAreaH);
    });
    const rowH = Math.min(Math.max(...fits.map(f => f.cy)), imgAreaH);

    shown.forEach(({ rId, dims }, i) => {
      const slotX = CONTENT_X + i * (slotW + IMG_GAP);
      const fit = fitInSlot(dims.w, dims.h, slotX, imgAreaY, slotW, rowH);
      shapes += picShape(rId, fit.x, fit.y, fit.cx, fit.cy, 20 + i);
    });
  }

  const xml = injectShapes(slideXml, shapes);
  return { xml, rels };
}

// ─── Helpers for presentation manifest ───────────────────────────────────────
function slideContentType(name: string) {
  return `<Override PartName="/ppt/slides/${name}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function exportPptx(studentId: string, reports: Rep[], students: U[]) {
  const res = await fetch("/template-report.pptx");
  if (!res.ok) throw new Error("ไม่พบ template");
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const slide1Xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
  const slide2Xml = await zip.file("ppt/slides/slide2.xml")!.async("string");
  let presentXml = await zip.file("ppt/presentation.xml")!.async("string");
  let presRels = await zip.file("ppt/_rels/presentation.xml.rels")!.async("string");
  let contentTypes = await zip.file("[Content_Types].xml")!.async("string");

  // ── Slide 1: fill personal info ────────────────────────────────────────────
  const targetStudents = studentId === "ALL" ? students : students.filter(s => s.id === studentId);

  let subtitleBody: string;
  if (studentId === "ALL") {
    const lines = targetStudents.map(s => {
      const nn = s.nickname ? ` (${s.nickname})` : "";
      const lvl = s.level ? LEVEL_LABEL[s.level] + " " : "";
      return p(
        run(`${s.name ?? ""}${nn}`, { sz: 1800, bold: true, color: "1F4E79" }) +
        run(`    ·    ${lvl}${s.school ?? ""}`, { sz: 1600, color: "444444" })
      , 2);
    }).join("");
    subtitleBody = `<p:txBody><a:bodyPr><a:normAutofit/></a:bodyPr><a:lstStyle/>${lines}</p:txBody>`;
  } else {
    const s = targetStudents[0];
    const name = s ? `${s.name ?? ""}${s.nickname ? ` (${s.nickname})` : ""}` : "";
    const level = s?.level ? LEVEL_LABEL[s.level] : "";
    const school = s?.school ?? "";
    subtitleBody =
      `<p:txBody><a:bodyPr><a:normAutofit/></a:bodyPr><a:lstStyle/>` +
      p(run(name, { sz: 2200, bold: true, color: "1F4E79" })) +
      (level || school ? p(run([level, school].filter(Boolean).join("  ·  "), { sz: 1800, color: "444444" }), 3) : "") +
      `</p:txBody>`;
  }

  zip.file("ppt/slides/slide1.xml", replaceSubtitle(slide1Xml, subtitleBody));

  // ── Build report slides ────────────────────────────────────────────────────
  const targetReports = studentId === "ALL"
    ? [...reports].sort((a, b) => a.user.id.localeCompare(b.user.id) || a.date.localeCompare(b.date))
    : reports.filter(r => r.user.id === studentId).sort((a, b) => a.date.localeCompare(b.date));

  const showStudent = studentId === "ALL";

  // Remove old slides 2-4 from zip
  [2, 3, 4].forEach(n => {
    zip.remove(`ppt/slides/slide${n}.xml`);
    zip.remove(`ppt/slides/_rels/slide${n}.xml.rels`);
  });

  // New slides start at index 6
  const newSlideNames: string[] = [];
  for (let i = 0; i < targetReports.length; i++) {
    const name = `slide${i + 6}`;
    newSlideNames.push(name);
    const { xml, rels } = await buildReportSlide(slide2Xml, targetReports[i], showStudent, zip, i);
    zip.file(`ppt/slides/${name}.xml`, xml);
    zip.file(`ppt/slides/_rels/${name}.xml.rels`, rels);
  }

  // ── Update presentation.xml ────────────────────────────────────────────────
  const slideRelType = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";

  // Remove old rId5,6,7 (slides 2,3,4)
  presRels = presRels
    .replace(/<Relationship Id="rId5"[^/]*\/>/g, "")
    .replace(/<Relationship Id="rId6"[^/]*\/>/g, "")
    .replace(/<Relationship Id="rId7"[^/]*\/>/g, "");

  const newRelEntries = newSlideNames.map((name, i) =>
    `<Relationship Id="rId${20 + i}" Type="${slideRelType}" Target="slides/${name}.xml"/>`
  ).join("");
  presRels = presRels.replace("</Relationships>", newRelEntries + "</Relationships>");

  const newSldIds =
    `<p:sldId id="256" r:id="rId4"/>` +
    newSlideNames.map((_, i) => `<p:sldId id="${400 + i}" r:id="rId${20 + i}"/>`).join("") +
    `<p:sldId id="335" r:id="rId8"/>`;
  presentXml = presentXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${newSldIds}</p:sldIdLst>`);

  zip.file("ppt/presentation.xml", presentXml);
  zip.file("ppt/_rels/presentation.xml.rels", presRels);

  // ── Update [Content_Types].xml ─────────────────────────────────────────────
  contentTypes = contentTypes
    .replace(/<Override PartName="\/ppt\/slides\/slide2\.xml"[^/]*\/>/g, "")
    .replace(/<Override PartName="\/ppt\/slides\/slide3\.xml"[^/]*\/>/g, "")
    .replace(/<Override PartName="\/ppt\/slides\/slide4\.xml"[^/]*\/>/g, "");

  contentTypes = contentTypes.replace(
    "</Types>",
    newSlideNames.map(slideContentType).join("") + "</Types>"
  );
  zip.file("[Content_Types].xml", contentTypes);

  // ── Download ───────────────────────────────────────────────────────────────
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  const label = studentId === "ALL" ? "ทั้งหมด" : (students.find(s => s.id === studentId)?.name ?? studentId);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SNTrainee_${label}_${dateStr}.pptx`;
  a.click();
}
