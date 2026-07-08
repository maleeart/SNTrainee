import JSZip from "jszip";
import { SCORE_CRITERIA, LEVEL_LABEL, STATUS_LABEL } from "./labels";

// EMU constants (1 inch = 914400 EMUs)
const SLD_W = 12192000;
const SLD_H = 6858000;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build a text run using TH Sarabun New (proper Unicode Thai)
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

function labelLine(label: string, value: string, sz = 1600) {
  if (!value?.trim()) return "";
  return p(
    run(label, { bold: true, sz, color: "1F4E79" }) +
    run(value, { sz })
  , 2);
}

function sectionHeader(label: string) {
  return p(run(label, { bold: true, sz: 1800, color: "1F4E79" }), 6);
}

function chips(items: string[], sz = 1500) {
  if (!items.length) return "";
  return p(run(items.join("  ·  "), { sz, color: "444444" }), 1);
}

// Full text box shape XML
function textBox(x: number, y: number, cx: number, cy: number, bodyXml: string, idOffset = 10) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${idOffset}" name="Body"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" rtlCol="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>${bodyXml}</p:txBody></p:sp>`;
}

// Inject shapes into existing slide XML (before closing </p:spTree>)
function injectShapes(slideXml: string, shapesXml: string) {
  return slideXml.replace("</p:spTree>", shapesXml + "</p:spTree>");
}

// Replace subtitle body in slide1
function replaceSubtitle(slide1Xml: string, newTxBody: string) {
  // Replace the <p:txBody>...</p:txBody> inside the Subtitle shape
  return slide1Xml.replace(
    /(<p:sp>(?:(?!<\/p:sp>)[\s\S])*?Subtitle 2(?:(?!<\/p:sp>)[\s\S])*?)<p:txBody>[\s\S]*?<\/p:txBody>(<\/p:sp>)/,
    `$1${newTxBody}$2`
  );
}

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

function buildReportSlide(base: string, r: Rep, showStudent: boolean): string {
  const tools = r.tools ?? [];
  const ppe = r.ppe ?? [];
  const evals = r.evaluations ?? [];
  const criteria = avgPerCriteria(evals);
  const allNums = evals.flatMap(e => Object.values(e.scores).filter(Boolean) as number[]);
  const overall = allNums.length ? allNums.reduce((a, b) => a + b, 0) / allNums.length : null;

  let body = "";

  // Student header (ALL mode)
  if (showStudent) {
    const nm = r.user.name ?? "";
    const nn = r.user.nickname ? ` (${r.user.nickname})` : "";
    body += sectionHeader(`นักศึกษา: ${nm}${nn}`);
  }

  // Date + location
  const dateLoc = [r.date.slice(0, 10), r.location].filter(Boolean).join("  |  สถานที่: ");
  body += labelLine("วันที่: ", showStudent ? dateLoc : (r.location ? `${r.date.slice(0, 10)}  |  สถานที่: ${r.location}` : r.date.slice(0, 10)));

  // Title
  body += p(run(r.title, { bold: true, sz: 2000, color: "1F4E79" }), 4);

  // Description
  if (r.description) body += labelLine("รายละเอียด: ", r.description);

  // Problem / solution / result in one section
  if (r.learned || r.solution || r.result) {
    if (r.learned) body += labelLine("ปัญหาที่พบ: ", r.learned, 1600);
    if (r.solution) body += labelLine("วิธีแก้ไข: ", r.solution, 1600);
    if (r.result) body += labelLine("ผลลัพธ์: ", r.result, 1600);
  }

  // Tools + PPE
  if (tools.length) {
    body += p(run("เครื่องมือ: ", { bold: true, sz: 1500, color: "1F4E79" }) + run(tools.join(", "), { sz: 1500 }), 3);
  }
  if (ppe.length) {
    body += p(run("อุปกรณ์ป้องกัน: ", { bold: true, sz: 1500, color: "1F4E79" }) + run(ppe.join(", "), { sz: 1500 }), 1);
  }

  // Evaluation summary
  if (evals.length > 0 && overall != null) {
    body += p(
      run(`ผลการประเมิน: `, { bold: true, sz: 1500, color: "1F4E79" }) +
      run(`${evals.length} คน · เฉลี่ย ${overall.toFixed(2)}/5.00`, { sz: 1500, color: "444444" })
    , 4);
    const scoreStr = SCORE_CRITERIA.map(c => {
      const v = criteria[c.key];
      return v != null ? `${c.label} ${v.toFixed(1)}` : null;
    }).filter(Boolean).join("  ·  ");
    if (scoreStr) body += p(run(scoreStr, { sz: 1300, color: "666666", italic: true }), 1);
  }

  // Inject content box (below title area: y ~1400000, height fills to bottom)
  const shape = textBox(457200, 1400000, SLD_W - 914400, SLD_H - 1600000, body);
  return injectShapes(base, shape);
}

