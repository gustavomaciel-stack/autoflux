import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { FornecedorModal } from "../components/FornecedorModal";
import { Layout } from "../components/Layout";

import {
  alterarSituacaoFornecedor,
  listarFornecedores,
} from "../services/fornecedoresApi";

import type { Fornecedor } from "../types/Fornecedor";

function formatarDocumento(fornecedor: Fornecedor) {
  const documento =
    fornecedor.tipo_pessoa === "PJ"
      ? fornecedor.cnpj
      : fornecedor.cpf;

  if (!documento) {
    return "—";
  }

  if (
    fornecedor.tipo_pessoa === "PJ" &&
    documento.length === 14
  ) {
    return documento.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }

  if (
    fornecedor.tipo_pessoa === "PF" &&
    documento.length === 11
  ) {
    return documento.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      "$1.$2.$3-$4",
    );
  }

  return documento;
}

function localizacao(fornecedor: Fornecedor) {
  if (fornecedor.cidade && fornecedor.estado) {
    return `${fornecedor.cidade}/${fornecedor.estado}`;
  }

  return fornecedor.cidade ?? fornecedor.estado ?? "—";
}

export function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<
    Fornecedor[]
  >([]);

  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [modalAberto, setModalAberto] = useState(false);

  const [fornecedorEmEdicao, setFornecedorEmEdicao] =
    useState<Fornecedor | null>(null);

  const [alterandoId, setAlterandoId] = useState<
    number | null
  >(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const dados = await listarFornecedores();
      setFornecedores(dados);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível carregar os fornecedores.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const fornecedoresFiltrados = useMemo(() => {
    const termo = busca
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!termo) {
      return fornecedores;
    }

    return fornecedores.filter((fornecedor) =>
      [
        fornecedor.razao_social_nome,
        fornecedor.nome_fantasia,
        fornecedor.cpf,
        fornecedor.cnpj,
        fornecedor.tipo_servico,
        fornecedor.cidade,
      ].some((valor) =>
        valor
          ?.toLocaleLowerCase("pt-BR")
          .includes(termo),
      ),
    );
  }, [busca, fornecedores]);

  function mostrarSucesso(mensagem: string) {
    setSucesso(mensagem);

    window.setTimeout(() => {
      setSucesso("");
    }, 3000);
  }

  function abrirCadastro() {
    setErro("");
    setSucesso("");
    setFornecedorEmEdicao(null);
    setModalAberto(true);
  }

  function abrirEdicao(fornecedor: Fornecedor) {
    setErro("");
    setSucesso("");
    setFornecedorEmEdicao(fornecedor);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setFornecedorEmEdicao(null);
  }

  async function fornecedorSalvo() {
    const mensagem = fornecedorEmEdicao
      ? "Fornecedor alterado com sucesso."
      : "Fornecedor cadastrado com sucesso.";

    await carregar();
    mostrarSucesso(mensagem);
  }

  async function alternarSituacao(
    fornecedor: Fornecedor,
  ) {
    const novoAtivo = !Boolean(
      Number(fornecedor.ativo),
    );

    const acao = novoAtivo
      ? "reativar"
      : "inativar";

    const confirmou = window.confirm(
      `Deseja realmente ${acao} ${fornecedor.razao_social_nome}?`,
    );

    if (!confirmou) {
      return;
    }

    setAlterandoId(fornecedor.id_fornecedor);
    setErro("");
    setSucesso("");

    try {
      await alterarSituacaoFornecedor(
        fornecedor.id_fornecedor,
        novoAtivo,
      );

      await carregar();

      mostrarSucesso(
        novoAtivo
          ? "Fornecedor reativado com sucesso."
          : "Fornecedor inativado com sucesso.",
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : `Não foi possível ${acao} o fornecedor.`,
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
        <strong>Fornecedores</strong>
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
            placeholder="Buscar por nome, CPF/CNPJ, tipo de serviço"
          />
        </label>

        <button
          className="button primary"
          type="button"
          onClick={abrirCadastro}
        >
          + Novo Fornecedor
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

      {sucesso && (
        <div className="alert success page-alert">
          <span>{sucesso}</span>
        </div>
      )}

      <section
        className="table-card"
        aria-label="Lista de fornecedores"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nome / Razão Social</th>
                <th>CPF / CNPJ</th>
                <th>Tipo</th>
                <th>Serviço</th>
                <th>Cidade</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={7}
                    className="empty-state"
                  >
                    Carregando fornecedores...
                  </td>
                </tr>
              ) : fornecedoresFiltrados.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="empty-state"
                  >
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                fornecedoresFiltrados.map(
                  (fornecedor) => {
                    const ativo = Boolean(
                      Number(fornecedor.ativo),
                    );

                    return (
                      <tr
                        key={
                          fornecedor.id_fornecedor
                        }
                      >
                        <td>
                          <strong>
                            {
                              fornecedor.razao_social_nome
                            }
                          </strong>

                          {fornecedor.nome_fantasia && (
                            <small>
                              {
                                fornecedor.nome_fantasia
                              }
                            </small>
                          )}
                        </td>

                        <td className="document">
                          {formatarDocumento(
                            fornecedor,
                          )}
                        </td>

                        <td>
                          {fornecedor.tipo_pessoa ===
                          "PJ"
                            ? "Pessoa Jurídica"
                            : "Pessoa Física"}
                        </td>

                        <td>
                          {fornecedor.tipo_servico}
                        </td>

                        <td>
                          {localizacao(fornecedor)}
                        </td>

                        <td>
                          <span
                            className={`status ${
                              ativo
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {ativo
                              ? "Ativo"
                              : "Inativo"}
                          </span>
                        </td>

                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              onClick={() =>
                                abrirEdicao(
                                  fornecedor,
                                )
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
                                fornecedor.id_fornecedor
                              }
                              onClick={() =>
                                void alternarSituacao(
                                  fornecedor,
                                )
                              }
                            >
                              {alterandoId ===
                              fornecedor.id_fornecedor
                                ? "Aguarde..."
                                : ativo
                                  ? "Inativar"
                                  : "Reativar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <FornecedorModal
        aberto={modalAberto}
        fornecedor={fornecedorEmEdicao}
        aoFechar={fecharModal}
        aoSalvar={fornecedorSalvo}
      />
    </Layout>
  );
}