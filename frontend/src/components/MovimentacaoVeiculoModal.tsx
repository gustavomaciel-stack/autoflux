import { Permissao } from "./Permissao";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  buscarHistoricoMovimentacoes,
  registrarMovimentacaoVeiculo,
} from "../services/movimentacoesVeiculoApi";
import type {
  DadosMovimentacaoVeiculo,
  MovimentacaoVeiculoFormData,
  SituacaoVeiculo,
} from "../types/MovimentacaoVeiculo";
import type { Veiculo } from "../types/Veiculo";

interface MovimentacaoVeiculoModalProps {
  aberto: boolean;
  veiculo: Veiculo | null;
  aoFechar: () => void;
  aoAtualizar: () => void | Promise<void>;
}

const situacoes: SituacaoVeiculo[] = [
  "Disponível",
  "Em preparação",
  "Em manutenção",
  "Reservado",
  "Bloqueado",
];

const formularioVazio:
MovimentacaoVeiculoFormData = {
  situacao_nova: "",
  observacoes: "",
};

function formatarDataHora(
  dataHora: string,
): string {
  const data = new Date(
    dataHora.replace(" ", "T"),
  );

  if (Number.isNaN(data.getTime())) {
    return dataHora;
  }

  return data.toLocaleString("pt-BR");
}

export function MovimentacaoVeiculoModal({
  aberto,
  veiculo,
  aoFechar,
  aoAtualizar,
}: MovimentacaoVeiculoModalProps) {
  const [dados, setDados] =
    useState<DadosMovimentacaoVeiculo | null>(
      null,
    );

  const [formulario, setFormulario] =
    useState<MovimentacaoVeiculoFormData>(
      formularioVazio,
    );

  const [carregando, setCarregando] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);

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

    async function carregarHistorico() {
      setCarregando(true);
      setDados(null);
      setFormulario(formularioVazio);
      setErro("");
      setSucesso("");

      try {
        const resultado =
          await buscarHistoricoMovimentacoes(
            veiculo!.id_ciclo,
          );

        if (ativo) {
          setDados(resultado);
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Não foi possível carregar o histórico.",
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarHistorico();

    return () => {
      ativo = false;
    };
  }, [aberto, veiculo]);

  function atualizarCampo(
    evento: ChangeEvent<
      HTMLSelectElement
      | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = evento.target;

    setFormulario((formularioAtual) => ({
      ...formularioAtual,
      [name]: value,
    }));
  }

  async function salvar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (!veiculo) {
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const resultado =
        await registrarMovimentacaoVeiculo(
          veiculo.id_ciclo,
          formulario,
        );

      setDados(resultado);

      setFormulario({
        situacao_nova: "",
        observacoes: "",
      });

      setSucesso(
        "Situação do veículo atualizada com sucesso.",
      );

      await aoAtualizar();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível atualizar a situação.",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto || !veiculo) {
    return null;
  }

  const situacaoAtual =
    dados?.ciclo.situacao_atual
    ?? veiculo.status;

  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-movimentacoes"
      >
        <div className="modal-header">
          <h2 id="titulo-movimentacoes">
            Situação e Histórico do Veículo
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

            {sucesso && (
              <div className="alert success page-alert">
                <span>{sucesso}</span>
              </div>
            )}

            <h3 className="form-section-title">
              Veículo
            </h3>

            <div className="form-grid">
              <label className="field">
                Veículo
                <input
                  value={`${veiculo.marca} ${veiculo.modelo}`}
                  readOnly
                />
              </label>

              <label className="field">
                Placa
                <input
                  value={veiculo.placa}
                  readOnly
                />
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                Nosso Número
                <input
                  value={veiculo.nosso_numero}
                  readOnly
                />
              </label>

              <label className="field">
                Situação atual
                <input
                  value={situacaoAtual}
                  readOnly
                />
              </label>
            </div>

            <h3 className="form-section-title">
              Alterar situação
            </h3>

            <label className="field field-full">
              Nova situação *
              <select
                name="situacao_nova"
                value={formulario.situacao_nova}
                onChange={atualizarCampo}
                required
              >
                <option value="">
                  Selecione...
                </option>

                {situacoes.map((situacao) => (
                  <option
                    key={situacao}
                    value={situacao}
                    disabled={
                      situacao === situacaoAtual
                    }
                  >
                    {situacao}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-full">
              Motivo ou observações
              <textarea
                name="observacoes"
                value={formulario.observacoes}
                onChange={atualizarCampo}
                maxLength={1000}
                rows={3}
                placeholder="Ex.: Veículo encaminhado para revisão mecânica."
              />
            </label>

            <Permissao codigo="veiculos.movimentar"><button
              className="button primary"
              type="submit"
              disabled={
                salvando
                || carregando
                || !formulario.situacao_nova
              }
            >
              {salvando
                ? "Atualizando..."
                : "Registrar alteração"}
            </button></Permissao>

            <h3 className="form-section-title">
              Histórico de situações
            </h3>

            {carregando ? (
              <div className="empty-state">
                Carregando histórico...
              </div>
            ) : !dados
              || dados.historico.length === 0 ? (
              <div className="empty-state">
                Nenhuma movimentação encontrada.
              </div>
            ) : (
              dados.historico.map(
                (movimentacao) => (
                  <div
                    className="more-fields"
                    key={
                      movimentacao.id_movimentacao
                    }
                  >
                    <strong>
                      {
                        movimentacao.situacao_anterior
                      }
                      {" → "}
                      {
                        movimentacao.situacao_nova
                      }
                    </strong>

                    <p>
                      {formatarDataHora(
                        movimentacao.data_movimentacao,
                      )}
                      {" · "}
                      {
                        movimentacao.usuario_responsavel
                      }
                    </p>

                    <small>
                      {movimentacao.observacoes
                      ?? "Sem observações."}
                    </small>
                  </div>
                ),
              )
            )}
          </div>

          <div className="modal-actions">
            <button
              className="button secondary"
              type="button"
              onClick={aoFechar}
              disabled={salvando}
            >
              Fechar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}