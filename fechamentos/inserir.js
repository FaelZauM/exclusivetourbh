import { getSubpages, getPageContent, insertAfter } from "./lib/notion.js";

// ─── Parse args ───────────────────────────────────────────────
const args = process.argv.slice(2);
let mesEspecifico = null;
let dryRun = false;

for (let i = args.length - 1; i >= 0; i--) {
  if (args[i] === "--dry-run") {
    dryRun = true;
    args.splice(i, 1);
  } else if (args[i] === "--mes" && i + 1 < args.length) {
    mesEspecifico = args[i + 1];
    args.splice(i, 2);
  }
}

if (args.length < 1) {
  console.log(`
Uso: node inserir.js "03/07 Ana Fiuza Inhotim x CNF 350"

O primeiro elemento (DD/MM) define o dia na página.
  --dry-run     preview sem salvar
  --mes junho   mês específico
`);
  process.exit(0);
}

const descricao = args.join(" ").trim();

// ─── Parse day from input ─────────────────────────────────────
const dayMatch = descricao.match(/^(\d{2})\/(\d{2})\s*/);
if (!dayMatch) {
  console.error("❌ Comece com o dia (ex: 03/07 Ana Fiuza...)");
  process.exit(1);
}

const targetDay = dayMatch[1];
const targetMonth = dayMatch[2];
const targetDayStr = `${targetDay}/${targetMonth}`;
const content = descricao.slice(dayMatch[0].length).trim();

// ─── Find month page ──────────────────────────────────────────
const meses = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// Use month from input if not specified via --mes
const mesTarget = mesEspecifico || meses[parseInt(targetMonth) - 1];
const pages = await getSubpages(process.env.AGENDAMENTOS_PAGE_ID);
const page = pages.find((p) =>
  p.child_page?.title
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .includes(mesTarget)
);

if (!page) {
  console.error(`❌ Mês "${mesTarget}" não encontrado`);
  process.exit(1);
}

console.log(`📄 ${page.child_page?.title}`);

// ─── Find last entry for target day ───────────────────────────
const blocks = await getPageContent(page.id);
let targetBlockId = null;
let foundDay = false;
const DAY_RE = /^(\d{2})\/(\d{2})\b/;

for (const b of blocks) {
  const text = b.paragraph?.rich_text?.map((r) => r.plain_text).join("") || "";
  const dm = text.match(DAY_RE);

  if (dm) {
    const dayStr = `${dm[1]}/${dm[2]}`;
    if (dayStr === targetDayStr) {
      foundDay = true;
      targetBlockId = b.id; // Mark the day marker itself
      continue;
    }
    // If we hit the next day, stop
    if (foundDay) break;
  }

  // Track the last non-empty block under the target day
  if (foundDay && text.trim()) {
    targetBlockId = b.id;
  }
}

if (!foundDay) {
  console.error(`❌ Dia "${targetDayStr}" não encontrado na página`);
  process.exit(1);
}

// ─── Preview ──────────────────────────────────────────────────
console.log(`📍 Inserindo após "${targetDayStr}": ${content}`);
if (dryRun) {
  console.log(`\n🔍 Dry-run — nada salvo`);
  process.exit(0);
}

// ─── Insert after day marker ──────────────────────────────────
await insertAfter(page.id, targetBlockId, [content]);
console.log(`✅ Inserido em "${page.child_page?.title}"`);
