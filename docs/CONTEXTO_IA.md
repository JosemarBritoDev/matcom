# CONTEXTO_IA — MatCom SaaS

> **Memória técnica persistente do projeto.**
> Este documento é a fonte primária de contexto para IAs, agentes CLI e novos desenvolvedores.
> Leia-o integralmente antes de propor ou executar qualquer alteração no código.

| Metadado | Valor |
| --- | --- |
| Produto | MatCom SaaS |
| Empresa | BCTech |
| Responsável | Josemar Brito |
| Stack principal | Next.js 15 (App Router) + TypeScript + Prisma + PostgreSQL (Supabase) |
| Última atualização | 08/11/2026 |
| Status | Em desenvolvimento ativo |

---

## 1. Visão geral

O **MatCom** é um SaaS multi-tenant de gestão para lojas de materiais de construção. O sistema cobre o ciclo operacional completo da loja: atendimento no balcão (PDV), formação de preço de varejo e atacado, controle de estoque com unidades fracionadas, compras, financeiro, fiscal, logística de entrega e um módulo mobile/PWA para atendimento no pátio.

### Princípios do produto

1. **Multi-tenant por padrão** — todo dado operacional pertence a um `Tenant`. Nenhuma consulta pode cruzar tenants sem autorização explícita.
2. **White-Label** — cada loja cliente personaliza nome, logotipo, mensagem de boas-vindas e cores. A marca BCTech/MatCom aparece como selo do SaaS, não como marca principal da loja.
3. **Operação de balcão rápida** — o fluxo de venda deve funcionar com o mínimo de cliques e resistir a quedas de conexão.
4. **Rastreabilidade e imutabilidade** — pedidos pagos não podem ser alterados; correções acontecem por estorno/cancelamento auditável.
5. **Aprovação hierárquica** — a tabela de atacado é uma concessão comercial e depende de aprovação do Gerente.
6. **Mobile-first no pátio** — o atendimento externo usa PWA instalável, com o mesmo backend do balcão.

### Módulos funcionais

| Módulo | Objetivo |
| --- | --- |
| Vendas / PDV | Pedidos, orçamentos, clientes, produtos, tabela de preços, vendedores e relatórios |
| Compras | Pedidos de compra, fornecedores e entradas de NF-e |
| Estoque & Logística | Fracionamento de medidas, saldo, inventário, romaneio e entregas |
| Financeiro | Contas a receber, contas a pagar e fluxo de caixa |
| Fiscal | Emissão de NF-e/NFC-e e Sped |
| Aprovações | Aprovação de tabela de atacado restrita ao Gerente |
| IA & PWA Mobile | Atendimento no pátio, assistente de produtos e apoio à operação |

---

## 2. Arquitetura

### 2.1 Visão macro

