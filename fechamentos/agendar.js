#!/usr/bin/env node
import "dotenv/config";
import { getPageContent, getSubpages, appendParagraphs } from "./lib/notion.js";

// ─── Parse arguments ───────────────────────────────────────────
const args = process.argv.slice(2);
let mesEspecifico = null;
let dryRun = false;

// Extract flags
for (let i = args.length - 1; i >= 0; i--) {
  if (args[i] === "--dry-run") {
    dryRun = true;
    args.splice(i, 1);
  } else if (args[i] === "--mes" && i + 1 < args.length) {
    mesEspecifico = args[i + 1];
    args.splice(i, 2);
  }
}

let descricao = args.join(" ").trim();

if (!descricao) {
  console.log(`
📋 Agendamento Rápido — ExclusiveTour BH

Uso:
  node agendar.js "09:00 João Sion x CNF 170"
  node agendar.js "bta 09:00 Daniela / Santo Antônio x CNF 160"
  node agendar.js "ultra 09:00 Mário Jd Canadá x Lourdes 104,75"
  node agendar.js "uber 53,93"

Prefixos:
  (nenhum)   → 🔹 cliente particular
  bta/lider  → 🏢 corporativo (use / entre passageiro e rota)
  ultra      → 🔸 Ultra
  cedac      → 🔺 CEDAC
  uber       → ⚫️ Uber (despesa)
  taximetro  → 🚖 taxímetro

Repasse: "09:00 João CNF x BH 170 - Manoel 150"
Cartão:   "09:00 João CNF x BH 170 💳"
tx:       "bta 09:00 Andrea / SP x CNF 160" (adds tx automaticamente)

Flags:
  --dry-run       → só mostra, não salva
  --mes junho     → mês específico
`);
  process.exit(1);
}

// ─── Categories ────────────────────────────────────────────────
const CAT_PREFIXES = {
  bta: { emoji: "", category: "corporativo" },
  lider: { emoji: "", category: "corporativo" },
  ultra: { emoji: "🔸", category: "ultra" },
  cedac: { emoji: "🔺", category: "cedac" },
};

let category = "cliente_particular";
let emoji = "🔹";
let cleanInput = descricao.trim();

// Detect category prefix
const lower = cleanInput.toLowerCase();
for (const [prefix, config] of Object.entries(CAT_PREFIXES)) {
  if (lower.startsWith(prefix) && !lower.startsWith(prefix + "x") && !lower.startsWith(prefix + "/")) {
    category = config.category;
    emoji = config.emoji;
    cleanInput = cleanInput.slice(prefix.length).trim();
    break;
  }
}

// Detect uber/taximetro (no emoji prefix, plain input like "uber 53,93" or "taximetro 70")
if (lower.startsWith("uber") || lower.startsWith("taximetro") || lower.startsWith("taxímetro")) {
  category = lower.startsWith("uber") ? "uber" : "taximetro";
  emoji = "⚫️";
  cleanInput = cleanInput.slice(lower.startsWith("uber") ? 4 : 9).trim();
}

// ─── Parse components ──────────────────────────────────────────
// Extract repasse partner FIRST (- Driver Valor)
let repasseDriver = null;
let repasseValor = null;
const dashMatch = cleanInput.match(/-\s*(\w[\w\s]*?)\s*(\d+)[,.]?(\d{0,2})\s*$/);
if (dashMatch) {
  repasseDriver = dashMatch[1].trim();
  repasseValor = dashMatch[2] + "," + (dashMatch[3] || "00").padEnd(2, "0");
  cleanInput = cleanInput.replace(dashMatch[0], "");
}

// Check for "tx" suffix (transfer tag on BTA entries)
let txSuffix = false;
const txCheck = cleanInput.match(/tx\s*$/i);
if (txCheck) {
  txSuffix = true;
  cleanInput = cleanInput.replace(/tx\s*$/i, "").trim();
}

// Extract value (last number remaining in input)
const valueMatch = cleanInput.match(/(\d+)[,.]?(\d{0,2})\b(?!.*\d)/);
if (!valueMatch) {
  console.error("❌ Valor não encontrado. Ex: 170");
  process.exit(1);
}
const rawValue = valueMatch[1] + "," + (valueMatch[2] || "00").padEnd(2, "0");
cleanInput = cleanInput.replace(valueMatch[0], "").trim();

