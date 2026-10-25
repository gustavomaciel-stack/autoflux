import { formatarCnpj } from "../services/cnpj";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { RepasseConsignacao } from "../components/RepasseConsignacao";
import { ConsignacaoModal } from "../components/ConsignacaoModal";
import { VeiculoModal } from "../components/VeiculoModal";
import { buscarVeiculo } from "../services/veiculosApi";
import type { Veiculo } from "../types/Veiculo";
import { Layout } from "../components/Layout";
import { listarClientes } from "../services/clientesApi";
import {
  buscarConsignacao,
  devolverConsignacao,
  listarConsignacoes,
} from "../services/consignacoesApi";
import type { Cliente } from "../types/Cliente";
import type { Consignacao } from "../types/Consignacao";
import "./ConsignacoesPage.css";

function normalizarTexto(
  valor: string | number | null | undefined,
): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarData(
  valor: string | null | undefined,
): string {
  if (!valor) {
    return "Não informada";
  }

  const data = valor.substring(0, 10).split("-");

  if (data.length !== 3) {
    return valor;
  }

  return `${data[2]}/${data[1]}/${data[0]}`;
}

function formatarMoeda(
  valor: string | number | null | undefined,
): string {
  const numero = Number(valor ?? 0);

  if (!Number.isFinite(numero)) {
    return "R$ 0,00";
  }

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarMoedaOpcional(
  valor: string | number | null | undefined,
): string {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ""
  ) {
    return "Não informado";
  }

  return formatarMoeda(valor);
}

function formatarDocumento(
  consignacao: Consignacao,
): string {
  if (consignacao.cpf_proprietario) {
    const cpf = consignacao.cpf_proprietario.replace(
      /\D/g,
      "",
    );

    if (cpf.length === 11) {
      return cpf.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        "$1.$2.$3-$4",
      );
    }

    return consignacao.cpf_proprietario;
  }

  if (consignacao.cnpj_proprietario) {
    return formatarCnpj(consignacao.cnpj_proprietario);
  }

  return "Documento não informado";
}

