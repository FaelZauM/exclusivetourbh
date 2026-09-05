import "dotenv/config";
import fs from "fs";
import { getPageContent, getSubpages, getPageTitle, extractEntries } from "./lib/notion.js";
import { calculateFechamento } from "./lib/calculator.js";
import { extractDespesas, sumarizarDespesas } from "./lib/contas.js";

const AGENDAMENTOS_ID = process.env.AGENDAMENTOS_PAGE_ID;
const CONTAS_ID = process.env.CONTAS_PAGE_ID;

async function main() {
  const meses = [];
  const mesesContas = [];

  if (AGENDAMENTOS_ID) {
    const subpages = await getSubpages(AGENDAMENTOS_ID);
    for (const page of subpages) {
      const title = page.child_page?.title || "";
      if (title === "/26") continue;
      const blocks = await getPageContent(page.id);
      const entries = extractEntries(blocks);
      if (entries.length === 0) continue;
      const calc = calculateFechamento(entries);
      meses.push({ titulo: title.split("-")[0].trim(), receita: calc.receitaTotal, liquido: calc.liquido });
    }
  }

  if (CONTAS_ID) {
    const subpages = await getSubpages(CONTAS_ID);
    for (const page of subpages) {
      const title = page.child_page?.title || "";
      if (title === "Anotações") continue;
      const blocks = await getPageContent(page.id);
      const despesas = extractDespesas(blocks);
      if (despesas.length === 0) continue;
      const resumo = sumarizarDespesas(despesas);

      let mesKey = title.split("/")[0].trim();
      if (title.toLowerCase().includes("março") && resumo.totalGeral > 14000) mesKey = "Maio";

      mesesContas.push({ titulo: mesKey, total: resumo.totalGeral, pago: resumo.pago });
    }
  }

  const mesesUnicos = [...new Set([...meses.map(m => m.titulo), ...mesesContas.map(m => m.titulo)])]
    .sort((a, b) => ordemMes(a) - ordemMes(b));

  const linhas = mesesUnicos.map(mes => {
    const rec = meses.find(m => m.titulo === mes);
    const desp = mesesContas.find(m => m.titulo === mes);
    const receita = rec?.receita || 0;
    const despesa = desp?.total || 0;
    const saldo = receita - despesa;
    return { mes, receita, despesa, saldo };
  });

  const totalReceita = linhas.reduce((s, l) => s + l.receita, 0);
  const totalDespesa = linhas.reduce((s, l) => s + l.despesa, 0);
  const totalSaldo = totalReceita - totalDespesa;
  const meta = 350000;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard Financeiro 2026</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Inter, -apple-system, sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 40px 24px; }
  .container { max-width: 1040px; margin: 0 auto; }
  h1 { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .subtitle { color: #888; font-size: 14px; margin-bottom: 32px; }

  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .card-destaque { background: #141414; border: 1px solid #222; border-radius: 12px; padding: 20px; }
  .card-destaque .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .card-destaque .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .card-destaque .value.positive { color: #4ade80; }
  .card-destaque .value.negative { color: #f87171; }
  .card-destaque .value.neutral { color: #fbbf24; }
  .card-destaque .sub { font-size: 12px; color: #666; margin-top: 2px; }

  .meta-bar { background: #141414; border: 1px solid #222; border-radius: 12px; padding: 20px; margin-bottom: 32px; }
  .meta-bar .header { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .meta-bar .label { font-size: 13px; color: #888; }
  .meta-bar .meta-label { font-size: 13px; color: #666; }
  .progress-bg { background: #2a2a2a; border-radius: 100px; height: 8px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, #4ade80, #fbbf24, #f87171); transition: width 0.5s; }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 12px 16px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #222; }
  td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #1a1a1a; }
  tr:hover td { background: #111; }
  .mes-cell { color: #fff; font-weight: 600; }
  .valor { font-weight: 600; text-align: right; }
  .positive { color: #4ade80; }
  .negative { color: #f87171; }
  .neutral { color: #fbbf24; }
  .footer td { border-bottom: none; padding-top: 16px; font-weight: 700; font-size: 15px; }
</style>
</head>
<body>
<div class="container">
  <h1>📊 Dashboard Financeiro 2026</h1>
  <p class="subtitle">Receita (Agendamentos) vs Despesas (Contas) · ${new Date().toLocaleString("pt-BR")}</p>

  <div class="cards">
    <div class="card-destaque">
      <div class="label">Receita Total</div>
      <div class="value neutral">R$ ${fmt(totalReceita)}</div>
      <div class="sub">Meta: R$ 350.000 · ${((totalReceita / meta) * 100).toFixed(1)}%</div>
    </div>
    <div class="card-destaque">
      <div class="label">Despesas Totais</div>
      <div class="value negative">R$ ${fmt(totalDespesa)}</div>
    </div>
    <div class="card-destaque">
      <div class="label">Saldo Líquido</div>
      <div class="value ${totalSaldo >= 0 ? "positive" : "negative"}">R$ ${fmt(Math.abs(totalSaldo))}</div>
      <div class="sub">${totalSaldo >= 0 ? "Superávit" : "Déficit"}</div>
    </div>
  </div>

  <div class="meta-bar">
    <div class="header">
      <span class="label">Progresso da Meta (R$ 350.000)</span>
      <span class="meta-label">${((totalReceita / meta) * 100).toFixed(1)}% · Faltam R$ ${fmt(Math.max(0, meta - totalReceita))}</span>
    </div>
    <div class="progress-bg"><div class="progress-fill" style="width:${Math.min((totalReceita / meta) * 100, 100)}%"></div></div>
  </div>

  <table>
    <thead><tr>
      <th>Mês</th>
      <th style="text-align:right">Receita</th>
      <th style="text-align:right">Despesas</th>
      <th style="text-align:right">Saldo</th>
    </tr></thead>
    <tbody>
      ${linhas.map(l => `<tr>
        <td class="mes-cell">${l.mes}</td>
        <td class="valor neutral">R$ ${fmt(l.receita)}</td>
        <td class="valor negative">R$ ${fmt(l.despesa)}</td>
        <td class="valor ${l.saldo >= 0 ? "positive" : "negative"}">R$ ${fmt(l.saldo)}</td>
      </tr>`).join("\n      ")}
      <tr class="footer">
        <td style="color:#fff">TOTAL</td>
        <td class="valor neutral">R$ ${fmt(totalReceita)}</td>
        <td class="valor negative">R$ ${fmt(totalDespesa)}</td>
        <td class="valor ${totalSaldo >= 0 ? "positive" : "negative"}">R$ ${fmt(totalSaldo)}</td>
      </tr>
    </tbody>
  </table>
</div>
</body>
</html>`;

  fs.writeFileSync("./dashboard.html", html);
  console.log(`✅ Dashboard integrado → dashboard.html`);
}

function fmt(n) {
  return n.toFixed(2).replace(".", ",");
}

function ordemMes(m) {
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return meses.indexOf(m);
}

main().catch(console.error);
