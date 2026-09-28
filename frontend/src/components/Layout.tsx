import { useState, type ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [menuVeiculosAberto, setMenuVeiculosAberto] =
    useState(false);

  const [menuVendasAberto, setMenuVendasAberto] =
    useState(false);

  const [menuCadastrosAberto, setMenuCadastrosAberto] =
    useState(false);

  const paginaAtual = window.location.hash;

  const paginaDashboard =
    paginaAtual === "#dashboard";

  const paginaPatio =
    paginaAtual === "#veiculos";

  const paginaNotasFiscais =
    paginaAtual === "#notas-fiscais-entrada";

  const paginaConsignacoes =
    paginaAtual === "#consignacoes";

  const paginaVendas =
    paginaAtual === "#vendas";

  const paginaUsuarios =
    paginaAtual === "#usuarios";

  const paginaFornecedores =
    paginaAtual === "#fornecedores" ||
    paginaAtual === "";

  const paginaModuloVeiculos =
    paginaPatio ||
    paginaNotasFiscais ||
    paginaConsignacoes;

  const paginaModuloVendas = paginaVendas;

  const paginaCadastros =
    paginaUsuarios || paginaFornecedores;

  function fecharMenus() {
    setMenuVeiculosAberto(false);
    setMenuVendasAberto(false);
    setMenuCadastrosAberto(false);
  }

  function abrirDashboard() {
    fecharMenus();
    window.location.hash = "#dashboard";
  }

  function abrirPatio() {
    fecharMenus();
    window.location.hash = "#veiculos";
  }

  function abrirNotasFiscais() {
    fecharMenus();

    window.location.hash =
      "#notas-fiscais-entrada";
  }

  function abrirConsignacoes() {
    fecharMenus();

    window.location.hash =
      "#consignacoes";
  }

  function abrirVendas() {
    fecharMenus();
    window.location.hash = "#vendas";
  }

  function abrirUsuarios() {
    fecharMenus();
    window.location.hash = "#usuarios";
  }

  function abrirFornecedores() {
    fecharMenus();

    window.location.hash =
      "#fornecedores";
  }

  function alternarMenuVeiculos() {
    setMenuVeiculosAberto(
      (aberto) => !aberto,
    );

    setMenuVendasAberto(false);
    setMenuCadastrosAberto(false);
  }

  function alternarMenuVendas() {
    setMenuVendasAberto(
      (aberto) => !aberto,
    );

    setMenuVeiculosAberto(false);
    setMenuCadastrosAberto(false);
  }

  function alternarMenuCadastros() {
    setMenuCadastrosAberto(
      (aberto) => !aberto,
    );

    setMenuVeiculosAberto(false);
    setMenuVendasAberto(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <strong className="brand">
            AutoFlux
          </strong>

          <span className="brand-divider" />

          <span className="company">
            Autocar Veículos
          </span>
        </div>

        <nav
          className="main-nav"
          aria-label="Navegação principal"
        >
          <button
            type="button"
            className={
              paginaDashboard
                ? "active"
                : undefined
            }
            aria-current={
              paginaDashboard
                ? "page"
                : undefined
            }
            onClick={abrirDashboard}
          >
            Dashboard
          </button>

          <button type="button">
            Gestão⌄
          </button>

          <div className="nav-dropdown">
            <button
              type="button"
              className={
                paginaModuloVeiculos
                  ? "active"
                  : undefined
              }
              aria-current={
                paginaModuloVeiculos
                  ? "page"
                  : undefined
              }
              aria-expanded={
                menuVeiculosAberto
              }
              onClick={
                alternarMenuVeiculos
              }
            >
              Veículos⌄
            </button>

            {menuVeiculosAberto && (
              <div className="nav-dropdown-menu">
                <button
                  type="button"
                  className={
                    paginaPatio
                      ? "selected"
                      : undefined
                  }
                  onClick={abrirPatio}
                >
                  Pátio de veículos
                </button>

                <button
                  type="button"
                  className={
                    paginaNotasFiscais
                      ? "selected"
                      : undefined
                  }
                  onClick={
                    abrirNotasFiscais
                  }
                >
                  Notas fiscais de entrada
                </button>

                <button
                  type="button"
                  className={
                    paginaConsignacoes
                      ? "selected"
                      : undefined
                  }
                  onClick={
                    abrirConsignacoes
                  }
                >
                  Consignações
                </button>
              </div>
            )}
          </div>

          <button type="button">
            Financeiro⌄
          </button>

          <div className="nav-dropdown">
            <button
              type="button"
              className={
                paginaModuloVendas
                  ? "active"
                  : undefined
              }
              aria-current={
                paginaModuloVendas
                  ? "page"
                  : undefined
              }
              aria-expanded={
                menuVendasAberto
              }
              onClick={
                alternarMenuVendas
              }
            >
              Vendas⌄
            </button>

            {menuVendasAberto && (
              <div className="nav-dropdown-menu">
                <button
                  type="button"
                  className={
                    paginaVendas
                      ? "selected"
                      : undefined
                  }
                  onClick={abrirVendas}
                >
                  Veículos para comercialização
                </button>
              </div>
            )}
          </div>

          <div className="nav-dropdown">
            <button
              type="button"
              className={
                paginaCadastros
                  ? "active"
                  : undefined
              }
              aria-current={
                paginaCadastros
                  ? "page"
                  : undefined
              }
              aria-expanded={
                menuCadastrosAberto
              }
              onClick={
                alternarMenuCadastros
              }
            >
              Cadastros⌄
            </button>

            {menuCadastrosAberto && (
              <div className="nav-dropdown-menu">
                <button
                  type="button"
                  className={
                    paginaUsuarios
                      ? "selected"
                      : undefined
                  }
                  onClick={abrirUsuarios}
                >
                  Usuários
                </button>

                <button
                  type="button"
                  className={
                    paginaFornecedores
                      ? "selected"
                      : undefined
                  }
                  onClick={
                    abrirFornecedores
                  }
                >
                  Fornecedores
                </button>
              </div>
            )}
          </div>

          <button type="button">
            Configurações⌄
          </button>
        </nav>

        <div className="user-area">
          <span
            className="notification"
            aria-label="2 notificações"
          >
            2
          </span>

          <span className="avatar">
            GA
          </span>

          <span className="user-copy">
            <strong>
              Gustavo Almeida
            </strong>

            <small>
              Gestão/Diretoria
            </small>
          </span>
        </div>
      </header>

      <main className="page-content">
        {children}
      </main>

      <footer className="app-footer">
        AutoFlux · Autocar Veículos ·
        Novo Hamburgo/RS
      </footer>
    </div>
  );
}
