import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  atualizarUsuario,
  buscarUsuario,
  cadastrarUsuario,
} from "../services/usuariosApi";
import type {
  Perfil,
  Usuario,
  UsuarioFormData,
} from "../types/Usuario";

interface UsuarioModalProps {
  aberto: boolean;
  usuario: Usuario | null;
  perfis: Perfil[];
  aoFechar: () => void;
  aoSalvar: () => void | Promise<void>;
}

const formularioVazio: UsuarioFormData = {
  nome: "",
  email: "",
  login: "",
  senha: "",
  percentual_comissao: "",
  ids_perfis: [],
};

export function UsuarioModal({
  aberto,
  usuario,
  perfis,
  aoFechar,
  aoSalvar,
}: UsuarioModalProps) {
  const [formulario, setFormulario] =
    useState<UsuarioFormData>(formularioVazio);

  const [carregando, setCarregando] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] = useState("");

  const editando = usuario !== null;

  const idPerfilVendedor = useMemo(
    () =>
      perfis.find(
        (perfil) => perfil.nome === "Vendedor",
      )?.id_perfil,
    [perfis],
  );

  const vendedorSelecionado =
    idPerfilVendedor !== undefined &&
    formulario.ids_perfis.includes(
      idPerfilVendedor,
    );

  useEffect(() => {
    if (!aberto) {
      return;
    }

    let componenteAtivo = true;

    async function carregarFormulario() {
      setErro("");

      if (!usuario) {
        setFormulario(formularioVazio);
        setCarregando(false);
        return;
      }

      setCarregando(true);

      try {
        const usuarioDetalhado =
          await buscarUsuario(
            usuario.id_usuario,
          );

        if (!componenteAtivo) {
          return;
        }

        setFormulario({
          nome: usuarioDetalhado.nome,
          email: usuarioDetalhado.email,
          login: usuarioDetalhado.login,
          senha: "",
          percentual_comissao:
            usuarioDetalhado.percentual_comissao ??
            "",
          ids_perfis:
            usuarioDetalhado.perfis.map(
              (perfil) => perfil.id_perfil,
            ),
        });
      } catch (falha) {
        if (!componenteAtivo) {
          return;
        }

        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar o usuário.",
        );
      } finally {
        if (componenteAtivo) {
          setCarregando(false);
        }
      }
    }

    void carregarFormulario();

    return () => {
      componenteAtivo = false;
    };
  }, [aberto, usuario]);

  function atualizarCampo(
    evento: ChangeEvent<HTMLInputElement>,
  ) {
    const { name, value } = evento.target;

    setFormulario((formularioAtual) => ({
      ...formularioAtual,
      [name]: value,
    }));
  }

  function alternarPerfil(idPerfil: number) {
    setFormulario((formularioAtual) => {
      const selecionado =
        formularioAtual.ids_perfis.includes(
          idPerfil,
        );

      const novosIds = selecionado
        ? formularioAtual.ids_perfis.filter(
            (id) => id !== idPerfil,
          )
        : [
            ...formularioAtual.ids_perfis,
            idPerfil,
          ];

      const removendoVendedor =
        selecionado &&
        idPerfil === idPerfilVendedor;

      return {
        ...formularioAtual,
        ids_perfis: novosIds,
        percentual_comissao:
          removendoVendedor
            ? ""
            : formularioAtual.percentual_comissao,
      };
    });
  }

  async function salvar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (formulario.ids_perfis.length === 0) {
      setErro(
        "Selecione pelo menos um perfil para o usuário.",
      );

      return;
    }

    setSalvando(true);
    setErro("");

    try {
      if (usuario) {
        await atualizarUsuario(
          usuario.id_usuario,
          formulario,
        );
      } else {
        await cadastrarUsuario(formulario);
      }

      await aoSalvar();
      aoFechar();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar o usuário.",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-usuario"
      >
        <div className="modal-header">
          <h2 id="titulo-modal-usuario">
            {editando
              ? "Editar Usuário"
              : "Novo Usuário"}
          </h2>

          <button
            className="icon-button"
            type="button"
            aria-label="Fechar"
            onClick={aoFechar}
            disabled={salvando}
          >
            ×
          </button>
        </div>

        <form onSubmit={salvar}>
          <div className="modal-body">
            {erro && (
              <div className="alert error page-alert">
                <span>{erro}</span>
              </div>
            )}

            {carregando ? (
              <div className="empty-state">
                Carregando usuário...
              </div>
            ) : (
              <>
                <label className="field field-full">
                  Nome completo *
                  <input
                    name="nome"
                    value={formulario.nome}
                    onChange={atualizarCampo}
                    maxLength={50}
                    required
                    autoFocus
                  />
                </label>

                <div className="form-grid">
                  <label className="field">
                    E-mail *
                    <input
                      name="email"
                      type="email"
                      value={formulario.email}
                      onChange={atualizarCampo}
                      maxLength={100}
                      required
                    />
                  </label>

                  <label className="field">
                    Login *
                    <input
                      name="login"
                      value={formulario.login}
                      onChange={atualizarCampo}
                      minLength={3}
                      maxLength={50}
                      pattern="[A-Za-z0-9._-]+"
                      required
                    />
                  </label>
                </div>

                <label className="field field-full">
                  {editando
                    ? "Nova senha"
                    : "Senha *"}

                  <input
                    name="senha"
                    type="password"
                    value={formulario.senha}
                    onChange={atualizarCampo}
                    minLength={8}
                    required={!editando}
                    autoComplete="new-password"
                  />

                  <small className="field-hint">
                    {editando
                      ? "Deixe em branco para manter a senha atual."
                      : "A senha deve possuir pelo menos 8 caracteres."}
                  </small>
                </label>

                <fieldset className="profile-fieldset">
                  <legend>Perfis de acesso *</legend>

                  <div className="profile-options">
                    {perfis.map((perfil) => (
                      <label
                        className="profile-option"
                        key={perfil.id_perfil}
                      >
                        <input
                          type="checkbox"
                          checked={formulario.ids_perfis.includes(
                            perfil.id_perfil,
                          )}
                          onChange={() =>
                            alternarPerfil(
                              perfil.id_perfil,
                            )
                          }
                        />

                        <span>
                          <strong>{perfil.nome}</strong>

                          {perfil.descricao && (
                            <small>
                              {perfil.descricao}
                            </small>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {vendedorSelecionado && (
                  <label className="field field-full">
                    Percentual de comissão
                    <input
                      name="percentual_comissao"
                      type="number"
                      value={
                        formulario.percentual_comissao
                      }
                      onChange={atualizarCampo}
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="Ex.: 2,00"
                    />

                    <small className="field-hint">
                      Informe somente o número do
                      percentual. Exemplo: 2 para 2%.
                    </small>
                  </label>
                )}
              </>
            )}
          </div>

          <div className="modal-actions">
            <button
              className="button secondary"
              type="button"
              onClick={aoFechar}
              disabled={salvando}
            >
              Cancelar
            </button>

            <button
              className="button primary"
              type="submit"
              disabled={salvando || carregando}
            >
              {salvando
                ? "Salvando..."
                : editando
                  ? "Salvar Alterações"
                  : "Cadastrar Usuário"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}