import "dotenv/config";
import { getPageContent, getSubpages, extractText, extractEntries } from "./lib/notion.js";
import { calculateFechamento } from "./lib/calculator.js";

async function debugMonth(monthName) {
  const subpages = await getSubpages(process.env.AGENDAMENTOS_PAGE_ID);
  for (const page of subpages) {
    const title = page.child_page?.title || "";
    if (!title.includes(monthName)) continue;
    console.log(`\n${"=".repeat(70)}`);
    console.log(`📄 ${title}`);
    console.log(`${"=".repeat(70)}`);

    const blocks = await getPageContent(page.id);
    const entries = extractEntries(blocks);

    // Show all entries by category
    const cats = {};
    for (const e of entries) {
      if (!cats[e.category]) cats[e.category] = [];
      cats[e.category].push(e);
    }

    for (const [cat, items] of Object.entries(cats)) {
      const total = items.reduce((s, e) => s + e.value, 0);
      const hasRep = items.some(e => e.repasse);
      console.log(`\n📌 ${cat.toUpperCase()} (${items.length} itens, Total: R$${total.toFixed(2)})`);
      for (const e of items) {
        const repStr = e.repasse ? ` → repasse R$${e.repasseValor.toFixed(2)} (comissão R$${(e.value - e.repasseValor).toFixed(2)})` : "";
        console.log(`  R$${e.value.toFixed(2).padStart(8)}: ${e.raw.slice(0, 90)}${repStr}`);
      }
    }

    // Calculate and show vs manual
    const calc = calculateFechamento(entries);
    console.log(`\n${"-".repeat(70)}`);
    console.log(`📊 SCRIPT x MANUAL`);
    console.log(`${"-".repeat(70)}`);

    const line = (label, scriptVal, manualVal, unit = "R$") => {
      const s = `${unit} ${scriptVal.toFixed(2)}`;
      const m = manualVal !== undefined ? `${unit} ${manualVal.toFixed(2)}` : "N/A";
      const d = manualVal !== undefined ? (scriptVal - manualVal).toFixed(2) : "N/A";
      const icon = manualVal !== undefined ? (Math.abs(scriptVal - manualVal) < 5 ? "✅" : "⚠️") : "❓";
      console.log(`  ${icon} ${label.padEnd(22)} Script: ${s.padStart(14)} | Manual: ${m.padStart(14)} | Diff: ${d.padStart(8)}`);
    };

    line("🔹 Clientes (bruto)", calc.clienteParticular, 9590);
    line("🏢 Corporativo", calc.corporativo, 6490);
    line("🔸 Ultra", calc.ultra, 2514.75);
    line("🔺 CEDAC", calc.cedac, 0);
    line("⚫️ Uber", calc.uber, 289.92);
    line("🚖 Taxímetro", calc.taximetro, 70);
    line("🏠 Aluguel QUB", calc.aluguel, 300);
    console.log(`  ${"-".repeat(60)}`);
    line("📈 Total Faturados", calc.receitaTotal, 19254.67);
    console.log();
    line("🔄 Repasses (-)", calc.repasses, 6600);
    line("🛣️ Pedágio (-)", calc.pedagio, 313.82);
    line("🏨 Hospedagem (-)", calc.hospedagem, 221);
    console.log(`  ${"-".repeat(60)}`);
    line("💰 Líquido", calc.liquido, 12654.67);
    line("⛽ Gasolina", calc.gasolina, 2789.21);
  }
}

// Show what entries are being filtered out
async function showFiltered(monthName) {
  const subpages = await getSubpages(process.env.AGENDAMENTOS_PAGE_ID);
  for (const page of subpages) {
    const title = page.child_page?.title || "";
    if (!title.includes(monthName)) continue;

    const blocks = await getPageContent(page.id);
    console.log(`\n📋 Raw blocks for ${title}:`);
    for (const b of blocks) {
      const t = extractText(b).trim();
      if (!t) continue;
      const type = b.type;
      console.log(`  [${type}] ${t.slice(0, 120)}`);
    }
  }
}

const month = process.argv[2] || "Janeiro";
await debugMonth(month);
