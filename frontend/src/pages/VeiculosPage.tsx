import { useAuth } from "../context/AuthContext";
import { Permissao } from "../components/Permissao";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CustosVeiculoModal } from "../components/CustosVeiculoModal";
import { HistoricoCiclosModal } from "../components/HistoricoCiclosModal";
import { Layout } from "../components/Layout";
import { MovimentacaoVeiculoModal } from "../components/MovimentacaoVeiculoModal";
import { VeiculoModal } from "../components/VeiculoModal";
import { listarVeiculos } from "../services/veiculosApi";
import type { Veiculo } from "../types/Veiculo";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatadorNumero = new Intl.NumberFormat("pt-BR");

function formatarData(data: string | null): string {
  if (!data) {
    return "—";
  }

  const dataSemHorario = data.slice(0, 10);
  const partes = dataSemHorario.split("-");

  if (partes.length !== 3) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarValor(valor: string | null): string {
  if (
    valor === null ||
    valor === "" ||
    Number.isNaN(Number(valor))
  ) {
    return "—";
  }

  return formatadorMoeda.format(Number(valor));
}

function formatarNotaFiscal(veiculo: Veiculo): string {
  if (
    !veiculo.id_nota_fiscal_entrada ||
    !veiculo.numero_nota
  ) {
    return "Sem NF - legado";
  }

  if (veiculo.serie) {
    return `${veiculo.numero_nota}/${veiculo.serie}`;
  }

  return veiculo.numero_nota;
}

function classeSituacao(situacao: string): string {
  return situacao === "Disponível"
    ? "status active"
    : "status inactive";
}

export function VeiculosPage() {
  const { pode } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(1);
  const ultimaConsulta = useRef(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [modalAberto, setModalAberto] = useState(false);

  const [
    modalMovimentacaoAberto,
    setModalMovimentacaoAberto,
  ] = useState(false);

  const [modalCustosAberto, setModalCustosAberto] =
    useState(false);

  const [
    modalHistoricoCiclosAberto,
    setModalHistoricoCiclosAberto,
  ] = useState(false);

  const [veiculoEmEdicao, setVeiculoEmEdicao] =
    useState<Veiculo | null>(null);

  const [veiculoEmMovimentacao, setVeiculoEmMovimentacao] =
    useState<Veiculo | null>(null);

  const [veiculoEmCustos, setVeiculoEmCustos] =
    useState<Veiculo | null>(null);

  const [veiculoEmHistorico, setVeiculoEmHistorico] =
    useState<Veiculo | null>(null);

  const carregar = useCallback(async () => {
    const consulta = ++ultimaConsulta.current;
    setCarregando(true);
    setErro("");

    try {
      const dados = await listarVeiculos(pagina, buscaAplicada);
      if (consulta !== ultimaConsulta.current) return;
      setVeiculos(dados.itens);
      setTotal(dados.total);
      setPaginas(dados.paginas);
      setPagina(dados.pagina);
    } catch (falha) {
      if (consulta !== ultimaConsulta.current) return;
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível carregar os veículos.",
      );
    } finally {
      if (consulta === ultimaConsulta.current) setCarregando(false);
    }
  }, [pagina, buscaAplicada]);

  useEffect(() => {
    void carregar();
    return () => { ultimaConsulta.current++; };
  }, [carregar]);

  useEffect(() => {
    if (busca.trim() === buscaAplicada) return;
    const timer = window.setTimeout(() => {
      setBuscaAplicada(busca.trim());
      setPagina(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [busca, buscaAplicada]);

  useEffect(() => {
    if (!sucesso) {
      return;
    }

    const temporizador = window.setTimeout(() => {
      setSucesso("");
    }, 5000);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [sucesso]);

  function abrirCadastro() {
    setSucesso("");
    setVeiculoEmEdicao(null);
    setModalAberto(true);
  }

  function abrirEdicao(veiculo: Veiculo) {
    setSucesso("");
    setVeiculoEmEdicao(veiculo);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setVeiculoEmEdicao(null);
  }

  async function veiculoSalvo() {
    const estavaEditando = veiculoEmEdicao !== null;

    if (!estavaEditando && pagina !== 1) setPagina(1);
    else await carregar();

    setSucesso(
      estavaEditando
        ? "Veículo alterado com sucesso."
        : "Veículo cadastrado com sucesso.",
    );
  }

  function abrirMovimentacoes(veiculo: Veiculo) {
    setVeiculoEmMovimentacao(veiculo);
    setModalMovimentacaoAberto(true);
  }

  function fecharMovimentacoes() {
    setModalMovimentacaoAberto(false);
    setVeiculoEmMovimentacao(null);
  }

  function abrirCustos(veiculo: Veiculo) {
    setVeiculoEmCustos(veiculo);
    setModalCustosAberto(true);
  }

  function fecharCustos() {
    setModalCustosAberto(false);
    setVeiculoEmCustos(null);
  }

  function abrirHistoricoCiclos(veiculo: Veiculo) {
    setVeiculoEmHistorico(veiculo);
    setModalHistoricoCiclosAberto(true);
  }

  function fecharHistoricoCiclos() {
    setModalHistoricoCiclosAberto(false);
    setVeiculoEmHistorico(null);
  }

  return (
    <Layout>
      <div className="breadcrumb">
        <span>Veículos</span>
        <span>/</span>
        <strong>Pátio</strong>
      </div>

      <div className="page-toolbar">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por nosso número, marca, modelo, placa, chassi ou situação"
          />
        </label>

        <Permissao codigo="veiculos.cadastrar"><button
          className="button primary"
          type="button"
          onClick={abrirCadastro}
        >
          + Nova Entrada
        </button></Permissao>
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
        aria-label="Lista de veículos"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nosso Número</th>
                <th>Veículo</th>
                <th>Placa</th>
                <th>Ano</th>
                <th>Combustível</th>
                <th>Quilometragem</th>
                <th>Aquisição / Repasse</th>
                <th>Nota Fiscal</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={10}
                    className="empty-state"
                  >
                    Carregando veículos...
                  </td>
                </tr>
              ) : veiculos.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="empty-state"
                  >
                    Nenhum veículo encontrado.
                  </td>
                </tr>
              ) : (
                veiculos.map((veiculo) => (
                  <tr key={veiculo.id_ciclo}>
                    <td className="document">
                      <strong>
                        {veiculo.nosso_numero}
                      </strong>{veiculo.origem_movimento&&<small>{veiculo.origem_movimento}</small>}
                    </td>

                    <td>
                      <strong>
                        {veiculo.marca} {veiculo.modelo}
                      </strong>

                      {veiculo.versao && (
                        <small>{veiculo.versao}</small>
                      )}
                    </td>

                    <td className="document">
                      {veiculo.placa}
                    </td>

                    <td>
                      {veiculo.ano_fabricacao}/
                      {veiculo.ano_modelo}
                    </td>

                    <td>{veiculo.combustivel}</td>

                    <td>
                      {veiculo.quilometragem === null
                        ? "—"
                        : `${formatadorNumero.format(
                            veiculo.quilometragem,
                          )} km`}
                    </td>

<td>{pode("custos.visualizar") ? <>                    
                      <strong>
                        {formatarValor(
                          veiculo.origem_entrada === "consignação"
                            ? veiculo.valor_repasse_acordado
                            : veiculo.valor_compra,
                        )}
                      </strong>

                      <small>
                        {veiculo.origem_entrada === "consignação"
                          ? "Repasse acordado"
                          : `Aquisição: ${formatarData(veiculo.data_compra)}`}
                      </small>
                    </> : "Acesso restrito"}</td>

                    <td>
                      <strong>
                        {formatarNotaFiscal(veiculo)}
                      </strong>

                      {veiculo.nome_fornecedor_nf && (
                        <small>
                          {veiculo.nome_fornecedor_nf}
                        </small>
                      )}
                    </td>

                    <td>
                      <span
                        className={classeSituacao(
                          veiculo.status,
                        )}
                      >
                        {veiculo.status}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        <Permissao codigo="veiculos.editar"><button
                          type="button"
                          onClick={() =>
                            abrirEdicao(veiculo)
                          }
                        >
                          Editar
                        </button></Permissao>

                        <button
                          type="button"
                          onClick={() =>
                            abrirMovimentacoes(veiculo)
                          }
                        >
                          Situação/Histórico
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            abrirHistoricoCiclos(veiculo)
                          }
                        >
                          Ciclos
                        </button>

                        <Permissao codigo="despesas.visualizar"><button
                          type="button"
                          onClick={() =>
                            abrirCustos(veiculo)
                          }
                        >
                          Resumo financeiro
                        </button></Permissao>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="orc-pagination" aria-label="Páginas do pátio">
        <span>Página {pagina} de {paginas} · {total} veículo(s) · 20 por página</span>
        <div>
          <button type="button" className="button secondary" disabled={carregando || pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
          <button type="button" className="button secondary" disabled={carregando || pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Próxima</button>
        </div>
      </nav>

      <VeiculoModal
        aberto={modalAberto}
        veiculo={veiculoEmEdicao}
        aoFechar={fecharModal}
        aoSalvar={veiculoSalvo}
      />

      <MovimentacaoVeiculoModal
        aberto={modalMovimentacaoAberto}
        veiculo={veiculoEmMovimentacao}
        aoFechar={fecharMovimentacoes}
        aoAtualizar={carregar}
      />

      <HistoricoCiclosModal
        aberto={modalHistoricoCiclosAberto}
        idVeiculo={
          veiculoEmHistorico?.id_veiculo ?? null
        }
        aoFechar={fecharHistoricoCiclos}
      />

      <CustosVeiculoModal
        aberto={modalCustosAberto}
        veiculo={veiculoEmCustos}
        aoFechar={fecharCustos}
      />
    </Layout>
  );
}
