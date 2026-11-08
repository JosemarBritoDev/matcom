"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Edit3,
  History,
  Plus,
  Search,
  Tag,
  X,
} from "lucide-react";

type RegistrationStatus = "SIMPLIFICADO" | "COMPLETO";
type CustomerAccountStatus = "ATIVO" | "BLOQUEADO";
type PricingTier = "VAREJO" | "ATACADO";
type TierStatus = "APROVADO" | "PENDENTE" | "REJEITADO";
type LocalType = "OBRA" | "DEPOSITO" | "RESIDENCIA";
type CustomerFilter =
  | "TODOS"
  | "SIMPLIFICADO"
  | "COMPLETO"
  | "ATACADO"
  | "BLOQUEADO";

interface AddressData {
  zipCode: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  reference: string;
  localType: LocalType;
}

interface ClientData {
  id: string;
  name: string;
  tradeName: string;
  document: string;
  stateRegistration: string;
  email: string;
  phone: string;
  whatsapp: string;
  registration: RegistrationStatus;
  accountStatus: CustomerAccountStatus;
  tier: PricingTier;
  tierStatus: TierStatus;
  creditLimit: number;
  paymentDays: number;
  financialPending: boolean;
  address: AddressData;
  purchaseHistory: Array<{
    code: string;
    date: string;
    value: number;
    status: "PAGO" | "EM ABERTO";
  }>;
}

const INITIAL_CLIENTS: ClientData[] = [
  {
    id: "cliente-1",
    name: "Construtora Horizonte Ltda.",
    tradeName: "Horizonte Construções",
    document: "12.345.678/0001-90",
    stateRegistration: "123.456.789.110",
    email: "compras@horizonte.com.br",
    phone: "(11) 3456-7890",
    whatsapp: "(11) 98765-4321",
    registration: "COMPLETO",
    accountStatus: "ATIVO",
    tier: "ATACADO",
    tierStatus: "APROVADO",
    creditLimit: 25000,
    paymentDays: 30,
    financialPending: false,
    address: {
      zipCode: "01310-100",
      street: "Avenida Paulista",
      number: "1200",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      reference: "Portaria lateral",
      localType: "OBRA",
    },
    purchaseHistory: [
      { code: "1048", date: "06/11/2026", value: 6240, status: "PAGO" },
      { code: "1019", date: "28/10/2026", value: 4380, status: "PAGO" },
    ],
  },
  {
    id: "cliente-2",
    name: "Carlos Eduardo Martins",
    tradeName: "",
    document: "123.456.789-00",
    stateRegistration: "",
    email: "carlos@email.com",
    phone: "(11) 98765-4321",
    whatsapp: "(11) 98765-4321",
    registration: "COMPLETO",
    accountStatus: "ATIVO",
    tier: "VAREJO",
    tierStatus: "APROVADO",
    creditLimit: 1800,
    paymentDays: 15,
    financialPending: false,
    address: {
      zipCode: "04001-000",
      street: "Rua Vergueiro",
      number: "310",
      district: "Liberdade",
      city: "São Paulo",
      state: "SP",
      reference: "Casa branca",
      localType: "RESIDENCIA",
    },
    purchaseHistory: [
      { code: "1052", date: "08/11/2026", value: 1160, status: "PAGO" },
    ],
  },
  {
    id: "cliente-3",
    name: "Maria Aparecida Silva",
    tradeName: "",
    document: "987.654.321-00",
    stateRegistration: "",
    email: "maria@email.com",
    phone: "(11) 97654-3210",
    whatsapp: "",
    registration: "SIMPLIFICADO",
    accountStatus: "ATIVO",
    tier: "VAREJO",
    tierStatus: "APROVADO",
    creditLimit: 900,
    paymentDays: 0,
    financialPending: false,
    address: {
      zipCode: "",
      street: "",
      number: "",
      district: "",
      city: "",
      state: "",
      reference: "",
      localType: "RESIDENCIA",
    },
    purchaseHistory: [],
  },
  {
    id: "cliente-4",
    name: "Reforma Fácil Materiais",
    tradeName: "Reforma Fácil",
    document: "98.765.432/0001-10",
    stateRegistration: "110.222.333.444",
    email: "financeiro@reformafacil.com.br",
    phone: "(11) 2233-4455",
    whatsapp: "(11) 98888-1122",
    registration: "COMPLETO",
    accountStatus: "BLOQUEADO",
    tier: "ATACADO",
    tierStatus: "PENDENTE",
    creditLimit: 8000,
    paymentDays: 30,
    financialPending: true,
    address: {
      zipCode: "08050-000",
      street: "Avenida Norte Sul",
      number: "780",
      district: "Centro",
      city: "São Paulo",
      state: "SP",
      reference: "Portão verde",
      localType: "DEPOSITO",
    },
    purchaseHistory: [
      { code: "1033", date: "01/11/2026", value: 2890, status: "EM ABERTO" },
    ],
  },
];

