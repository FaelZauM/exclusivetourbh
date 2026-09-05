import "dotenv/config";
import { getPageContent, getSubpages, getPageTitle, extractDespesas, sumarizarDespesas } from "./lib/contas.js";

const PAGE_ID = process.env.CONTAS_PAGE_ID;

async function main() {
  if (!PAGE_ID) {
    console.log("⚠️  Defina CONTAS_PAGE_ID no .env");
    process.exit(1);
  }

  const parentTitle = await getPageTitle(PAGE_ID);
  console.log(`📋 ${parentTitle}\n`);

  const subpages = await getSubpages(PAGE_ID);
  const results = [];

  for (const page of subpages) {
    const pageId = page.id;
    const title = page.child_page?.title || "Sem título";

    const blocks = await getPageContent(pageId);
    const despesas = extractDespesas(blocks);
    const resumo = sumarizarDespesas(despesas);

    console.log(`  ─── ${title} ───`);
    console.log(`     Despesas: ${despesas.length}`);
    console.log(`     Total:    R$ ${fmt(resumo.totalGeral)}`);
    console.log(`     Pago:     R$ ${fmt(resumo.pago)}`);
    console.log(`     Pendente: R$ ${fmt(resumo.pendente)}`);

    for (const [sec, s] of Object.entries(resumo.secoes)) {
      console.log(`     ├ ${sec}: R$ ${fmt(s.total)} (${s.itens} itens)`);
    }
    console.log(``);

    results.push({ titulo: title, pageId, ...resumo, despesas });
  }

  if (results.length > 0) {
    const totalGeral = results.reduce((s, r) => s + r.totalGeral, 0);
    const totalPago = results.reduce((s, r) => s + r.pago, 0);
    const totalPendente = results.reduce((s, r) => s + r.pendente, 0);

    console.log(`  ═══════════════════════════════════`);
    console.log(`  📊 RESUMO GERAL`);
    console.log(`  Total despesas: R$ ${fmt(totalGeral)}`);
    console.log(`  Total pago:     R$ ${fmt(totalPago)}`);
    console.log(`  Pendente:       R$ ${fmt(totalPendente)}`);
    console.log(``);

    const fs = await import("fs/promises");
    await fs.writeFile("./data-contas.json", JSON.stringify({
      generatedAt: new Date().toISOString(),
      totalGeral,
      totalPago,
      totalPendente,
      meses: results.map((r) => ({
        titulo: r.titulo,
        total: r.totalGeral,
        pago: r.pago,
        pendente: r.pendente,
        secoes: r.secoes,
      })),
    }, null, 2));
    console.log(`  💾 Dados salvos em data-contas.json`);
  }
}

function fmt(n) {
  return n.toFixed(2).replace(".", ",");
}

main().catch(console.error);
