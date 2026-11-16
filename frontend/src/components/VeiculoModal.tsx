import {useIdentidadeEntrada} from './IdentidadeEntrada';
import { createPortal } from "react-dom";
import { FornecedorModal } from "./FornecedorModal";
import {useAuth} from '../context/AuthContext';
import { CadastroEntradaAbas, useCadastroEntradaAbas } from "./CadastroEntradaAbas";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  atualizarVeiculo,
  cadastrarVeiculo,
} from "../services/veiculosApi";
import { listarFornecedores } from "../services/fornecedoresApi";
import type { Fornecedor } from "../types/Fornecedor";
import type {
  Veiculo,
  VeiculoFormData,
} from "../types/Veiculo";

import { RepasseNoPatio } from "./RepasseNoPatio";
import "./VeiculoModalTabs.css";

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
  const {usuario, pode}=useAuth();
  const [novoFornecedor, setNovoFornecedor] = useState(false);
  useEffect(() => { if (!aberto) setNovoFornecedor(false); }, [aberto]);
  const podeCorrigirChassi=usuario?.pode_corrigir_chassi===true;
  const [motivoChassi,setMotivoChassi]=useState('');
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
  const [erro, setErro] = useState("");

  const [aba, setAba] = useState<"dados" | "repasse">("dados");

  const entradaAbas = useCadastroEntradaAbas(aberto);
  const editando = veiculo !== null;
  const identidade=useIdentidadeEntrada(formulario,aberto&&!editando,setFormulario);
  const corrigiuChassi=!!veiculo&&formulario.chassi!==veiculo.chassi;
  const exibirDadosAquisicao =
    !editando || veiculo?.id_aquisicao !== null;

  useEffect(() => {
    if (!aberto) {
      return;
    }

    setAba("dados");
    setMotivoChassi('');

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
      setErro("");
    }
    setFormulario((formularioAtual) => ({ ...formularioAtual, [name]: valorTratado }));
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

    if (!editando && !identidade.pronto) {
      entradaAbas.setEtapa(0);
      setErro("Confira o chassi e confirme o retorno, se houver cadastro anterior, antes de continuar.");
      return;
    }

    if(corrigiuChassi&&(!podeCorrigirChassi||!motivoChassi.trim())){
      setAba('dados');setErro(!podeCorrigirChassi?'Somente Gestão/Diretoria pode corrigir o chassi.':'Informe o motivo da correção do chassi.');return;
    }
    setSalvando(true);
    setErro("");

    try {
      if (veiculo) {
        await atualizarVeiculo(
          veiculo.id_veiculo,
          {...formulario,chassi_anterior:veiculo.chassi,motivo_correcao_chassi:motivoChassi.trim()},
        );
      } else {
        await cadastrarVeiculo({...formulario,confirmacao_retorno:identidade.confirmacao});
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
        className={veiculo?.origem_entrada === "consignação" ? "modal vehicle-edit-modal has-repasse" : "modal vehicle-edit-modal"}
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

        {veiculo?.origem_entrada === "consignação" && (
          <div className="vehicle-editor-tabs" role="group" aria-label="Seções de edição">
            <button type="button" className={aba === "dados" ? "vehicle-editor-tab active" : "vehicle-editor-tab"}
              aria-pressed={aba === "dados"} onClick={() => setAba("dados")}>Dados do veículo</button>
            <button type="button" className={aba === "repasse" ? "vehicle-editor-tab active" : "vehicle-editor-tab"}
              aria-pressed={aba === "repasse"} onClick={() => setAba("repasse")}>Repasse e histórico</button>
          </div>
        )}

        <div style={{ display: aba === "dados" ? "block" : "none" }}>
        <form onSubmit={salvar} onInvalidCapture={entradaAbas.validar}>
          {!editando&&<CadastroEntradaAbas id={entradaAbas.id} etapa={entradaAbas.etapa} onEtapa={entradaAbas.setEtapa} tituloSegundo="Aquisição e nota fiscal" bloqueado={salvando}/> }
          <div className="modal-body">
            {erro && (
              <div className="alert error page-alert">
                <span>{erro}</span>
              </div>
            )}


            <section id={entradaAbas.id+"-panel-0"} role={!editando?"tabpanel":undefined} aria-labelledby={!editando?entradaAbas.id+"-tab-0":undefined} data-etapa-entrada="0" hidden={!editando&&entradaAbas.etapa!==0}>
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
                  disabled={salvando||(editando&&!podeCorrigirChassi)}
                  required
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
                    {podeCorrigirChassi?'Você pode corrigir um erro no chassi. A alteração exige motivo e ficará registrada no histórico, com o valor anterior e o responsável.':'A correção do chassi é exclusiva de Gestão/Diretoria.'}
                  </small>
                )}

              </label>
              {!editando&&identidade.aviso}
              {corrigiuChassi&&podeCorrigirChassi&&<label className="field field-full">Motivo da correção do chassi *<textarea name="motivo_correcao_chassi" required maxLength={1000} rows={2} value={motivoChassi} disabled={salvando} onChange={e=>setMotivoChassi(e.target.value)} placeholder="Ex.: erro de digitação identificado na conferência do documento"/><small className="field-hint">A correção mantém o mesmo veículo e os vínculos com seus ciclos, aquisições e documentos. O chassi anterior ficará no histórico.</small></label>}

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

            </section>
            <section id={entradaAbas.id+"-panel-1"} role={!editando?"tabpanel":undefined} aria-labelledby={!editando?entradaAbas.id+"-tab-1":undefined} data-etapa-entrada="1" hidden={!editando&&entradaAbas.etapa!==1}>
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
                  <div className="field field-full">
                    <label htmlFor="entrada-fornecedor">Fornecedor *</label>
                    <div className="entrada-fornecedor-controles">
                    <select id="entrada-fornecedor"
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
                    {pode("fornecedores.cadastrar") && <button type="button" className="button primary entrada-fornecedor-adicionar" title="Cadastrar fornecedor" aria-label="Cadastrar fornecedor" onClick={() => setNovoFornecedor(true)}>+</button>}
                    </div>
                  </div>
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
            </section>
          </div>

          <div data-ui-actions="navigation" className="modal-actions">
            <button data-ui-nav="back"
              className="button secondary"
              type="button"
              onClick={aoFechar}
              disabled={salvando}
            >
              Cancelar
            </button>

            {!editando&&entradaAbas.etapa===1&&<button data-ui-nav="back" type="button" className="button secondary" disabled={salvando} onClick={()=>entradaAbas.setEtapa(0)}>Anterior</button>}
            {!editando&&entradaAbas.etapa===0?<button data-ui-nav="next" type="button" className="button primary" disabled={salvando||!identidade.pronto} onClick={e=>entradaAbas.proxima(e.currentTarget)}>Próxima</button>:<button
              className="button primary"
              type="submit"
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : editando
                  ? "Salvar alterações"
                  : "Confirmar entrada"}
            </button>}
          </div>
        </form>
        </div>
        {aba === "repasse" && veiculo && (
          <div className="modal-body repasse-patio-body">
            <RepasseNoPatio key={veiculo.id_ciclo} idCiclo={veiculo.id_ciclo} />
          </div>
        )}
      </section>
      {novoFornecedor && createPortal(
        <div className="entrada-fornecedor-modal">
          <FornecedorModal aberto fornecedor={null}
            aoFechar={() => setNovoFornecedor(false)}
            aoSalvar={async () => {}}
            aoCadastrar={(id, dados) => {
              setFornecedores(atuais => [...atuais.filter(f => Number(f.id_fornecedor) !== id), {
                ...dados, id_fornecedor: id, ativo: 1, data_cadastro: "", data_atualizacao: "",
              }].sort((a, b) => a.razao_social_nome.localeCompare(b.razao_social_nome, "pt-BR")));
              setFormulario(atual => ({...atual, id_fornecedor_origem: String(id)}));
            }} />
        </div>, document.body)}
    </div>
  );
}