function obterDataAtual(): string {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(
    2,
    "0",
  );
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function ConsignacoesPage() {
  const [consignacoes, setConsignacoes] = useState<
    Consignacao[]
  >([]);

  const [clientes, setClientes] = useState<Cliente[]>(
    [],
  );

  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState<Veiculo | null>(null);
  const [carregandoEdicao, setCarregandoEdicao] = useState<number | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] =
    useState("Todas");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [modalCadastroAberto, setModalCadastroAberto] =
    useState(false);

  const [
    consignacaoDetalhes,
    setConsignacaoDetalhes,
  ] = useState<Consignacao | null>(null);

  const [
    consignacaoDevolucao,
    setConsignacaoDevolucao,
  ] = useState<Consignacao | null>(null);

  const [dataSaida, setDataSaida] = useState(
    obterDataAtual,
  );

  const [motivoSaida, setMotivoSaida] =
    useState("");

  const [salvandoDevolucao, setSalvandoDevolucao] =
    useState(false);

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    try {
      const [
        consignacoesRecebidas,
        clientesRecebidos,
      ] = await Promise.all([
        listarConsignacoes(),
        listarClientes(),
      ]);

      setConsignacoes(consignacoesRecebidas);
      setClientes(clientesRecebidos);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as consignações.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  const consignacoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return consignacoes.filter((consignacao) => {
      const correspondeSituacao =
        filtroSituacao === "Todas" ||
        consignacao.situacao === filtroSituacao;

      if (!correspondeSituacao) {
        return false;
      }

      if (termo === "") {
        return true;
      }

      const dadosPesquisaveis = [
        consignacao.nosso_numero,
        consignacao.marca,
        consignacao.modelo,
        consignacao.versao,
        consignacao.placa,
        consignacao.chassi,
        consignacao.nome_proprietario,
        consignacao.cpf_proprietario,
        consignacao.cnpj_proprietario,
        consignacao.numero_nota,
        consignacao.serie,
        consignacao.situacao,
        consignacao.valor_repasse_acordado,
        consignacao.responsavel_despesas,
      ]
        .map((valor) => normalizarTexto(valor))
        .join(" ");

      return dadosPesquisaveis.includes(termo);
    });
  }, [
    busca,
    consignacoes,
    filtroSituacao,
  ]);

  function clienteCadastrado(cliente: Cliente) {
    setClientes((atuais) => {
      const jaExiste = atuais.some(
        (item) =>
          item.id_cliente === cliente.id_cliente,
      );

      if (jaExiste) {
        return atuais;
      }

      return [...atuais, cliente].sort((a, b) =>
        a.nome_razao_social.localeCompare(
          b.nome_razao_social,
          "pt-BR",
        ),
      );
    });
  }

  function consignacaoCadastrada(
    consignacao: Consignacao,
  ) {
    setConsignacoes((atuais) => [
      consignacao,
      ...atuais,
    ]);

    setMensagem(
      `Consignação do veículo ${consignacao.marca} ${consignacao.modelo} cadastrada com sucesso.`,
    );

    setErro("");
  }

  async function abrirEdicaoConsignado(consignacao: Consignacao) {
    if (carregandoEdicao !== null) return;
    setErro("");
    setCarregandoEdicao(consignacao.id_consignacao);
    try {
      const veiculo = await buscarVeiculo(consignacao.id_veiculo);
      if (Number(veiculo.id_ciclo) !== Number(consignacao.id_ciclo)) {
        throw new Error("O veículo está em outro ciclo. Atualize a listagem antes de editar.");
      }
      setConsignacaoDetalhes(null);
      setVeiculoEmEdicao(veiculo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível abrir a edição do consignado.");
    } finally {
      setCarregandoEdicao(null);
    }
  }

  async function abrirDetalhes(
    consignacao: Consignacao,
  ) {
    setErro("");

    try {
      const detalhes = await buscarConsignacao(
        consignacao.id_consignacao,
      );

      setConsignacaoDetalhes(detalhes);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível consultar a consignação.",
      );
    }
  }

  function abrirDevolucao(
    consignacao: Consignacao,
  ) {
    setConsignacaoDevolucao(consignacao);
    setDataSaida(obterDataAtual());
    setMotivoSaida("");
    setErro("");
  }

  async function registrarDevolucao(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!consignacaoDevolucao) {
      return;
    }

    const dataEntrada = consignacaoDevolucao.data_entrada.slice(0, 10);
    if (dataSaida < dataEntrada) {
      setErro("A data da devolução não pode ser anterior à data de entrada do veículo.");
      return;
    }

    setSalvandoDevolucao(true);
    setErro("");
    setMensagem("");

    try {
      const atualizada =
        await devolverConsignacao(
          consignacaoDevolucao.id_consignacao,
          {
            acao: "devolver",
            id_usuario_responsavel: 1,
            data_saida: dataSaida,
            motivo_saida: motivoSaida.trim(),
          },
        );

      setConsignacoes((atuais) =>
        atuais.map((consignacao) =>
          consignacao.id_consignacao ===
          atualizada.id_consignacao
            ? atualizada
            : consignacao,
        ),
      );

      setConsignacaoDevolucao(null);

      setMensagem(
        `A devolução do veículo ${atualizada.marca} ${atualizada.modelo} foi registrada com sucesso.`,
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a devolução.",
      );
    } finally {
      setSalvandoDevolucao(false);
    }
  }

  return (
    <Layout>
      <div className="consignment-page">
        <div className="breadcrumb">
          <span>Veículos</span>
          <span>/</span>
          <strong>Consignações</strong>
        </div>

        <div className="consignment-page-heading">
          <div>
            <h1>Consignações</h1>

            <p>
              Controle os veículos de terceiros
              recebidos para comercialização.
            </p>
          </div>

          <button
            type="button"
            className="consignment-primary-button"
            onClick={() =>
              setModalCadastroAberto(true)
            }
          >
            + Nova consignação
          </button>
        </div>

        <div className="consignment-toolbar">
          <label className="consignment-search">
            <span className="sr-only">
              Buscar consignação
            </span>

            <input
              type="search"
              value={busca}
              onChange={(event) =>
                setBusca(event.target.value)
              }
              placeholder="Buscar por veículo, placa, chassi, proprietário, nota ou nosso número"
            />
          </label>

          <label className="consignment-status-filter">
            <span>Situação</span>

            <select
              value={filtroSituacao}
              onChange={(event) =>
                setFiltroSituacao(event.target.value)
              }
            >
              <option value="Todas">Todas</option>
              <option value="Ativa">Ativas</option>
              <option value="Devolvida">
                Devolvidas
              </option>
            </select>
          </label>
        </div>

        {mensagem && (
          <div className="alert success">
            {mensagem}
          </div>
        )}

        {erro && (
          <div className="alert error">
            <span>{erro}</span>

            <button
              type="button"
              className="consignment-link-button"
              onClick={() => void carregarDados()}
            >
              Tentar novamente
            </button>
          </div>
        )}

        <div className="consignment-table-wrapper">
          <table className="consignment-table">
            <thead>
              <tr>
                <th>Nosso número</th>
                <th>Veículo</th>
                <th>Placa</th>
                <th>Proprietário</th>
                <th>Nota fiscal</th>
                <th>Valor de referência</th>
                <th>Repasse acordado</th>
                <th>Entrada</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={10}
                    className="consignment-empty"
                  >
                    Carregando consignações...
                  </td>
                </tr>
              ) : consignacoesFiltradas.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="consignment-empty"
                  >
                    Nenhuma consignação encontrada.
                  </td>
                </tr>
              ) : (
                consignacoesFiltradas.map(
                  (consignacao) => (
                    <tr
                      key={
                        consignacao.id_consignacao
                      }
                    >
                      <td>
                        <strong className="consignment-code">
                          {consignacao.nosso_numero}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {consignacao.marca}{" "}
                          {consignacao.modelo}
                        </strong>

                        <small>
                          {consignacao.versao ||
                            "Versão não informada"}
                        </small>
                      </td>

                      <td className="consignment-plate">
                        {consignacao.placa}
                      </td>

                      <td>
                        <strong>
                          {
                            consignacao.nome_proprietario
                          }
                        </strong>

                        <small>
                          {formatarDocumento(
                            consignacao,
                          )}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {consignacao.numero_nota}/
                          {consignacao.serie}
                        </strong>

                        <small>
                          {formatarData(
                            consignacao.data_emissao,
                          )}
                        </small>
                      </td>

                      <td>
                        {formatarMoeda(
                          consignacao.valor_total,
                        )}
                      </td>

                      <td>
                        {formatarMoedaOpcional(
                          consignacao.valor_repasse_acordado,
                        )}
                      </td>

                      <td>
                        {formatarData(
                          consignacao.data_entrada,
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            consignacao.situacao ===
                            "Ativa"
                              ? "consignment-status consignment-status-active"
                              : "consignment-status consignment-status-returned"
                          }
                        >
                          {consignacao.situacao}
                        </span>
                      </td>

                      <td>
                        <div className="consignment-actions">
                          <button
                            type="button"
                            className="consignment-link-button"
                            onClick={() =>
                              void abrirDetalhes(
                                consignacao,
                              )
                            }
                          >
                            Detalhes
                          </button>

                          {consignacao.situacao === "Ativa" && consignacao.data_encerramento === null && (
                            <button type="button" className="consignment-link-button"
                              disabled={carregandoEdicao !== null}
                              onClick={() => void abrirEdicaoConsignado(consignacao)}>
                              {carregandoEdicao === consignacao.id_consignacao ? "Abrindo..." : "Editar veículo"}
                            </button>
                          )}

                          {consignacao.situacao ===
                            "Ativa" && (
                            <button
                              type="button"
                              className="consignment-link-button danger"
                              onClick={() =>
                                abrirDevolucao(
                                  consignacao,
                                )
                              }
                            >
                              Registrar devolução
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VeiculoModal
        aberto={veiculoEmEdicao !== null}
        veiculo={veiculoEmEdicao}
        aoFechar={() => { setVeiculoEmEdicao(null); void carregarDados(); }}
        aoSalvar={async () => {
          await carregarDados();
          setMensagem("Dados do veículo consignado atualizados com sucesso.");
        }}
      />

      <ConsignacaoModal
        aberto={modalCadastroAberto}
        clientes={clientes}
        onFechar={() =>
          setModalCadastroAberto(false)
        }
        onClienteCadastrado={clienteCadastrado}
        onConsignacaoCadastrada={
          consignacaoCadastrada
        }
      />

      {consignacaoDetalhes && (
        <div className="modal-backdrop">
          <section
            className="modal-card consignment-modal"
            role="dialog"
            aria-modal="true"
          >
            <header className="modal-header">
              <h2>
                Consignação{" "}
                {consignacaoDetalhes.nosso_numero}
              </h2>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setConsignacaoDetalhes(null)
                }
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <div className="modal-body">
              <section className="consignment-section">
                <h3>Veículo</h3>

                <div className="consignment-details-grid">
                  <div className="consignment-detail">
                    <span>Veículo</span>
                    <strong>
                      {consignacaoDetalhes.marca}{" "}
                      {consignacaoDetalhes.modelo}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Versão</span>
                    <strong>
                      {consignacaoDetalhes.versao ||
                        "Não informada"}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Placa</span>
                    <strong>
                      {consignacaoDetalhes.placa}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Chassi</span>
                    <strong>
                      {consignacaoDetalhes.chassi}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Ano</span>
                    <strong>
                      {
                        consignacaoDetalhes.ano_fabricacao
                      }
                      /
                      {consignacaoDetalhes.ano_modelo}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Situação atual</span>
                    <strong>
                      {
                        consignacaoDetalhes.situacao_atual
                      }
                    </strong>
                  </div>
                </div>
              </section>

              <section className="consignment-section">
                <h3>Proprietário</h3>

                <div className="consignment-details-grid">
                  <div className="consignment-detail">
                    <span>Nome</span>
                    <strong>
                      {
                        consignacaoDetalhes.nome_proprietario
                      }
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Documento</span>
                    <strong>
                      {formatarDocumento(
                        consignacaoDetalhes,
                      )}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Telefone</span>
                    <strong>
                      {
                        consignacaoDetalhes.telefone_proprietario
                      }
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>E-mail</span>
                    <strong>
                      {consignacaoDetalhes.email_proprietario ||
                        "Não informado"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="consignment-section">
                <h3>Nota Fiscal de Entrada</h3>

                <div className="consignment-details-grid">
                  <div className="consignment-detail">
                    <span>Número/Série</span>
                    <strong>
                      {
                        consignacaoDetalhes.numero_nota
                      }
                      /{consignacaoDetalhes.serie}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Emissão</span>
                    <strong>
                      {formatarData(
                        consignacaoDetalhes.data_emissao,
                      )}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Valor de referência</span>
                    <strong>
                      {formatarMoeda(
                        consignacaoDetalhes.valor_total,
                      )}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Situação</span>
                    <strong>
                      {consignacaoDetalhes.situacao}
                    </strong>
                  </div>

                  <div className="consignment-detail full-width">
                    <span>Descrição</span>
                    <strong>
                      {consignacaoDetalhes.descricao_item ||
                        "Não informada"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="consignment-section">
                <h3>Condições da consignação</h3>

                <div className="consignment-details-grid">
                  <div className="consignment-detail">
                    <span>Repasse acordado</span>
                    <strong>
                      {formatarMoedaOpcional(
                        consignacaoDetalhes.valor_repasse_acordado,
                      )}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>
                      Responsável pelas despesas
                    </span>
                    <strong>
                      {consignacaoDetalhes.responsavel_despesas ||
                        "Não informado"}
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Data do acordo</span>
                    <strong>
                      {formatarData(
                        consignacaoDetalhes.data_acordo,
                      )}
                    </strong>
                  </div>
                </div>
              </section>

              <RepasseConsignacao
                key={consignacaoDetalhes.id_consignacao}
                consignacao={consignacaoDetalhes}
                onSalvo={(atualizada) => {
                  setConsignacoes(atuais => atuais.map(item =>
                    item.id_consignacao === atualizada.id_consignacao ? atualizada : item));
                  setConsignacaoDetalhes(atual =>
                    atual?.id_consignacao === atualizada.id_consignacao ? atualizada : atual);
                }}
              />

              {normalizarTexto(
                consignacaoDetalhes.situacao,
              ) === "devolvida" && (
                <section className="consignment-section">
                  <h3>Devolução</h3>

                  <div className="consignment-details-grid">
                    <div className="consignment-detail">
                      <span>Data da devolução</span>
                      <strong>
                        {formatarData(
                          consignacaoDetalhes.data_saida,
                        )}
                      </strong>
                    </div>

                    <div className="consignment-detail">
                      <span>Situação final</span>
                      <strong>
                        {consignacaoDetalhes.situacao}
                      </strong>
                    </div>

                    <div className="consignment-detail full-width">
                      <span>
                        Motivo da devolução
                      </span>

                      <strong>
                        {consignacaoDetalhes.motivo_saida ||
                          "Não informado"}
                      </strong>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <footer className="modal-footer">
              {consignacaoDetalhes.situacao === "Ativa" && consignacaoDetalhes.data_encerramento === null && (
                <button type="button" className="button primary"
                  disabled={carregandoEdicao !== null}
                  onClick={() => void abrirEdicaoConsignado(consignacaoDetalhes)}>
                  {carregandoEdicao !== null ? "Abrindo..." : "Editar veículo"}
                </button>
              )}
              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  setConsignacaoDetalhes(null)
                }
              >
                Fechar
              </button>
            </footer>
          </section>
        </div>
      )}

      {consignacaoDevolucao && (
        <div className="modal-backdrop">
          <section
            className="modal-card consignment-modal"
            role="dialog"
            aria-modal="true"
          >
            <header className="modal-header">
              <h2>Registrar devolução</h2>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setConsignacaoDevolucao(null)
                }
                disabled={salvandoDevolucao}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <form
              id="formulario-devolucao"
              className="modal-body"
              onSubmit={registrarDevolucao}
            >
              <section className="consignment-section">
                <h3>
                  {consignacaoDevolucao.marca}{" "}
                  {consignacaoDevolucao.modelo}
                </h3>

                <div className="consignment-details-grid">
                  <div className="consignment-detail">
                    <span>Nosso número</span>
                    <strong>
                      {
                        consignacaoDevolucao.nosso_numero
                      }
                    </strong>
                  </div>

                  <div className="consignment-detail">
                    <span>Placa</span>
                    <strong>
                      {consignacaoDevolucao.placa}
                    </strong>
                  </div>

                  <div className="consignment-detail full-width">
                    <span>Proprietário</span>
                    <strong>
                      {
                        consignacaoDevolucao.nome_proprietario
                      }
                    </strong>
                  </div>
                </div>
              </section>

              <div className="form-grid">
                <label className="form-field">
                  <span>Data de saída *</span>

                  <input
                    type="date"
                    min={consignacaoDevolucao.data_entrada.slice(0, 10)}
                    value={dataSaida}
                    onChange={(event) =>
                      setDataSaida(
                        event.target.value,
                      )
                    }
                    required
                  />
                  <small>
                    A devolução deve ocorrer em {formatarData(consignacaoDevolucao.data_entrada)} ou depois.
                  </small>
                </label>

                <label className="form-field full-width">
                  <span>
                    Motivo da devolução *
                  </span>

                  <textarea
                    value={motivoSaida}
                    onChange={(event) =>
                      setMotivoSaida(
                        event.target.value,
                      )
                    }
                    placeholder="Informe o motivo da devolução do veículo."
                    maxLength={255}
                    required
                  />
                </label>
              </div>
            </form>

            <footer className="modal-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  setConsignacaoDevolucao(null)
                }
                disabled={salvandoDevolucao}
              >
                Cancelar
              </button>

              <button
                type="submit"
                form="formulario-devolucao"
                className="button button-primary"
                disabled={salvandoDevolucao}
              >
                {salvandoDevolucao
                  ? "Registrando..."
                  : "Confirmar devolução"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </Layout>
  );
}
