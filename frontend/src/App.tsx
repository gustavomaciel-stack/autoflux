import { EmpresaPage } from "./pages/EmpresaPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RelatoriosPage } from "./pages/RelatoriosPage";
import { FinanciamentosPage } from './pages/FinanciamentosPage';
import { TrocasRecebidasPage } from './pages/TrocasRecebidasPage';
import { GarantiasPage } from './pages/GarantiasPage';
import { PedidosPage } from './pages/PedidosPage';
import { AvaliacoesTrocaPage } from './pages/AvaliacoesTrocaPage';
import { AutorizacoesComerciaisPage } from "./pages/AutorizacoesComerciaisPage";
import { OrcamentosPage } from "./pages/OrcamentosPage";
import { ParametrosComerciaisPage } from "./pages/ParametrosComerciaisPage";
import { HistoricoClientesPage } from "./pages/HistoricoClientesPage";
import { ClientesPage } from "./pages/ClientesPage";
import { podeGerenciarClientes, podeConsultarOrcamentos, podeConsultarHistoricoCliente } from "./services/clientesAcesso";
import { PerfisPage } from "./pages/PerfisPage";
import { useAuth } from "./context/AuthContext";
import { useEffect, useState, type FormEvent } from "react";
import { Layout } from "./components/Layout";
import { ConsignacoesPage } from "./pages/ConsignacoesPage";
import { FornecedoresPage } from "./pages/FornecedoresPage";
import { NotasFiscaisEntradaPage } from "./pages/NotasFiscaisEntradaPage";
import { UsuariosPage } from "./pages/UsuariosPage";
import { VeiculosPage } from "./pages/VeiculosPage";
import { VendasPage } from "./pages/VendasPage";

type Pagina =
  | "login"
  | "dashboard"
  | "relatorios"
  | "empresa"
  | "veiculos"
  | "notas-fiscais-entrada"
  | "consignacoes"
  | "vendas"
  | "fornecedores"
  | "usuarios"
  | "perfis"
  | "historico-clientes"
  | "clientes"
  | "parametros-comerciais"
  | "trocas-recebidas"
  | "avaliacoes-troca"
  | "financiamentos"
  | "garantias"
  | "pedidos"
  | "orcamentos"
  | "autorizacoes-comerciais";

function obterPaginaAtual(): Pagina {
  const hash = window.location.hash
    .replace("#", "")
    .trim();

  switch (hash) {
    case "login":
      return "login";
    case "dashboard":
      return "dashboard";
    case "relatorios":
      return "relatorios";
    case "empresa":
      return "empresa";

    case "notas-fiscais-entrada":
      return "notas-fiscais-entrada";

    case "consignacoes":
      return "consignacoes";

    case "vendas":
      return "vendas";

    case "fornecedores":
      return "fornecedores";

    case "perfis":
      return "perfis";
    case "autorizacoes-comerciais":
      return "autorizacoes-comerciais";
    case "trocas-recebidas":
      return "trocas-recebidas";
    case "avaliacoes-troca":
      return "avaliacoes-troca";
    case "financiamentos":
      return "financiamentos";
    case "garantias":
      return "garantias";
    case "pedidos":
      return "pedidos";
    case "orcamentos":
      return "orcamentos";
    case "parametros-comerciais":
      return "parametros-comerciais";
    case "historico-clientes":
      return "historico-clientes";
    case "clientes":
      return "clientes";
    case "usuarios":
      return "usuarios";

    case "veiculos":
      return "veiculos";

    default:
      return "login";
  }
}

