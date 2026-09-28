import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Layout } from "../components/Layout";
import { listarNotasFiscaisEntrada } from "../services/notasFiscaisEntradaApi";
import type { NotaFiscalEntrada } from "../types/NotaFiscalEntrada";

const formatadorMoeda = new Intl.NumberFormat(
  "pt-BR",
  {
    style: "currency",
    currency: "BRL",
  },
);

function formatarData(
  data: string | null,
): string {
  if (!data) {
    return "—";
  }

  const partes = data.split("-");

  if (partes.length !== 3) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarDocumento(
  documento: string | null,
): string {
  if (!documento) {
    return "Não informado";
  }

  const numeros = documento.replace(/\D/g, "");

  if (numeros.length === 11) {
    return numeros.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      "$1.$2.$3-$4",
    );
  }

  if (numeros.length === 14) {
    return numeros.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }

  return documento;
}

function numeroCompleto(
  nota: NotaFiscalEntrada,
): string {
  return `${nota.numero_nota}/${nota.serie}`;
}

export function NotasFiscaisEntradaPage() {
  const [notas, setNotas] =
    useState<NotaFiscalEntrada[]>([]);

  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] =
    useState(true);
  const [erro, setErro] = useState("");

  const [notaSelecionada, setNotaSelecionada] =
    useState<NotaFiscalEntrada | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const dados =
        await listarNotasFiscaisEntrada();

      setNotas(dados);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível carregar as notas fiscais.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const notasFiltradas = useMemo(() => {
    const termo = busca
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!termo) {
      return notas;
    }

    return notas.filter((nota) =>
      [
        nota.numero_nota,
        nota.serie,
        nota.nome_origem,
        nota.tipo_origem,
        nota.marca,
        nota.modelo,
        nota.versao,
        nota.placa,
        nota.chassi,
        nota.nosso_numero,
        nota.descricao_item,
      ].some((valor) =>
        String(valor ?? "")
          .toLocaleLowerCase("pt-BR")
          .includes(termo),
      ),
    );
  }, [busca, notas]);

  return (
    <Layout>
      <div className="breadcrumb">
        <span>Veículos</span>
        <span>/</span>
        <strong>Notas Fiscais de Entrada</strong>
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
            placeholder="Buscar por nota, origem, veículo, placa ou nosso número"
          />
        </label>
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
        aria-label="Lista de notas fiscais de entrada"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nota / Série</th>
                <th>Emissão</th>
                <th>Origem</th>
                <th>Veículo</th>
                <th>Placa</th>
                <th>Nosso Número</th>
                <th>Valor</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={9}
                    className="empty-state"
                  >
                    Carregando notas fiscais...
                  </td>
                </tr>
              ) : notasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="empty-state"
                  >
                    Nenhuma nota fiscal encontrada.
                  </td>
                </tr>
              ) : (
                notasFiltradas.map((nota) => (
                  <tr
                    key={
                      nota.id_nota_fiscal_entrada
                    }
                  >
                    <td className="document">
                      <strong>
                        {numeroCompleto(nota)}
                      </strong>

                      <small>
                        {nota.tipo_origem}
                      </small>
                    </td>

                    <td>
                      {formatarData(
                        nota.data_emissao,
                      )}
                    </td>

                    <td>
                      <strong>
                        {nota.nome_origem}
                      </strong>

                      {nota.documento_origem && (
                        <small>
                          {formatarDocumento(
                            nota.documento_origem,
                          )}
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>
                        {nota.marca} {nota.modelo}
                      </strong>

                      {nota.versao && (
                        <small>{nota.versao}</small>
                      )}
                    </td>

                    <td className="document">
                      {nota.placa}
                    </td>

                    <td className="document">
                      {nota.nosso_numero}
                    </td>

                    <td>
                      {formatadorMoeda.format(
                        Number(nota.valor_total),
                      )}
                    </td>

                    <td>
                      <span className="status active">
                        {nota.situacao_atual}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() =>
                            setNotaSelecionada(nota)
                          }
                        >
                          Ver detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {notaSelecionada && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalhes-nota"
          >
            <div className="modal-header">
              <h2 id="titulo-detalhes-nota">
                Nota Fiscal de Entrada{" "}
                {numeroCompleto(
                  notaSelecionada,
                )}
              </h2>

              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={() =>
                  setNotaSelecionada(null)
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(evento) =>
                evento.preventDefault()
              }
            >
              <div className="modal-body">
                <h3 className="form-section-title">
                  Dados da nota fiscal
                </h3>

                <div className="form-grid">
                  <label className="field">
                    Número da nota
                    <input
                      value={
                        notaSelecionada.numero_nota
                      }
                      readOnly
                    />
                  </label>

                  <label className="field">
                    Série
                    <input
                      value={notaSelecionada.serie}
                      readOnly
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label className="field">
                    Data de emissão
                    <input
                      value={formatarData(
                        notaSelecionada.data_emissao,
                      )}
                      readOnly
                    />
                  </label>

                  <label className="field">
                    Data de entrada
                    <input
                      value={formatarData(
                        notaSelecionada.data_entrada,
                      )}
                      readOnly
                    />
                  </label>
                </div>

                <label className="field field-full">
                  Chave de acesso
                  <input
                    value={
                      notaSelecionada.chave_acesso
                      ?? "Não informada"
                    }
                    readOnly
                  />
                </label>

                <label className="field field-full">
                  Descrição do item
                  <textarea
                    value={
                      notaSelecionada.descricao_item
                    }
                    rows={2}
                    readOnly
                  />
                </label>

                <label className="field field-full">
                  Natureza da operação
                  <input
                    value={
                      notaSelecionada.natureza_operacao
                      ?? "Não informada"
                    }
                    readOnly
                  />
                </label>

                <label className="field field-full">
                  Valor total
                  <input
                    value={formatadorMoeda.format(
                      Number(
                        notaSelecionada.valor_total,
                      ),
                    )}
                    readOnly
                  />
                </label>

                <h3 className="form-section-title">
                  Origem
                </h3>

                <div className="form-grid">
                  <label className="field">
                    Tipo
                    <input
                      value={
                        notaSelecionada.tipo_origem
                      }
                      readOnly
                    />
                  </label>

                  <label className="field">
                    Nome
                    <input
                      value={
                        notaSelecionada.nome_origem
                      }
                      readOnly
                    />
                  </label>
                </div>

                <label className="field field-full">
                  CPF/CNPJ
                  <input
                    value={formatarDocumento(
                      notaSelecionada.documento_origem,
                    )}
                    readOnly
                  />
                </label>

                <h3 className="form-section-title">
                  Veículo vinculado
                </h3>

                <div className="form-grid">
                  <label className="field">
                    Veículo
                    <input
                      value={`${notaSelecionada.marca} ${notaSelecionada.modelo}`}
                      readOnly
                    />
                  </label>

                  <label className="field">
                    Versão
                    <input
                      value={
                        notaSelecionada.versao
                        ?? "Não informada"
                      }
                      readOnly
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label className="field">
                    Placa
                    <input
                      value={notaSelecionada.placa}
                      readOnly
                    />
                  </label>

                  <label className="field">
                    Nosso Número
                    <input
                      value={
                        notaSelecionada.nosso_numero
                      }
                      readOnly
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label className="field">
                    Ano
                    <input
                      value={`${notaSelecionada.ano_fabricacao}/${notaSelecionada.ano_modelo}`}
                      readOnly
                    />
                  </label>

                  <label className="field">
                    Situação atual
                    <input
                      value={
                        notaSelecionada.situacao_atual
                      }
                      readOnly
                    />
                  </label>
                </div>

                <label className="field field-full">
                  Chassi
                  <input
                    value={notaSelecionada.chassi}
                    readOnly
                  />
                </label>

                <h3 className="form-section-title">
                  Aquisição e controle
                </h3>

                <div className="form-grid">
                  <label className="field">
                    Data da aquisição
                    <input
                      value={formatarData(
                        notaSelecionada.data_aquisicao,
                      )}
                      readOnly
                    />
                  </label>

                  <label className="field">
                    Valor da aquisição
                    <input
                      value={
                        notaSelecionada.valor_aquisicao
                          ? formatadorMoeda.format(
                              Number(
                                notaSelecionada.valor_aquisicao,
                              ),
                            )
                          : "Não informado"
                      }
                      readOnly
                    />
                  </label>
                </div>

                <label className="field field-full">
                  Origem da aquisição
                  <input
                    value={
                      notaSelecionada.origem_aquisicao
                      ?? "Não informada"
                    }
                    readOnly
                  />
                </label>

                <label className="field field-full">
                  Usuário responsável
                  <input
                    value={
                      notaSelecionada.usuario_responsavel
                    }
                    readOnly
                  />
                </label>

                <label className="field field-full">
                  Observações
                  <textarea
                    value={
                      notaSelecionada.observacoes
                      ?? "Sem observações"
                    }
                    rows={3}
                    readOnly
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  className="button primary"
                  type="button"
                  onClick={() =>
                    setNotaSelecionada(null)
                  }
                >
                  Fechar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Layout>
  );
}