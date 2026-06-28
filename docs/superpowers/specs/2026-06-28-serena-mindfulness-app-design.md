# Serena — App de Mindfulness para Mulheres 40-55

## Visão Geral

**Serena** é um aplicativo PWA de mindfulness focado em mulheres de 40 a 55 anos, casadas, com filhos. A proposta é oferecer ferramentas rápidas e práticas (5-15 min) de meditação, respiração, journaling e conteúdo educativo, entregues com carinho e sem culpa — encaixando na rotina corrida do público-alvo.

**Modelo de negócio:** Assinatura mensal via Lastlink (PIX, cartão, boleto)
**Formato:** PWA (navegador, sem lojas)
**Trial:** 7 dias grátis sem cartão
**Preço:** R$ 29,90/mês ou R$ 249/ano

## Público

- **Quem:** Mulheres, 40-55 anos, classe B/C, casadas, com filhos
- **Dores:** Sobrecarga mental, falta de tempo para si, dificuldade com ansiedade e sono, culpa ao parar
- **Como alcançamos:** Lead magnet gratuito → aquecimento WhatsApp → trial → assinatura
- **Proposta de valor:** "5 minutos por dia para você recarregar — sem culpa, sem complicação."

## Funcionalidades — MVP (Fase 1)

### Carro-chefe: Meditações Guiadas
- Áudio gerado por IA (ElevenLabs ou similar — voz feminina natural)
- Categorias: Manhã, Pausa, Noite
- Timer com duração (5, 10, 15 min)
- Fundo visual com animações suaves

### Respiração (Breathing Tool)
- Exercícios guiados: 4-7-8, Respiração Caixa, Respiração Diafragmática
- Animação visual expansiva (círculo que cresce/encolhe)
- Timer integrado

### Trilhas de Conteúdo
- Micro-aulas em texto (2-3 min de leitura) + narração em áudio (TTS)
- Temas: mindfulness básico, ansiedade, sono, culpa materna, autocuidado
- Progressão: 5 aulas por trilha
- Progresso visual (●●○○○)

### Journaling Rápido
- Um prompt diário de 1 pergunta
- Resposta livre em texto
- Permite desabafo rápido sem pressão

### WhatsApp Integrado
- Lembretes diários para meditar
- Link para comunidade (grupo opcional)
- Link para lead magnet inicial

### Autenticação
- Cadastro por email + senha
- Onboarding rápido: "Qual seu momento do dia?"

## Arquitetura Técnica

### Stack
| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 + PWA (static export) |
| Estilo | Tailwind CSS |
| Fonte | Nunito (Google Fonts) |
| Pagamento | Lastlink (webhooks) |
| Banco + Auth + Storage | Supabase |
| Áudio IA | ElevenLabs (voz feminina natural) |
| Conteúdo | Markdown + áudio TTS |
| Lembretes | Link automatizado para WhatsApp (sem API no MVP) |

### Fluxo do Usuário
1. **Aquisição:** Lead magnet → WhatsApp → trial
2. **Cadastro:** Email + senha
3. **Onboarding:** Escolher momento do dia preferido
4. **Dashboard:** Sugestão do dia + atalhos rápidos
5. **Consumo:** Meditar, respirar, ler/ouvir, escrever
6. **Retenção:** Lembrete WhatsApp, novo conteúdo semanal

## Design Visual

### Paleta de Cores
| Token | Cor | Uso |
|-------|-----|-----|
| Folha | `#8CAF8C` | Detalhes, ícones, bordas, cards de destaque |
| Florescer | `#D4A5A5` | Acento feminino, bullets |
| Terra | `#6B5E4A` | Headings, títulos |
| Névoa | `#F5F2ED` | Fundos de seção, cards |
| Branco | `#FFFFFF` | Canvas principal |
| Marrom | `#3D322B` | Body text |
| CTA | `#9B7B6B` | Botões principais |

### Tipografia
- **Fonte:** Nunito (Google Fonts) — rounded sans-serif que transmite acolhimento
- **Hierarquia:**
  - Headings: Bold/Nunito
  - Body: Regular/Nunito
  - Botões: SemiBold/Nunito

### Estilo Visual
- Minimalista com bastante espaço
- Cantos arredondados (12-16px)
- Cards em fundo Névoa
- CTA em tom terroso (CTA) com hover
- Ícones com emojis
- Sem sombras pesadas — clean, suave

## Estrutura do App (Telas)

### 1. Home / Dashboard
- Header: logo "Serena · seu momento de paz"
- Saudação personalizada ("Bom dia, Ana")
- CTA principal: meditação do dia
- Cards de acesso rápido: respiração, journaling, trilhas
- Progresso das trilhas ativas
- Bottom nav: Início, Meditar, Trilhas, Perfil

### 2. Meditar
- Lista de categorias (Manhã, Pausa, Noite)
- Meditação em destaque do dia
- Ao clicar: player com áudio + timer + animação

### 3. Respiração (dentro do player)
- Seleção de exercício
- Animação visual + timer
- Opção de som ambiente (natureza)

### 4. Trilhas
- Lista de trilhas com progresso
- Cada trilha: 5 aulas (texto + áudio)
- Ao concluir: celebração visual

### 5. Journaling
- Prompt do dia
- Campo de texto livre
- Histórico de entradas

### 6. Perfil / Conta
- Gerenciar assinatura (Lastlink)
- Preferências (horário de lembrete)
- Sair

## Funil de Conversão

1. **Lead Magnet:** "5 Meditações para Noites Tranquilas" (PDF + áudios grátis)
2. **Captura:** WhatsApp ou email
3. **Nutrição:** Sequência de 3-5 dias com dicas de mindfulness via WhatsApp
4. **Trial:** Convite para 7 dias grátis no app
5. **Assinatura:** Após trial, R$ 29,90/mês ou R$ 249/ano
6. **Retenção:** Conteúdo semanal novo, lembretes via WhatsApp

## Métricas de Sucesso (Fase 1)

- **Ativação:** ≥50% dos cadastros completam onboarding
- **Retenão D1:** ≥40% retornam no dia seguinte
- **Retenção D7:** ≥20% ativos após 7 dias
- **Conversão:** ≥15% dos trials viram assinantes
- **Churn mensal:** <15%

## Fora do Escopo (MVP)

- Comunidade in-app
- Gamificação
- Perfil avançado
- Recomendação por IA
- Versão iOS/Android nativa
- Conteúdo em vídeo (apenas áudio + texto)

## Próximos Passos (Pós-MVP)

- Conteúdo em vídeo curto gerado por IA
- Temas especiais (menopausa, vazio ninho, recomeço)
- Programa de indicação
- Modo casal/família
