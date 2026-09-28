import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Layout } from "../components/Layout";
import { UsuarioModal } from "../components/UsuarioModal";
import {
  alterarSituacaoUsuario,
  listarPerfis,
  listarUsuarios,
} from "../services/usuariosApi";
import type {
  Perfil,
  Usuario,
} from "../types/Usuario";

function formatarComissao(
  percentual: string | null,
) {
  if (percentual === null) {
    return "—";
  }

  return `${Number(percentual).toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}%`;
}

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(
    [],
  );

  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] =
    useState(false);

  const [usuarioEmEdicao, setUsuarioEmEdicao] =
    useState<Usuario | null>(null);

  const [alterandoId, setAlterandoId] =
    useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const [usuariosRecebidos, perfisRecebidos] =
        await Promise.all([
          listarUsuarios(),
          listarPerfis(),
        ]);

      setUsuarios(usuariosRecebidos);
      setPerfis(perfisRecebidos);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível carregar os usuários.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!termo) {
      return usuarios;
    }

    return usuarios.filter((usuario) =>
      [
        usuario.nome,
        usuario.email,
        usuario.login,
        ...usuario.perfis,
      ].some((valor) =>
        valor
          .toLocaleLowerCase("pt-BR")
          .includes(termo),
      ),
    );
  }, [busca, usuarios]);

  function abrirCadastro() {
    setUsuarioEmEdicao(null);
    setModalAberto(true);
  }

  function abrirEdicao(usuario: Usuario) {
    setUsuarioEmEdicao(usuario);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setUsuarioEmEdicao(null);
  }

  async function alternarSituacao(
    usuario: Usuario,
  ) {
    const ativo = Boolean(Number(usuario.ativo));
    const novoAtivo = !ativo;
    const acao = novoAtivo ? "reativar" : "inativar";

    const confirmou = window.confirm(
      `Deseja realmente ${acao} ${usuario.nome}?`,
    );

    if (!confirmou) {
      return;
    }

    setAlterandoId(usuario.id_usuario);
    setErro("");

    try {
      await alterarSituacaoUsuario(
        usuario.id_usuario,
        novoAtivo,
      );

      await carregar();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : `Não foi possível ${acao} o usuário.`,
      );
    } finally {
      setAlterandoId(null);
    }
  }

  return (
    <Layout>
      <div className="breadcrumb">
        <span>Cadastros</span>
        <span>/</span>
        <strong>Usuários</strong>
      </div>

      <div className="page-toolbar">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            value={busca}
            onChange={(evento) =>
              setBusca(evento.target.value)
            }
            placeholder="Buscar por nome, e-mail, login ou perfil"
          />
        </label>

        <button
          className="button primary"
          type="button"
          onClick={abrirCadastro}
        >
          + Novo Usuário
        </button>
      </div>

      {erro && (
        <div className="alert error page-alert">
          <span>{erro}</span>

          <button
            type="button"
            onClick={() => void carregar()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <section
        className="table-card"
        aria-label="Lista de usuários"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Login</th>
                <th>Perfis</th>
                <th>Comissão</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={6}
                    className="empty-state"
                  >
                    Carregando usuários...
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="empty-state"
                  >
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => {
                  const ativo = Boolean(
                    Number(usuario.ativo),
                  );

                  return (
                    <tr key={usuario.id_usuario}>
                      <td>
                        <strong>{usuario.nome}</strong>
                        <small>{usuario.email}</small>
                      </td>

                      <td className="document">
                        {usuario.login}
                      </td>

                      <td>
                        <div className="profile-badges">
                          {usuario.perfis.map(
                            (perfil) => (
                              <span
                                className="profile-badge"
                                key={perfil}
                              >
                                {perfil}
                              </span>
                            ),
                          )}
                        </div>
                      </td>

                      <td>
                        {formatarComissao(
                          usuario.percentual_comissao,
                        )}
                      </td>

                      <td>
                        <span
                          className={`status ${
                            ativo
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          {ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            onClick={() =>
                              abrirEdicao(usuario)
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className={
                              ativo
                                ? "danger"
                                : "success"
                            }
                            disabled={
                              alterandoId ===
                              usuario.id_usuario
                            }
                            onClick={() =>
                              void alternarSituacao(
                                usuario,
                              )
                            }
                          >
                            {alterandoId ===
                            usuario.id_usuario
                              ? "Aguarde..."
                              : ativo
                                ? "Inativar"
                                : "Reativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <UsuarioModal
        aberto={modalAberto}
        usuario={usuarioEmEdicao}
        perfis={perfis}
        aoFechar={fecharModal}
        aoSalvar={carregar}
      />
    </Layout>
  );
}