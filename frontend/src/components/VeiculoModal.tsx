import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  atualizarVeiculo,
  buscarVeiculoPorChassi,
  cadastrarVeiculo,
} from "../services/veiculosApi";
import { listarFornecedores } from "../services/fornecedoresApi";
import type { Fornecedor } from "../types/Fornecedor";
import type {
  Veiculo,
  VeiculoFormData,
} from "../types/Veiculo";

interface VeiculoModalProps {
  aberto: boolean;
  veiculo: Veiculo | null;
  aoFechar: () => void;
  aoSalvar: () => void | Promise<void>;
}

type TipoOrigemNota = "fornecedor" | "particular";

const formularioVazio: VeiculoFormData = {
  marca: "",
  modelo: "",
  versao: "",
  ano_fabricacao: "",
  ano_modelo: "",
  combustivel: "",
  placa: "",
  chassi: "",
  observacoes: "",

  renavam: "",
  cor: "",
  quilometragem: "",
  horimetro: "",

  valor_compra: "",
  data_compra: "",
  origem: "",

  id_fornecedor_origem: "",
  nome_fornecedor_avulso: "",
  numero_nota: "",
  serie: "",
  chave_acesso: "",
  data_emissao_nf: "",
  descricao_item_nf: "",
  natureza_operacao: "",
  observacoes_nf: "",
};

function converterVeiculoParaFormulario(
  veiculo: Veiculo,
): VeiculoFormData {
  return {
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    versao: veiculo.versao ?? "",
    ano_fabricacao: String(veiculo.ano_fabricacao),
    ano_modelo: String(veiculo.ano_modelo),
    combustivel: veiculo.combustivel,
    placa: veiculo.placa,
    chassi: veiculo.chassi,
    observacoes: veiculo.observacoes ?? "",

    renavam: veiculo.renavam ?? "",
    cor: veiculo.cor,
    quilometragem:
      veiculo.quilometragem === null
        ? ""
        : String(veiculo.quilometragem),
    horimetro:
      veiculo.horimetro === null
        ? ""
        : String(veiculo.horimetro),

    valor_compra: veiculo.valor_compra ?? "",
    data_compra: veiculo.data_compra ?? "",
    origem: veiculo.origem_aquisicao ?? "",

    id_fornecedor_origem:
      veiculo.id_fornecedor_origem === null
        ? ""
        : String(veiculo.id_fornecedor_origem),
    nome_fornecedor_avulso:
      veiculo.nome_fornecedor_avulso ?? "",
    numero_nota: veiculo.numero_nota ?? "",
    serie: veiculo.serie ?? "",
    chave_acesso: veiculo.chave_acesso ?? "",
    data_emissao_nf: veiculo.data_emissao_nf ?? "",
    descricao_item_nf:
      veiculo.descricao_item_nf ?? "",
    natureza_operacao:
      veiculo.natureza_operacao ?? "",
    observacoes_nf: veiculo.observacoes_nf ?? "",
  };
}