// Extract time (HH:MM)
let time = "";
const timeMatch = cleanInput.match(/(\d{1,2}:\d{2})/);
if (timeMatch) {
  time = timeMatch[1];
  const parts = time.split(":");
  if (parts[0].length === 1) time = "0" + time;
  cleanInput = cleanInput.replace(timeMatch[0], "").trim();
}

// Extract payment method
let payment = "";
let paymentEmoji = "";
if (cleanInput.includes("💳") || /\b(cartao|cartão)\b/i.test(cleanInput)) {
  paymentEmoji = "💳";
} else if (cleanInput.includes("💲") || /\b(dinheiro)\b/i.test(cleanInput)) {
  paymentEmoji = "💲";
}
cleanInput = cleanInput.replace(/💳|💲/g, "").replace(/\b(cartao|cartão|dinheiro)\b/gi, "").trim();

// Remaining text = passenger + route
let passengerRoute = cleanInput;

// ─── Build formatted line ──────────────────────────────────────
let line = "";

if (category === "corporativo") {
  // BTA/Líder format: use / to separate passenger from route
  let passenger, route;
  const sepIdx = passengerRoute.search(/\s*\/\s*/);
  if (sepIdx !== -1) {
    passenger = passengerRoute.slice(0, sepIdx).trim();
    route = passengerRoute.slice(sepIdx + 1).trim().replace(/^\s*\/?\s*/, "");
  } else {
    // No separator: first word = passenger, rest = route
    const words = passengerRoute.trim().split(/\s+/);
    passenger = words[0];
    route = words.slice(1).join(" ");
  }
  const corporateLabel = lower.includes("lider") ? "(Líder)" : "(BTA)";
  line = `${time ? time + " " : ""}${passenger} ${corporateLabel} - ${route} ${rawValue}${txSuffix ? "tx" : ""} ${paymentEmoji}`;
} else {
  // 🔹/🔸/🔺 format
  line = `${emoji}${time ? time + " " : ""}${passengerRoute} ${rawValue}${txSuffix ? "tx" : ""} ${paymentEmoji}`;
}

// Add repasse partner
if (repasseDriver && repasseValor) {
  line += ` - ${repasseDriver} ${repasseValor}🟡`;
}

line = line.replace(/\s+/g, " ").trim();
if (!line.endsWith("✅")) line += "✅";

// ─── Uber/taximetro format ─────────────────────────────────────
if (category === "uber") {
  line = `Uber - ${rawValue}`;
} else if (category === "taximetro") {
  line = `${rawValue} taxímetro`;
}

// ─── Find current month's page ─────────────────────────────────
async function findMonthPage(trimestreNome) {
  const subs = await getSubpages(process.env.AGENDAMENTOS_PAGE_ID);
  const mesAlvo = trimestreNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const page of subs) {
    const title = (page.child_page?.title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (title.includes(mesAlvo)) {
      return page;
    }
  }
  return null;
}

const meses = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const mesTarget = mesEspecifico || meses[new Date().getMonth()];
const page = await findMonthPage(mesTarget);

if (!page) {
  console.error(`❌ Página do mês "${mesTarget}" não encontrada.`);
  process.exit(1);
}

const pageTitle = page.child_page?.title || "";

// ─── Show preview ──────────────────────────────────────────────
console.log(`📄 Mês: ${pageTitle}`);
console.log(`📝 Preview:`);
console.log(`  ${line}`);

if (repasseDriver) {
  const val = parseFloat(repasseValor.replace(",", "."));
  const total = parseFloat(rawValue.replace(",", "."));
  const comissao = total - val;
  console.log(`   ↳ Repasse: ${repasseDriver} R$ ${repasseValor} (comissão: R$ ${comissao.toFixed(2).replace(".", ",")})`);
}

// Check for common issues
if (!time && category === "cliente_particular") {
  console.warn("  ⚠️  Sem horário");
}
if (repasseValor) {
  const r = parseFloat(repasseValor.replace(",", "."));
  const v = parseFloat(rawValue.replace(",", "."));
  if (r >= v) console.warn("  ⚠️  Repasse >= valor total");
}

// ─── Save to Notion ────────────────────────────────────────────
if (dryRun) {
  console.log(`\n🔍 Modo dry-run — nada foi salvo`);
  process.exit(0);
}

try {
  await appendParagraphs(page.id, [line]);
  console.log(`✅ Salvo em "${pageTitle}"`);
} catch (err) {
  console.error("❌ Erro ao salvar no Notion:", err.message);
  process.exit(1);
}
