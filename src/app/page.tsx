import {
  ArrowRight,
  Boxes,
  FileText,
  LogIn,
  ShoppingCart,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";

const modules = [
  {
    icon: ShoppingCart,
    title: "Vendas",
    description: "Pedidos, orçamentos e atendimento ao cliente.",
  },
  {
    icon: Wallet,
    title: "Caixa",
    description: "Pagamentos, fechamento e controle de recebimentos.",
  },
  {
    icon: Boxes,
    title: "Estoque",
    description: "Produtos, unidades, conversões e estoque mínimo.",
  },
  {
    icon: Truck,
    title: "Logística",
    description: "Entregas pendentes e retiradas na loja.",
  },
  {
    icon: FileText,
    title: "Fiscal",
    description: "Emissão e conferência de documentos fiscais.",
  },
  {
    icon: Sparkles,
    title: "Assistente IA",
    description: "Apoio inteligente para a operação do dia a dia.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col justify-center gap-14 px-6 py-16">
        <section className="flex flex-col items-start gap-6">
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Sistema de gestão para loja de materiais de construção
          </span>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Tudo o que a sua loja precisa,{" "}
            <span className="text-amber-600 dark:text-amber-400">
              em um só lugar
            </span>
            .
          </h1>

          <p className="max-w-2xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
            Vendas, caixa, compras, estoque, logística e fiscal integrados para
            simplificar a rotina da sua equipe. A tela inicial está em
            desenvolvimento — em breve o sistema completo estará disponível.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="#modulos"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
            >
              Conhecer os módulos
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Acessar o sistema
            </a>
          </div>
        </section>

        <section id="modulos" className="flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Módulos previstos
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Recursos organizados por área de atuação da loja.
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight">{title}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
