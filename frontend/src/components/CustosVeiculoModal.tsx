import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { listarFornecedores } from "../services/fornecedoresApi";
import {
  cadastrarDespesaPrevista,
  cadastrarDespesaRealizada,
  consultarCustosVeiculo,
  excluirDespesaPrevista,
  excluirDespesaRealizada,
} from "../services/despesasVeiculoApi";
import type {
  CategoriaDespesa,
  CustosVeiculo,
  DespesaPrevista,
  DespesaPrevistaFormData,
  DespesaRealizada,
  DespesaRealizadaFormData,
} from "../types/DespesaVeiculo";
import type { Fornecedor } from "../types/Fornecedor";
import type { Veiculo } from "../types/Veiculo";
import { DespesaEdicaoModal } from "./DespesaEdicaoModal";

interface CustosVeiculoModalProps {
  aberto: boolean;
  veiculo: Veiculo | null;
  aoFechar: () => void;
}

type TipoFormulario =
  | "resumo"
  | "prevista"
  | "realizada";

const categorias: CategoriaDespesa[] = [
  "Mecânica",
  "Funilaria",
  "Pintura",
  "Elétrica",
  "Higienização",
  "Documentação",
  "Transporte",
  "Pneus",
  "Outros",
];

const previstaVazia: DespesaPrevistaFormData = {
  categoria: "",
  descricao: "",
  valor: "",
  observacoes: "",
};

const realizadaVazia: DespesaRealizadaFormData = {
  id_fornecedor: "",
  id_despesa_prevista: "",
  categoria: "",
  descricao: "",
  data_despesa: "",
  valor: "",
  observacoes: "",
};

const formatadorMoeda = new Intl.NumberFormat(
  "pt-BR",
  {
    style: "currency",
    currency: "BRL",
  },
);

function formatarMoeda(
  valor: string | number,
): string {
  return formatadorMoeda.format(Number(valor));
}

