import { Client } from "@notionhq/client";
import "dotenv/config";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function getPageContent(pageId) {
  const blocks = [];
  let cursor;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...response.results);
    cursor = response.next_cursor || undefined;
  } while (cursor);

  return blocks;
}

export async function getSubpages(pageId) {
  const blocks = await getPageContent(pageId);
  return blocks.filter((b) => b.type === "child_page");
}

export async function getPageTitle(pageId) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return page.properties?.title?.title?.[0]?.plain_text || "Sem título";
}

export function extractText(block) {
  if (!block || !block.type) return "";
  const content = block[block.type];
  if (!content) return "";
  const richText = content.rich_text || [];
  return richText.map((t) => t.plain_text).join("");
}

export function extractEntries(blocks) {
  const entries = [];
  const manualLines = []; // manual fechamento lines with lump-sum values

  for (const block of blocks) {
    if (block.type !== "paragraph" && block.type !== "to-do") continue;
    const text = extractText(block);
    if (!text.trim()) continue;

    const line = text.trim().replace(/\uFE0F/g, '');

    if (line.match(/^Km\s/i)) continue;
    if (line.match(/^CEDAC\s+/i)) continue;
    if (line.match(/^[📊💰✅❌📈📉]/u)) continue;
    if (line.match(/^[─=]{10,}/)) continue;
    if (line.includes("Fechamento Automático") || line.includes("Resumo Automático")) continue;
    if (line.match(/^[🔹🔸🔺🏢🚕🚖⚫️🟡⛽]\s*(Clientes|Ultra|CEDAC|Corporativo|Táxi|Taxímetro|Uber|Repasses|Gasolina|Receita|Líquido):/u)) continue;

    // Collect lump-sum values from manual fechamento blocks
    const fechamentoMatch = line.match(/^(Uber|Aluguel\s*QUB|Hospedagem|Pedágio|Total\s*Gasolina|Taxímetro):?\s*R?\$?([\d.]+,\d{2})/i);
    if (fechamentoMatch) {
      const label = fechamentoMatch[1].toLowerCase().replace(/\s+/g, '');
      const val = parseValue(fechamentoMatch[2]);
      if (label === "uber") {
        manualLines.push({ category: "uber", value: val });
      } else if (label.includes("aluguel") || label.includes("pedágio") || label.includes("pedagio") || label.includes("hospedagem")) {
        const cat = label.replace(/[^a-záéíóúãõç]/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, '');
        manualLines.push({ category: cat, value: val });
      } else if (label === "totalgasolina") {
        manualLines.push({ category: "gasolina", value: val });
      } else if (label === "taxímetro" || label === "taximetro") {
        manualLines.push({ category: "taximetro", value: val });
      }
      continue;
    }

    // Skip other manual fechamento lines (we derive these from individual entries)
    if (line.match(/^(Faturado:|Cliente:|Parceiros:|Ultra\s|Ultra\s*Tx:)/i)) continue;
    if (line.match(/^Total:|^Passados:|^Liquido:|^Km\s|^Total (Faturados|Liquido|Passados|de km)/i)) continue;
    if (line.match(/^Hospedagem:\s*$/i)) continue; // empty hospedagem line

    const CAT_MAP = {
      "🔹": "cliente_particular",
      "🔸": "ultra",
      "🔺": "cedac",
      "🚕": "taxi",
      "🚖": "taximetro",
    };

    const symbol = line.match(/^([🔹🔸🔺🚕🚖])/u)?.[1];
    let category = symbol ? CAT_MAP[symbol] : classifyByContent(line);

    const gasMatch = line.match(/([\d.]+,\d{2})G$/);
    if (gasMatch) {
      entries.push({ raw: line, category: "gasolina", value: parseValue(gasMatch[1]) });
      continue;
    }

    const values = [...line.matchAll(/(?:\$)?([\d.]+,\d{2})/g)];
    if (values.length === 0) continue;

    if (category === "gasolina" || category === "uber" || category === "taximetro") {
      entries.push({ raw: line, category, value: parseValue(values[0][1]), isExpense: true });
      continue;
    }

    const hasRepasse = line.includes("🟡") || line.includes("⚫") || /\b(Manoel|Roberto)\b/i.test(line);

    entries.push({
      raw: line,
      category: category || "cliente_particular",
      value: parseValue(values[0][1]),
      repasse: hasRepasse,
      repasseValor: hasRepasse && values.length > 1 ? parseValue(values[values.length - 1][1]) : 0,
      metodo: line.includes("💳") ? "cartao" : line.includes("💲") ? "dinheiro" : "nao_especificado",
    });
  }

  // Merge manual fechamento values into entries
  const manualCats = {};
  for (const m of manualLines) {
    if (!manualCats[m.category]) manualCats[m.category] = 0;
    manualCats[m.category] += m.value;
  }

  const categoriesToReplace = ["uber", "taximetro", "gasolina"];
  const categoriesToAdd = ["aluguelqub", "pedagio", "hospedagem"];

  for (const [cat, total] of Object.entries(manualCats)) {
    if (categoriesToReplace.includes(cat)) {
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].category === cat) {
          entries.splice(i, 1);
        }
      }
      entries.push({
        raw: `📋 ${cat}: R$ ${total.toFixed(2).replace('.', ',')}`,
        category: cat,
        value: total,
        isExpense: cat !== "gasolina",
        repasse: false,
        repasseValor: 0,
        metodo: "nao_especificado",
      });
    }
  }

  // Add lump-sum expense entries for categories not derived from individual entries
  for (const cat of categoriesToAdd) {
    if (manualCats[cat] && manualCats[cat] > 0) {
      entries.push({
        raw: `📋 ${cat}: R$ ${manualCats[cat].toFixed(2).replace('.', ',')}`,
        category: cat,
        value: manualCats[cat],
        isExpense: true,
        repasse: false,
        repasseValor: 0,
        metodo: "nao_especificado",
      });
    }
  }

  return entries;
}

