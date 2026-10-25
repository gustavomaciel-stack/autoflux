import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  atualizarDespesaPrevista,
  atualizarDespesaRealizada,
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

interface DespesaEdicaoModalProps {
  aberto: boolean;
  consignado: boolean;
  idCiclo: number | null;
  despesaPrevista: DespesaPrevista | null;
  despesaRealizada: DespesaRealizada | null;
  fornecedores: Fornecedor[];
  aoFechar: () => void;
  aoSalvar: (
    custosAtualizados: CustosVeiculo,
    mensagem: string,
  ) => void;
}

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

const previstaVazia:
DespesaPrevistaFormData = {
  integra_base_comercial: false,
  responsavel_despesa: "",
  categoria: "",
  descricao: "",
  valor: "",
  observacoes: "",
};

const realizadaVazia:
DespesaRealizadaFormData = {
  id_fornecedor: "",
  id_despesa_prevista: "",
  responsavel_despesa: "",
  categoria: "",
  descricao: "",
  data_despesa: "",
  valor: "",
  observacoes: "",
};

export function DespesaEdicaoModal({
  aberto,
  consignado,
  idCiclo,
  despesaPrevista,
  despesaRealizada,
  fornecedores,
  aoFechar,
  aoSalvar,
}: DespesaEdicaoModalProps) {
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

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  useEffect(() => {
    if (!aberto) {
      return;
    }

    setErro("");

    if (despesaPrevista) {
      setFormularioPrevista({
        integra_base_comercial: Number(despesaPrevista.integra_base_comercial) === 1,
        responsavel_despesa: despesaPrevista.responsavel_despesa ?? "",
        categoria:
          despesaPrevista.categoria,
        descricao:
          despesaPrevista.descricao,
        valor:
          despesaPrevista.valor_previsto,
        observacoes:
          despesaPrevista.observacoes
          ?? "",
      });
    } else {
      setFormularioPrevista(
        previstaVazia,
      );
    }

    if (despesaRealizada) {
      setFormularioRealizada({
        responsavel_despesa: despesaRealizada.responsavel_despesa ?? "",
        id_fornecedor: String(
          despesaRealizada.id_fornecedor,
        ),

        id_despesa_prevista: "",

        categoria:
          despesaRealizada.categoria,

        descricao:
          despesaRealizada.descricao,

        data_despesa:
          despesaRealizada
            .data_despesa
            .slice(0, 10),

        valor:
          despesaRealizada.valor,

        observacoes:
          despesaRealizada.observacoes
          ?? "",
      });
    } else {
      setFormularioRealizada(
        realizadaVazia,
      );
    }
  }, [
    aberto,
    despesaPrevista,
    despesaRealizada,
  ]);

  function atualizarCampoPrevista(
    evento: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >,
  ) {
    const { name, value } =
      evento.target;

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
    const { name, value } =
      evento.target;

    setFormularioRealizada(
      (formularioAtual) => ({
        ...formularioAtual,
        [name]: value,
      }),
    );
  }

  async function salvar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (!idCiclo) {
      setErro(
        "O ciclo do veículo não foi informado.",
      );

      return;
    }

    if (
      !despesaPrevista
      && !despesaRealizada
    ) {
      setErro(
        "Nenhuma despesa foi selecionada para edição.",
      );

      return;
    }

    setSalvando(true);
    setErro("");

    try {
      if (despesaPrevista) {
        const custosAtualizados =
          await atualizarDespesaPrevista(
            idCiclo,
            despesaPrevista
              .id_despesa_prevista,
            formularioPrevista,
          );

        aoSalvar(
          custosAtualizados,
          "Despesa identificada na compra atualizada com sucesso.",
        );

        return;
      }

      if (despesaRealizada) {
        const custosAtualizados =
          await atualizarDespesaRealizada(
            idCiclo,
            despesaRealizada
              .id_despesa,
            formularioRealizada,
          );

        aoSalvar(
          custosAtualizados,
          "Despesa realizada atualizada com sucesso.",
        );
      }
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível atualizar a despesa.",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (
    !aberto
    || (
      !despesaPrevista
      && !despesaRealizada
    )
  ) {
    return null;
  }

  const editandoPrevista =
    despesaPrevista !== null;

  return (
    <div className="modal-backdrop expense-edit-backdrop">
      <section
        className="modal expense-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-edicao-despesa"
      >
        <div className="modal-header">
          <h2 id="titulo-edicao-despesa">
            {editandoPrevista
              ? "Editar despesa identificada na compra"
              : "Editar despesa realizada"}
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

            
            {consignado && (
              <label className="field field-full">
                Responsável pela despesa *
                <select
                  name="responsavel_despesa"
                  value={editandoPrevista ? formularioPrevista.responsavel_despesa : formularioRealizada.responsavel_despesa}
                  onChange={editandoPrevista ? atualizarCampoPrevista : atualizarCampoRealizada}
                  required
                  disabled={salvando}
                >
                  <option value="">Selecione...</option>
                  <option value="Revenda">Revenda</option>
                  <option value="Proprietário">Proprietário</option>
                  <option value="Desconto no repasse">Desconto no repasse</option>
                </select>
              </label>
            )}

{editandoPrevista ? (
              <>
                <label className="field field-full">
                  Categoria *

                  <select
                    name="categoria"
                    value={
                      formularioPrevista
                        .categoria
                    }
                    onChange={
                      atualizarCampoPrevista
                    }
                    required
                    disabled={salvando}
                  >
                    <option value="">
                      Selecione...
                    </option>

                    {categorias.map(
                      (categoria) => (
                        <option
                          key={categoria}
                          value={categoria}
                        >
                          {categoria}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="field field-full">
                  Descrição *

                  <input
                    name="descricao"
                    value={
                      formularioPrevista
                        .descricao
                    }
                    onChange={
                      atualizarCampoPrevista
                    }
                    maxLength={255}
                    required
                    disabled={salvando}
                  />
                </label>

                <label className="field field-full">
                  Valor previsto *

                  <input
                    name="valor"
                    type="number"
                    value={
                      formularioPrevista
                        .valor
                    }
                    onChange={
                      atualizarCampoPrevista
                    }
                    min="0.01"
                    step="0.01"
                    required
                    disabled={salvando}
                  />
                </label>

                

                    <label className="field field-full">
                  Observações

                  <textarea
                    name="observacoes"
                    value={
                      formularioPrevista
                        .observacoes
                    }
                    onChange={
                      atualizarCampoPrevista
                    }
                    rows={4}
                    disabled={salvando}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="field field-full">
                  Fornecedor *

                  <select
                    name="id_fornecedor"
                    value={
                      formularioRealizada
                        .id_fornecedor
                    }
                    onChange={
                      atualizarCampoRealizada
                    }
                    required
                    disabled={salvando}
                  >
                    <option value="">
                      Selecione...
                    </option>

                    {fornecedores.map(
                      (fornecedor) => (
                        <option
                          key={
                            fornecedor
                              .id_fornecedor
                          }
                          value={
                            fornecedor
                              .id_fornecedor
                          }
                        >
                          {
                            fornecedor
                              .razao_social_nome
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="field field-full">
                  Categoria *

                  <select
                    name="categoria"
                    value={
                      formularioRealizada
                        .categoria
                    }
                    onChange={
                      atualizarCampoRealizada
                    }
                    required
                    disabled={salvando}
                  >
                    <option value="">
                      Selecione...
                    </option>

                    {categorias.map(
                      (categoria) => (
                        <option
                          key={categoria}
                          value={categoria}
                        >
                          {categoria}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="field field-full">
                  Descrição *

                  <input
                    name="descricao"
                    value={
                      formularioRealizada
                        .descricao
                    }
                    onChange={
                      atualizarCampoRealizada
                    }
                    maxLength={255}
                    required
                    disabled={salvando}
                  />
                </label>

                <div className="form-grid">
                  <label className="field">
                    Data da despesa *

                    <input
                      name="data_despesa"
                      type="date"
                      value={
                        formularioRealizada
                          .data_despesa
                      }
                      onChange={
                        atualizarCampoRealizada
                      }
                      required
                      disabled={salvando}
                    />
                  </label>

                  <label className="field">
                    Valor realizado *

                    <input
                      name="valor"
                      type="number"
                      value={
                        formularioRealizada
                          .valor
                      }
                      onChange={
                        atualizarCampoRealizada
                      }
                      min="0.01"
                      step="0.01"
                      required
                      disabled={salvando}
                    />
                  </label>
                </div>

                <label className="field field-full">
                  Observações

                  <textarea
                    name="observacoes"
                    value={
                      formularioRealizada
                        .observacoes
                    }
                    onChange={
                      atualizarCampoRealizada
                    }
                    rows={4}
                    disabled={salvando}
                  />
                </label>
              </>
            )}

            <div className="row-actions expense-edit-actions">
              <button
                className="button primary"
                type="submit"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar alterações"}
              </button>

              <button
                className="button secondary"
                type="button"
                onClick={aoFechar}
                disabled={salvando}
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}