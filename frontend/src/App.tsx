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
  | "veiculos"
  | "notas-fiscais-entrada"
  | "consignacoes"
  | "vendas"
  | "fornecedores"
  | "usuarios";

function obterPaginaAtual(): Pagina {
  const hash = window.location.hash
    .replace("#", "")
    .trim();

  switch (hash) {
    case "login":
      return "login";
    case "dashboard":
      return "dashboard";

    case "notas-fiscais-entrada":
      return "notas-fiscais-entrada";

    case "consignacoes":
      return "consignacoes";

    case "vendas":
      return "vendas";

    case "fornecedores":
      return "fornecedores";

    case "usuarios":
      return "usuarios";

    case "veiculos":
      return "veiculos";

    default:
      return "login";
  }
}

function LoginPage() {
  function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    window.location.hash = "veiculos";
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
        <form onSubmit={entrar}>
          <label htmlFor="login-usuario">Usuário</label>
          <input id="login-usuario" type="text" autoComplete="username" placeholder="Seu usuário" />
          <label htmlFor="login-senha">Senha</label>
          <input id="login-senha" type="password" autoComplete="current-password" placeholder="Sua senha" />
          <button type="submit">Entrar no pátio</button>
        </form>
        <p className="login-demo-note">
          Acesso demonstrativo: usuário e senha ainda não são validados.
        </p>
      </section>
    </main>
  );
}

function PaginaEmConstrucao({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <Layout>
      <div>
        <div className="breadcrumb">
          <strong>{titulo}</strong>
        </div>

        <div
          style={{
            marginTop: "24px",
            padding: "32px",
            border: "1px solid #d9e1ec",
            borderRadius: "14px",
            background: "#ffffff",
          }}
        >
          <h1
            style={{
              margin: "0 0 12px",
              color: "#172033",
              fontSize: "28px",
            }}
          >
            {titulo}
          </h1>

          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "16px",
            }}
          >
            {descricao}
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default function App() {
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

  switch (paginaAtual) {
    case "login":
      return <LoginPage />;
    case "dashboard":
      return (
        <PaginaEmConstrucao
          titulo="Dashboard"
          descricao="O dashboard completo será desenvolvido em uma entrega posterior."
        />
      );

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

    case "usuarios":
      return <UsuariosPage />;

    case "veiculos":
    default:
      return <VeiculosPage />;
  }
}