function LoginPage() {
  const { autenticar, erroInicial } = useAuth();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setErro(""); setEnviando(true);
    try { await autenticar(login, senha); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível entrar."); }
    finally { setEnviando(false); }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">Auto<span>Flux</span></div>
        <p className="login-company">Autocar Veículos</p>
        <h1 id="login-title">Bem-vindo ao AutoFlux</h1>
        <p className="login-description">
          Gestão de veículos, aquisições e despesas em um só lugar.
        </p>
        {(erro || erroInicial) && <div className="alert error" role="alert">{erro || erroInicial}</div>}
        <form onSubmit={entrar}>
          <label htmlFor="login-usuario">Usuário</label>
          <input id="login-usuario" type="text" autoComplete="username" placeholder="Seu usuário" value={login} onChange={e => setLogin(e.target.value)} required disabled={enviando} />
          <label htmlFor="login-senha">Senha</label>
          <input id="login-senha" type="password" autoComplete="current-password" placeholder="Sua senha" value={senha} onChange={e => setSenha(e.target.value)} required disabled={enviando} />
          <button type="submit" disabled={enviando}>{enviando ? "Entrando..." : "Login"}</button>
        </form>

      </section>
    </main>
  );
}

export default function App() {
  const { usuario, carregando, pode } = useAuth();
  const [paginaAtual, setPaginaAtual] =
    useState<Pagina>(obterPaginaAtual);

  useEffect(() => {
    function atualizarPagina() {
      setPaginaAtual(obterPaginaAtual());
    }

    window.addEventListener(
      "hashchange",
      atualizarPagina,
    );

    if (!window.location.hash) {
      window.location.hash = "login";
    }

    return () => {
      window.removeEventListener(
        "hashchange",
        atualizarPagina,
      );
    };
  }, []);

  if (carregando) return <main className="login-page">Carregando...</main>;
  if (!usuario) return <LoginPage />;

  const acesso: Record<string, string> = { financiamentos:"pedidos.visualizar", "trocas-recebidas":"trocas.visualizar", garantias:"pedidos.visualizar", pedidos:"pedidos.visualizar", "avaliacoes-troca":"trocas.visualizar", "autorizacoes-comerciais":"autorizacoes.decidir", veiculos:"veiculos.visualizar", login:"veiculos.visualizar", vendas:"vendas.visualizar", consignacoes:"consignacoes.visualizar", "notas-fiscais-entrada":"notas.visualizar", fornecedores:"fornecedores.visualizar", usuarios:"usuarios.administrar", perfis:"perfis.administrar", dashboard:"gerenciais.visualizar", relatorios:"gerenciais.visualizar", empresa:"empresa.gerenciar", "parametros-comerciais":"perfis.administrar" };
  const acessoPermitido = paginaAtual === "historico-clientes" ? podeConsultarHistoricoCliente(usuario) : paginaAtual === "clientes" ? podeGerenciarClientes(usuario) : paginaAtual === "orcamentos" ? podeConsultarOrcamentos(usuario) : paginaAtual === "notas-fiscais-entrada" ? pode("notas.visualizar") || pode("notas.saida.visualizar") : pode(acesso[paginaAtual]);
  if (!acessoPermitido) return <Layout><div className="alert error">Seu perfil não permite acessar esta página. Use os menus disponíveis.</div></Layout>;
  switch (paginaAtual) {
    case "login":
      return <VeiculosPage />;
    case "dashboard":
      return <DashboardPage />;
    case "relatorios":
      return <RelatoriosPage />;
    case "empresa":
      return <EmpresaPage />;

    case "notas-fiscais-entrada":
      return <NotasFiscaisEntradaPage />;

    case "consignacoes":
      return <ConsignacoesPage />;

    case "vendas":
      return (
        <Layout>
          <VendasPage />
        </Layout>
      );

    case "fornecedores":
      return <FornecedoresPage />;

    case "perfis":
      return <PerfisPage />;
    case "autorizacoes-comerciais":
      return <AutorizacoesComerciaisPage />;
    case "trocas-recebidas":
      return <TrocasRecebidasPage />;
    case "avaliacoes-troca":
      return <AvaliacoesTrocaPage />;
    case "financiamentos":
      return <FinanciamentosPage />;
    case "garantias":
      return <GarantiasPage />;
    case "pedidos":
      return <PedidosPage />;
    case "orcamentos":
      return <OrcamentosPage />;
    case "parametros-comerciais":
      return <ParametrosComerciaisPage />;
    case "historico-clientes":
      return <HistoricoClientesPage />;
    case "clientes":
      return <ClientesPage />;
    case "usuarios":
      return <UsuariosPage />;

    case "veiculos":
    default:
      return <VeiculosPage />;
  }
}
