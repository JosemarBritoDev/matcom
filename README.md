# MatCom SaaS

**Sistema de gestão para lojas de materiais de construção — by BCTech**

O **MatCom** é um SaaS multi-tenant e white-label que integra o balcão (PDV), estoque com unidades fracionadas, compras, financeiro, fiscal, logística de entregas e atendimento mobile no pátio. Foi desenhado para a rotina real de lojas de materiais de construção: venda rápida, preço correto, comanda rastreável e aprovação hierárquica da tabela de atacado.

---

## Resumo executivo

| Pilar | Descrição |
| --- | --- |
| **PDV & Vendas** | Pedidos, orçamentos, clientes, produtos, tabela de preços, vendedores e relatórios |
| **Preço inteligente** | Varejo padrão e atacado com trava de aprovação pelo Gerente |
| **Comanda imutável** | Pedidos pagos não são editáveis; correções via estorno auditável |
| **Dupla impressão** | Via do Cliente e Via do Galpão para separação e entrega |
| **Estoque & Logística** | Fracionamento (caixa→m², saco→kg), saldo, romaneio e entregas |
| **Financeiro & Fiscal** | Contas a receber/pagar, fluxo de caixa, NF-e/NFC-e e Sped |
| **White-Label** | Nome, logotipo, mensagem e cores por loja cliente |
| **Mobile & IA** | PWA instalável para atendimento no pátio e assistente de produtos |
| **Temas** | Light Clean padrão no balcão e Dark Neon BCTech via toggle |

### Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Shadcn/UI · Lucide React · next-themes · Prisma 6.19.3 · PostgreSQL (Supabase) · Vercel

---

## Documentação oficial

Toda a documentação técnica, operacional e arquitetural está em [`docs/`](./docs/):

| Documento | Conteúdo |
| --- | --- |
| 📘 [CONTEXTO_IA.md](./docs/CONTEXTO_IA.md) | Arquitetura, stack, modelo de dados, regras invariantes, time de agentes de IA, regras visuais e roadmap |
| 📗 [MANUAL_OFICIAL.md](./docs/MANUAL_OFICIAL.md) | Guia de uso para vendedores, caixas e gerentes; tabelas de preço, aprovação, caixa imutável, dupla impressão e PWA |
| 📙 [SETUP_E_DEPLOY.md](./docs/SETUP_E_DEPLOY.md) | Desenvolvimento local no VS Code, Supabase, migrations Prisma, variáveis e deploy na Vercel |
| 📕 [AGENTES.md](./docs/AGENTES.md) | Personas, prompts e protocolos de handoff para agentes de IA por módulo |

> **Para IAs e agentes CLI:** leia `docs/CONTEXTO_IA.md` antes de qualquer alteração no código.

---

## Começando localmente

```bash
# 1. Clonar
git clone https://github.com/JosemarBritoDev/matcom.git
cd matcom

# 2. Instalar dependências
npm install

# 3. Configurar .env (DATABASE_URL e DIRECT_URL do Supabase)
#    Veja docs/SETUP_E_DEPLOY.md

# 4. Gerar o Prisma Client e aplicar migrations
npx prisma generate
npx prisma migrate deploy

# 5. Rodar em desenvolvimento
npm run dev
```

Acesse <http://localhost:3000>.

---

## Mapa completo de navegação e rotas

### Acesso local e em produção

| Módulo | Perfil / role | Função | Local | Produção |
| --- | --- | --- | --- | --- |
| Pré-Venda & Balcão | `OPERACIONAL_VENDAS` / Vendedor | Atendimento rápido, produtos, cliente simplificado em Varejo/Retirada e comanda | [Abrir PDV](http://localhost:3000/vendas/pdv) | [Abrir PDV](https://matcom.vercel.app/vendas/pdv) |
| Fila do Caixa | `OPERADOR_CAIXA` | Pagamento, troco, PIX, cartão, crediário, dupla impressão e sangria auditada | [Abrir Caixa](http://localhost:3000/caixa/fila) | [Abrir Caixa](https://matcom.vercel.app/caixa/fila) |
| Aprovações | `GERENTE_LOJA`, `SUPER_ADMIN` | Atacado, descontos, crediário e estornos com trava antifraude | [Abrir Aprovações](http://localhost:3000/gerencia/aprovacoes) | [Abrir Aprovações](https://matcom.vercel.app/gerencia/aprovacoes) |
| Clientes & Crédito | Administrativo / Vendas / `GERENTE_LOJA` | Cadastro completo, endereço, limite de crediário e promoção ao Atacado | [Abrir Clientes](http://localhost:3000/vendas/clientes) | [Abrir Clientes](https://matcom.vercel.app/vendas/clientes) |
| NF-e & Compras | Estoque / Suprimentos / `FINANCEIRO` | XML, De-Para, fracionamento, custo médio e entrada fiscal | [Abrir Compras NF-e](http://localhost:3000/compras/nfe) | [Abrir Compras NF-e](https://matcom.vercel.app/compras/nfe) |
| Financeiro & DRE | `FINANCEIRO`, Diretoria, `GERENTE_LOJA`, `SUPER_ADMIN` | Contas a pagar/receber, liquidação, COGS, margem e lucro líquido | [Abrir Financeiro](http://localhost:3000/financeiro/contas) | [Abrir Financeiro](https://matcom.vercel.app/financeiro/contas) |

### Links rápidos locais

- [PDV Balcão](http://localhost:3000/vendas/pdv)
- [Fila do Caixa](http://localhost:3000/caixa/fila)
- [Central de Aprovações](http://localhost:3000/gerencia/aprovacoes)
- [Gestão de Clientes](http://localhost:3000/vendas/clientes)
- [Entrada de NF-e](http://localhost:3000/compras/nfe)
- [Contas & DRE](http://localhost:3000/financeiro/contas)
- [Prisma Studio](http://localhost:5555) — `npx prisma studio`

### Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | Desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção local |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Verificação de tipos |
| `npx prisma studio` | Interface visual do banco |

---

## Estrutura do projeto

```text
matcom/
├── docs/                  # Documentação oficial
├── prisma/                # Schema e migrations
├── public/                # Assets estáticos
├── src/
│   ├── app/               # App Router (layout, páginas, estilos)
│   └── components/        # Componentes de UI e layout
└── package.json
```

---

## Regras de negócio essenciais

- **Multi-tenant:** todo dado é isolado por `tenantId`.
- **Atacado:** só é aplicado com `tierStatus = APROVADO`; aprovação exclusiva de `GERENTE_LOJA`/`SUPER_ADMIN`.
- **Comanda imutável:** após `PAGO`, nenhum item/preço pode ser alterado.
- **Snapshot de preço:** vendas antigas não são recalculadas.
- **Dupla impressão:** Via do Cliente + Via do Galpão.
- **Assinatura:** o rodapé de todas as telas exibe a assinatura BCTech.

---

## Deploy

O deploy é feito na **Vercel**, com Preview Deployments por Pull Request e Production na branch `main`. O banco PostgreSQL fica no **Supabase** (pooler para runtime, conexão direta para migrations). Passo a passo completo em [`docs/SETUP_E_DEPLOY.md`](./docs/SETUP_E_DEPLOY.md).

---

## Suporte

**BCTech — Josemar Brito**
WhatsApp: **11 97264-6617**
GitHub: [JosemarBritoDev](https://github.com/JosemarBritoDev)

---

**Criado por BCTech | Josemar Brito | Whatsapp 11972646617**
