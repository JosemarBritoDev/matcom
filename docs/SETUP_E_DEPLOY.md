# SETUP E DEPLOY — MatCom SaaS

**Ambiente de desenvolvimento, banco Supabase e publicação na Vercel**
Versão do documento: 1.0 — 08/11/2026

> Público-alvo: desenvolvedores, DevOps e agentes CLI.
> Para regras de negócio, consulte [`CONTEXTO_IA.md`](./CONTEXTO_IA.md).

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Observação |
| --- | --- | --- |
| Node.js | 20 LTS | Recomendado 20.x ou 22.x |
| npm | 10+ | Vem com o Node |
| Git | 2.40+ | Controle de versão |
| VS Code | Atual | Editor recomendado |
| Conta Supabase | — | Projeto PostgreSQL |
| Conta Vercel | — | Deploy |
| GitHub | — | Repositório `JosemarBritoDev/matcom` |

### Extensões recomendadas no VS Code

- **Prisma** (`Prisma.prisma`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Error Lens** (`usernamehw.errorlens`) — opcional
- **GitLens** (`eamodio.gitlens`) — opcional

---

## 2. Desenvolvimento local (VS Code)

### 2.1 Clonar o repositório

```bash
git clone https://github.com/JosemarBritoDev/matcom.git
cd matcom
```

### 2.2 Instalar dependências

```bash
npm install
```

> O `postinstall` do Prisma gera o Client automaticamente. Se necessário:
> `npx prisma generate`

### 2.3 Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz (nunca versione):

```env
# Conexão com pooler (runtime da aplicação)
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<SENHA>@aws-0-<REGIAO>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Conexão direta (migrations e introspecção)
DIRECT_URL="postgresql://postgres.<PROJECT_REF>:<SENHA>@aws-0-<REGIAO>.pooler.supabase.com:5432/postgres"
```

> A senha deve ser URL-encoded se contiver caracteres especiais (`@`, `#`, `/`, etc.).
> O arquivo `.env*` já está no `.gitignore`.

### 2.4 Preparar o schema e o banco

```bash
# Gera o Prisma Client
npx prisma generate

# Aplica migrations existentes (não cria novas)
npx prisma migrate deploy
```

### 2.5 Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: <http://localhost:3000>

O script usa Turbopack:

```json
"dev": "next dev --turbopack"
```

### 2.6 Comandos úteis

| Comando | Função |
| --- | --- |
| `npm run dev` | Desenvolvimento com Turbopack |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção local |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Verificação de tipos |
| `npx prisma studio` | Interface visual do banco |
| `npx prisma format` | Formata o schema |
| `npx prisma validate` | Valida o schema |
| `npx prisma migrate status` | Status das migrations |

### 2.7 Configurações recomendadas do VS Code

`.vscode/settings.json` sugerido:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.eol": "\n"
}
```

---

## 3. Supabase — banco de dados

### 3.1 Criar o projeto

1. Acesse <https://supabase.com> e faça login.
2. **New project** → escolha organização, nome, senha forte e região mais próxima dos usuários.
3. Aguarde o provisionamento.
4. Guarde a senha do banco em local seguro.

### 3.2 Obter as strings de conexão

No painel do Supabase:

**Project Settings → Database → Connection string**

- **Transaction pooler (porta 6543)** → use em `DATABASE_URL`
  - Indicado para serverless/Vercel.
  - Adicione `?pgbouncer=true&connection_limit=1`.
- **Session/Direct (porta 5432)** → use em `DIRECT_URL`
  - Indicado para migrations e operações administrativas.

Formato:

```text
postgresql://postgres.<PROJECT_REF>:<SENHA>@aws-0-<REGIAO>.pooler.supabase.com:<PORTA>/postgres
```

> **Atenção:** ambientes serverless devem usar o pooler na `DATABASE_URL` para evitar esgotamento de conexões. O Prisma usa `directUrl` para migrations.

### 3.3 Boas práticas no Supabase

- Ative backups automáticos no plano contratado.
- Não exponha a `service_role key` no front-end.
- Use SSL (`sslmode=require`) quando o provedor exigir.
- Monitore conexões e uso de CPU no dashboard.
- Crie um usuário/role dedicado para a aplicação quando possível.
- Nunca rode `prisma migrate dev` contra o banco de produção.

---

## 4. Fluxo de migrations com Prisma

### 4.1 Durante o desenvolvimento

```bash
# 1. Edite prisma/schema.prisma
# 2. Formate e valide
npx prisma format
npx prisma validate

# 3. Crie e aplique a migration em desenvolvimento
npx prisma migrate dev --name nome_descritivo_da_mudanca