export function VeiculoModal({
  aberto,
  veiculo,
  aoFechar,
  aoSalvar,
}: VeiculoModalProps) {
  const [formulario, setFormulario] =
    useState<VeiculoFormData>(formularioVazio);

  const [fornecedores, setFornecedores] =
    useState<Fornecedor[]>([]);

  const [tipoOrigemNota, setTipoOrigemNota] =
    useState<TipoOrigemNota>("fornecedor");

  const [
    carregandoFornecedores,
    setCarregandoFornecedores,
  ] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [pesquisandoChassi, setPesquisandoChassi] = useState(false);
  const versaoPesquisaChassi = useRef(0);
  const [avisoChassi, setAvisoChassi] = useState("");
  const [chassiConferido, setChassiConferido] = useState("");
  const [erro, setErro] = useState("");

  const editando = veiculo !== null;
  const exibirDadosAquisicao =
    !editando || veiculo?.id_aquisicao !== null;

  useEffect(() => {
    if (!aberto) {
      return;
    }

    versaoPesquisaChassi.current += 1;

    setFormulario(
      veiculo
        ? converterVeiculoParaFormulario(veiculo)
        : { ...formularioVazio },
    );

    setTipoOrigemNota(
      veiculo?.nome_fornecedor_avulso
        ? "particular"
        : "fornecedor",
    );

    setErro("");
    setAvisoChassi("");
    setChassiConferido("");
  }, [aberto, veiculo]);

  useEffect(() => {
    if (!aberto || editando) {
      return;
    }

    let ativo = true;

    async function carregarFornecedores() {
      setCarregandoFornecedores(true);

      try {
        const dados = await listarFornecedores();

        if (ativo) {
          setFornecedores(
            dados.filter(
              (fornecedor) =>
                Number(fornecedor.ativo) === 1,
            ),
          );
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Não foi possível carregar os fornecedores.",
          );
        }
      } finally {
        if (ativo) {
          setCarregandoFornecedores(false);
        }
      }
    }

    void carregarFornecedores();

    return () => {
      ativo = false;
    };
  }, [aberto, editando]);

  function atualizarCampo(
    evento: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = evento.target;
    let valorTratado = value;

    if (name === "placa" || name === "chassi") {
      valorTratado = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    }

    if (
      name === "renavam" ||
      name === "chave_acesso"
    ) {
      valorTratado = value.replace(/\D/g, "");
    }

    if (name === "chassi") {
      versaoPesquisaChassi.current += 1;
      setPesquisandoChassi(false);
      setChassiConferido("");
      setAvisoChassi("");
      setErro("");
    }
    setFormulario((formularioAtual) => name === "chassi" ? {
      ...formularioAtual,
      chassi: valorTratado,
      marca: "", modelo: "", versao: "", ano_fabricacao: "", ano_modelo: "",
      combustivel: "", placa: "", observacoes: "", cor: "", renavam: "",
    } : { ...formularioAtual, [name]: valorTratado });
  }

  async function pesquisarChassi() {
    const chassi = formulario.chassi.trim().toUpperCase();
    if (chassi.length !== 17) {
      setErro("Informe os 17 caracteres do chassi antes de pesquisar.");
      return;
    }

    setPesquisandoChassi(true);
    const versao = ++versaoPesquisaChassi.current;
    setErro("");
    setAvisoChassi("");
    try {
      const encontrado = await buscarVeiculoPorChassi(chassi);
      if (versao !== versaoPesquisaChassi.current) return;

      if (!encontrado) {
        setAvisoChassi("Chassi não cadastrado. Confira os dados e prossiga com a nova entrada.");
      } else if (encontrado.data_encerramento === null) {
        setErro(`Este chassi já possui ciclo ativo (${encontrado.nosso_numero}). Confira o veículo no pátio.`);
        return;
      } else {
        setFormulario((atual) => ({
          ...atual,
          marca: encontrado.marca,
          modelo: encontrado.modelo,
          versao: encontrado.versao ?? "",
          ano_fabricacao: String(encontrado.ano_fabricacao),
          ano_modelo: String(encontrado.ano_modelo),
          combustivel: encontrado.combustivel,
          placa: encontrado.placa,
          observacoes: encontrado.observacoes ?? "",
          cor: encontrado.cor,
          renavam: encontrado.renavam ?? "",
          // Dados da aquisição, NF e quilometragem desta entrada não são reaproveitados.
        }));
        setAvisoChassi(`Veículo localizado no ciclo ${encontrado.nosso_numero}. Confira os dados recuperados antes de continuar.`);
      }
      setChassiConferido(chassi);
    } catch (falha) {
      if (versao !== versaoPesquisaChassi.current) return;
      setErro(falha instanceof Error ? falha.message : "Não foi possível pesquisar o chassi.");
    } finally {
      if (versao === versaoPesquisaChassi.current) setPesquisandoChassi(false);
    }
  }

  function alterarTipoOrigem(
    evento: ChangeEvent<HTMLSelectElement>,
  ) {
    const tipo =
      evento.target.value as TipoOrigemNota;

    setTipoOrigemNota(tipo);

    setFormulario((formularioAtual) => ({
      ...formularioAtual,

      id_fornecedor_origem:
        tipo === "fornecedor"
          ? formularioAtual.id_fornecedor_origem
          : "",

      nome_fornecedor_avulso:
        tipo === "particular"
          ? formularioAtual.nome_fornecedor_avulso
          : "",
    }));
  }

  async function salvar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (!editando && chassiConferido !== formulario.chassi) {
      setErro("Pesquise o chassi antes de confirmar a aquisição.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      if (veiculo) {
        await atualizarVeiculo(
          veiculo.id_veiculo,
          formulario,
        );
      } else {
        await cadastrarVeiculo(formulario);
      }

      await aoSalvar();
      aoFechar();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar o veículo.",
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
        aria-labelledby="titulo-modal-veiculo"
      >
        <div className="modal-header">
          <h2 id="titulo-modal-veiculo">
            {editando
              ? "Editar Veículo"
              : "Nova Entrada de Veículo"}
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
            {avisoChassi && <div className="alert page-alert" role="status">{avisoChassi}</div>}

            <h3 className="form-section-title">
              Dados do veículo
            </h3>

            <div className="form-grid">
              <label className="field">
                Marca *
                <input
                  name="marca"
                  value={formulario.marca}
                  onChange={atualizarCampo}
                  maxLength={50}
                  required
                  autoFocus
                />
              </label>

              <label className="field">
                Modelo *
                <input
                  name="modelo"
                  value={formulario.modelo}
                  onChange={atualizarCampo}
                  maxLength={80}
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                Versão
                <input
                  name="versao"
                  value={formulario.versao}
                  onChange={atualizarCampo}
                  maxLength={80}
                />
              </label>

              <label className="field">
                Cor *
                <input
                  name="cor"
                  value={formulario.cor}
                  onChange={atualizarCampo}
                  maxLength={30}
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                Ano de fabricação *
                <input
                  name="ano_fabricacao"
                  type="number"
                  value={formulario.ano_fabricacao}
                  onChange={atualizarCampo}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  required
                />
              </label>

              <label className="field">
                Ano do modelo *
                <input
                  name="ano_modelo"
                  type="number"
                  value={formulario.ano_modelo}
                  onChange={atualizarCampo}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  required
                />
              </label>
            </div>

            <label className="field field-full">
              Combustível *
              <select
                name="combustivel"
                value={formulario.combustivel}
                onChange={atualizarCampo}
                required
              >
                <option value="">
                  Selecione...
                </option>

                <option value="Gasolina">
                  Gasolina
                </option>

                <option value="Etanol">
                  Etanol
                </option>

                <option value="Flex">
                  Flex
                </option>

                <option value="Diesel">
                  Diesel
                </option>

                <option value="Elétrico">
                  Elétrico
                </option>

                <option value="Híbrido">
                  Híbrido
                </option>

                <option value="GNV">
                  GNV
                </option>
              </select>
            </label>

            <div className="form-grid">
              <label className="field">
                Placa *
                <input
                  name="placa"
                  value={formulario.placa}
                  onChange={atualizarCampo}
                  placeholder="ABC1D23"
                  minLength={7}
                  maxLength={7}
                  required
                />
              </label>

              <label className="field">
                Chassi *
                <input
                  name="chassi"
                  value={formulario.chassi}
                  onChange={atualizarCampo}
                  minLength={17}
                  maxLength={17}
                  disabled={editando}
                  required={!editando}
                  aria-describedby={
                    editando
                      ? "aviso-edicao-chassi"
                      : undefined
                  }
                />

                {editando && (
                  <small
                    id="aviso-edicao-chassi"
                    className="field-hint"
                  >
                    O chassi é a identificação permanente do
                    veículo. Sua correção exige tratamento
                    específico.
                  </small>
                )}
                {!editando && (
                  <button type="button" onClick={() => void pesquisarChassi()} disabled={pesquisandoChassi || salvando}>
                    {pesquisandoChassi ? "Pesquisando..." : "Pesquisar chassi"}
                  </button>
                )}
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                RENAVAM
                <input
                  name="renavam"
                  value={formulario.renavam}
                  onChange={atualizarCampo}
                  minLength={11}
                  maxLength={11}
                  inputMode="numeric"
                />
              </label>

              <label className="field">
                Quilometragem
                <input
                  name="quilometragem"
                  type="number"
                  value={formulario.quilometragem}
                  onChange={atualizarCampo}
                  min="0"
                  step="1"
                />
              </label>
            </div>

            <label className="field field-full">
              Horímetro
              <input
                name="horimetro"
                type="number"
                value={formulario.horimetro}
                onChange={atualizarCampo}
                min="0"
                step="1"
              />
            </label>

            <label className="field field-full">
              Observações do veículo
              <textarea
                name="observacoes"
                value={formulario.observacoes}
                onChange={atualizarCampo}
                rows={3}
              />
            </label>

            {exibirDadosAquisicao && (
              <>
                <h3 className="form-section-title">
                  Dados da aquisição
                </h3>

                <div className="form-grid">
                  <label className="field">
                    Valor da aquisição *
                    <input
                      name="valor_compra"
                      type="number"
                      value={formulario.valor_compra}
                      onChange={atualizarCampo}
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </label>

                  <label className="field">
                    Data da aquisição *
                    <input
                      name="data_compra"
                      type="date"
                      value={formulario.data_compra}
                      onChange={atualizarCampo}
                      required
                    />
                  </label>
                </div>

                <label className="field field-full">
                  Origem da aquisição *
                  <input
                    name="origem"
                    value={formulario.origem}
                    onChange={atualizarCampo}
                    maxLength={100}
                    placeholder="Ex.: Compra direta"
                    required
                  />
                </label>
              </>
            )}

            {!editando && (
              <>
                <h3 className="form-section-title">
                  Nota Fiscal de Entrada
                </h3>

                <label className="field field-full">
                  Origem da nota fiscal *
                  <select
                    value={tipoOrigemNota}
                    onChange={alterarTipoOrigem}
                  >
                    <option value="fornecedor">
                      Fornecedor cadastrado
                    </option>

                    <option value="particular">
                      Pessoa particular
                    </option>
                  </select>
                </label>

                {tipoOrigemNota === "fornecedor" ? (
                  <label className="field field-full">
                    Fornecedor *
                    <select
                      name="id_fornecedor_origem"
                      value={
                        formulario.id_fornecedor_origem
                      }
                      onChange={atualizarCampo}
                      required
                      disabled={carregandoFornecedores}
                    >
                      <option value="">
                        {carregandoFornecedores
                          ? "Carregando fornecedores..."
                          : "Selecione..."}
                      </option>

                      {fornecedores.map(
                        (fornecedor) => (
                          <option
                            key={
                              fornecedor.id_fornecedor
                            }
                            value={
                              fornecedor.id_fornecedor
                            }
                          >
                            {
                              fornecedor.razao_social_nome
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                ) : (
                  <label className="field field-full">
                    Nome do particular *
                    <input
                      name="nome_fornecedor_avulso"
                      value={
                        formulario.nome_fornecedor_avulso
                      }
                      onChange={atualizarCampo}
                      maxLength={150}
                      placeholder="Digite o nome completo"
                      required
                    />
                  </label>
                )}

                <div className="form-grid">
                  <label className="field">
                    Número da nota *
                    <input
                      name="numero_nota"
                      value={formulario.numero_nota}
                      onChange={atualizarCampo}
                      maxLength={20}
                      required
                    />
                  </label>

                  <label className="field">
                    Série *
                    <input
                      name="serie"
                      value={formulario.serie}
                      onChange={atualizarCampo}
                      maxLength={10}
                      required
                    />
                  </label>
                </div>

                <label className="field field-full">
                  Data de emissão *
                  <input
                    name="data_emissao_nf"
                    type="date"
                    value={formulario.data_emissao_nf}
                    onChange={atualizarCampo}
                    required
                  />
                </label>

                <label className="field field-full">
                  Chave de acesso
                  <input
                    name="chave_acesso"
                    value={formulario.chave_acesso}
                    onChange={atualizarCampo}
                    minLength={44}
                    maxLength={44}
                    inputMode="numeric"
                    placeholder="44 números, quando disponível"
                  />
                </label>

                <label className="field field-full">
                  Descrição do item *
                  <input
                    name="descricao_item_nf"
                    value={formulario.descricao_item_nf}
                    onChange={atualizarCampo}
                    maxLength={255}
                    placeholder="Descrição do veículo presente na nota"
                    required
                  />
                </label>

                <label className="field field-full">
                  Natureza da operação (conforme a Nota
                  Fiscal)
                  <input
                    name="natureza_operacao"
                    value={formulario.natureza_operacao}
                    onChange={atualizarCampo}
                    maxLength={100}
                    placeholder="Copie a informação apresentada na Nota Fiscal"
                  />
                </label>

                <label className="field field-full">
                  Observações da nota fiscal
                  <textarea
                    name="observacoes_nf"
                    value={formulario.observacoes_nf}
                    onChange={atualizarCampo}
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
              onClick={aoFechar}
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
                : editando
                  ? "Salvar alterações"
                  : "Confirmar entrada"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
