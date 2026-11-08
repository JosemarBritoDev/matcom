# MANUAL OFICIAL — MatCom SaaS

**Sistema de gestão para lojas de materiais de construção**
Versão do documento: 1.0 — 08/11/2026

> Guia operacional para **vendedores**, **caixas** e **gerentes**.
> Para detalhes técnicos, consulte [`CONTEXTO_IA.md`](./CONTEXTO_IA.md) e [`SETUP_E_DEPLOY.md`](./SETUP_E_DEPLOY.md).

---

## Sumário

1. [Primeiro acesso e papéis](#1-primeiro-acesso-e-papéis)
2. [Visão geral da tela](#2-visão-geral-da-tela)
3. [Fluxo de venda no balcão](#3-fluxo-de-venda-no-balcão)
4. [Tabelas de preços: Varejo e Atacado](#4-tabelas-de-preços-varejo-e-atacado)
5. [Trava de aprovação do Gerente](#5-trava-de-aprovação-do-gerente)
6. [Fila do Caixa e imutabilidade pós-pagamento](#6-fila-do-caixa-e-imutabilidade-pós-pagamento)
7. [Dupla impressão: Via do Cliente e Via do Galpão](#7-dupla-impressão-via-do-cliente-e-via-do-galpão)
8. [Módulo PWA / Mobile — Atendimento no Pátio](#8-módulo-pwa--mobile--atendimento-no-pátio)
9. [Compras, estoque e logística](#9-compras-estoque-e-logística)
10. [Financeiro e fiscal](#10-financeiro-e-fiscal)
11. [Perguntas frequentes](#11-perguntas-frequentes)
12. [Suporte](#12-suporte)

---

## 1. Primeiro acesso e papéis

### 1.1 Acesso

1. Abra o endereço do sistema fornecido pela sua loja.
2. Informe e-mail e senha cadastrados.
3. No primeiro acesso, altere a senha provisória.
4. Em caso de esquecimento, solicite redefinição ao Gerente da Loja.

### 1.2 Papéis e permissões

| Papel | Principais permissões |
| --- | --- |
| **Vendedor** | Criar pedidos e orçamentos, consultar produtos/clientes, solicitar tabela de atacado |
| **Caixa** | Receber pagamentos, fechar caixa, reimprimir vias, cancelar com autorização |
| **Gerente da Loja** | Tudo do vendedor e do caixa + **aprovar/rejeitar tabela de atacado**, relatórios e configurações da loja |
| **Almoxarife** | Estoque, conferência, separação e romaneio |
| **Logística** | Entregas, rotas e confirmação de entrega |
| **Financeiro** | Contas a receber/pagar e fluxo de caixa |
| **Comprador** | Pedidos de compra e fornecedores |
| **Super Admin** | Administração do SaaS e suporte BCTech |

> **Regra de ouro:** cada usuário deve ter apenas o papel necessário para sua função. Nunca compartilhe credenciais.

---

## 2. Visão geral da tela

O sistema possui:

- **Header superior** com logotipo da loja, selo **MatCom SaaS**, menus de navegação, alternador de tema e perfil do usuário.
- **Menu Aprovações** visível somente para Gerente/Super Admin.
- **Área central** com o conteúdo de cada módulo.
- **Rodapé fixo** com a assinatura BCTech.

### Tema da interface

- **Light Clean** é o padrão, ideal para o balcão.
- **Dark Neon BCTech** pode ser ativado no botão de sol/lua no canto superior direito.
- A preferência fica salva no navegador do usuário.

---

## 3. Fluxo de venda no balcão

### 3.1 Iniciar um atendimento

1. Acesse **Vendas → Pedidos de Venda**.
2. Clique em **Novo pedido**.
3. Identifique o cliente:
   - Cliente cadastrado: busque por nome, documento ou telefone.
   - Cliente avulso: informe nome e telefone para rastreabilidade.
4. Adicione produtos por código de barras, nome ou busca rápida.
5. Confira quantidade, unidade e preço aplicado.
6. Escolha o modo de entrega:
   - **Retirada imediata** — cliente leva na hora.
   - **Entrega pendente** — segue para logística com endereço e observações.
7. Revise o total e envie para o caixa.

### 3.2 Orçamento

- Use **Vendas → Orçamentos** quando o cliente ainda não fechou a compra.
- O orçamento **não reserva estoque** e **não gera cobrança**.
- Ao aprovar, converta em pedido e envie ao caixa.
- Validade padrão sugerida: informar sempre a data de validade ao cliente.

### 3.3 Negociação

- O vendedor pode negociar dentro dos limites definidos pela loja.
- **Nunca** altere preço após o pedido estar pago.
- Descontos acima do limite exigem autorização do Gerente.
- O preço praticado é gravado no item do pedido (snapshot). Alterações futuras na tabela não mudam vendas antigas.

### 3.4 Envio para o caixa

- Ao confirmar, o pedido entra na **Fila do Caixa** com status **AGUARDANDO_CAIXA**.
- O vendedor acompanha o status na lista de pedidos.
- O caixa é o único responsável por registrar o pagamento.

---

## 4. Tabelas de preços: Varejo e Atacado

### 4.1 Varejo

- Tabela padrão de todo cliente novo.
- Aplicada automaticamente quando o cliente tem `pricingTier = VAREJO`.
- Não exige aprovação.

### 4.2 Atacado

- Destinada a clientes com volume de compra e negociação comercial.
- Oferece preços e/ou condições diferenciadas.
- **Só pode ser aplicada quando o cliente estiver com `tierStatus = APROVADO`.**
- Cliente com solicitação em análise fica com `tierStatus = PENDENTE`.

### 4.3 Como o sistema decide a tabela

| Situação do cliente | Tabela aplicada | Observação |
| --- | --- | --- |
| `VAREJO` + `APROVADO` | Varejo | Padrão |
| `ATACADO` + `APROVADO` | Atacado | Liberado pelo Gerente |
| `ATACADO` + `PENDENTE` | Varejo (ou bloqueio) | Não aplicar atacado |
| `ATACADO` + `REJEITADO` | Varejo | Solicitação negada |

> O vendedor **não** consegue forçar a tabela de atacado no front-end. A validação acontece também no servidor.

### 4.4 Produtos com preço de atacado por quantidade

- Cada produto possui `retailPrice`, `wholesalePrice` e `minWholesaleQty`.
- O preço de atacado pode ser aplicado automaticamente a partir da quantidade mínima, desde que o cliente esteja aprovado.
- Sempre confira a quantidade mínima antes de fechar o pedido.

---

## 5. Trava de aprovação do Gerente

### 5.1 Solicitação (Vendedor)

1. Abra o cadastro do cliente.
2. Clique em **Solicitar tabela de atacado**.
3. Informe o motivo/observação comercial.
4. Confirme. O sistema registra:
   - `pricingTier = ATACADO`
   - `tierStatus = PENDENTE`
   - `requestedBy = usuário solicitante`
5. O pedido fica **bloqueado para preço de atacado** até a análise.

### 5.2 Análise (Gerente)

1. Acesse **Aprovações → Tabelas de Atacado Pendentes**.
2. Revise cliente, histórico, volume e justificativa.
3. Escolha:
   - **Aprovar** → `tierStatus = APROVADO` e `approvedBy = gerente`.
   - **Rejeitar** → `tierStatus = REJEITADO`, com motivo.
4. O vendedor é notificado do resultado.

### 5.3 Regras importantes

- O menu **Aprovações** só aparece para `GERENTE_LOJA` e `SUPER_ADMIN`.
- **Vendedor não pode aprovar a própria solicitação.**
- Toda aprovação/rejeição é auditável (quem, quando e por quê).
- Enquanto pendente, o cliente continua comprando no varejo.
- Rejeição pode ser revista posteriormente com nova solicitação.

### 5.4 Checklist do Gerente

- [ ] Cliente possui histórico consistente?
- [ ] Volume declarado justifica a concessão?
- [ ] Margem do atacado é saudável?
- [ ] Há inadimplência em aberto?
- [ ] A decisão está registrada com justificativa?

---

## 6. Fila do Caixa e imutabilidade pós-pagamento

### 6.1 Fila do Caixa

1. Pedidos enviados pelo vendedor aparecem em **Caixa → Fila de Pedidos** com status **AGUARDANDO_CAIXA**.
2. O caixa confere cliente, itens, quantidades, preços e modo de entrega.
3. Seleciona a forma de pagamento (dinheiro, PIX, cartão, crediário etc.).
4. Registra o recebimento e confirma.
5. O pedido passa para **PAGO** e sai da fila ativa.

### 6.2 O que **não** pode ser feito após o pagamento

- Alterar itens, quantidades ou preços.
- Trocar a tabela de preço aplicada.
- Aplicar desconto retroativo.
- Excluir o pedido.
- Reimprimir alterando o conteúdo.

### 6.3 Como corrigir um pedido pago

1. Solicite ao Gerente o **cancelamento/estorno**.
2. O sistema registra `canceledBy`, data/hora e motivo.
3. Se necessário, crie um **novo pedido** corrigido.
4. O histórico original permanece preservado para auditoria.

> **Motivo da regra:** segurança jurídica, conferência de caixa, prevenção de fraude e rastreabilidade fiscal.

### 6.4 Fechamento de caixa

1. Acesse **Caixa → Fechamento**.
2. Confira valores por forma de pagamento.
3. Registre divergências com observação.
4. Confirme o fechamento. O relatório fica disponível para o Gerente e o Financeiro.

---

## 7. Dupla impressão: Via do Cliente e Via do Galpão

Todo pedido pago deve gerar **duas vias**. Elas não são cópias idênticas: cada uma tem finalidade própria.

### 7.1 Via do Cliente

**Destino:** cliente.
**Conteúdo recomendado:**
- Logotipo e dados da loja (white-label).
- Número do pedido e data/hora.
- Nome do cliente.
- Itens, quantidades, unidades e preços.
- Total, descontos e forma de pagamento.
- Modo de entrega e prazo/endereço, quando aplicável.
- Assinatura BCTech no rodapé.

### 7.2 Via do Galpão

**Destino:** equipe de separação/expedição.
**Conteúdo recomendado:**
- Número do pedido em destaque.
- Lista de separação com quantidade e unidade.
- Localização/setor do produto, quando disponível.
- Modo de entrega (retirada ou entrega).
- Observações de separação e romaneio.
- Campos para conferente e motorista assinarem.
- **Não** exibir dados financeiros desnecessários.

### 7.3 Como imprimir

1. localize o pedido pago.
2. Clique em **Imprimir vias**.
3. Selecione **Via do Cliente** e/ou **Via do Galpão**.
4. Confirme a impressora.
5. Em caso de falha, use **Reimprimir** — o conteúdo é sempre o mesmo do pagamento original.

> A reimpressão é registrada para auditoria. Nunca edite o pedido para "corrigir" uma via: cancele e reemita.

---

## 8. Módulo PWA / Mobile — Atendimento no Pátio

### 8.1 O que é

O MatCom pode ser instalado no celular ou tablet como aplicativo (PWA), permitindo atendimento no pátio, na expedição e em feiras, sem precisar voltar ao balcão.

### 8.2 Como instalar

**Android (Chrome):**
1. Abra o endereço do sistema.
2. Toque no menu (⋮) → **Instalar aplicativo** ou **Adicionar à tela inicial**.
3. Confirme.

**iOS (Safari):**
1. Abra o endereço no Safari.
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Confirme.

### 8.3 Recursos disponíveis

- Consulta rápida de produto, preço, estoque e unidade.
- Leitura de código de barras (quando disponível no dispositivo).
- Criação e edição de pedido em rascunho.
- Envio do pedido para o caixa.
- Consulta de clientes e tabela aplicada.
- Assistente de IA para apoio na identificação e cadastro de produtos.

### 8.4 Uso responsável

- O PWA **não substitui** o caixa: o pagamento continua sendo registrado pelo operador autorizado.
- Dados sensíveis não ficam armazenados no dispositivo.
- Em caso de conexão instável, o rascunho pode ser mantido localmente e sincronizado depois; confirme sempre o status antes de prometer ao cliente.
- A IA **não define preço nem estoque** — ela consulta a fonte de verdade. Em caso de divergência, prevaleça o sistema.

### 8.5 Boas práticas no pátio

- Mantenha o app atualizado (recarregue quando solicitado).
- Confira a unidade de venda antes de lançar quantidade (m², kg, caixa, unidade).
- Fotografe/observed condições de entrega quando necessário.
- Finalize o atendimento no sistema antes de liberar a mercadoria.

---

## 9. Compras, estoque e logística

### 9.1 Compras

1. **Compras → Pedidos de Compra** → novo pedido.
2. Selecione fornecedor e itens.
3. Envie ao fornecedor.
4. Ao receber, registre a **Entrada de NF-e** e confira quantidades e custos.
5. O status passa a **RECEBIDO_CONFERIDO**.

### 9.2 Estoque

- Consulte saldo por produto e unidade.
- Respeite o **estoque mínimo** para reposição.
- Produtos com unidade secundária (ex.: caixa → m², saco → kg) usam fator de conversão.
- Toda movimentação deve ter origem e responsável.

### 9.3 Logística e entregas

1. Pedidos com **ENTREGA_PENDENTE** aparecem na fila de logística.
2. O almoxarife separa e gera o **romaneio** (Via do Galpão).
3. A logística organiza rota e confirma a entrega.
4. O cliente assina o comprovante.
5. O sistema registra a conclusão.

---

## 10. Financeiro e fiscal

### 10.1 Contas a receber

- Geradas por vendas a prazo/crediário e parcelamentos.
- Baixa manual ou automática conforme conciliação.
- Acompanhe inadimplência e envie lembretes.

### 10.2 Contas a pagar

- Lançamentos de fornecedores, despesas fixas e variáveis.
- Controle vencimentos e evite juros.

### 10.3 Fluxo de caixa

- Visão consolidada de entradas e saídas.
- Conciliado com fechamentos de caixa.
- Use para decisões de compra e concessão de atacado.

### 10.4 Fiscal

- **Emissão NF-e/NFC-e:** vinculada ao pedido pago e aos dados fiscais do cliente.
- **Sped:** geração de arquivos para contabilidade.
- Em caso de erro fiscal, acione o responsável financeiro/contábil antes de reemitir.

---

## 11. Perguntas frequentes

**O vendedor pode aplicar atacado sem aprovação?**
Não. O sistema bloqueia a aplicação até o Gerente aprovar.

**Cliente aprovado no atacado perde o benefício?**
Só se o Gerente revogar ou rejeitar nova análise. A regra padrão é manter enquanto aprovado.

**Posso editar um pedido já pago?**
Não. Cancele/estorne com autorização e crie um novo pedido.

**O orçamento reserva estoque?**
Não. Só o pedido enviado ao caixa entra no fluxo operacional.

**Posso reimprimir uma via?**
Sim, com o mesmo conteúdo do pagamento original. A reimpressão é auditada.

**O PWA funciona sem internet?**
Parcialmente. Rascunhos podem ser mantidos localmente; operações críticas exigem conexão e confirmação do servidor.

**Quem pode ver o menu Aprovações?**
Somente `GERENTE_LOJA` e `SUPER_ADMIN`.

**Onde altero logo e cores da loja?**
Em **Configurações** (Gerente), nos campos de white-label do tenant.

---

## 12. Suporte

**BCTech — Josemar Brito**
WhatsApp: **11 97264-6617**

Ao abrir um chamado, informe:
- Nome da loja e usuário.
- Módulo e tela.
- Número do pedido/cliente (se aplicável).
- Descrição do ocorrido e horário aproximado.
- Print da tela, se possível.

---

**Criado por BCTech | Josemar Brito | Whatsapp 11972646617**
