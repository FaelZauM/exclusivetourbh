import "dotenv/config";
import { escreverFechamentos } from "./lib/escritor.js";

const PAGE_ID = process.env.AGENDAMENTOS_PAGE_ID;

console.log("📝 Escrevendo fechamentos no Notion...\n");

escreverFechamentos(PAGE_ID)
  .then((results) => {
    const total = results.reduce((s, r) => s + r.receitaTotal, 0);
    console.log(`\n✅ ${results.length} meses atualizados`);
    console.log(`📊 Receita total: R$ ${total.toFixed(2).replace(".", ",")}`);
  })
  .catch(console.error);
