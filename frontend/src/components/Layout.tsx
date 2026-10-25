import { podeGerenciarClientes, podeConsultarOrcamentos } from "../services/clientesAcesso";
import { Permissao } from "./Permissao";
import "./SessionActions.css";
import { useAuth } from "../context/AuthContext";
import { AlterarSenhaModal } from "./AlterarSenhaModal";
import { useState, type ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { usuario, encerrar, pode } = useAuth();
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [erroSessao, setErroSessao] = useState("");
  const [saindo, setSaindo] = useState(false);
  async function sair() {
    setSaindo(true); setErroSessao("");
    try { await encerrar(); }
    catch (e) { setErroSessao(e instanceof Error ? e.message : "Não foi possível sair."); }
    finally { setSaindo(false); }
  }

  const [menuVeiculosAberto, setMenuVeiculosAberto] =
    useState(false);

  const [menuVendasAberto, setMenuVendasAberto] =
    useState(false);

  const [menuCadastrosAberto, setMenuCadastrosAberto] =
    useState(false);

  const [menuConfiguracoesAberto, setMenuConfiguracoesAberto] = useState(false);

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

  const paginaClientes = paginaAtual === "#clientes";

  const paginaUsuarios =
    paginaAtual === "#usuarios";

  const paginaFornecedores =
    paginaAtual === "#fornecedores" ||
    paginaAtual === "";

  const paginaModuloVeiculos =
    paginaPatio ||
    paginaNotasFiscais ||
    paginaConsignacoes;

  const paginaModuloVendas = paginaVendas || paginaAtual === "#orcamentos" || paginaAtual === "#autorizacoes-comerciais";

  const paginaCadastros =
    paginaUsuarios || paginaFornecedores || paginaClientes;

  function fecharMenus() {
    setMenuVeiculosAberto(false);
    setMenuVendasAberto(false);
    setMenuCadastrosAberto(false);
    setMenuConfiguracoesAberto(false);
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
    setMenuConfiguracoesAberto(false);
  }

  function alternarMenuVendas() {
    setMenuVendasAberto(
      (aberto) => !aberto,
    );

    setMenuVeiculosAberto(false);
    setMenuCadastrosAberto(false);
    setMenuConfiguracoesAberto(false);
  }

  function alternarMenuCadastros() {
    setMenuCadastrosAberto(
      (aberto) => !aberto,
    );
    setMenuConfiguracoesAberto(false);

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
          <Permissao codigo="perfis.administrar"><button
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
          </button></Permissao>

          <Permissao codigo="perfis.administrar"><button type="button">
            Gestão⌄
          </button></Permissao>

          {(pode("veiculos.visualizar") || pode("notas.visualizar") || pode("consignacoes.visualizar")) && (<div className="nav-dropdown">
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
                <Permissao codigo="veiculos.visualizar"><button
                  type="button"
                  className={
                    paginaPatio
                      ? "selected"
                      : undefined
                  }
                  onClick={abrirPatio}
                >
                  Pátio de veículos
                </button></Permissao>

                <Permissao codigo="notas.visualizar"><button
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
                </button></Permissao>

                <Permissao codigo="consignacoes.visualizar"><button
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
                </button></Permissao>
              </div>
            )}
          </div>) }

          <Permissao codigo="trocas.visualizar"><button type="button" className={paginaAtual === "#avaliacoes-troca" ? "active" : undefined} onClick={()=>{fecharMenus();window.location.hash="#avaliacoes-troca";}} title="Avaliações de veículos oferecidos na troca">Compras</button></Permissao>

          <Permissao codigo="despesas.visualizar"><button type="button">
            Financeiro⌄
          </button></Permissao>

          {(pode("vendas.visualizar") || podeConsultarOrcamentos(usuario) || pode("autorizacoes.decidir")) && (<div className="nav-dropdown">
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
                <Permissao codigo="vendas.visualizar"><button
                  type="button"
                  className={
                    paginaVendas
                      ? "selected"
                      : undefined
                  }
                  onClick={abrirVendas}
                >
                  Veículos para comercialização
                </button></Permissao>
                {podeConsultarOrcamentos(usuario) && <button type="button" className={paginaAtual === "#orcamentos" ? "selected" : undefined} onClick={()=>{fecharMenus();window.location.hash="#orcamentos";}}>Orçamentos e negociações</button>}
                {pode("autorizacoes.decidir") && <button type="button" className={paginaAtual === "#autorizacoes-comerciais" ? "selected" : undefined} onClick={()=>{fecharMenus();window.location.hash="#autorizacoes-comerciais";}}>Autorizações comerciais</button>}
              </div>
            )}
          </div>) }

          {(pode("usuarios.administrar") || pode("fornecedores.visualizar") || pode("perfis.administrar") || podeGerenciarClientes(usuario)) && (<div className="nav-dropdown">
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
                {podeGerenciarClientes(usuario) && (
                  <button type="button" className={paginaClientes ? "selected" : undefined}
                    onClick={() => { fecharMenus(); window.location.hash = "#clientes"; }}>
                    Clientes
                  </button>
                )}
                <Permissao codigo="usuarios.administrar"><button
                  type="button"
                  className={
                    paginaUsuarios
                      ? "selected"
                      : undefined
                  }
                  onClick={abrirUsuarios}
                >
                  Usuários
                </button></Permissao>

                <Permissao codigo="fornecedores.visualizar"><button
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
                </button></Permissao>
              <Permissao codigo="perfis.administrar"><button type="button" onClick={() => { fecharMenus(); window.location.hash="perfis"; }}>Perfis e permissões</button></Permissao></div>
            )}
          </div>) }

          <Permissao codigo="perfis.administrar"><div className="nav-dropdown">
            <button type="button" className={paginaAtual === "#parametros-comerciais" ? "active" : undefined}
              aria-expanded={menuConfiguracoesAberto}
              onClick={() => { const abrir = !menuConfiguracoesAberto; fecharMenus(); setMenuConfiguracoesAberto(abrir); }}>
              Configurações⌄
            </button>
            {menuConfiguracoesAberto && <div className="nav-dropdown-menu">
              <button type="button" className={paginaAtual === "#parametros-comerciais" ? "selected" : undefined}
                onClick={() => { fecharMenus(); window.location.hash = "#parametros-comerciais"; }}>Parâmetros comerciais</button>
            </div>}
          </div></Permissao>
        </nav>

        <div className="user-area">
          <button className="session-action" type="button" onClick={() => setAlterandoSenha(true)}>Alterar senha</button>
          <button className="session-action" type="button" onClick={() => void sair()} disabled={saindo}>{saindo ? "Saindo..." : "Sair"}</button>
          <span
            className="notification"
            aria-label="2 notificações"
          >
            2
          </span>

          <span className="avatar">
            {usuario?.nome.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("")}
          </span>

          <span className="user-copy">
            <strong>
              {usuario?.nome}
            </strong>

            <small>
              {usuario?.perfis.map(p => p.nome).join(", ")}
            </small>
          </span>
        </div>
      </header>

      <main className="page-content">
        {erroSessao && <div className="alert error">{erroSessao}</div>}
        {children}
      </main>

      {alterandoSenha && <AlterarSenhaModal aoFechar={() => setAlterandoSenha(false)} />}
      <footer className="app-footer">
        AutoFlux · Autocar Veículos ·
        Novo Hamburgo/RS
      </footer>
    </div>
  );
}
