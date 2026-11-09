"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  CircleAlert,
  Pencil,
  Search,
  Shield,
  ShieldOff,
  X,
} from "lucide-react";

import {
  alternarFeatureFlag,
  DESCRICOES_FEATURE_FLAGS,
  FEATURE_FLAGS_PADRAO,
  FEATURE_FLAGS_TENANT,
  formatarLimiteUsuarios,
  PLANOS,
  PLANOS_TENANT,
  resolverFeatureFlags,
  ROTULOS_FEATURE_FLAGS,
  type FeatureFlagTenant,
  type PlanoTenant,
  type TenantFeatureFlags,
} from "@/lib/permissions";

type StatusTenant = "ATIVO" | "SUSPENSO";

interface TenantAdministrado {
  id: string;
  nome: string;
  cnpj: string;
  plano: PlanoTenant;
  status: StatusTenant;
  featureFlags: TenantFeatureFlags;
}

const TENANTS_DEMONSTRACAO: TenantAdministrado[] = [
  {
    id: "tenant-matcom",
    nome: "MatCom Materiais",
    cnpj: "12.345.678/0001-90",
    plano: "PRO",
    status: "ATIVO",
    featureFlags: resolverFeatureFlags(FEATURE_FLAGS_PADRAO),
  },
  {
    id: "tenant-casa-nova",
    nome: "Casa Nova Construções",
    cnpj: "45.678.901/0001-23",
    plano: "START",
    status: "ATIVO",
    featureFlags: {
      ...FEATURE_FLAGS_PADRAO,
      emissaoFiscalSefaz: false,
    },
  },
  {
    id: "tenant-deposito-central",
    nome: "Depósito Central",
    cnpj: "98.765.432/0001-10",
    plano: "FREE",
    status: "SUSPENSO",
    featureFlags: {
      ...FEATURE_FLAGS_PADRAO,
      expedicao: false,
      emissaoFiscalSefaz: false,
    },
  },
];

const campoClassName =
  "mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-950";

