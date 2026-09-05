import { Client } from "@notionhq/client";
import "dotenv/config";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function getPageContent(pageId) {
  const blocks = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...res.results);
    cursor = res.next_cursor || undefined;
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

function extractText(block) {
  if (!block || !block.type) return "";
  const content = block[block.type];
  if (!content) return "";
  const richText = content.rich_text || [];
  return richText.map((t) => t.plain_text).join("");
}

const SECTION_HEADERS = [
  "cartão de crédito",
  "financiamento",
  "débito",
  "casa",
  "empresa",
];

export function extractDespesas(blocks) {
  const despesas = [];
  let currentSection = "outros";

  for (const block of blocks) {
    const text = extractText(block).trim();
    if (!text) continue;

    const lower = text.toLowerCase().replace(/[:\s/]+/g, " ").trim();

    if (SECTION_HEADERS.some((h) => lower.includes(h))) {
      currentSection = SECTION_HEADERS.find((h) => lower.includes(h));
      if (currentSection === "cartão de crédito") currentSection = "cartao";
      if (currentSection === "financiamento") currentSection = "cartao";
      if (currentSection === "débito") currentSection = "debito";
      continue;
    }

    if (block.type !== "to_do") continue;

    const pago = block.to_do?.checked || false;
    const values = [...text.matchAll(/([\d.]+,\d{2})/g)];

    if (values.length === 0) continue;

    const valor = parseValue(values[0][1]);
    const nome = text
      .replace(/^[✅❌]\s*/, "")
      .replace(/\s*[-–—]\s*R?\$?[\d.,]+.*/, "")
      .trim();

    const diaMatch = text.match(/(\d{1,2})\s*[-–—]/);
    const dia = diaMatch ? parseInt(diaMatch[1]) : null;

    despesas.push({
      raw: text,
      nome,
      valor,
      dia,
      pago,
      section: currentSection,
    });
  }

  return despesas;
}

export function sumarizarDespesas(despesas) {
  const secoes = {};
  let totalGeral = 0;
  let pago = 0;
  let pendente = 0;

  for (const d of despesas) {
    if (!secoes[d.section]) secoes[d.section] = { total: 0, itens: 0 };
    secoes[d.section].total += d.valor;
    secoes[d.section].itens++;
    totalGeral += d.valor;
    if (d.pago) pago += d.valor;
    else pendente += d.valor;
  }

  for (const s of Object.keys(secoes)) {
    secoes[s].total = round(secoes[s].total);
  }

  return {
    secoes,
    totalGeral: round(totalGeral),
    pago: round(pago),
    pendente: round(pendente),
    qtd: despesas.length,
  };
}

function parseValue(str) {
  const cleaned = str.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
