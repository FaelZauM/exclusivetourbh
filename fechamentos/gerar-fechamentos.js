import { getSubpages, getPageContent } from "./lib/notion.js";
import { Client } from "@notionhq/client";
import "dotenv/config";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ─── Parse args ───────────────────────────────────────────────
const args = process.argv.slice(2);
let de, ate, mesEspecifico;

for (let i = args.length - 1; i >= 0; i--) {
  if (args[i] === "--de" && i + 1 < args.length) { de = args[i + 1]; args.splice(i, 2); }
  else if (args[i] === "--ate" && i + 1 < args.length) { ate = args[i + 1]; args.splice(i, 2); }
  else if (args[i] === "--mes" && i + 1 < args.length) { mesEspecifico = args[i + 1]; args.splice(i, 2); }
}

const hoje = new Date();
const meses = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const mesTarget = mesEspecifico || meses[hoje.getMonth()];

if (!de || !ate) {
  const d = hoje.getDate();
  const m = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = String(hoje.getFullYear()).slice(-2);
  if (d <= 15) { de = `01/${m}`; ate = `15/${m}`; }
  else { ate = `${new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()}/${m}`; de = `16/${m}`; }
}

console.log(`📊 Fechamento ${de} a ${ate} — ${mesTarget}`);

// ─── Find month page ──────────────────────────────────────────
const pages = await getSubpages(process.env.AGENDAMENTOS_PAGE_ID);
const page = pages.find(p =>
  p.child_page?.title?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(mesTarget)
);
if (!page) { console.error(`❌ Mês "${mesTarget}" não encontrado`); process.exit(1); }

// ─── Read page ────────────────────────────────────────────────
const blocks = await getPageContent(page.id);
const DAY_RE = /^(\d{2})\/(\d{2})\b/;

const [deD, deM] = de.split("/").map(Number);
const [ateD, ateM] = ate.split("/").map(Number);

// Build day name map + track current day
const dayNames = {};
let currentDay = null;
const rawEntries = [];

function inRange(d, m) {
  if (m === deM) return d >= deD && d <= ateD;
  return false;
}

for (const b of blocks) {
  const t = (b.paragraph?.rich_text?.map(r => r.plain_text).join("") || "").trim();
  if (!t) currentDay = null; // empty paragraph resets day (safety)
  if (!t) continue;

  const dm = t.match(DAY_RE);
  if (dm) {
    const d = Number(dm[1]), m = Number(dm[2]);
    if (inRange(d, m)) {
      currentDay = `${dm[1]}/${dm[2]}`;
      const rest = t.slice(dm[0].length).trim();
      dayNames[currentDay] = rest.replace(/ - .*$/, "").replace(/^[- ]+/, "").trim();
    } else {
      currentDay = null;
    }
    continue;
  }

  if (!currentDay) continue;

  let cat = null;
  if (t.includes("(BTA)")) cat = "BTA";
  else if (t.includes("(Líder)") || t.includes("(Lider)")) cat = "Líder";
  else if (t.startsWith("🔺") && !t.match(/^🔺\s*CEDAC/i)) cat = "CEDAC";
  else if (t.startsWith("🔸")) cat = "Ultra";
  else if (t.startsWith("🔹") || t.startsWith("🏢")) cat = "Cliente Particular";

  if (cat) rawEntries.push({ day: currentDay, raw: t, category: cat });
}

// ─── Clean functions ──────────────────────────────────────────
function cleanBTA(s) {
  s = s.replace(/^[🔹🔸🔺🏢]\s*/u, "").replace(/✅\s*$/, "").replace(/[🟡⚫️]/gu, "").trim();
  s = s.replace(/ -(\w)/g, " - $1");

  // Find fare value (first R$,XX in the entry)
  const valMatch = s.match(/(\d+[.,]\d{2})/);
  if (!valMatch) return s;

  const fareEnd = valMatch.index + valMatch[0].length;
  const beforeFare = s.slice(0, fareEnd);
  const afterFare = s.slice(fareEnd).trim();

  // If there's " - " after the fare, it's a driver section
  if (afterFare.startsWith("- ")) {
    let driver = afterFare.slice(2).trim();
    // Strip any remaining R$,XX from driver section (repasse values)
    driver = driver.replace(/\s*\d+[.,]\d{2}/, "").trim();
    s = beforeFare + " - " + driver;
  } else {
    s = beforeFare;
  }

  s = s.replace(/\s*-\s*$/, "").trim();
  return s.replace(/\s+/g, " ").trim();
}