```text
┌──────────────────────────────────────────────────────────────┐
│                        Navegador / PWA                       │
│   Balcão (desktop) · Pátio (mobile) · Gestão (desktop)       │
└───────────────────────────────┬──────────────────────────────┘
                                │ HTTPS
┌───────────────────────────────▼──────────────────────────────┐
│                     Next.js 15 — App Router                  │
│  Server Components · Server Actions · Route Handlers · UI    │
│  Middleware (auth/tenant) · next-themes (Light/Dark)         │
└───────────────────────────────┬──────────────────────────────┘
                                │ Prisma Client 6.19.3
┌───────────────────────────────▼──────────────────────────────┐
│                PostgreSQL — Supabase (pooler)                │
│  Connection pooling (6543) · Direct connection (5432)        │
│  Migrations versionadas em prisma/migrations                 │
└──────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                      Vercel (deploy)                         │
│  Preview Deployments · Production · Environment Variables    │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Decisões arquiteturais

- **App Router** como padrão. Server Components para leitura de dados; Client Components apenas onde há interatividade real (dropdowns, tema, formulários dinâmicos).
- **Server Actions / Route Handlers** para mutações. Evitar rotas de API redundantes quando uma Server Action resolve.
- **Prisma como única camada de acesso ao banco.** Proibido SQL solto sem justificativa documentada.
- **Validação na borda** com Zod (previsto) antes de qualquer escrita.
- **Multi-tenancy por coluna** (`tenantId`) com filtragem obrigatória em todas as queries.
- **Sessão mock de desenvolvimento** centralizada em `src/lib/session.ts`; o
  ambiente de produção falha fechado até a integração de autenticação real.
- **Persistência administrativa mock** usa `localStorage` somente para
  demonstração local; não substitui Prisma nem autoriza operações em produção.
- **Banco em Supabase** usando pooler para runtime e conexão direta para migrations.
- **Deploy na Vercel** com Preview por Pull Request e Production na branch `main`.

### 2.3 Estrutura atual do repositório

```text
matcom/
├── docs/                        # Documentação oficial (este diretório)
├── prisma/
│   ├── migrations/              # Histórico versionado de migrations
│   └── schema.prisma            # Modelo de dados
├── public/                      # Assets estáticos
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind v4 + variantes de tema
│   │   ├── layout.tsx           # ThemeProvider, Header e Footer globais
│   │   └── page.tsx             # Página inicial
│   └── components/
│       ├── theme-provider.tsx   # Wrapper do next-themes
│       └── layout/
│           ├── Header.tsx       # Header responsivo + navegação
│           └── Footer.tsx       # Rodapé fixo com assinatura
├── .env                         # Local (não versionado)
├── next.config.ts
├── package.json
└── tsconfig.json
```

### 2.4 Stack detalhada

| Camada | Tecnologia | Observações |
| --- | --- | --- |
| Framework | Next.js 15.5.x (App Router) | Turbopack habilitado em dev e build |
| Linguagem | TypeScript 5 (strict) | Tipagem obrigatória, sem `any` gratuito |
| UI | Tailwind CSS v4 | Tokens via `@theme`, variante `dark` por classe |
| Componentes | Shadcn/UI (Radix) | Padrão de composição e acessibilidade |
| Ícones | Lucide React | Ícones consistentes em toda a aplicação |
| Tema | next-themes | `defaultTheme="light"`, classe `dark` |
| ORM | Prisma 6.19.3 | Schema único + migrations versionadas |
| Banco | PostgreSQL (Supabase) | Pooler + conexão direta |
| Deploy | Vercel | Preview + Production |
| Autenticação | Mock somente em desenvolvimento | Produção nega as rotas administrativas até Auth.js/Supabase Auth |
| Validação | Zod | Previsto para Server Actions e forms |

### 2.5 Estratégia de temas

- **Light Clean** é o tema padrão do balcão: fundo claro, alto contraste, legibilidade sob luz forte.
- **Dark Neon BCTech** é o tema alternativo: fundo escuro, acentos violeta/fúcsia.
- A troca é feita por `next-themes` com `attribute="class"`; a classe `dark` é aplicada no `<html>`.
- A variante `dark` do Tailwind é declarada explicitamente em `src/app/globals.css` com `@custom-variant dark (&:where(.dark, .dark *));`.
- Cores white-label do tenant: `primaryColor`, `accentColor`, `logoUrl` e `welcomeMessage` (modelo `Tenant`).

### 2.6 Permissão de emissão fiscal

- O alias comercial `nfe` resolve para `TenantModule.emissaoFiscalSefaz`, com
  fallback para a flag geral `fiscal` em configurações legadas.
- O Painel Fiscal SEFAZ apresentado no ambiente de desenvolvimento usa dados
  simulados; não transmite XML nem acessa certificado ou serviço externo.

### 2.7 DRE gerencial demonstrativa

- A rota `/financeiro/dre` permite acesso somente aos papéis
  `FINANCEIRO`, `GERENTE_LOJA` e `SUPER_ADMIN`.
- Enquanto os pedidos e lançamentos financeiros não estiverem conectados à
  persistência da DRE, a tela identifica seus valores como demonstrativos e
  limita os dados de exemplo ao tenant `tenant-matcom`.
- Os cálculos de lucro e margem reutilizam a função pura `calcularDre`.

---

## 3. Modelo de dados (Prisma)

Arquivo: `prisma/schema.prisma`.

### 3.1 Entidades principais

| Entidade | Responsabilidade |
| --- | --- |
| `Tenant` | Loja cliente. Raiz do isolamento multi-tenant e da personalização white-label. |
| `TenantModule` | Flags de módulos contratados/ativos por tenant (`vendas`, `caixa`, `compras`, `logistica`, `fiscal`, `iaAssistant`) e recursos avulsos (`orcamentos`, `expedicao`, `comprasCurvaAbc`, `emissaoFiscalSefaz`). |
| `User` | Usuário do tenant com papel (`EmployeeRole`). |
| `Customer` | Cliente da loja, com tabela de preço e status de aprovação. |
| `Supplier` | Fornecedor. |
| `Product` | Produto com preço de custo, varejo, atacado, unidades e estoque. |
| `Order` | Pedido de venda (comanda). |
| `OrderItem` | Item do pedido, com preço unitário, flag de atacado e modo de entrega. |
| `PurchaseOrder` | Pedido de compra. |
| `PurchaseItem` | Item do pedido de compra. |

### 3.2 Enums

| Enum | Valores |
| --- | --- |
| `EmployeeRole` | `SUPER_ADMIN`, `GERENTE_LOJA`, `VENDEDOR`, `CAIXA`, `ALMOXARIFE`, `LOGISTICA`, `FINANCEIRO`, `COMPRADOR` |
| `CustomerPricingTier` | `VAREJO`, `ATACADO` |
| `ApprovalStatus` | `APROVADO`, `PENDENTE`, `REJEITADO` |
| `OrderStatus` | `PENDENTE`, `AGUARDANDO_CAIXA`, `PAGO`, `CANCELADO` |
| `DeliveryMode` | `RETIRADA_IMEDIATA`, `ENTREGA_PENDENTE` |
| `PurchaseStatus` | `PENDENTE_AGUARDANDO_ENTREGA`, `RECEBIDO_CONFERIDO`, `CANCELADO` |

### 3.3 Campos white-label e aprovação

`Tenant`:

```prisma
logoUrl        String?
welcomeMessage String? @default("Bem-vindo ao sistema da sua loja de materiais de construção.")
primaryColor   String? @default("#1E293B")
accentColor    String? @default("#A855F7")
```

`Customer`:

```prisma
pricingTier CustomerPricingTier @default(VAREJO)
tierStatus  ApprovalStatus      @default(APROVADO)
requestedBy String?
approvedBy  String?
```

### 3.4 Regras de integridade

- Todo registro operacional deve ter `tenantId`.
- `User.email` é único globalmente; avaliar unicidade por tenant no futuro.
- `Tenant.document` é único.
- `OrderItem` guarda o preço praticado no momento da venda (snapshot), não referencia o preço atual do produto.
- Exclusões em cascata são permitidas apenas a partir do `Tenant`; registros históricos financeiros/fiscais devem ser preservados.

---

## 4. Regras de negócio invariantes

Estas regras não podem ser quebradas por nenhuma implementação:

1. **Isolamento multi-tenant**
   Toda query de dados de negócio filtra por `tenantId`. Um agente nunca deve aceitar `tenantId` vindo do cliente sem validar contra a sessão.

2. **Tabela de preços**
   - `VAREJO`: padrão para novos clientes (`tierStatus = APROVADO`, `pricingTier = VAREJO`).
   - `ATACADO`: benefício comercial que exige aprovação do Gerente.
   - Solicitação de atacado define `tierStatus = PENDENTE`, registra `requestedBy` e bloqueia a aplicação do preço de atacado até aprovação.
   - Aprovação define `tierStatus = APROVADO` e registra `approvedBy`. Rejeição define `tierStatus = REJEITADO`.
   - Enquanto `PENDENTE`, o pedido deve usar preço de varejo ou ficar bloqueado, conforme decisão de UX documentada.

3. **Comanda imutável pós-caixa**
   Após `Order.status = PAGO`, itens, quantidades, preços e descontos não podem ser editados. Correções exigem cancelamento/estorno auditável com registro de `canceledBy`.

4. **Preço snapshot**
   `OrderItem.unitPrice` é o preço efetivo no momento da venda. Mudanças futuras em `Product` não podem recalcular pedidos antigos.

5. **Fracionamento de medidas**
   Produtos podem ter unidade primária e secundária (ex.: caixa → m², saco → kg) com `conversionRatio`. Conversões devem ser explícitas, testadas e arredondadas conforme regra do produto.

6. **Dupla impressão**
   Todo pedido pago gera **Via do Cliente** e **Via do Galpão**, com identificação clara e conteúdo adequado a cada destinatário.

7. **Aprovação restrita**
   Somente `GERENTE_LOJA` e `SUPER_ADMIN` podem aprovar/rejeitar tabela de atacado. Vendedores apenas solicitam.

8. **Assinatura obrigatória**
   O rodapé de todas as telas deve exibir: `Criado por BCTech | Josemar Brito | Whatsapp 11972646617`.

---

## 5. Time de Agentes Especialistas de IA

Cada agente atua em um domínio funcional e deve respeitar as fronteiras abaixo. Nenhum agente pode alterar regras de outro módulo sem handoff explícito.

### 5.1 Agente PDV & Vendas

**Missão:** garantir que o balcão venda rápido, com preço correto, comanda rastreável e experiência impecável para vendedor e cliente.

**Escopo:**
- Fluxo de pedido/orçamento, seleção de cliente e produto.
- Aplicação de tabela de preço (varejo/atacado) e negociação permitida.
- Comanda imutável após pagamento.
- Relatórios de vendas e desempenho de vendedores.
- Telas de clientes, produtos e tabela de preços no contexto de venda.

**Fora de escopo:** aprovação de atacado (Agente Financeiro & Gerência), baixa de estoque/romaneio (Estoque & Logística), emissão fiscal.

**Invariantes:** preço snapshot, imutabilidade pós-caixa, isolamento por tenant, nenhum atalho que permita editar pedido pago.

### 5.2 Agente Estoque & Logística

**Missão:** manter saldo confiável e entregar o produto certo, na quantidade e unidade corretas, no prazo.

**Escopo:**
- Cadastro e manutenção de produtos, unidades e conversões.
- Fracionamento de medidas e arredondamento.
- Entradas, saídas, inventário e estoque mínimo.
- Romaneio, separação, rotas e confirmação de entrega.
- Integração com compras (entrada de NF-e).

**Fora de escopo:** preço de venda e aprovação comercial, lançamentos financeiros, emissão fiscal.

**Invariantes:** toda movimentação é auditável; conversão de unidade nunca pode gerar saldo negativo sem alerta; entrega pendente não baixa estoque definitivamente sem regra definida.

### 5.3 Agente Financeiro & Gerência

**Missão:** proteger a margem e a saúde financeira da loja, garantindo que concessões comerciais sejam aprovadas por quem tem autoridade.

**Escopo:**
- Aprovação/rejeição de tabela de atacado (`Customer.tierStatus`).
- Registro de `requestedBy` e `approvedBy`.
- Contas a receber, contas a pagar e fluxo de caixa.
- Fechamento de caixa e conciliação.
- Permissões por papel, especialmente `GERENTE_LOJA` e `SUPER_ADMIN`.

**Fora de escopo:** edição de itens de venda pagos, emissão fiscal, gestão de rotas.

**Invariantes:** princípio do menor privilégio; toda aprovação é auditável; vendedor nunca aprova a própria solicitação; exclusões financeiras exigem estorno.

### 5.4 Agente IA & PWA Mobile

**Missão:** levar o MatCom ao pátio e à mão do colaborador, com experiência offline-friendly e assistência inteligente.

**Escopo:**
- PWA instalável (manifest, service worker, cache, ícones).
- Atendimento mobile no pátio: consulta de produto, preço, estoque e criação de pedido.
- Assistente de IA para descrição, categoria, unidade e apoio ao cadastro de produtos.
- Responsividade, acessibilidade e desempenho mobile.

**Fora de escopo:** regras de aprovação, fechamento financeiro, emissão fiscal.

**Invariantes:** PWA não pode armazenar dados sensíveis em cache; operações offline precisam de fila idempotente; IA nunca inventa preço ou estoque — sempre consulta a fonte de verdade.

### 5.5 Protocolo de handoff

Ao identificar impacto cruzado, o agente deve:
1. Descrever o problema e o módulo afetado.
2. Listar arquivos e contratos envolvidos.
3. Propor a menor mudança possível.
4. Solicitar validação do agente responsável antes de implementar.
5. Registrar a decisão neste documento ou em ADR.

---

## 6. Regras visuais

### Light Clean (padrão)

- Fundo claro (`#FFFFFF` / `zinc-50`), texto escuro de alto contraste.
- Uso de bordas suaves, sombras discretas e espaçamento generoso.
- Prioridade para legibilidade no balcão, sob iluminação intensa.
- Cor de destaque padrão do tenant: `#1E293B` (primária) e `#A855F7` (acento).

