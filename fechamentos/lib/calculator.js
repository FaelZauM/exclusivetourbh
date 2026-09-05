export function calculateFechamento(entries) {
  let clienteParticular = 0;
  let corporativo = 0;
  let ultra = 0;
  let cedac = 0;
  let taxi = 0;
  let uber = 0;
  let taximetro = 0;
  let gasolina = 0;
  let repasses = 0;
  let aluguel = 0;
  let pedagio = 0;
  let hospedagem = 0;

  for (const e of entries) {
    // Track repasses from any category
    if (e.repasse && e.repasseValor) {
      repasses += e.repasseValor;
    }

    switch (e.category) {
      case "cliente_particular":
        clienteParticular += e.value;
        break;
      case "corporativo":
        corporativo += e.value;
        break;
      case "ultra":
        ultra += e.value;
        break;
      case "cedac":
        // CEDAC revenue is already accounted at end of month - skip
        // BUT keep repasse tracking (handled above)
        break;
      case "taxi":
        taxi += e.value;
        break;
      case "uber":
        uber += e.value;
        break;
      case "taximetro":
        taximetro += e.value;
        break;
      case "gasolina":
        gasolina += e.value;
        break;
      case "aluguelqub":
        aluguel += e.value;
        break;
      case "pedagio":
        pedagio += e.value;
        break;
      case "hospedagem":
        hospedagem += e.value;
        break;
    }
  }

  clienteParticular = round(clienteParticular);
  corporativo = round(corporativo);
  ultra = round(ultra);
  cedac = round(cedac);
  taxi = round(taxi);
  uber = round(uber);
  taximetro = round(taximetro);
  gasolina = round(gasolina);
  repasses = round(repasses);
  aluguel = round(aluguel);
  pedagio = round(pedagio);
  hospedagem = round(hospedagem);

  // Total Faturados = ALL revenue (gross, including pass-through items)
  const receitaTotal = clienteParticular + corporativo + cedac + ultra + uber + taximetro + aluguel;

  // Despesas = Pedágio + Hospedagem (NOT uber/taximetro/aluguel - those are Renda)
  const despesas = pedagio + hospedagem;

  // Líquido = Total Faturados - Repasses(Passados) - Despesas
  const liquido = round(receitaTotal - repasses - despesas);

  return {
    clienteParticular,
    corporativo,
    ultra,
    cedac,
    taxi,
    uber,
    taximetro,
    gasolina,
    repasses,
    aluguel,
    pedagio,
    hospedagem,
    receitaTotal,
    despesas,
    liquido,
    entriesCount: entries.length,
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