function formatarData(data: string): string {
  const partes = data.slice(0, 10).split("-");

  if (partes.length !== 3) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export function CustosVeiculoModal({
  aberto,
  veiculo,
  aoFechar,
}: CustosVeiculoModalProps) {
  const [custos, setCustos] =
    useState<CustosVeiculo | null>(null);

  const [fornecedores, setFornecedores] =
    useState<Fornecedor[]>([]);

  const [tipoFormulario, setTipoFormulario] =
    useState<TipoFormulario>("resumo");

  const [
    formularioPrevista,
    setFormularioPrevista,
  ] = useState<DespesaPrevistaFormData>(
    previstaVazia,
  );

  const [
    formularioRealizada,
    setFormularioRealizada,
  ] = useState<DespesaRealizadaFormData>(
    realizadaVazia,
  );

  const [
    previstaEmEdicao,
    setPrevistaEmEdicao,
  ] = useState<DespesaPrevista | null>(null);

  const [
    realizadaEmEdicao,
    setRealizadaEmEdicao,
  ] = useState<DespesaRealizada | null>(null);

  const [carregando, setCarregando] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);

  const [excluindo, setExcluindo] =
    useState<string | null>(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    if (
      !aberto
      || !veiculo
      || !veiculo.id_ciclo
    ) {
      return;
    }

    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setCustos(null);
      setErro("");
      setSucesso("");
      setTipoFormulario("resumo");
      setFormularioPrevista(previstaVazia);
      setFormularioRealizada(realizadaVazia);
      setPrevistaEmEdicao(null);
      setRealizadaEmEdicao(null);

      try {
        const [
          custosCarregados,
          fornecedoresCarregados,
        ] = await Promise.all([
          consultarCustosVeiculo(
            veiculo!.id_ciclo,
          ),
          listarFornecedores(),
        ]);

        if (!ativo) {
          return;
        }

        setCustos(custosCarregados);

        setFornecedores(
          fornecedoresCarregados.filter(
            (fornecedor) =>
              Number(fornecedor.ativo) === 1,
          ),
        );
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Não foi possível carregar os custos.",
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [aberto, veiculo]);

  function atualizarCampoPrevista(
    evento: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = evento.target;

    setFormularioPrevista(
      (formularioAtual) => ({
        ...formularioAtual,
        [name]: value,
      }),
    );
  }

  function atualizarCampoRealizada(
    evento: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = evento.target;

    if (
      name === "id_despesa_prevista"
      && custos
    ) {
      const prevista =
        custos.despesas_previstas.find(
          (item) =>
            String(
              item.id_despesa_prevista,
            ) === value,
        );

      if (prevista) {
        setFormularioRealizada(
          (formularioAtual) => ({
            ...formularioAtual,
            id_despesa_prevista: value,
            categoria: prevista.categoria,
            descricao: prevista.descricao,
            valor: prevista.valor_previsto,
            observacoes:
              prevista.observacoes ?? "",
          }),
        );

        return;
      }
    }

    setFormularioRealizada(
      (formularioAtual) => ({
        ...formularioAtual,
        [name]: value,
      }),
    );
  }

  function abrirNovaPrevista() {
    setTipoFormulario("prevista");
    setFormularioPrevista({
      ...previstaVazia,
    });
    setErro("");
    setSucesso("");
  }

  function abrirNovaRealizada(
    despesaPrevista?: DespesaPrevista,
  ) {
    setTipoFormulario("realizada");

    setFormularioRealizada({
      ...realizadaVazia,

      id_despesa_prevista:
        despesaPrevista
          ? String(
              despesaPrevista
                .id_despesa_prevista,
            )
          : "",

      categoria:
        despesaPrevista?.categoria ?? "",

      descricao:
        despesaPrevista?.descricao ?? "",

      valor:
        despesaPrevista
          ?.valor_previsto ?? "",

      observacoes:
        despesaPrevista
          ?.observacoes ?? "",
    });

    setErro("");
    setSucesso("");
  }

  function abrirEdicaoPrevista(
    despesa: DespesaPrevista,
  ) {
    setPrevistaEmEdicao(despesa);
    setRealizadaEmEdicao(null);
    setErro("");
    setSucesso("");
  }

  function abrirEdicaoRealizada(
    despesa: DespesaRealizada,
  ) {
    setRealizadaEmEdicao(despesa);
    setPrevistaEmEdicao(null);
    setErro("");
    setSucesso("");
  }

  function fecharEdicao() {
    setPrevistaEmEdicao(null);
    setRealizadaEmEdicao(null);
  }

  function concluirEdicao(
    custosAtualizados: CustosVeiculo,
    mensagem: string,
  ) {
    setCustos(custosAtualizados);
    setSucesso(mensagem);
    setErro("");
    fecharEdicao();
  }

  function voltarAoResumo() {
    setTipoFormulario("resumo");
    setFormularioPrevista(previstaVazia);
    setFormularioRealizada(realizadaVazia);
    setErro("");
  }

  async function salvar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (
      !veiculo
      || tipoFormulario === "resumo"
    ) {
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      let custosAtualizados: CustosVeiculo;

      if (tipoFormulario === "prevista") {
        custosAtualizados =
          await cadastrarDespesaPrevista(
            veiculo.id_ciclo,
            formularioPrevista,
          );

        setSucesso(
          "Despesa prevista cadastrada com sucesso.",
        );
      } else {
        custosAtualizados =
          await cadastrarDespesaRealizada(
            veiculo.id_ciclo,
            formularioRealizada,
          );

        setSucesso(
          "Despesa realizada cadastrada com sucesso.",
        );
      }

      setCustos(custosAtualizados);
      setTipoFormulario("resumo");
      setFormularioPrevista(previstaVazia);
      setFormularioRealizada(realizadaVazia);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar a despesa.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirPrevista(
    despesa: DespesaPrevista,
  ) {
    if (!veiculo) {
      return;
    }

    const confirmou = window.confirm(
      `Deseja excluir a despesa prevista "${despesa.descricao}"?`,
    );

    if (!confirmou) {
      return;
    }

    const chave =
      `prevista-${despesa.id_despesa_prevista}`;

    setExcluindo(chave);
    setErro("");
    setSucesso("");

    try {
      const custosAtualizados =
        await excluirDespesaPrevista(
          veiculo.id_ciclo,
          despesa.id_despesa_prevista,
        );

      setCustos(custosAtualizados);

      setSucesso(
        "Despesa prevista excluída com sucesso.",
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível excluir a despesa prevista.",
      );
    } finally {
      setExcluindo(null);
    }
  }

  async function excluirRealizada(
    despesa: DespesaRealizada,
  ) {
    if (!veiculo) {
      return;
    }

    const confirmou = window.confirm(
      `Deseja excluir a despesa realizada "${despesa.descricao}"?`,
    );

    if (!confirmou) {
      return;
    }

    const chave =
      `realizada-${despesa.id_despesa}`;

    setExcluindo(chave);
    setErro("");
    setSucesso("");

    try {
      const custosAtualizados =
        await excluirDespesaRealizada(
          veiculo.id_ciclo,
          despesa.id_despesa,
        );

      setCustos(custosAtualizados);

      setSucesso(
        "Despesa realizada excluída com sucesso.",
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível excluir a despesa realizada.",
      );
    } finally {
      setExcluindo(null);
    }
  }

  if (!aberto || !veiculo) {
    return null;
  }

  const despesasPrevistasPendentes =
    custos?.despesas_previstas.filter(
      (despesa) =>
        despesa.situacao === "Pendente",
    ) ?? [];

  return (
    <>
      <div className="modal-backdrop">
        <section
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-custos-veiculo"
        >
          <div className="modal-header">
            <h2 id="titulo-custos-veiculo">
              Resumo Financeiro do Veículo
            </h2>

            <button
              className="icon-button"
              type="button"
              aria-label="Fechar"
              onClick={aoFechar}
              disabled={
                salvando
                || excluindo !== null
              }
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

              {sucesso && (
                <div className="alert success page-alert">
                  <span>{sucesso}</span>
                </div>
              )}

              {carregando ? (
                <div className="empty-state">
                  Carregando informações...
                </div>
              ) : custos ? (
                <>
                  <h3 className="form-section-title">
                    Veículo
                  </h3>

                  <div className="form-grid">
                    <label className="field">
                      Veículo

                      <input
                        value={`${custos.marca} ${custos.modelo}`}
                        readOnly
                      />
                    </label>

                    <label className="field">
                      Placa

                      <input
                        value={custos.placa}
                        readOnly
                      />
                    </label>
                  </div>

                  <label className="field field-full">
                    Nosso Número

                    <input
                      value={custos.nosso_numero}
                      readOnly
                    />
                  </label>

                  <h3 className="form-section-title">
                    Resumo financeiro
                  </h3>

                  <div className="form-grid">
                    <label className="field">
                      {custos.origem_entrada === "consignação" ? "Repasse acordado (informativo)" : "Valor de aquisição"}

                      <input
                        value={custos.origem_entrada === "consignação"
                          ? custos.valor_repasse_acordado === null ? "Não informado" : formatarMoeda(custos.valor_repasse_acordado)
                          : formatarMoeda(custos.valor_aquisicao)}
                        readOnly
                      />
                    </label>

                    {custos.origem_entrada === "consignação" && (
                      <label className="field">
                        Responsável pelas despesas
                        <input value={custos.responsavel_despesas ?? "Não informado"} readOnly />
                      </label>
                    )}

                    <label className="field">
                      Despesas realizadas

                      <input
                        value={formatarMoeda(
                          custos
                            .total_despesas_realizadas,
                        )}
                        readOnly
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      Despesas previstas pendentes

                      <input
                        value={formatarMoeda(
                          custos
                            .total_despesas_previstas,
                        )}
                        readOnly
                      />
                    </label>

                    <label className="field">
                      Total investido

                      <input
                        value={formatarMoeda(
                          custos.custo_acumulado,
                        )}
                        readOnly
                      />
                    </label>
                  </div>

                  <label className="field field-full">
                    Total projetado

                    <input
                      value={formatarMoeda(
                        custos.custo_projetado,
                      )}
                      readOnly
                    />
                  </label>

                  <div className="row-actions">
                    <button
                      className="button primary"
                      type="button"
                      onClick={abrirNovaPrevista}
                    >
                      + Despesa prevista
                    </button>

                    <button
                      className="button secondary"
                      type="button"
                      onClick={() =>
                        abrirNovaRealizada()
                      }
                    >
                      + Despesa realizada
                    </button>
                  </div>

                  <h3 className="form-section-title">
                    Despesas previstas
                  </h3>

                  {custos.despesas_previstas
                    .length === 0 ? (
                    <div className="empty-state">
                      Nenhuma despesa prevista.
                    </div>
                  ) : (
                    custos.despesas_previstas.map(
                      (despesa) => (
                        <div
                          className="more-fields"
                          key={
                            despesa
                              .id_despesa_prevista
                          }
                        >
                          <strong>
                            {despesa.descricao}
                          </strong>

                          <p>
                            {despesa.categoria}
                            {" · "}
                            {formatarMoeda(
                              despesa.valor_previsto,
                            )}
                            {" · "}
                            {despesa.situacao}
                          </p>

                          {despesa.observacoes && (
                            <p>
                              {despesa.observacoes}
                            </p>
                          )}

                          {despesa.situacao ===
                            "Pendente" && (
                            <div className="row-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  abrirEdicaoPrevista(
                                    despesa,
                                  )
                                }
                              >
                                Editar
                              </button>

                              <button
                                className="success"
                                type="button"
                                onClick={() =>
                                  abrirNovaRealizada(
                                    despesa,
                                  )
                                }
                              >
                                Registrar realização
                              </button>

                              <button
                                className="danger"
                                type="button"
                                onClick={() =>
                                  void excluirPrevista(
                                    despesa,
                                  )
                                }
                                disabled={
                                  excluindo ===
                                  `prevista-${despesa.id_despesa_prevista}`
                                }
                              >
                                {excluindo ===
                                `prevista-${despesa.id_despesa_prevista}`
                                  ? "Excluindo..."
                                  : "Excluir"}
                              </button>
                            </div>
                          )}
                        </div>
                      ),
                    )
                  )}

                  <h3 className="form-section-title">
                    Despesas realizadas
                  </h3>

                  {custos.despesas_realizadas
                    .length === 0 ? (
                    <div className="empty-state">
                      Nenhuma despesa realizada.
                    </div>
                  ) : (
                    custos.despesas_realizadas.map(
                      (despesa) => {
                        const prevista =
                          custos.despesas_previstas
                            .some(
                              (item) =>
                                item
                                  .id_despesa_realizada
                                ===
                                despesa.id_despesa,
                            );

                        return (
                          <div
                            className="more-fields"
                            key={
                              despesa.id_despesa
                            }
                          >
                            <strong>
                              {despesa.descricao}
                            </strong>

                            <p>
                              {despesa.categoria}
                              {" · "}
                              {formatarMoeda(
                                despesa.valor,
                              )}
                            </p>

                            <p>
                              <strong>
                                Classificação:
                              </strong>{" "}
                              {prevista
                                ? "Prevista"
                                : "Imprevista"}
                            </p>

                            <p>
                              {formatarData(
                                despesa
                                  .data_despesa,
                              )}
                              {" · "}
                              {despesa.fornecedor}
                            </p>

                            {despesa.observacoes && (
                              <p>
                                {despesa.observacoes}
                              </p>
                            )}

                            <div className="row-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  abrirEdicaoRealizada(
                                    despesa,
                                  )
                                }
                              >
                                Editar
                              </button>

                              <button
                                className="danger"
                                type="button"
                                onClick={() =>
                                  void excluirRealizada(
                                    despesa,
                                  )
                                }
                                disabled={
                                  excluindo ===
                                  `realizada-${despesa.id_despesa}`
                                }
                              >
                                {excluindo ===
                                `realizada-${despesa.id_despesa}`
                                  ? "Excluindo..."
                                  : "Excluir"}
                              </button>
                            </div>
                          </div>
                        );
                      },
                    )
                  )}
                </>
              ) : null}
            </div>

            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={aoFechar}
                disabled={
                  salvando
                  || excluindo !== null
                }
              >
                Fechar
              </button>
            </div>
          </form>
        </section>
      </div>

      {tipoFormulario !== "resumo" && (
        <div className="modal-backdrop">
          <section
            className="modal expense-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-formulario-despesa"
          >
            <div className="modal-header">
              <h2 id="titulo-formulario-despesa">
                {tipoFormulario === "prevista"
                  ? "Nova despesa prevista"
                  : formularioRealizada.id_despesa_prevista
                    ? "Registrar realização"
                    : "Nova despesa realizada"}
              </h2>

              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={voltarAoResumo}
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

                {tipoFormulario === "prevista" ? (
                  <>
                    <label className="field field-full">
                      Categoria *

                      <select
                        name="categoria"
                        value={formularioPrevista.categoria}
                        onChange={atualizarCampoPrevista}
                        required
                      >
                        <option value="">Selecione...</option>

                        {categorias.map((categoria) => (
                          <option
                            key={categoria}
                            value={categoria}
                          >
                            {categoria}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field field-full">
                      Descrição *

                      <input
                        name="descricao"
                        value={formularioPrevista.descricao}
                        onChange={atualizarCampoPrevista}
                        maxLength={255}
                        required
                      />
                    </label>

                    <label className="field field-full">
                      Valor previsto *

                      <input
                        name="valor"
                        type="number"
                        value={formularioPrevista.valor}
                        onChange={atualizarCampoPrevista}
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </label>

                    <label className="field field-full">
                      Observações

                      <textarea
                        name="observacoes"
                        value={formularioPrevista.observacoes}
                        onChange={atualizarCampoPrevista}
                        rows={3}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="field field-full">
                      Despesa prevista relacionada

                      <select
                        name="id_despesa_prevista"
                        value={
                          formularioRealizada.id_despesa_prevista
                        }
                        onChange={atualizarCampoRealizada}
                      >
                        <option value="">
                          Nenhuma — despesa imprevista
                        </option>

                        {despesasPrevistasPendentes.map(
                          (despesa) => (
                            <option
                              key={despesa.id_despesa_prevista}
                              value={despesa.id_despesa_prevista}
                            >
                              {despesa.descricao}
                              {" — "}
                              {formatarMoeda(
                                despesa.valor_previsto,
                              )}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="field field-full">
                      Fornecedor *

                      <select
                        name="id_fornecedor"
                        value={formularioRealizada.id_fornecedor}
                        onChange={atualizarCampoRealizada}
                        required
                      >
                        <option value="">Selecione...</option>

                        {fornecedores.map((fornecedor) => (
                          <option
                            key={fornecedor.id_fornecedor}
                            value={fornecedor.id_fornecedor}
                          >
                            {fornecedor.razao_social_nome}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field field-full">
                      Categoria *

                      <select
                        name="categoria"
                        value={formularioRealizada.categoria}
                        onChange={atualizarCampoRealizada}
                        required
                      >
                        <option value="">Selecione...</option>

                        {categorias.map((categoria) => (
                          <option
                            key={categoria}
                            value={categoria}
                          >
                            {categoria}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field field-full">
                      Descrição *

                      <input
                        name="descricao"
                        value={formularioRealizada.descricao}
                        onChange={atualizarCampoRealizada}
                        maxLength={255}
                        required
                      />
                    </label>

                    <div className="form-grid">
                      <label className="field">
                        Data da despesa *

                        <input
                          name="data_despesa"
                          type="date"
                          value={formularioRealizada.data_despesa}
                          onChange={atualizarCampoRealizada}
                          required
                        />
                      </label>

                      <label className="field">
                        Valor realizado *

                        <input
                          name="valor"
                          type="number"
                          value={formularioRealizada.valor}
                          onChange={atualizarCampoRealizada}
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </label>
                    </div>

                    <label className="field field-full">
                      Observações

                      <textarea
                        name="observacoes"
                        value={formularioRealizada.observacoes}
                        onChange={atualizarCampoRealizada}
                        rows={3}
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="modal-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={voltarAoResumo}
                  disabled={salvando}
                >
                  Cancelar
                </button>

                <button
                  className="button primary"
                  type="submit"
                  disabled={salvando}
                >
                  {salvando
                    ? "Salvando..."
                    : tipoFormulario === "prevista"
                      ? "Cadastrar previsão"
                      : formularioRealizada.id_despesa_prevista
                        ? "Registrar realização"
                        : "Cadastrar despesa"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <DespesaEdicaoModal
        aberto={
          previstaEmEdicao !== null
          || realizadaEmEdicao !== null
        }
        idCiclo={veiculo.id_ciclo}
        despesaPrevista={previstaEmEdicao}
        despesaRealizada={realizadaEmEdicao}
        fornecedores={fornecedores}
        aoFechar={fecharEdicao}
        aoSalvar={concluirEdicao}
      />
    </>
  );
}
