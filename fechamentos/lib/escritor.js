import { getPageContent, getSubpages, getPageTitle, extractText, appendParagraphs, deleteBlocks } from "./notion.js";
import { calculateFechamento } from "./calculator.js";
import { extractEntries } from "./notion.js";

export async function escreverFechamentos(pageId) {
  const subpages = await getSubpages(pageId);
  const results = [];

  for (const page of subpages) {
    const pageId = page.id;
    const title = page.child_page?.title || "Sem título";

    const blocks = await getPageContent(pageId);
    const entries = extractEntries(blocks);
    if (entries.length === 0) continue;

    const calc = calculateFechamento(entries);

    // Remove old auto-generated fechamento blocks
    const oldBlockIds = [];
    let found = false;
    for (const block of blocks) {
      const text = extractText(block).trim();
      if (text === "📊 Fechamento Automático") {
        found = true;
      }
      if (found) {
        oldBlockIds.push(block.id);
      }
    }
    if (oldBlockIds.length > 0) {
      await deleteBlocks(oldBlockIds);
      console.log(`  🗑️  ${title} — ${oldBlockIds.length} blocos antigos removidos`);
    }

    const lines = [
      ``,
      `📊 Fechamento Automático`,
      `───────────────────────`,
      `🔹 Clientes:      R$ ${fmt(calc.clienteParticular)}`,
      `🏢 Corporativo:   R$ ${fmt(calc.corporativo)}`,
      `🔸 Ultra:         R$ ${fmt(calc.ultra)}`,
      `🔺 CEDAC:         R$ ${fmt(calc.cedac)}`,
      `🚕 Táxi:          R$ ${fmt(calc.taxi)}`,
      `🚖 Taxímetro:     R$ ${fmt(calc.taximetro)}`,
      `⚫️ Uber:          R$ ${fmt(calc.uber)}`,
      `🟡 Repasses:      R$ ${fmt(calc.repasses)}`,
      `⛽ Gasolina:      R$ ${fmt(calc.gasolina)}`,
      `───────────────────────`,
      `📈 Receita Total: R$ ${fmt(calc.receitaTotal)}`,
      `💰 Líquido:       R$ ${fmt(calc.liquido)}`,
      ``,
    ];

    await appendParagraphs(pageId, lines);
    console.log(`  ✅ ${title} — fechamento escrito (${entries.length} entradas)`);
    results.push({ title, ...calc });
  }

  return results;
}

function fmt(n) {
  return n.toFixed(2).replace(".", ",");
}