function classifyByContent(line) {
  const lower = line.toLowerCase();
  const clean = lower.replace(/^[🔹🔸🔺🚕🚖⚫️🟡✅💳💲🗒️]+\s*/u, "");

  if (line.match(/G$/)) return "gasolina";
  if (clean.startsWith("uber")) return "uber";
  if (lower.includes("taxímetro") || lower.includes("taximetro")) return "taximetro";

  const isCorporate = (str) =>
    lower.includes(`(${str.toLowerCase()})`);
  const corporate = ["bta", "líder", "lider", "cedac"];
  if (corporate.some((c) => isCorporate(c))) return "corporativo";

  if (isCorporate("solymar") || isCorporate("ricardo") ||
      isCorporate("gleydson") || isCorporate("gleyson") ||
      isCorporate("rafa") || isCorporate("marcus") ||
      isCorporate("carioca") || isCorporate("joaquim") ||
      isCorporate("santarelli")) return "ultra";

  if (lower.includes("tx") || lower.includes("(devo")) return "corporativo";

  return "cliente_particular";
}

export function parseValue(str) {
  const cleaned = str.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export async function appendParagraphs(pageId, texts) {
  await notion.blocks.children.append({
    block_id: pageId,
    children: texts.map((t) => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: t } }],
      },
    })),
  });
}

export async function insertAfter(pageId, afterBlockId, texts) {
  await notion.blocks.children.append({
    block_id: pageId,
    after: afterBlockId,
    children: texts.map((t) => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: t } }],
      },
    })),
  });
}

export async function updateParagraph(blockId, text) {
  await notion.blocks.update({
    block_id: blockId,
    paragraph: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  });
}

export async function deleteBlocks(blockIds) {
  for (const id of blockIds) {
    await notion.blocks.delete({ block_id: id });
  }
}
