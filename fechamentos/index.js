import "dotenv/config";
import { getPageContent, getSubpages, getPageTitle, extractEntries } from "./lib/notion.js";
import { calculateFechamento } from "./lib/calculator.js";

const PAGE_ID = process.env.AGENDAMENTOS_PAGE_ID;

async function main() {
  console.log("📋 Fechamentos - Automação de Agendamentos 2026\n");

  const parentTitle = await getPageTitle(PAGE_ID);
  console.log(`📍 Página principal: ${parentTitle}\n`);

  const subpages = await getSubpages(PAGE_ID);
  console.log(`📂 Subpáginas encontradas: ${subpages.length}\n`);

  const results = [];

  for (const page of subpages) {
    const pageId = page.id;
    const title = page.child_page?.title || "Sem título";
    console.log(`  ─── ${title} ───`);

    const blocks = await getPageContent(pageId);
    const entries = extractEntries(blocks);

    if (entries.length === 0) { console.log(`     ⚠️  Sem entradas\n`); continue; }

    const calc = calculateFechamento(entries);

    console.log(`     📌 Fechamento Sugerido:`);
    console.log(`     Cliente (🔹):   R$ ${fmt(calc.clienteParticular)}`);
    console.log(`     Faturado (🏢):   R$ ${fmt(calc.corporativo)}`);
    console.log(`     Ultra (🔸):     R$ ${fmt(calc.ultra)}`);
    console.log(`     CEDAC (🔺):     R$ ${fmt(calc.cedac)}`);
    console.log(`     Uber:           R$ ${fmt(calc.uber)}`);
    console.log(`     Taxímetro:      R$ ${fmt(calc.taximetro)}`);
    console.log(`     Repasses:       R$ ${fmt(calc.repasses)}`);
    console.log(`     Gasolina:       R$ ${fmt(calc.gasolina)}`);
    console.log(`     ───────────────────────`);
    console.log(`     Total Receita:  R$ ${fmt(calc.receitaTotal)}`);
    console.log(`     Despesas:       R$ ${fmt(calc.despesas)}`);
    console.log(`     Líquido:        R$ ${fmt(calc.liquido)}`);
    console.log(``);

    results.push({ title, pageId, calc, entries });
  }

  if (results.length > 0) {
    const totalReceita = results.reduce((s, r) => s + r.calc.receitaTotal, 0);
    const totalLiquido = results.reduce((s, r) => s + r.calc.liquido, 0);
    const totalRepasses = results.reduce((s, r) => s + r.calc.repasses, 0);

    console.log(`  ═══════════════════════════════════`);
    console.log(`  📊 RESUMO GERAL`);
    console.log(`  Receita total:  R$ ${fmt(totalReceita)}`);
    console.log(`  Líquido total:  R$ ${fmt(totalLiquido)}`);
    console.log(`  Repasses:       R$ ${fmt(totalRepasses)}`);
    console.log(`  Meta receita:   R$ 350.000,00`);
    console.log(`  Progresso:      ${((totalReceita / 350000) * 100).toFixed(1)}%`);
    console.log(``);

    await saveResults(results, totalReceita, totalLiquido);
  }
}

async function saveResults(results, totalReceita, totalLiquido) {
  const fs = await import("fs/promises");
  await fs.writeFile(
    "./data.json",
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      meta: { receita: 350000, liquido: 250000 },
      totalReceita,
      totalLiquido,
      meses: results.map((r) => ({
        titulo: r.title,
        pageId: r.pageId,
        ...r.calc,
      })),
    }, null, 2)
  );
  console.log("  💾 Dados exportados para data.json");
}

function fmt(n) {
  return n.toFixed(2).replace(".", ",");
}

main().catch(console.error);
