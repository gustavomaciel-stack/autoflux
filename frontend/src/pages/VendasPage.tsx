import { useEffect, useMemo, useState } from "react";
import {
  listarVeiculosParaVenda,
  veiculoEstaDisponivel,
} from "../services/vendasApi";
import type { VeiculoVenda } from "../types/VeiculoVenda";
import "./VendasPage.css";

function normalizarTexto(valor: string | number | null | undefined): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarMoeda(valor: string | number | null | undefined): string {
  const numero = Number(valor ?? 0);

  if (!Number.isFinite(numero)) {
    return "R$ 0,00";
  }

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor: string | null | undefined): string {
  if (!valor) return "Não informada";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

function mostrar(valor: string | number | null | undefined): string {
  return valor === null || valor === undefined || String(valor).trim() === ""
    ? "Não informado"
    : String(valor);
}

function obterSituacao(veiculo: VeiculoVenda): string {
  return veiculo.situacao_atual?.trim() || "Não informada";
}

function obterClasseSituacao(situacao: string): string {
  const situacaoNormalizada = normalizarTexto(situacao);

  if (situacaoNormalizada === "disponivel") {
    return "sales-status sales-status-available";
  }

  if (
    situacaoNormalizada === "em manutencao" ||
    situacaoNormalizada === "em preparacao"
  ) {
    return "sales-status sales-status-warning";
  }

  if (situacaoNormalizada === "reservado") {
    return "sales-status sales-status-reserved";
  }

  return "sales-status sales-status-blocked";
}

export function VendasPage() {
  const [veiculos, setVeiculos] = useState<VeiculoVenda[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("Todos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [veiculoDetalhes, setVeiculoDetalhes] = useState<VeiculoVenda | null>(null);

  useEffect(() => {
    if (!veiculoDetalhes) return;
    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setVeiculoDetalhes(null);
    }
    window.addEventListener("keydown", fecharComEscape);
    return () => window.removeEventListener("keydown", fecharComEscape);
  }, [veiculoDetalhes]);

  async function carregarVeiculos() {
    setCarregando(true);
    setErro("");

    try {
      const dados = await listarVeiculosParaVenda();
      setVeiculos(dados);
    } catch (error) {
      setVeiculos([]);

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os veículos.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarVeiculos();
  }, []);

  const situacoes = useMemo(() => {
    const valores = veiculos
      .map((veiculo) => obterSituacao(veiculo))
      .filter((situacao) => situacao !== "Não informada");

    return Array.from(new Set(valores)).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [veiculos]);

  const veiculosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return veiculos.filter((veiculo) => {
      const situacao = obterSituacao(veiculo);

      const correspondeSituacao =
        filtroSituacao === "Todos" || situacao === filtroSituacao;

      if (!correspondeSituacao) {
        return false;
      }

      if (termo === "") {
        return true;
      }

      const conteudoPesquisavel = [
        veiculo.nosso_numero,
        veiculo.placa,
        veiculo.chassi,
        veiculo.renavam,
        veiculo.marca,
        veiculo.modelo,
        veiculo.versao,
        veiculo.ano_fabricacao,
        veiculo.ano_modelo,
        veiculo.combustivel,
        veiculo.cor,
        situacao,
      ]
        .map((valor) => normalizarTexto(valor))
        .join(" ");

      return conteudoPesquisavel.includes(termo);
    });
  }, [busca, filtroSituacao, veiculos]);

  const quantidadeDisponiveis = useMemo(() => {
    return veiculos.filter((veiculo) => veiculoEstaDisponivel(veiculo)).length;
  }, [veiculos]);

  const quantidadeBloqueados = veiculos.length - quantidadeDisponiveis;

  function selecionarVeiculo(veiculo: VeiculoVenda) {
    setErro("");
    setMensagem("");

    if (!veiculoEstaDisponivel(veiculo)) {
      setErro(
        `O veículo ${veiculo.marca} ${veiculo.modelo} não está disponível para comercialização.`,
      );

      return;
    }

    setMensagem(
      `O veículo ${veiculo.marca} ${veiculo.modelo}, placa ${veiculo.placa}, está disponível para comercialização.`,
    );
  }

  return (
    <div className="sales-page">
      <div className="breadcrumb">
        <span>Vendas</span>
        <span>/</span>
        <strong>Veículos para comercialização</strong>
      </div>

      <div className="sales-heading">
        <div>
          <h1>Veículos para comercialização</h1>

          <p>
            Consulte os veículos e verifique quais estão liberados para venda.
          </p>
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => void carregarVeiculos()}
          disabled={carregando}
        >
          {carregando ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <section className="sales-summary">
        <article className="sales-summary-card">
          <span>Total no pátio</span>
          <strong>{veiculos.length}</strong>
        </article>

        <article className="sales-summary-card sales-summary-card-success">
          <span>Disponíveis para venda</span>
          <strong>{quantidadeDisponiveis}</strong>
        </article>

        <article className="sales-summary-card sales-summary-card-warning">
          <span>Venda bloqueada</span>
          <strong>{quantidadeBloqueados}</strong>
        </article>
      </section>

      <div className="sales-filters">
        <label className="sales-search">
          <span className="sr-only">Buscar veículos</span>

          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nosso número, placa, chassi, marca, modelo ou situação"
          />
        </label>

        <label className="sales-filter-status">
          <span>Situação</span>

          <select
            value={filtroSituacao}
            onChange={(event) => setFiltroSituacao(event.target.value)}
          >
            <option value="Todos">Todas</option>

            {situacoes.map((situacao) => (
              <option key={situacao} value={situacao}>
                {situacao}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mensagem && <div className="alert success">{mensagem}</div>}

      {erro && (
        <div className="alert error">
          <span>{erro}</span>

          <button type="button" onClick={() => void carregarVeiculos()}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="sales-table-wrapper">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Nosso número</th>
              <th>Veículo</th>
              <th>Ano</th>
              <th>Placa</th>
              <th>Cor</th>
              <th>Combustível</th>
              <th>Total investido</th>
              <th>Situação</th>
              <th>Ação</th>
            </tr>
          </thead>

          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={9} className="sales-empty">
                  Carregando veículos...
                </td>
              </tr>
            ) : veiculosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="sales-empty">
                  Nenhum veículo encontrado.
                </td>
              </tr>
            ) : (
              veiculosFiltrados.map((veiculo) => {
                const disponivel = veiculoEstaDisponivel(veiculo);
                const situacao = obterSituacao(veiculo);

                return (
                  <tr key={`${veiculo.id_veiculo}-${veiculo.id_ciclo}`}>
                    <td>
                      <strong className="sales-code">
                        {veiculo.nosso_numero}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {veiculo.marca} {veiculo.modelo}
                      </strong>

                      <small>{veiculo.versao || "Versão não informada"}</small>
                    </td>

                    <td>
                      {veiculo.ano_fabricacao}/{veiculo.ano_modelo}
                    </td>

                    <td className="sales-plate">{veiculo.placa}</td>

                    <td>{veiculo.cor || "Não informada"}</td>

                    <td>{veiculo.combustivel}</td>

                    <td>
                      {formatarMoeda(
                        veiculo.custo_acumulado ?? veiculo.valor_aquisicao,
                      )}
                    </td>

                    <td>
                      <span className={obterClasseSituacao(situacao)}>
                        {situacao}
                      </span>
                    </td>

                    <td>
                      <div className="sales-actions">
                      <button
                        type="button"
                        className="sales-action-button sales-details-button"
                        onClick={() => setVeiculoDetalhes(veiculo)}
                      >
                        Detalhes
                      </button>
                      <button
                        type="button"
                        className="sales-action-button"
                        disabled={!disponivel}
                        title={
                          disponivel
                            ? "Selecionar veículo para comercialização"
                            : `Venda bloqueada: veículo está ${situacao}`
                        }
                        onClick={() => selecionarVeiculo(veiculo)}
                      >
                        {disponivel ? "Selecionar" : "Bloqueado"}
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
      {veiculoDetalhes && (
        <div className="sales-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setVeiculoDetalhes(null);
        }}>
          <section className="sales-details-modal" role="dialog" aria-modal="true" aria-labelledby="sales-details-title">
            <header className="sales-details-header">
              <div>
                <small>{veiculoDetalhes.nosso_numero}</small>
                <h2 id="sales-details-title">{veiculoDetalhes.marca} {veiculoDetalhes.modelo}</h2>
              </div>
              <button type="button" aria-label="Fechar detalhes" onClick={() => setVeiculoDetalhes(null)}>×</button>
            </header>
            <div className="sales-details-body">
              <span className={obterClasseSituacao(obterSituacao(veiculoDetalhes))}>{obterSituacao(veiculoDetalhes)}</span>
              <h3>Identificação</h3>
              <dl className="sales-details-grid">
                <div><dt>Versão</dt><dd>{mostrar(veiculoDetalhes.versao)}</dd></div>
                <div><dt>Ano fabricação/modelo</dt><dd>{veiculoDetalhes.ano_fabricacao}/{veiculoDetalhes.ano_modelo}</dd></div>
                <div><dt>Placa</dt><dd>{veiculoDetalhes.placa}</dd></div>
                <div><dt>Chassi</dt><dd>{veiculoDetalhes.chassi}</dd></div>
                <div><dt>RENAVAM</dt><dd>{mostrar(veiculoDetalhes.renavam)}</dd></div>
                <div><dt>Cor</dt><dd>{mostrar(veiculoDetalhes.cor)}</dd></div>
                <div><dt>Combustível</dt><dd>{veiculoDetalhes.combustivel}</dd></div>
              </dl>
              <h3>Ciclo atual</h3>
              <dl className="sales-details-grid">
                <div><dt>Nosso número</dt><dd>{veiculoDetalhes.nosso_numero}</dd></div>
                <div><dt>Data de entrada</dt><dd>{formatarData(veiculoDetalhes.data_entrada)}</dd></div>
                <div><dt>Origem da entrada</dt><dd>{mostrar(veiculoDetalhes.origem_entrada)}</dd></div>
                <div><dt>Quilometragem na entrada</dt><dd>{veiculoDetalhes.quilometragem === null ? "Não informada" : `${veiculoDetalhes.quilometragem.toLocaleString("pt-BR")} km`}</dd></div>
                <div><dt>Horímetro na entrada</dt><dd>{mostrar(veiculoDetalhes.horimetro)}</dd></div>
                <div><dt>Valor de aquisição</dt><dd>{veiculoDetalhes.id_aquisicao === null ? "Não se aplica" : formatarMoeda(veiculoDetalhes.valor_aquisicao)}</dd></div>
              </dl>
              <h3>Observações do veículo</h3>
              <p className="sales-details-notes">{mostrar(veiculoDetalhes.observacoes)}</p>
            </div>
            <footer className="sales-details-footer"><button type="button" className="sales-action-button" onClick={() => setVeiculoDetalhes(null)}>Fechar</button></footer>
          </section>
        </div>
      )}
    </div>
  );
}
