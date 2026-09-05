import { getSubpages, getPageContent, deleteBlocks, appendParagraphs } from "./lib/notion.js";

const meses = [
  "janeiro","fevereiro","marco","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro",
];

const monthIdx = 8; // September
const year = "26";
const mesNome = meses[monthIdx];

// Sep 1, 2026 = Tuesday (Terça)
// Days: 0=Dom,1=Seg,2=Ter,3=Qua,4=Qui,5=Sex,6=Sab
const startDay = 2; // Terça
const diasNoMes = 30;

const diasSemana = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

const dias = Array.from({ length: diasNoMes }, (_, i) => {
  const dia = i + 1;
  const dow = (startDay + i) % 7;
  return `${String(dia).padStart(2, "0")}/09 ${diasSemana[dow]}`;
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

const lines = [];
for (const d of dias) {
  lines.push("");
  lines.push(d);
}
lines.push(...fechamento);

async function main() {
  const pages = await getSubpages(process.env.AGENDAMENTOS_PAGE_ID);
  const page = pages.find((p) =>
    p.child_page?.title
      ?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .includes(mesNome)
  );
  if (!page) { console.error(`❌ Página "${mesNome}" não encontrada`); process.exit(1); }

  console.log(`📄 ${page.child_page?.title} (${page.id})`);

  const existing = await getPageContent(page.id);
  const ids = existing.map((b) => b.id);
  if (ids.length > 0) {
    console.log(`🗑️  Deletando ${ids.length} blocos...`);
    await deleteBlocks(ids);
  }

  console.log(`✍️  Escrevendo ${lines.length} linhas...`);
  const batchSize = 30;
  for (let i = 0; i < lines.length; i += batchSize) {
    await appendParagraphs(page.id, lines.slice(i, i + batchSize));
    console.log(`  ${Math.min(i + batchSize, lines.length)}/${lines.length}`);
  }

  console.log(`✅ ${mesNome} regenerado!`);
}

main();