export default function AdminPage() {
  const [tenants, setTenants] = useState(TENANTS_DEMONSTRACAO);
  const [busca, setBusca] = useState("");
  const [tenantEditando, setTenantEditando] =
    useState<TenantAdministrado | null>(null);
  const [aviso, setAviso] = useState("");

  const tenantsFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    if (!termo) {
      return tenants;
    }

    return tenants.filter((tenant) =>
      `${tenant.nome} ${tenant.cnpj}`.toLocaleLowerCase("pt-BR").includes(termo),
    );
  }, [busca, tenants]);

  function salvarTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantEditando) {
      return;
    }

    setTenants((atuais) =>
      atuais.map((tenant) =>
        tenant.id === tenantEditando.id ? tenantEditando : tenant,
      ),
    );
    setTenantEditando(null);
    setAviso("Dados do tenant atualizados nesta sessão.");
  }

  function alternarFlagTenant(
    tenantId: string,
    feature: FeatureFlagTenant,
  ) {
    setTenants((atuais) =>
      atuais.map((tenant) =>
        tenant.id === tenantId
          ? {
              ...tenant,
              featureFlags: alternarFeatureFlag(tenant.featureFlags, feature),
            }
          : tenant,
      ),
    );
  }

  function atualizarTenantEditado<K extends keyof TenantAdministrado>(
    campo: K,
    valor: TenantAdministrado[K],
  ) {
    setTenantEditando((atual) =>
      atual ? { ...atual, [campo]: valor } : atual,
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/70 px-4 py-8 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600 dark:text-violet-400">
              BCTech · Administração SaaS
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Painel Super Admin
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
              Gerencie empresas assinantes, planos, limites e módulos
              contratados.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
            <Shield className="h-4 w-4" aria-hidden />
            BCTech
          </span>
        </header>

        <aside
          role="note"
          className="mt-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            <strong>Interface demonstrativa:</strong> este repositório ainda não
            possui autenticação nem integração de tenants com o Prisma. Os
            registros são exemplos e as alterações ficam apenas nesta sessão;
            não use esta tela como controle administrativo em produção.
          </p>
        </aside>

        <section
          aria-label="Resumo de tenants"
          className="mt-5 grid gap-3 sm:grid-cols-3"
        >
          <ResumoCard
            label="Empresas cadastradas"
            valor={String(tenants.length)}
            icon={Building2}
          />
          <ResumoCard
            label="Assinaturas ativas"
            valor={String(tenants.filter((tenant) => tenant.status === "ATIVO").length)}
            icon={Check}
          />
          <ResumoCard
            label="Empresas suspensas"
            valor={String(
              tenants.filter((tenant) => tenant.status === "SUSPENSO").length,
            )}
            icon={ShieldOff}
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div>
              <h2 className="font-bold">Empresas assinantes</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Plano e limite de usuários são sincronizados pelas regras
                comerciais do MatCom.
              </p>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar empresa ou CNPJ"
                className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Empresa / CNPJ</th>
                  <th className="px-5 py-3">Plano</th>
                  <th className="px-5 py-3">Limite de usuários</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tenantsFiltrados.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{tenant.nome}</p>
                      <p className="mt-1 text-xs text-zinc-500">{tenant.cnpj}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {PLANOS[tenant.plano].nome}
                    </td>
                    <td className="px-5 py-4">
                      {formatarLimiteUsuarios(tenant.plano)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          tenant.status === "ATIVO"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setTenantEditando({ ...tenant })}
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {tenantsFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm text-zinc-500"
                    >
                      Nenhuma empresa encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-lg font-bold">Feature flags por empresa</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Ative ou desative módulos avulsos individualmente para cada
              tenant.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {tenants.map((tenant) => (
              <article
                key={tenant.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h3 className="font-bold">{tenant.nome}</h3>
                <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {FEATURE_FLAGS_TENANT.map((feature) => (
                    <FeatureFlagRow
                      key={feature}
                      feature={feature}
                      ativo={tenant.featureFlags[feature]}
                      onToggle={() => alternarFlagTenant(tenant.id, feature)}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {tenantEditando && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="tenant-edit-title"
              onSubmit={salvarTenant}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
                <div>
                  <h2 id="tenant-edit-title" className="text-lg font-bold">
                    Editar empresa assinante
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Os limites disponíveis acompanham o plano selecionado.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Fechar edição"
                  onClick={() => setTenantEditando(null)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Nome da empresa
                  </span>
                  <input
                    required
                    value={tenantEditando.nome}
                    onChange={(event) =>
                      atualizarTenantEditado("nome", event.target.value)
                    }
                    className={campoClassName}
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    CNPJ
                  </span>
                  <input
                    required
                    value={tenantEditando.cnpj}
                    onChange={(event) =>
                      atualizarTenantEditado("cnpj", event.target.value)
                    }
                    className={campoClassName}
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Plano
                  </span>
                  <select
                    value={tenantEditando.plano}
                    onChange={(event) =>
                      atualizarTenantEditado(
                        "plano",
                        event.target.value as PlanoTenant,
                      )
                    }
                    className={campoClassName}
                  >
                    {PLANOS_TENANT.map((plano) => (
                      <option key={plano} value={plano}>
                        {plano}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Limite de usuários
                  </span>
                  <input
                    readOnly
                    value={formatarLimiteUsuarios(tenantEditando.plano)}
                    className={`${campoClassName} bg-zinc-100 dark:bg-zinc-800`}
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Status
                  </span>
                  <select
                    value={tenantEditando.status}
                    onChange={(event) =>
                      atualizarTenantEditado(
                        "status",
                        event.target.value as StatusTenant,
                      )
                    }
                    className={campoClassName}
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="SUSPENSO">SUSPENSO</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-200 p-5 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTenantEditando(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold dark:border-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        )}

        {aviso && (
          <p
            role="status"
            className="fixed bottom-16 right-5 z-[90] rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-xl"
          >
            {aviso}
          </p>
        )}

        <p className="mt-8 border-t border-zinc-200 pt-5 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Criado por BCTech | Josemar Brito | Whatsapp 11972646617
        </p>
      </main>
    </div>
  );
}

function ResumoCard({
  label,
  valor,
  icon: Icon,
}: {
  label: string;
  valor: string;
  icon: typeof Building2;
}) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="text-xl font-extrabold">{valor}</p>
      </div>
    </article>
  );
}

function FeatureFlagRow({
  feature,
  ativo,
  onToggle,
}: {
  feature: FeatureFlagTenant;
  ativo: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-semibold">
          {ROTULOS_FEATURE_FLAGS[feature]}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {DESCRICOES_FEATURE_FLAGS[feature]}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        aria-label={`${ativo ? "Desativar" : "Ativar"} ${ROTULOS_FEATURE_FLAGS[feature]}`}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
          ativo ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            ativo ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
