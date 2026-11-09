"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Camera,
  CreditCard,
  Edit3,
  KeyRound,
  LockKeyhole,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";

import {
  podeAdicionarUsuario,
  PLANOS,
  type PlanoTenant,
  type ValidacaoLimiteUsuarios,
} from "@/lib/permissions";

type SettingsTab = "empresa" | "usuarios" | "regras";
type EmployeeRole =
  | "GERENTE_LOJA"
  | "OPERADOR_CAIXA"
  | "FINANCEIRO"
  | "OPERACIONAL_VENDAS";
type UserStatus = "ATIVO" | "BLOQUEADO";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  sellerRegistration: string;
  status: UserStatus;
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  GERENTE_LOJA: "Gerente da Loja",
  OPERADOR_CAIXA: "Operador de Caixa",
  FINANCEIRO: "Financeiro",
  OPERACIONAL_VENDAS: "Operacional de Vendas",
};

const INITIAL_USERS: TeamUser[] = [
  {
    id: "usr-001",
    name: "Josemar Brito",
    email: "josemar@matcom.com.br",
    role: "GERENTE_LOJA",
    sellerRegistration: "GL-001",
    status: "ATIVO",
  },
  {
    id: "usr-002",
    name: "Ana Paula",
    email: "ana.paula@matcom.com.br",
    role: "OPERACIONAL_VENDAS",
    sellerRegistration: "VND-0042",
    status: "ATIVO",
  },
  {
    id: "usr-003",
    name: "Carlos Eduardo",
    email: "carlos@matcom.com.br",
    role: "OPERADOR_CAIXA",
    sellerRegistration: "-",
    status: "ATIVO",
  },
  {
    id: "usr-004",
    name: "Marina Santos",
    email: "marina@matcom.com.br",
    role: "FINANCEIRO",
    sellerRegistration: "-",
    status: "BLOQUEADO",
  },
];

const EMPTY_USER: Omit<TeamUser, "id"> = {
  name: "",
  email: "",
  role: "OPERACIONAL_VENDAS",
  sellerRegistration: "",
  status: "ATIVO",
};

