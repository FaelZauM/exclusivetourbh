import { getSubpages, getPageContent, deleteBlocks, appendParagraphs } from "./lib/notion.js";

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

const fechamento = [
  "",
  "── Fechamento ──",
  "",
  "Total Faturados: R$",
  "Total Passados: R$ + R$tx = R$",
  "Total Gasolina: R$ - Média de km/L ",
  "Total de km: ",
  "",
  "Hospedagem: ",
  "Pedágio: R$",
  "",
  "Liquido Total: R$",
  "",
  "Total Liquido: R$",
  "",
  "Total Repasses: R$",
];

// Build all lines
const lines = [];
for (const d of dias) {
  lines.push(""); // empty line before day
  lines.push(d);
}
lines.push(...fechamento);

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

  // Delete all existing blocks
  const existing = await getPageContent(agosto.id);
  const ids = existing.map((b) => b.id);
  if (ids.length > 0) {
    console.log(`🗑️  Deleting ${ids.length} blocks...`);
    await deleteBlocks(ids);
  }

  // Write new blocks
  console.log(`✍️  Writing ${lines.length} lines...`);

  // Write in batches to avoid payload limits
  const batchSize = 30;
  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize);
    await appendParagraphs(agosto.id, batch);
    console.log(`  ${Math.min(i + batchSize, lines.length)}/${lines.length}`);
  }

  console.log("✅ Agosto regenerado!");
}

main();
