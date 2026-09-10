# Design: Exportação PDF/CSV do Histórico

## Visão Geral

Sistema de exportação de relatórios de corridas e gastos em PDF e CSV, com filtros de período e layout profissional.

## Regras de Negócio

### Períodos

- **Mês atual:** Exporta apenas o mês selecionado na página
- **Personalizado:** Selecionar mês/ano inicial e final

### Formatos

- **PDF:** Layout profissional com cabeçalho, resumo, gráficos e tabelas detalhadas
- **CSV:** Dois arquivos separados (corridas e gastos)

### Filtros

- Tipo: Todas / Próprias / Passadas
- Carro: Todos / Executivo / Táxi
- Empresa: Todas / Específica
- Gastos: Todos / Gasolina / Gastos / Diárias

## Estrutura de Dados

### PDF Layout

```
┌─────────────────────────────────────┐
│  EXCLUSIVEPRO                       │
│  Relatório de Corridas              │
│  Período: Jan/2026 - Mar/2026       │
├─────────────────────────────────────┤
│  RESUMO FINANCEIRO                  │
│  Faturamento Bruto: R$ 15.000,00    │
│  Faturamento Líquido: R$ 12.000,00  │
│  Gasolina: R$ 2.500,00              │
│  Líquido pós-gasolina: R$ 9.500,00  │
├─────────────────────────────────────┤
│  GRÁFICOS                           │
│  [Pie Chart: Categorias]            │
│  [Line Chart: Evolução Mensal]      │
├─────────────────────────────────────┤
│  DETALHAMENTO POR MÊS               │
│  Janeiro 2026                        │
│  ┌─────┬──────┬──────┬──────┐      │
│  │ Data │ Tipo │ Valor│ Motor│      │
│  ├─────┼──────┼──────┼──────┤      │
│  │ ...  │ ...  │ ...  │ ...  │      │
│  └─────┴──────┴──────┴──────┘      │
├─────────────────────────────────────┤
│  GASTOS                             │
│  [Tabela de gastos]                 │
└─────────────────────────────────────┘
```

### CSV Headers

**corridas.csv:**
```csv
Data,Tipo,Categoria,Valor,Comissão,Motorista,Passageiro,Empresa,Início,Destino
```

**gastos.csv:**
```csv
Data,Categoria,Descrição,Valor
```

## Arquitetura

### Componentes

1. **ExportModal** — Modal com opções de período e formato
2. **ExportService** — Gerar PDF e CSV
3. **ChartService** — Gerar gráficos como PNG

### Fluxo Principal

```
1. Usuário clica "Exportar" no histórico
2. Modal abre com opções:
   - Período: Mês atual / Personalizado (início/fim)
   - Formato: PDF / CSV
3. Usuário seleciona e confirma
4. Download do arquivo
```

### Dependências

- `pdfmake` — Geração de PDF
- `chart.js` — Geração de gráficos
- `papaparse` — Geração de CSV

## Arquivos a modificar/criar

### Novos arquivos

- `src/app/taxi/components/ExportModal.tsx` — Modal de exportação
- `src/app/taxi/lib/export-service.ts` — Service de exportação

### Arquivos a modificar

- `src/app/taxi/historico/page.tsx` — Adicionar botão exportar
- `package.json` — Adicionar dependências

## Interface

### Modal de Exportação

```
┌─────────────────────────────────────┐
│  Exportar Relatório              ✕  │
├─────────────────────────────────────┤
│  Período                            │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ Mês Atual   │ │ Personalizado│   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│  [Se Personalizado]                 │
│  Início: [Mês/Ano] Fim: [Mês/Ano]  │
│                                     │
│  Formato                            │
│  ┌─────────────┐ ┌─────────────┐   │
│  │    PDF      │ │     CSV     │   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Exportar               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## SQL

Nenhuma alteração de banco necessária.

## Segurança

- Dados ficam no client-side
- Nada enviado para servidores externos
- Download direto no navegador
