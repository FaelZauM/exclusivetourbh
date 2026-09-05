import { getSubpages, getPageContent, extractText, updateParagraph } from "./lib/notion.js";

const diasSemana = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];

// August 1, 2026 is Saturday (Sábado)
const semana = [6, 0, 1, 2, 3, 4, 5]; // Sábado = index 6

const dias = Array.from({ length: 31 }, (_, i) => {
  const dia = i + 1;
  const dow = semana[i % 7];
  return `${String(dia).padStart(2, "0")}/08 ${diasSemana[dow]}`;
});

async function main() {
  const pages = await getSubpages(process.env.AGENDAMENTOS_PAGE_ID);
  const agosto = pages.find((p) =>
    p.child_page?.title
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes("agosto")
  );
  if (!agosto) {
    console.error("Agosto page not found");
    process.exit(1);
  }

  console.log(`📄 ${agosto.child_page?.title} (${agosto.id})`);

  const blocks = await getPageContent(agosto.id);
  const dayBlockId = new Map();
  for (const b of blocks) {
    if (b.type !== "paragraph") continue;
    const text = extractText(b).trim().replace(/\uFE0F/g, "");
    const match = text.match(/^(\d{1,2})\//);
    if (match) {
      const dia = parseInt(match[1], 10);
      if (dia >= 1 && dia <= 31) {
        dayBlockId.set(dia, b.id);
      }
    }
  }

  console.log(`📆 Found ${dayBlockId.size} day blocks`);

  for (const [dia, id] of dayBlockId) {
    const target = dias[dia - 1];
    const current = extractText(blocks.find((b) => b.id === id)).trim().replace(/\uFE0F/g, "");
    if (current === target) continue;
    console.log(`  ${current} → ${target}`);
    await updateParagraph(id, target);
  }

  console.log("✅ Datas atualizadas sem tocar no restante do conteúdo!");
}

main();