const EMPTY_CLIENT: Omit<ClientData, "id" | "purchaseHistory"> = {
  name: "",
  tradeName: "",
  document: "",
  stateRegistration: "",
  email: "",
  phone: "",
  whatsapp: "",
  registration: "COMPLETO",
  accountStatus: "ATIVO",
  tier: "VAREJO",
  tierStatus: "APROVADO",
  creditLimit: 0,
  paymentDays: 30,
  financialPending: false,
  address: {
    zipCode: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    reference: "",
    localType: "OBRA",
  },
};

const FILTERS: Array<{ id: CustomerFilter; label: string }> = [
  { id: "TODOS", label: "Todos" },
  { id: "SIMPLIFICADO", label: "Simplificado / Balcão" },
  { id: "COMPLETO", label: "Cadastro Completo" },
  { id: "ATACADO", label: "Atacado Aprovado" },
  { id: "BLOQUEADO", label: "Bloqueado" },
];

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatBRL(value: number) {
  return brlFormatter.format(value);
}

function documentDigits(document: string) {
  return document.replace(/\D/g, "");
}

function isValidDocument(document: string) {
  const digits = documentDigits(document);
  return digits.length === 11 || digits.length === 14;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientData[]>(INITIAL_CLIENTS);
  const [filter, setFilter] = useState<CustomerFilter>("TODOS");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [draft, setDraft] =
    useState<Omit<ClientData, "id" | "purchaseHistory">>(EMPTY_CLIENT);
  const [activeTab, setActiveTab] = useState(0);
  const [formError, setFormError] = useState("");
  const [historyClient, setHistoryClient] = useState<ClientData | null>(null);
  const [promotionNotice, setPromotionNotice] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !normalizedSearch ||
        client.name.toLowerCase().includes(normalizedSearch) ||
        client.tradeName.toLowerCase().includes(normalizedSearch) ||
        documentDigits(client.document).includes(documentDigits(normalizedSearch));

      const matchesFilter =
        filter === "TODOS" ||
        (filter === "SIMPLIFICADO" && client.registration === "SIMPLIFICADO") ||
        (filter === "COMPLETO" && client.registration === "COMPLETO") ||
        (filter === "ATACADO" &&
          client.tier === "ATACADO" &&
          client.tierStatus === "APROVADO") ||
        (filter === "BLOQUEADO" && client.accountStatus === "BLOQUEADO");

      return matchesSearch && matchesFilter;
    });
  }, [clients, filter, search]);

  function openNewClient() {
    setEditingClient(null);
    setDraft({
      ...EMPTY_CLIENT,
      address: { ...EMPTY_CLIENT.address },
    });
    setActiveTab(0);
    setFormError("");
    setEditorOpen(true);
  }

  function openEditClient(client: ClientData) {
    const { id: _id, purchaseHistory: _history, ...editable } = client;
    void _id;
    void _history;
    setEditingClient(client);
    setDraft({
      ...editable,
      address: { ...client.address },
    });
    setActiveTab(0);
    setFormError("");
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingClient(null);
    setFormError("");
  }

  function updateDraft<K extends keyof Omit<ClientData, "id" | "purchaseHistory">>(
    key: K,
    value: Omit<ClientData, "id" | "purchaseHistory">[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateAddress<K extends keyof AddressData>(
    key: K,
    value: AddressData[K],
  ) {
    setDraft((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }));
  }

  async function lookupCep() {
    const digits = documentDigits(draft.address.zipCode);
    if (digits.length !== 8) {
      setFormError("Informe um CEP válido com 8 dígitos.");
      return;
    }

    setCepLoading(true);
    setFormError("");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data: {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      } = await response.json();

      if (data.erro) {
        setFormError("CEP não encontrado.");
        return;
      }

      setDraft((current) => ({
        ...current,
        address: {
          ...current.address,
          zipCode: `${digits.slice(0, 5)}-${digits.slice(5)}`,
          street: data.logradouro ?? current.address.street,
          district: data.bairro ?? current.address.district,
          city: data.localidade ?? current.address.city,
          state: data.uf ?? current.address.state,
        },
      }));
    } catch {
      setFormError("Não foi possível consultar o CEP. Preencha manualmente.");
    } finally {
      setCepLoading(false);
    }
  }

  function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (draft.name.trim().length < 3) {
      setFormError("Informe o nome ou razão social.");
      setActiveTab(0);
      return;
    }

    if (!isValidDocument(draft.document)) {
      setFormError("Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.");
      setActiveTab(0);
      return;
    }

    const hasCompleteAddress = Boolean(
      draft.address.zipCode.trim() &&
        draft.address.street.trim() &&
        draft.address.number.trim() &&
        draft.address.city.trim() &&
        draft.address.state.trim(),
    );

    const wholesaleBlocked =
      draft.tier === "ATACADO" &&
      (draft.financialPending || !isValidDocument(draft.document));

    if (wholesaleBlocked) {
      setFormError(
        "Atacado não pode ser ativado diretamente: há pendência financeira ou o documento é inválido.",
      );
      setActiveTab(2);
      return;
    }

    const normalizedDraft: Omit<ClientData, "id" | "purchaseHistory"> = {
      ...draft,
      name: draft.name.trim(),
      document: draft.document.trim(),
      registration: hasCompleteAddress ? "COMPLETO" : "SIMPLIFICADO",
      tierStatus:
        draft.tier === "ATACADO"
          ? editingClient?.tier === "ATACADO"
            ? editingClient.tierStatus
            : "PENDENTE"
          : "APROVADO",
    };

    if (editingClient) {
      setClients((current) =>
        current.map((client) =>
          client.id === editingClient.id
            ? { ...client, ...normalizedDraft }
            : client,
        ),
      );
    } else {
      setClients((current) => [
        {
          ...normalizedDraft,
          id: `cliente-${Date.now()}`,
          purchaseHistory: [],
        },
        ...current,
      ]);
    }

    closeEditor();
  }

  function requestWholesale(client: ClientData) {
    if (
      client.financialPending ||
      !isValidDocument(client.document) ||
      client.accountStatus === "BLOQUEADO"
    ) {
      setPromotionNotice(
        `Solicitação bloqueada para ${client.name}: regularize pendências financeiras/documentação.`,
      );
      return;
    }

    setClients((current) =>
      current.map((item) =>
        item.id === client.id
          ? { ...item, tier: "ATACADO", tierStatus: "PENDENTE" }
          : item,
      ),
    );
    setPromotionNotice(
      `Solicitação de tabela de atacado enviada ao Gerente para ${client.name}.`,
    );
  }

  return (
    <main className="min-h-full bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                Vendas
              </p>
              <h1 className="text-xl font-bold sm:text-2xl">
                Gestão de Clientes &amp; Crédito
              </h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {clients.length} clientes cadastrados
              </p>
            </div>
            <button
              type="button"
              onClick={openNewClient}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Novo Cliente Completo
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                    filter === item.id
                      ? "bg-white text-violet-700 shadow-sm dark:bg-zinc-800 dark:text-violet-300"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="relative min-w-[18rem]">
              <span className="sr-only">Buscar cliente</span>
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome ou CPF/CNPJ"
                className="h-10 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>
        </section>

        {promotionNotice && (
          <div
            role="status"
            className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
          >
            <span>{promotionNotice}</span>
            <button
              type="button"
              onClick={() => setPromotionNotice("")}
              aria-label="Fechar aviso"
              className="shrink-0"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        <section className="mt-4 hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Contato</th>
                  <th className="px-4 py-3 font-semibold">Cidade/UF</th>
                  <th className="px-4 py-3 font-semibold">Cadastro</th>
                  <th className="px-4 py-3 font-semibold">Tabela</th>
                  <th className="px-4 py-3 font-semibold">Crediário</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-4">
                      <p className="font-bold">{client.name}</p>
                      <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                        {client.document}
                      </p>
                    </td>
                    <td className="px-4 py-4">{client.phone}</td>
                    <td className="px-4 py-4">
                      {client.address.city
                        ? `${client.address.city}/${client.address.state}`
                        : "Não informado"}
                    </td>
                    <td className="px-4 py-4">
                      <RegistrationBadge client={client} />
                    </td>
                    <td className="px-4 py-4">
                      <TierBadge client={client} />
                    </td>
                    <td className="px-4 py-4 font-bold">
                      {formatBRL(client.creditLimit)}
                    </td>
                    <td className="px-4 py-4">
                      <ClientActions
                        client={client}
                        onEdit={() => openEditClient(client)}
                        onPromote={() => requestWholesale(client)}
                        onHistory={() => setHistoryClient(client)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 grid gap-3 md:hidden">
          {filteredClients.map((client) => (
            <article
              key={client.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{client.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {client.document}
                  </p>
                </div>
                <RegistrationBadge client={client} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <Info label="Telefone" value={client.phone} />
                <Info
                  label="Cidade/UF"
                  value={
                    client.address.city
                      ? `${client.address.city}/${client.address.state}`
                      : "Não informado"
                  }
                />
                <Info label="Tabela" value={client.tier} />
                <Info label="Crediário" value={formatBRL(client.creditLimit)} />
              </div>
              <div className="mt-3">
                <ClientActions
                  client={client}
                  onEdit={() => openEditClient(client)}
                  onPromote={() => requestWholesale(client)}
                  onHistory={() => setHistoryClient(client)}
                />
              </div>
            </article>
          ))}
        </section>

        {filteredClients.length === 0 && (
          <div className="mt-4 py-16 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Nenhum cliente encontrado.
          </div>
        )}

        <footer className="py-6 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>

      {editorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-zinc-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <h2 className="font-bold">
                  {editingClient ? "Editar cliente" : "Novo Cliente Completo"}
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Os dados completos liberam entrega e análise comercial.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Fechar cadastro"
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="border-b border-zinc-200 px-5 pt-3 dark:border-zinc-800">
              <div className="flex gap-1 overflow-x-auto">
                {["Dados Gerais", "Endereço de Entrega/Obra", "Análise Financeira & Tabelas"].map(
                  (tab, index) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(index)}
                      className={`shrink-0 border-b-2 px-3 py-3 text-xs font-bold ${
                        activeTab === index
                          ? "border-violet-600 text-violet-700 dark:text-violet-300"
                          : "border-transparent text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {index + 1}. {tab}
                    </button>
                  ),
                )}
              </div>
            </div>

            <form onSubmit={saveClient}>
              <div className="p-5">
                {activeTab === 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nome/Razão Social" className="sm:col-span-2">
                      <input required value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
                    </Field>
                    <Field label="Nome Fantasia">
                      <input value={draft.tradeName} onChange={(event) => updateDraft("tradeName", event.target.value)} />
                    </Field>
                    <Field label="CPF/CNPJ">
                      <input required value={draft.document} onChange={(event) => updateDraft("document", event.target.value)} />
                    </Field>
                    <Field label="Inscrição Estadual">
                      <input value={draft.stateRegistration} onChange={(event) => updateDraft("stateRegistration", event.target.value)} />
                    </Field>
                    <Field label="E-mail">
                      <input type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} />
                    </Field>
                    <Field label="Telefone principal">
                      <input value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} />
                    </Field>
                    <Field label="WhatsApp">
                      <input value={draft.whatsapp} onChange={(event) => updateDraft("whatsapp", event.target.value)} />
                    </Field>
                  </div>
                )}

                {activeTab === 1 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="CEP">
                      <div className="flex gap-2">
                        <input value={draft.address.zipCode} onChange={(event) => updateAddress("zipCode", event.target.value)} />
                        <button type="button" onClick={lookupCep} className="rounded-lg bg-violet-600 px-3 text-xs font-bold text-white">
                          {cepLoading ? "..." : "Buscar"}
                        </button>
                      </div>
                    </Field>
                    <Field label="Tipo de Local">
                      <select value={draft.address.localType} onChange={(event) => updateAddress("localType", event.target.value as LocalType)}>
                        <option value="OBRA">Obra</option>
                        <option value="DEPOSITO">Depósito</option>
                        <option value="RESIDENCIA">Residência</option>
                      </select>
                    </Field>
                    <Field label="Logradouro" className="sm:col-span-2">
                      <input value={draft.address.street} onChange={(event) => updateAddress("street", event.target.value)} />
                    </Field>
                    <Field label="Número">
                      <input value={draft.address.number} onChange={(event) => updateAddress("number", event.target.value)} />
                    </Field>
                    <Field label="Bairro">
                      <input value={draft.address.district} onChange={(event) => updateAddress("district", event.target.value)} />
                    </Field>
                    <Field label="Cidade">
                      <input value={draft.address.city} onChange={(event) => updateAddress("city", event.target.value)} />
                    </Field>
                    <Field label="Estado">
                      <input maxLength={2} value={draft.address.state} onChange={(event) => updateAddress("state", event.target.value.toUpperCase())} />
                    </Field>
                    <Field label="Ponto de Referência" className="sm:col-span-2">
                      <input value={draft.address.reference} onChange={(event) => updateAddress("reference", event.target.value)} />
                    </Field>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Perfil de tabela">
                      <select value={draft.tier} onChange={(event) => updateDraft("tier", event.target.value as PricingTier)}>
                        <option value="VAREJO">Varejo</option>
                        <option value="ATACADO">Atacado</option>
                      </select>
                    </Field>
                    <Field label="Limite de Crediário Autorizado">
                      <input type="number" min="0" step="0.01" value={draft.creditLimit} onChange={(event) => updateDraft("creditLimit", Number(event.target.value))} />
                    </Field>
                    <Field label="Prazo para faturamento" className="sm:col-span-2">
                      <input type="number" min="0" max="360" value={draft.paymentDays} onChange={(event) => updateDraft("paymentDays", Number(event.target.value))} />
                    </Field>
                    {draft.tier === "ATACADO" && (
                      <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                        O perfil Atacado gera solicitação pendente ao Gerente. Ativação direta não é permitida para clientes com pendências ou documento inválido.
                      </div>
                    )}
                  </div>
                )}

                {formError && (
                  <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {formError}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 p-5 sm:flex-row dark:border-zinc-800">
                <button type="button" onClick={closeEditor} className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold uppercase dark:border-zinc-700">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold uppercase text-white hover:bg-violet-700">
                  Salvar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyClient && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] flex items-end justify-center bg-zinc-950/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h2 className="font-bold">Histórico de Compras</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{historyClient.name}</p>
              </div>
              <button type="button" onClick={() => setHistoryClient(null)} aria-label="Fechar histórico" className="rounded-lg p-1 text-zinc-400">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="max-h-80 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
              {historyClient.purchaseHistory.length > 0 ? historyClient.purchaseHistory.map((purchase) => (
                <div key={purchase.code} className="flex items-center justify-between px-5 py-3 text-xs">
                  <div>
                    <p className="font-bold">Comanda #{purchase.code}</p>
                    <p className="text-zinc-500 dark:text-zinc-400">{purchase.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatBRL(purchase.value)}</p>
                    <p className={purchase.status === "PAGO" ? "text-emerald-600" : "text-amber-600"}>{purchase.status}</p>
                  </div>
                </div>
              )) : (
                <p className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Nenhuma compra registrada.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function RegistrationBadge({ client }: { client: ClientData }) {
  const simplified = client.registration === "SIMPLIFICADO";
  return (
    <span title={simplified ? "Sem endereço de entrega cadastrado" : undefined} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${simplified ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"}`}>
      {simplified ? <Clock3 className="h-3 w-3" aria-hidden /> : <CheckCircle2 className="h-3 w-3" aria-hidden />}
      {client.registration}
      {simplified && <span className="hidden lg:inline"> · Sem endereço de entrega</span>}
    </span>
  );
}

function TierBadge({ client }: { client: ClientData }) {
  const wholesale = client.tier === "ATACADO" && client.tierStatus === "APROVADO";
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${wholesale ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>
      {wholesale ? "Atacado" : client.tierStatus === "PENDENTE" ? "Atacado Pendente" : "Varejo"}
    </span>
  );
}

function ClientActions({
  client,
  onEdit,
  onPromote,
  onHistory,
}: {
  client: ClientData;
  onEdit: () => void;
  onPromote: () => void;
  onHistory: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <ActionButton icon={<Edit3 className="h-3.5 w-3.5" />} label="Editar Dados" onClick={onEdit} />
      <ActionButton icon={<Tag className="h-3.5 w-3.5" />} label="Promover para Atacado" onClick={onPromote} disabled={client.tier === "ATACADO"} />
      <ActionButton icon={<History className="h-3.5 w-3.5" />} label="Ver Histórico de Compras" onClick={onHistory} />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-[10px] font-semibold text-zinc-600 hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300">
      {icon}
      {label}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 font-bold">{value}</p>
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
        {label}
      </span>
      <span className="[&>input]:mt-1 [&>input]:h-10 [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-zinc-300 [&>input]:bg-white [&>input]:px-3 [&>input]:text-sm [&>select]:mt-1 [&>select]:h-10 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-zinc-300 [&>select]:bg-white [&>select]:px-3 [&>select]:text-sm dark:[&>input]:border-zinc-700 dark:[&>input]:bg-zinc-950 dark:[&>select]:border-zinc-700 dark:[&>select]:bg-zinc-950 [&_.flex>input]:mt-0 [&_.flex>input]:min-w-0 [&_.flex>input]:flex-1">
        {children}
      </span>
    </label>
  );
}
