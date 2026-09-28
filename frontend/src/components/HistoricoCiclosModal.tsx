import {
  useEffect,
  useState,
} from "react";
import { buscarHistoricoVeiculo } from "../services/historicoVeiculoApi";
import type {
  CicloHistorico,
  HistoricoVeiculo,
} from "../types/HistoricoVeiculo";
import "./HistoricoCiclosModal.css";

interface HistoricoCiclosModalProps {
  aberto: boolean;
  idVeiculo: number | null;
  aoFechar: () => void;
}

function formatarData(
  valor: string | null | undefined,
): string {
  if (!valor) {
    return "—";
  }

  const partes = valor.substring(0, 10).split("-");

  if (partes.length !== 3) {
    return valor;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
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

function formatarQuilometragem(
  valor: number | null,
): string {
  if (valor === null) {
    return "—";
  }

  return `${valor.toLocaleString("pt-BR")} km`;
}

function obterTipoCiclo(
  ciclo: CicloHistorico,
): string {
  if (ciclo.id_consignacao !== null) {
    return "Consignação";
  }

  if (ciclo.id_aquisicao !== null) {
    return "Aquisição própria";
  }

  return ciclo.origem_entrada || "Entrada";
}

function cicloEstaAtivo(
  ciclo: CicloHistorico,
): boolean {
  return ciclo.data_encerramento === null;
}

function obterTituloValorEntrada(
  ciclo: CicloHistorico,
): string {
  if (ciclo.id_consignacao !== null) {
    return "Repasse acordado";
  }

  return "Custo de aquisição";
}

function obterValorEntrada(
  ciclo: CicloHistorico,
): string {
  if (ciclo.id_consignacao !== null) {
    return ciclo.valor_repasse_acordado !== null
      ? formatarMoeda(ciclo.valor_repasse_acordado)
      : "Não informado";
  }

  if (ciclo.id_aquisicao !== null) {
    return formatarMoeda(ciclo.valor_aquisicao);
  }

  return "Sem aquisição";
}

export function HistoricoCiclosModal({
  aberto,
  idVeiculo,
  aoFechar,
}: HistoricoCiclosModalProps) {
  const [historico, setHistorico] =
    useState<HistoricoVeiculo | null>(null);

  const [carregando, setCarregando] =
    useState(false);

  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!aberto || idVeiculo === null) {
      setHistorico(null);
      setErro("");
      return;
    }

    let requisicaoCancelada = false;

    async function carregarHistorico() {
      setCarregando(true);
      setErro("");

      try {
        const dados =
          await buscarHistoricoVeiculo(
            idVeiculo as number,
          );

        if (!requisicaoCancelada) {
          setHistorico(dados);
        }
      } catch (error) {
        if (!requisicaoCancelada) {
          setHistorico(null);

          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o histórico.",
          );
        }
      } finally {
        if (!requisicaoCancelada) {
          setCarregando(false);
        }
      }
    }

    void carregarHistorico();

    return () => {
      requisicaoCancelada = true;
    };
  }, [
    aberto,
    idVeiculo,
  ]);

  if (!aberto) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <section
        className="modal-card vehicle-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-historico-ciclos"
      >
        <header className="modal-header">
          <h2 id="titulo-historico-ciclos">
            Histórico de ciclos
          </h2>

          <button
            type="button"
            className="modal-close"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="modal-body vehicle-history-body">
          {carregando ? (
            <div className="vehicle-history-message">
              Carregando histórico...
            </div>
          ) : erro ? (
            <div className="alert error">
              {erro}
            </div>
          ) : historico ? (
            <>
              <section className="vehicle-history-header">
                <div>
                  <span>Veículo</span>

                  <strong>
                    {historico.veiculo.marca}{" "}
                    {historico.veiculo.modelo}
                  </strong>

                  <small>
                    {historico.veiculo.versao ||
                      "Versão não informada"}
                  </small>
                </div>

                <div>
                  <span>Placa atual</span>

                  <strong>
                    {historico.veiculo.placa}
                  </strong>
                </div>

                <div>
                  <span>Chassi</span>

                  <strong className="vehicle-history-document">
                    {historico.veiculo.chassi}
                  </strong>
                </div>

                <div>
                  <span>Total de ciclos</span>

                  <strong>
                    {historico.ciclos.length}
                  </strong>
                </div>
              </section>

              <section className="vehicle-history-list">
                <h3>Ciclos na revenda</h3>

                {historico.ciclos.length === 0 ? (
                  <div className="vehicle-history-message">
                    Nenhum ciclo encontrado.
                  </div>
                ) : (
                  historico.ciclos.map(
                    (ciclo, indice) => {
                      const ativo =
                        cicloEstaAtivo(ciclo);

                      return (
                        <article
                          className="vehicle-history-cycle"
                          key={ciclo.id_ciclo}
                        >
                          <div className="vehicle-history-cycle-heading">
                            <div>
                              <strong>
                                {ciclo.nosso_numero}
                              </strong>

                              <small>
                                Ciclo{" "}
                                {historico.ciclos.length -
                                  indice}
                              </small>
                            </div>

                            <span
                              className={
                                ativo
                                  ? "vehicle-history-status active"
                                  : "vehicle-history-status closed"
                              }
                            >
                              {ativo
                                ? "Ciclo ativo"
                                : "Ciclo encerrado"}
                            </span>
                          </div>

                          <div className="vehicle-history-grid">
                            <div>
                              <span>
                                Tipo de entrada
                              </span>

                              <strong>
                                {obterTipoCiclo(ciclo)}
                              </strong>
                            </div>

                            <div>
                              <span>Situação</span>

                              <strong>
                                {ciclo.situacao_atual}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Data de entrada
                              </span>

                              <strong>
                                {formatarData(
                                  ciclo.data_entrada,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>Encerramento</span>

                              <strong>
                                {formatarData(
                                  ciclo.data_encerramento,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>Cor</span>

                              <strong>
                                {ciclo.cor || "—"}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Quilometragem
                              </span>

                              <strong>
                                {formatarQuilometragem(
                                  ciclo.quilometragem_entrada,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                {obterTituloValorEntrada(
                                  ciclo,
                                )}
                              </span>

                              <strong>
                                {obterValorEntrada(
                                  ciclo,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>Nota Fiscal</span>

                              <strong>
                                {ciclo.numero_nota
                                  ? `${ciclo.numero_nota}/${ciclo.serie ?? ""}`
                                  : "Não informada"}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Despesas realizadas
                              </span>

                              <strong>
                                {formatarMoeda(
                                  ciclo.despesas_realizadas,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Despesas previstas pendentes
                              </span>

                              <strong>
                                {formatarMoeda(
                                  ciclo.despesas_previstas_pendentes,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Total investido
                              </span>

                              <strong>
                                {formatarMoeda(
                                  ciclo.custo_acumulado,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Total projetado
                              </span>

                              <strong>
                                {formatarMoeda(
                                  ciclo.custo_projetado,
                                )}
                              </strong>
                            </div>
                          </div>

                          {ciclo.situacao_consignacao ===
                            "Devolvida" && (
                            <div className="vehicle-history-return">
                              <strong>
                                Devolução da consignação
                              </strong>

                              <span>
                                {formatarData(
                                  ciclo.data_saida,
                                )}
                                {" — "}
                                {ciclo.motivo_saida ||
                                  "Motivo não informado"}
                              </span>
                            </div>
                          )}
                        </article>
                      );
                    },
                  )
                )}
              </section>
            </>
          ) : null}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={aoFechar}
          >
            Fechar
          </button>
        </footer>
      </section>
    </div>
  );
}