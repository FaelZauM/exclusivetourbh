import "dotenv/config";
import { getPageContent, getSubpages, getPageTitle, extractDespesas, sumarizarDespesas } from "./lib/contas.js";
import { appendParagraphs } from "./lib/notion.js";

const PAGE_ID = process.env.CONTAS_PAGE_ID;

async function main() {
  console.log("📝 Escrevendo resumo de contas no Notion...\n");

  const subpages = await getSubpages(PAGE_ID);

  for (const page of subpages) {
    const pageId = page.id;
    const title = page.child_page?.title || "Sem título";
    if (title === "Anotações") continue;

    const blocks = await getPageContent(pageId);
    const despesas = extractDespesas(blocks);
    if (despesas.length === 0) continue;

    const resumo = sumarizarDespesas(despesas);

    const lines = [
      ``,
      `📊 Resumo Automático`,
      `───────────────────────`,
      ...Object.entries(resumo.secoes).map(([sec, s]) =>
        `  ${sec}: R$ ${fmt(s.total)} (${s.itens} itens)`
      ),
      `───────────────────────`,
      `💰 Total:     R$ ${fmt(resumo.totalGeral)}`,
      `✅ Pago:      R$ ${fmt(resumo.pago)}`,
      `❌ Pendente:  R$ ${fmt(resumo.pendente)}`,
      ``,
    ];

    await appendParagraphs(pageId, lines);
    console.log(`  ✅ ${title} — resumo escrito (${despesas.length} despesas)`);
  }

  console.log(`\n✅ Concluído!`);
}

function fmt(n) {
  return n.toFixed(2).replace(".", ",");
}

main().catch(console.error);