export default function ConfiguracoesEmpresaPage() {
  const planoContratado: PlanoTenant = "PRO";
  const [activeTab, setActiveTab] = useState<SettingsTab>("empresa");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<TeamUser[]>(INITIAL_USERS);
  const [editingUser, setEditingUser] =
    useState<TeamUser | Omit<TeamUser, "id"> | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [approvalPin, setApprovalPin] = useState("");
  const [toast, setToast] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("10");
  const [quoteValidity, setQuoteValidity] = useState("15");
  const [requireCpfNfce, setRequireCpfNfce] = useState(true);
  const [cashDrawerLimit, setCashDrawerLimit] = useState("5000");
  const [upgradeSolicitado, setUpgradeSolicitado] =
    useState<ValidacaoLimiteUsuarios | null>(null);

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.name, user.email, ROLE_LABELS[user.role], user.sellerRegistration]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [search, users]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function openNewUser() {
    const limite = podeAdicionarUsuario(planoContratado, users.length);

    if (!limite.permitido) {
      setUpgradeSolicitado(limite);
      return;
    }

    setEditingUser({ ...EMPTY_USER });
    setTemporaryPassword("");
    setApprovalPin("");
    setIsNewUser(true);
  }

  function openEditUser(user: TeamUser) {
    setEditingUser({ ...user });
    setTemporaryPassword("");
    setApprovalPin("");
    setIsNewUser(false);
  }

  function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;

    if ("id" in editingUser) {
      setUsers((current) =>
        current.map((user) =>
          user.id === editingUser.id
            ? { ...editingUser, sellerRegistration: editingUser.sellerRegistration || "-" }
            : user,
        ),
      );
      showToast("Permissões do usuário atualizadas.");
    } else {
      const limite = podeAdicionarUsuario(planoContratado, users.length);

      if (!limite.permitido) {
        setEditingUser(null);
        setUpgradeSolicitado(limite);
        return;
      }

      setUsers((current) => [
        ...current,
        {
          ...editingUser,
          id: `usr-${Date.now()}`,
          sellerRegistration: editingUser.sellerRegistration || "-",
        },
      ]);
      showToast("Usuário cadastrado com sucesso.");
    }
    setEditingUser(null);
  }

  function updateEditingUser<K extends keyof Omit<TeamUser, "id">>(
    key: K,
    value: Omit<TeamUser, "id">[K],
  ) {
    setEditingUser((current) => (current ? { ...current, [key]: value } : current));
  }

  function toggleUserStatus(user: TeamUser) {
    setUsers((current) =>
      current.map((item) =>
        item.id === user.id
          ? { ...item, status: item.status === "ATIVO" ? "BLOQUEADO" : "ATIVO" }
          : item,
      ),
    );
    showToast(
      user.status === "ATIVO"
        ? `${user.name} foi bloqueado.`
        : `${user.name} foi reativado.`,
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-400">
              Administração da loja
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Configurações da Empresa &amp; Gestão de Equipe
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Dados corporativos, equipe, acessos e regras operacionais do tenant.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Ambiente seguro
          </span>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-cyan-50 shadow-sm dark:border-violet-900/60 dark:from-violet-950/60 dark:via-zinc-900 dark:to-cyan-950/30">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
                <Store className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Plano contratado
                </p>
                <h2 className="mt-1 text-lg font-bold">
                  Plano MatCom {PLANOS[planoContratado].nome} - Ativo
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {users.length} de{" "}
                  {PLANOS[planoContratado].limiteUsuarios ?? "ilimitado"}{" "}
                  usuários em uso
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => showToast("Dados cadastrais enviados para alteração.")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-800 dark:bg-zinc-900 dark:text-violet-300 dark:hover:bg-violet-950"
            >
              <Edit3 className="h-4 w-4" /> Alterar dados cadastrais
            </button>
          </div>
        </section>

        <div className="mt-6 flex gap-2 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1.5 dark:border-zinc-800 dark:bg-zinc-900">
          {([
            ["empresa", "Dados da Empresa", Building2],
            ["usuarios", "Gestão de Usuários & Equipe", Users],
            ["regras", "Regras de Negócio da Loja", Settings2],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex min-w-max items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === id
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {activeTab === "empresa" && (
          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-bold">Dados cadastrais</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Razão Social" defaultValue="MatCom Materiais de Construção Ltda." />
                <Field label="Nome Fantasia" defaultValue="MatCom Materiais" />
                <Field label="CNPJ" defaultValue="12.345.678/0001-90" />
                <Field label="Inscrição Estadual" defaultValue="123.456.789.123" />
                <Field label="Telefone" defaultValue="(11) 97264-6617" />
                <Field label="E-mail fiscal" defaultValue="fiscal@matcom.com.br" />
                <div className="sm:col-span-2">
                  <Field label="Endereço completo" defaultValue="Av. das Construções, 250 - Parque Industrial, São Paulo/SP - 08000-000" />
                </div>
              </div>
              <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <h3 className="text-sm font-bold">Parâmetros de Impressão Térmica</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field label="Largura do papel" defaultValue="80 mm" />
                  <Field label="Modelo da impressora" defaultValue="Epson TM-T20X" />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">Modo de impressão</span>
                    <select className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                      <option>Texto térmico</option>
                      <option>PDF / Sistema</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => showToast("Dados da empresa salvos.")} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
                  <Save className="h-4 w-4" /> Salvar dados
                </button>
              </div>
            </div>
            <aside className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-bold">Logotipo da loja</h2>
              <div className="mt-5 flex h-44 flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-black text-white">M</div>
                <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400">
                  <Camera className="h-4 w-4" /> Enviar logotipo
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">PNG ou JPG, com fundo transparente. Máximo de 2 MB.</p>
            </aside>
          </section>
        )}

        {activeTab === "usuarios" && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuário, e-mail ou matrícula..." className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-950" />
              </div>
              <button type="button" onClick={openNewUser} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
                <Plus className="h-4 w-4" /> Novo usuário
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Usuário</th>
                    <th className="px-5 py-3">Perfil / Role</th>
                    <th className="px-5 py-3">Vendedor associado</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{user.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{user.email}</p>
                      </td>
                      <td className="px-5 py-4"><span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">{ROLE_LABELS[user.role]}</span></td>
                      <td className="px-5 py-4 text-sm">{user.sellerRegistration}</td>
                      <td className="px-5 py-4">
                        <button type="button" onClick={() => toggleUserStatus(user)} className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.status === "ATIVO" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>
                          {user.status}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openEditUser(user)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"><KeyRound className="h-3.5 w-3.5" /> Editar Permissões</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "regras" && (
          <section className="mt-5 grid gap-5 md:grid-cols-2">
            <RuleCard icon={ShieldCheck} title="Desconto sem aprovação" description="Percentual máximo concedido pelo vendedor sem autorização hierárquica.">
              <NumberRule value={maxDiscount} onChange={setMaxDiscount} suffix="%" />
            </RuleCard>
            <RuleCard icon={BadgeCheck} title="Validade de orçamentos" description="Prazo padrão aplicado a propostas comerciais novas.">
              <NumberRule value={quoteValidity} onChange={setQuoteValidity} suffix="dias" />
            </RuleCard>
            <RuleCard icon={CreditCard} title="CPF na NFC-e" description="Determina se a identificação do consumidor será obrigatória na emissão.">
              <button type="button" onClick={() => setRequireCpfNfce((current) => !current)} className={`relative h-7 w-12 rounded-full transition-colors ${requireCpfNfce ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${requireCpfNfce ? "left-6" : "left-1"}`} />
              </button>
            </RuleCard>
            <RuleCard icon={LockKeyhole} title="Limite de sangria da gaveta" description="Valor que exige autorização adicional do gerente.">
              <NumberRule value={cashDrawerLimit} onChange={setCashDrawerLimit} prefix="R$" />
            </RuleCard>
            <div className="md:col-span-2 flex justify-end">
              <button type="button" onClick={() => showToast("Regras de negócio atualizadas.")} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
                <Save className="h-4 w-4" /> Salvar regras
              </button>
            </div>
          </section>
        )}

        {editingUser && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
            <form onSubmit={saveUser} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
                <div>
                  <h2 className="text-lg font-bold">{isNewUser ? "Novo usuário" : "Editar permissões"}</h2>
                  <p className="mt-1 text-xs text-zinc-500">Defina identidade, acesso e vínculo comercial.</p>
                </div>
                <button type="button" onClick={() => setEditingUser(null)} aria-label="Fechar" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Nome completo" value={editingUser.name} onChange={(value) => updateEditingUser("name", value)} />
                <Field label="E-mail" type="email" value={editingUser.email} onChange={(value) => updateEditingUser("email", value)} />
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">Perfil / Role</span>
                  <select value={editingUser.role} onChange={(event) => updateEditingUser("role", event.target.value as EmployeeRole)} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                    {(Object.keys(ROLE_LABELS) as EmployeeRole[]).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                  </select>
                </label>
                <Field label="Matrícula de vendedor" value={editingUser.sellerRegistration} onChange={(value) => updateEditingUser("sellerRegistration", value)} placeholder="Ex.: VND-0042" />
                <Field label="Senha temporária" type="password" value={temporaryPassword} onChange={setTemporaryPassword} placeholder="Mínimo 8 caracteres" />
                <Field label="PIN de aprovação do gerente" type="password" value={approvalPin} onChange={setApprovalPin} placeholder="4 a 6 dígitos" inputMode="numeric" maxLength={6} />
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">Status</span>
                  <select value={editingUser.status} onChange={(event) => updateEditingUser("status", event.target.value as UserStatus)} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                    <option value="ATIVO">Ativo</option>
                    <option value="BLOQUEADO">Bloqueado</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-zinc-200 p-5 dark:border-zinc-800">
                <button type="button" onClick={() => setEditingUser(null)} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Cancelar</button>
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"><Save className="h-4 w-4" /> Salvar usuário</button>
              </div>
            </form>
          </div>
        )}

        {upgradeSolicitado && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="upgrade-title"
              className="w-full max-w-md rounded-2xl border border-violet-200 bg-white p-6 shadow-2xl dark:border-violet-900 dark:bg-zinc-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                <Users className="h-6 w-6" aria-hidden />
              </div>
              <h2 id="upgrade-title" className="mt-4 text-lg font-bold">
                Amplie sua equipe com o plano{" "}
                {upgradeSolicitado.planoSugerido
                  ? PLANOS[upgradeSolicitado.planoSugerido].nome
                  : "BCTech"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {upgradeSolicitado.motivo}
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Fale com a BCTech para liberar novos acessos para sua loja.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUpgradeSolicitado(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold dark:border-zinc-700"
                >
                  Agora não
                </button>
                <a
                  href={`https://wa.me/5511972646617?text=${encodeURIComponent(
                    `Olá, gostaria de fazer upgrade para o plano ${upgradeSolicitado.planoSugerido ? PLANOS[upgradeSolicitado.planoSugerido].nome : "BCTech"}.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
                >
                  Falar com a BCTech
                </a>
              </div>
            </section>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-xl dark:bg-white dark:text-zinc-900">
            <BadgeCheck className="h-4 w-4 text-emerald-400" /> {toast}
          </div>
        )}

        <footer className="mt-8 border-t border-zinc-200 pt-5 text-center text-xs text-zinc-500 dark:border-zinc-800">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </footer>
      </div>
    </main>
  );
}

interface FieldProps {
  label: string;
  value?: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric" | "text";
  maxLength?: number;
  onChange?: (value: string) => void;
}

function Field({
  label,
  value,
  defaultValue,
  type = "text",
  placeholder,
  inputMode,
  maxLength,
  onChange,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition-colors focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
    </label>
  );
}

function RuleCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="flex min-h-36 flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"><Icon className="h-5 w-5" /></div>
        <div><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p></div>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function NumberRule({
  value,
  onChange,
  prefix,
  suffix,
}: {
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {prefix && <span className="text-sm font-bold text-zinc-500">{prefix}</span>}
      <input type="number" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-28 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-bold outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-950" />
      {suffix && <span className="text-sm font-bold text-zinc-500">{suffix}</span>}
    </div>
  );
}