# 4. Prisma Client é regenerado automaticamente
```

Regras:

- Nome da migration em `snake_case`, curto e descritivo.
- **Nunca edite uma migration já aplicada.**
- **Nunca apague migrations** para "resolver" conflito; crie uma nova.
- Revise o `migration.sql` gerado antes de commitar.
- Commite `prisma/schema.prisma` + `prisma/migrations/` juntos.

### 4.2 Em produção / CI

```bash
npx prisma migrate deploy
```

Esse comando:

- Aplica apenas migrations pendentes.
- Não cria novas migrations.
- Não executa seed.
- É o comando seguro para Vercel/CI.

### 4.3 Seed (quando existir)

```bash
npx prisma db seed
```

Configure em `package.json`:

```json
{
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

### 4.4 Reset local (apenas desenvolvimento)

```bash
npx prisma migrate reset
```

> Apaga e recria o banco local de desenvolvimento. **Nunca** use em produção.

### 4.5 Situações de emergência

| Situação | Ação |
| --- | --- |
| Migration falhou em produção | Não edite a migration aplicada; avalie `prisma migrate resolve` com cuidado |
| Banco divergente do schema | `npx prisma migrate diff` para diagnosticar |
| Client desatualizado | `npx prisma generate` |
| Pooler recusando conexão | Confirme `pgbouncer=true` e `connection_limit=1` |

---

## 5. Deploy na Vercel

### 5.1 Importar o projeto

1. Acesse <https://vercel.com> → **Add New → Project**.
2. Conecte o GitHub e selecione `JosemarBritoDev/matcom`.
3. Framework preset: **Next.js** (detectado automaticamente).
4. Root directory: `./`.
5. Build command recomendado:

```bash
npx prisma generate && npm run build
```

6. Install command: `npm install`.

### 5.2 Variáveis de ambiente na Vercel

**Project Settings → Environment Variables**

| Variável | Ambientes | Exemplo/Observação |
| --- | --- | --- |
| `DATABASE_URL` | Production, Preview, Development | Pooler Supabase porta 6543 com `pgbouncer=true` |
| `DIRECT_URL` | Production, Preview | Conexão direta porta 5432 |
| `NEXTAUTH_SECRET` | Todos (futuro) | Segredo forte quando a autenticação for implementada |
| `NEXTAUTH_URL` | Todos (futuro) | URL pública da aplicação |
| `NEXT_PUBLIC_APP_URL` | Todos (futuro) | URL pública usada pelo PWA/metadata |

Regras:

- Nunca prefixe segredos com `NEXT_PUBLIC_`.
- Variáveis de Preview podem apontar para um banco de staging.
- Após alterar variáveis, faça **Redeploy**.

### 5.3 Migrations no deploy

Opções recomendadas (escolha uma):

**A. Build command com migrate deploy (simples):**

```bash
npx prisma generate && npx prisma migrate deploy && npm run build
```

**B. Etapa manual controlada antes do deploy de produção:**

```bash
npx prisma migrate deploy
```

> Para equipes maiores, prefira um pipeline de CI dedicado para migrations, evitando execuções concorrentes em builds paralelos.

### 5.4 Fluxo de branches

| Branch | Ambiente Vercel |
| --- | --- |
| `main` | Production |
| demais branches | Preview Deployment |
| Pull Request | Preview URL comentada no PR |

Fluxo recomendado:

```bash
git checkout -b feat/nome-da-feature
# desenvolver
git add .
git commit -m "feat: descricao"
git push origin feat/nome-da-feature
# abrir PR → validar Preview → merge em main
```

### 5.5 Checklist de deploy

- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run lint` sem erros
- [ ] `npm run build` local funcionando
- [ ] `prisma migrate status` sem pendências inesperadas
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Migration revisada e commitada
- [ ] Teste do fluxo crítico na Preview
- [ ] Rodapé com assinatura BCTech presente
- [ ] Tema Light/Dark funcionando

### 5.6 Pós-deploy

1. Abra a URL de produção.
2. Valide login e navegação.
3. Confirme conexão com o banco (lista de produtos/clientes).
4. Teste o toggle de tema.
5. Verifique os logs em **Vercel → Deployments → Functions/Logs**.

---

## 6. Segurança e operação

- Segredos apenas em `.env` local e na Vercel. Nunca em código ou documentação.
- `.env*` está no `.gitignore`; mantenha assim.
- Ative **Deployment Protection** em ambientes de Preview, se necessário.
- Revise permissões do Supabase e da Vercel periodicamente.
- Use HTTPS sempre (Vercel fornece por padrão).
- Faça backup antes de migrations destrutivas.
- Em caso de incidente, registre data/hora, impacto e ações tomadas.

---

## 7. Troubleshooting

| Problema | Causa provável | Solução |
| --- | --- | --- |
| `Can't reach database server` | Pooler/host incorreto ou senha inválida | Revise `DATABASE_URL`, URL-encode da senha e região |
| `too many connections` | Uso de conexão direta em serverless | Use pooler 6543 + `connection_limit=1` |
| `prepared statement already exists` | Pooler em modo transaction | Adicione `pgbouncer=true` |
| `P1001` | Banco inacessível | Verifique status do Supabase e firewall/IPv4 |
| Client Prisma desatualizado | `generate` não executado | `npx prisma generate` |
| Build falha por tipos | Erro TypeScript | `npx tsc --noEmit` e corrija |
| Tema não alterna | Variante `dark` ausente | Confirme `@custom-variant dark` no `globals.css` |
| Footer sobre conteúdo | Rodapé fixo | Garanta `pb-16` no `main` do layout |
| Migration pendente em produção | `migrate deploy` não executado | Rode no build/CI |
| Imagem white-label quebrada | URL inválida/CORS | Valide `logoUrl` e domínio permitido |
| `Internal Server Error` em todas as rotas no `next dev` | `npm run build` executado com o dev server ativo: o build reescreve `.next` e corrompe o cache de desenvolvimento | Pare o dev server, apague `.next`, suba o `next dev` novamente. Nunca rode `next build` com o dev ativo |
| Assets em `public/` retornando 404 | Arquivo ausente ou nome divergente | Confira `public/products/` e o caminho exato usado no componente (`.svg`, `.png`, etc.) |

---

## 8. Referências

- Next.js 15 App Router: <https://nextjs.org/docs/app>
- Prisma ORM: <https://www.prisma.io/docs>
- Supabase Database: <https://supabase.com/docs/guides/database>
- Vercel Deployments: <https://vercel.com/docs/deployments>
- Tailwind CSS v4: <https://tailwindcss.com/docs>
- next-themes: <https://github.com/pacocoursey/next-themes>

---

**Criado por BCTech | Josemar Brito | Whatsapp 11972646617**
