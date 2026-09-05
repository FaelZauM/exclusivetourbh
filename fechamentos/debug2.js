import "dotenv/config";
import { getPageContent, getSubpages, extractText } from "./lib/notion.js";

async function findRawEntries(monthName) {
  const subpages = await getSubpages(process.env.AGENDAMENTOS_PAGE_ID);
  for (const page of subpages) {
    const title = page.child_page?.title || "";
    if (!title.includes(monthName)) continue;

    const blocks = await getPageContent(page.id);

    // Show ALL blocks except auto-generated summary
    let autoSection = false;
    console.log(`\n${"=".repeat(70)}`);
    console.log(`📄 ${title} — ALL RAW BLOCKS`);
    console.log(`${"=".repeat(70)}`);
    
    for (const b of blocks) {
      const t = extractText(b).trim();
      if (t.includes("Fechamento Automático")) {
        autoSection = true;
        console.log(`  ... [auto-generated blocks start here, skipped]`);
        continue;
      }
      if (autoSection) continue;
      if (!t) continue;
      
      const type = b.type.padEnd(12);
      console.log(`  [${type}] ${t.slice(0, 130)}`);
    }
  }
}

// Also check what Uber entries exist in the raw data
async function findSpecificEntries(monthName, keywords) {
  const subpages = await getSubpages(process.env.AGENDAMENTOS_PAGE_ID);
  for (const page of subpages) {
    const title = page.child_page?.title || "";
    if (!title.includes(monthName)) continue;

    const blocks = await getPageContent(page.id);
    
    console.log(`\n📄 ${title} — looking for: ${keywords.join(", ")}`);
    for (const b of blocks) {
      const t = extractText(b).trim();
      if (!t) continue;
      const lower = t.toLowerCase();
      if (keywords.some(k => lower.includes(k.toLowerCase()))) {
        console.log(`  [${b.type}] ${t.slice(0, 130)}`);
      }
    }
  }
}

const month = process.argv[2] || "Janeiro";

// Find ALL Uber-related lines
await findSpecificEntries(month, ["uber", "taxímetro", "taximetro", "aluguel", "pedágio", "pedagio", "hospedagem", "gasolina"]);
