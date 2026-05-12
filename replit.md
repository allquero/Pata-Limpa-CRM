# Pata Limpa CRM

CRM SaaS multi-tenant para pet shops de banho e tosa no Brasil — agendamentos Kanban, clientes, pets, serviços, fluxo de caixa, relatórios e leads.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (porta 5000 → proxy /api)
- `pnpm --filter @workspace/grooming-crm run dev` — Frontend React (porta dinâmica → proxy /)
- `pnpm run typecheck` — typecheck completo
- `pnpm run build` — typecheck + build todos os pacotes
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks React Query e schemas Zod do OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar mudanças no schema do banco (só dev)
- Variável obrigatória: `DATABASE_URL` — string de conexão PostgreSQL

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validação: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (do spec OpenAPI)
- Build: esbuild (bundle CJS)
- Frontend: React + Vite + Tailwind + shadcn/ui + @dnd-kit + Recharts + date-fns

## Where things live

- `artifacts/api-server/` — servidor Express com todas as rotas
- `artifacts/grooming-crm/` — frontend React/Vite em português
- `lib/db/src/schema/` — 8 tabelas: tenants, clients, pets, services, packages, appointments, financial_entries, message_templates
- `lib/api-spec/openapi.yaml` — spec OpenAPI (fonte da verdade)
- `lib/api-client-react/` — hooks React Query gerados
- `lib/api-zod/` — schemas Zod gerados
- `artifacts/grooming-crm/src/pages/` — 9 páginas: Dashboard, Clientes, Agendamentos, Serviços, Financeiro, Relatórios, Mensagens, Leads, Empresas

## Architecture decisions

- `tenantId = 1` fixo no frontend (sem auth por enquanto, multi-tenant pronto no backend)
- Rotas de agendamentos/financeiro parseiam datas manualmente de `req.query` em vez de usar `zod.date()` (que não coerce strings HTTP)
- Enum `PetSize` com 9 variações (mini_curto … gigante) para preços diferenciados por porte e pelagem
- Agendamentos recorrentes: cria N cópias com intervalo de 7 dias e `recurringGroupId` UUID compartilhado
- Kanban de agendamentos usa `@dnd-kit` com drop em colunas de status; atualiza via PATCH `/appointments/:id/status`

## Product

- **Dashboard**: métricas do dia/semana, receita do mês, agendamentos recentes
- **Agendamentos**: Kanban drag-and-drop por status (Aguardando / Em Atendimento / Concluído / Cancelado), visão dia/semana, criação com recorrência semanal e confirmação WhatsApp
- **Clientes**: CRUD com busca, notas e expansão inline de pets
- **Pets**: cadastro por cliente com porte/pelagem e raça
- **Serviços**: CRUD agrupado por nome com preços por porte
- **Financeiro**: lançamentos de receita/despesa/despesa_fixa com resumo e filtros por período
- **Relatórios**: gráficos de receita, atendimentos por status/porte, top 10 clientes (Recharts)
- **Mensagens**: editor de templates WhatsApp com variáveis inseríveis
- **Leads**: clientes sem agendamento há X dias com botão de WhatsApp e template selecionável
- **Empresas**: dados cadastrais do pet shop

## User preferences

- Toda UI em Português (Brasil)
- Moeda em R$ (BRL), formato pt-BR
- Ícone pata + nome "Pata Limpa" na sidebar

## Gotchas

- Ao adicionar novos campos de data em query params, parse manualmente em vez de `z.date()` (não coerce strings HTTP)
- `pnpm run typecheck:libs` deve rodar antes do typecheck dos artifacts quando libs mudarem
- API montada em `/api`, frontend em `/` — ambos roteados pelo proxy Replit

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