function slideContentType(name: string) {
  return `<Override PartName="/ppt/slides/${name}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
}

export async function exportPptx(
  studentId: string,
  reports: Rep[],
  students: U[]
) {
  const res = await fetch("/template-report.pptx");
  if (!res.ok) throw new Error("ไม่พบ template");
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // Read key files
  const slide1Xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
  const slide2Xml = await zip.file("ppt/slides/slide2.xml")!.async("string");
  const slide2Rels = await zip.file("ppt/slides/_rels/slide2.xml.rels")!.async("string");
  let presentXml = await zip.file("ppt/presentation.xml")!.async("string");
  let presRels = await zip.file("ppt/_rels/presentation.xml.rels")!.async("string");
  let contentTypes = await zip.file("[Content_Types].xml")!.async("string");

  // ── Slide 1: fill personal info ───────────────────────────────────────────
  const targetStudents = studentId === "ALL"
    ? students
    : students.filter(s => s.id === studentId);

  let subtitleBody: string;
  if (studentId === "ALL") {
    // Multiple students: Name (nickname) · School per line
    const lines = targetStudents.map(s => {
      const nn = s.nickname ? ` (${s.nickname})` : "";
      const lvl = s.level ? LEVEL_LABEL[s.level] + " " : "";
      const school = s.school ?? "";
      return p(
        run(`${s.name ?? ""}${nn}`, { sz: 1800, bold: true, color: "1F4E79" }) +
        run(`    ·    ${lvl}${school}`, { sz: 1600, color: "444444" })
      , 2);
    }).join("");
    subtitleBody = `<p:txBody><a:bodyPr><a:normAutofit/></a:bodyPr><a:lstStyle/>${lines}</p:txBody>`;
  } else {
    const s = targetStudents[0];
    const name = s ? `${s.name ?? ""}${s.nickname ? ` (${s.nickname})` : ""}` : "";
    const level = s?.level ? LEVEL_LABEL[s.level] : "";
    const school = s?.school ?? "";
    subtitleBody = `<p:txBody><a:bodyPr><a:normAutofit/></a:bodyPr><a:lstStyle/>` +
      p(run(name, { sz: 2200, bold: true, color: "1F4E79" })) +
      (level || school ? p(run([level, school].filter(Boolean).join("  ·  "), { sz: 1800, color: "444444" }), 3) : "") +
      `</p:txBody>`;
  }

  const newSlide1 = replaceSubtitle(slide1Xml, subtitleBody);
  zip.file("ppt/slides/slide1.xml", newSlide1);

  // ── Report slides ──────────────────────────────────────────────────────────
  const targetReports = studentId === "ALL"
    ? [...reports].sort((a, b) => a.user.id.localeCompare(b.user.id) || a.date.localeCompare(b.date))
    : reports.filter(r => r.user.id === studentId).sort((a, b) => a.date.localeCompare(b.date));

  const showStudent = studentId === "ALL";

  // Remove old slides 2, 3, 4 from zip
  ["ppt/slides/slide2.xml", "ppt/slides/slide3.xml", "ppt/slides/slide4.xml",
   "ppt/slides/_rels/slide2.xml.rels", "ppt/slides/_rels/slide3.xml.rels", "ppt/slides/_rels/slide4.xml.rels"]
    .forEach(path => zip.remove(path));

  // New slide files start at index 6
  const newSlideNames: string[] = [];
  targetReports.forEach((r, i) => {
    const name = `slide${i + 6}`;
    newSlideNames.push(name);
    const slideXml = buildReportSlide(slide2Xml, r, showStudent);
    zip.file(`ppt/slides/${name}.xml`, slideXml);
    // rels: same layout as slide2
    zip.file(`ppt/slides/_rels/${name}.xml.rels`, slide2Rels.replace("slide2", name));
  });

  // ── Update presentation.xml ────────────────────────────────────────────────
  // New slide list: slide1, newSlides..., slide5
  // Assign rIDs: slide1=rId4, new slides=rId20+, slide5=rId8 (keep as is)
  const slideRelType = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";

  // Remove old rId5,rId6,rId7 (slides 2,3,4) from presRels
  presRels = presRels
    .replace(/<Relationship Id="rId5"[^/]*\/>/g, "")
    .replace(/<Relationship Id="rId6"[^/]*\/>/g, "")
    .replace(/<Relationship Id="rId7"[^/]*\/>/g, "");

  // Add new slide relationships
  const newRelEntries = newSlideNames.map((name, i) =>
    `<Relationship Id="rId${20 + i}" Type="${slideRelType}" Target="slides/${name}.xml"/>`
  ).join("");
  presRels = presRels.replace("</Relationships>", newRelEntries + "</Relationships>");

  // Build new sldIdLst: slide1 (id=256,rId4), new slides (id=400+,rId20+), slide5 (id=335,rId8)
  const newSldIds =
    `<p:sldId id="256" r:id="rId4"/>` +
    newSlideNames.map((_, i) => `<p:sldId id="${400 + i}" r:id="rId${20 + i}"/>`).join("") +
    `<p:sldId id="335" r:id="rId8"/>`;

  presentXml = presentXml.replace(
    /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    `<p:sldIdLst>${newSldIds}</p:sldIdLst>`
  );

  zip.file("ppt/presentation.xml", presentXml);
  zip.file("ppt/_rels/presentation.xml.rels", presRels);

  // ── Update [Content_Types].xml ─────────────────────────────────────────────
  // Remove old slide2,3,4 overrides, add new ones
  contentTypes = contentTypes
    .replace(/<Override PartName="\/ppt\/slides\/slide2\.xml"[^/]*\/>/g, "")
    .replace(/<Override PartName="\/ppt\/slides\/slide3\.xml"[^/]*\/>/g, "")
    .replace(/<Override PartName="\/ppt\/slides\/slide4\.xml"[^/]*\/>/g, "");

  const newCTEntries = newSlideNames.map(slideContentType).join("");
  contentTypes = contentTypes.replace("</Types>", newCTEntries + "</Types>");
  zip.file("[Content_Types].xml", contentTypes);

  // ── Download ───────────────────────────────────────────────────────────────
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  const dateStr = new Date().toISOString().slice(0, 10);
  const label = studentId === "ALL" ? "ทั้งหมด" : (students.find(s => s.id === studentId)?.name ?? studentId);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SNTrainee_${label}_${dateStr}.pptx`;
  a.click();
}