function cleanCEDAC(s) {
  s = s.replace(/^🔺\s*/u, "").replace(/✅\s*$/, "").replace(/[🟡⚫️]/gu, "").trim();
  // Remove repasse at end
  s = s.replace(/\s+(\d+[,.]\d{2})\s*$/, "").trim();
  // Remove last " - Name R$,XX" or " - Name - R$,XX"
  s = s.replace(/ - [\wÀ-ÿ\s]+? - \d+[,.]?\d*\s*$/, "").trim();
  s = s.replace(/ - [\wÀ-ÿ\s]+? \d+[,.]?\d*\s*$/, "").trim();
  s = s.replace(/\s*-\s*$/, "").trim();
  return s.replace(/\s+/g, " ").trim();
}

function cleanLider(s) {
  s = s.replace(/^[🔹🔸🔺🏢]\s*/u, "").replace(/✅\s*$/, "").replace(/[🟡⚫️]/gu, "").trim();
  return s.replace(/\s+/g, " ").trim();
}

function getDayName(day) { return dayNames[day] || ""; }
function fmtDay(day) { const n = getDayName(day); return n ? `${day} ${n}` : day; }

// ─── Group ────────────────────────────────────────────────────
const groups = { BTA: [], CEDAC: [], "Líder": [] };
const totals = {};

function extractValue(s) {
  // Skip "R$" prefix lines (CEDAC totals etc)
  if (s.match(/^R\$/)) return 0;
  const m = s.match(/(?:R?\$)?([\d.]+,\d{2})/);
  return m ? parseFloat(m[1].replace(/\./g, "").replace(",", ".")) : 0;
}

for (const e of rawEntries) {
  const val = extractValue(e.raw);
  if (groups[e.category]) groups[e.category].push({ ...e, val });
  totals[e.category] = (totals[e.category] || 0) + val;
}

// ─── Format functions ─────────────────────────────────────────
function fmtBTA(entries) {
  const lines = ["Fechando BTA - " + de + " - " + ate, ""];
  let cur = null, total = 0;
  for (const e of entries) {
    if (e.day !== cur) { cur = e.day; lines.push(fmtDay(e.day)); }
    lines.push(cleanBTA(e.raw));
    total += e.val;
  }
  lines.push("", "Total: R$" + total.toFixed(2).replace(".", ","));
  return lines;
}

function fmtCEDAC(entries) {
  const lines = ["CEDAC", ""];
  let cur = null, total = 0;
  for (const e of entries) {
    if (e.day !== cur) { cur = e.day; lines.push("", fmtDay(e.day)); }
    lines.push(cleanCEDAC(e.raw));
    total += e.val;
  }
  lines.push("", "Total: R$" + total.toFixed(2).replace(".", ","));
  return lines;
}

function fmtLider(entries) {
  const lines = ["Líder", ""];
  let cur = null, total = 0;
  for (const e of entries) {
    if (e.day !== cur) { cur = e.day; lines.push(fmtDay(e.day)); }
    lines.push(cleanLider(e.raw));
    total += e.val;
  }
  lines.push("", "Total: R$" + total.toFixed(2).replace(".", ","));
  return lines;
}

// ─── Build ────────────────────────────────────────────────────
const allLines = [];
const ordem = ["BTA", "CEDAC", "Líder"];
for (const cat of ordem) {
  if (groups[cat].length > 0) {
    const fns = { BTA: fmtBTA, CEDAC: fmtCEDAC, "Líder": fmtLider };
    allLines.push(...fns[cat](groups[cat]));
  }
}

allLines.push("");
const catsResumo = ["CEDAC", "BTA", "Líder", "Ultra", "Cliente Particular"];
let totalGeral = 0;
for (const cat of catsResumo) {
  const v = totals[cat] || 0;
  if (v > 0) { allLines.push(`${cat} - R$${v.toFixed(2).replace(".", ",")}`); totalGeral += v; }
}
allLines.push("", `Total: R$${totalGeral.toFixed(2).replace(".", ",")}`);

// Print
console.log("\n" + allLines.join("\n"));

// ─── Create/update subpage ────────────────────────────────────
const subTitle = "Fechamento " + de + " a " + ate;
const existing = await getSubpages(page.id);
let sub = existing.find(sp => (sp.child_page?.title || "").trim() === subTitle);

if (!sub) {
  const r = await notion.pages.create({
    parent: { page_id: page.id, type: "page_id" },
    properties: { title: { title: [{ type: "text", text: { content: subTitle } }] } },
  });
  sub = r;
  console.log(`\n📄 "${subTitle}" criada`);
} else {
  const old = await getPageContent(sub.id);
  for (const b of old) await notion.blocks.delete({ block_id: b.id });
  console.log(`\n📄 "${subTitle}" atualizada`);
}

for (let i = 0; i < allLines.length; i += 30) {
  const batch = allLines.slice(i, i + 30);
  await notion.blocks.children.append({
    block_id: sub.id,
    children: batch.map(t => ({
      object: "block", type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: t || " " } }] },
    })),
  });
}
console.log(`✅ ${allLines.length} linhas`);