### Dark Neon BCTech

- Fundo escuro (`zinc-950`), superfícies `zinc-900`, bordas `zinc-800`.
- Acentos em violeta/fúcsia, com brilho moderado.
- Ativado pela classe `dark` no `<html>` via toggle do Header.
- Nunca usar neon em excesso: contraste e legibilidade vêm antes do efeito visual.

### Regras de UI

- Header global fixo no topo; Footer global fixo no rodapé.
- Navegação superior com dropdowns por módulo e ícones Lucide.
- Menu "Aprovações" visível apenas para `GERENTE_LOJA`/`SUPER_ADMIN`.
- Componentes devem ser acessíveis via teclado (`Esc` fecha menus, foco visível).
- Textos em português do Brasil.
- Assinatura obrigatória no rodapé: **"Criado por BCTech | Josemar Brito | Whatsapp 11972646617"**.

---

## 7. Convenções de engenharia

- **TypeScript strict**: evitar `any`; preferir tipos derivados do Prisma.
- **Server-first**: só usar `"use client"` quando necessário.
- **Validação**: toda entrada externa deve ser validada (Zod) antes de tocar no banco.
- **Erros**: mensagens para o usuário em PT-BR; logs técnicos em inglês.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- **Migrations**: nomes descritivos, sempre versionadas; nunca editar migration aplicada.
- **Segurança**: segredos apenas em `.env`/Vercel; `.env*` não é versionado.
- **Testes**: priorizar regras de negócio (preço, conversão, aprovação, imutabilidade).

---

## 8. Roadmap técnico resumido

| Fase | Entregas |
| --- | --- |
| 1 — Fundação | Schema Prisma, multi-tenant, temas, layout, documentação |
| 2 — Autenticação | Login, sessão, middleware de tenant, RBAC |
| 3 — PDV & Vendas | Clientes, produtos, pedidos, tabela de preços, caixa |
| 4 — Aprovações & Financeiro | Fluxo de atacado, contas, fluxo de caixa |
| 5 — Estoque & Logística | Conversões, inventário, romaneio, entregas |
| 6 — Fiscal & PWA/IA | NF-e/NFC-e, Sped, PWA, assistente de IA |

---

## 9. Assinatura

**Criado por BCTech | Josemar Brito | Whatsapp 11972646617**

> Ao alterar regras de negócio, modelos ou arquitetura, atualize este documento no mesmo commit.
