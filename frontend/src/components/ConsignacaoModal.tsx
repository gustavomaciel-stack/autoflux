import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  cadastrarCliente,
  type CadastroCliente,
} from "../services/clientesApi";
import { cadastrarConsignacao } from "../services/consignacoesApi";
import { buscarVeiculoPorChassi } from "../services/veiculosApi";
import type { Cliente } from "../types/Cliente";
import type {
  CadastroConsignacao,
  Consignacao,
} from "../types/Consignacao";

interface ConsignacaoModalProps {
  aberto: boolean;
  clientes: Cliente[];
  onFechar: () => void;
  onClienteCadastrado: (cliente: Cliente) => void;
  onConsignacaoCadastrada: (
    consignacao: Consignacao,
  ) => void;
}

interface FormularioConsignacao {
  id_proprietario: string;
  marca: string;
  modelo: string;
  versao: string;
  ano_fabricacao: string;
  ano_modelo: string;
  combustivel: string;
  placa: string;
  chassi: string;
  renavam: string;
  cor: string;
  quilometragem_entrada: string;
  horimetro_entrada: string;
  data_entrada: string;
  numero_nota: string;
  serie: string;
  chave_acesso: string;
  data_emissao: string;
  valor_total: string;
  descricao_item: string;
  natureza_operacao: string;
  valor_repasse_acordado: string;
  responsavel_despesas: string;
  data_acordo: string;
  observacoes_veiculo: string;
  observacoes_nota: string;
  observacoes_consignacao: string;
}

interface FormularioCliente {
  tipo_pessoa: "PF" | "PJ";
  nome_razao_social: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
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

function formularioInicial(): FormularioConsignacao {
  const dataAtual = obterDataAtual();

  return {
    id_proprietario: "",
    marca: "",
    modelo: "",
    versao: "",
    ano_fabricacao: "",
    ano_modelo: "",
    combustivel: "Flex",
    placa: "",
    chassi: "",
    renavam: "",
    cor: "",
    quilometragem_entrada: "",
    horimetro_entrada: "",
    data_entrada: dataAtual,
    numero_nota: "",
    serie: "1",
    chave_acesso: "",
    data_emissao: dataAtual,
    valor_total: "",
    descricao_item: "",
    natureza_operacao:
      "Entrada de veículo em consignação",
    valor_repasse_acordado: "",
    responsavel_despesas: "",
    data_acordo: dataAtual,
    observacoes_veiculo: "",
    observacoes_nota: "",
    observacoes_consignacao: "",
  };
}

function formularioClienteInicial(): FormularioCliente {
  return {
    tipo_pessoa: "PF",
    nome_razao_social: "",
    cpf_cnpj: "",
    telefone: "",
    email: "",
  };
}

function somenteNumeros(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function ConsignacaoModal({
  aberto,
  clientes,
  onFechar,
  onClienteCadastrado,
  onConsignacaoCadastrada,
}: ConsignacaoModalProps) {
  const [formulario, setFormulario] =
    useState<FormularioConsignacao>(
      formularioInicial,
    );

  const [formularioCliente, setFormularioCliente] =
    useState<FormularioCliente>(
      formularioClienteInicial,
    );

  const [
    mostrarCadastroCliente,
    setMostrarCadastroCliente,
  ] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [pesquisandoChassi, setPesquisandoChassi] = useState(false);
  const versaoPesquisaChassi = useRef(0);
  const [chassiConferido, setChassiConferido] = useState("");
  const [avisoChassi, setAvisoChassi] = useState("");
  const [salvandoCliente, setSalvandoCliente] =
    useState(false);

  const [erro, setErro] = useState("");
  const [mensagemCliente, setMensagemCliente] =
    useState("");

  useEffect(() => {
    if (aberto) {
      versaoPesquisaChassi.current += 1;
      setFormulario(formularioInicial());
      setFormularioCliente(
        formularioClienteInicial(),
      );
      setMostrarCadastroCliente(false);
      setErro("");
      setChassiConferido("");
      setAvisoChassi("");
      setMensagemCliente("");
    }
  }, [aberto]);

  if (!aberto) {
    return null;
  }

  function atualizarCampo(
    campo: keyof FormularioConsignacao,
    valor: string,
  ) {
    if (campo === "chassi") {
      versaoPesquisaChassi.current += 1;
      setPesquisandoChassi(false);
      setChassiConferido("");
      setAvisoChassi("");
      setErro("");
    }
    setFormulario((atual) => campo === "chassi" ? {
      ...atual,
      chassi: valor,
      marca: "",
      modelo: "",
      versao: "",
      ano_fabricacao: "",
      ano_modelo: "",
      combustivel: "Flex",
      placa: "",
      renavam: "",
      cor: "",
      observacoes_veiculo: "",
    } : { ...atual, [campo]: valor });
  }

  async function pesquisarChassi() {
    const chassi = formulario.chassi.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (chassi.length !== 17) {
      setErro("Informe os 17 caracteres do chassi para pesquisar.");
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
        setAvisoChassi("Chassi não cadastrado. Preencha os dados do veículo.");
      } else if (encontrado.data_encerramento === null) {
        setErro(`Este chassi já possui ciclo ativo (${encontrado.nosso_numero}) no pátio.`);
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
          renavam: encontrado.renavam ?? "",
          cor: encontrado.cor,
          observacoes_veiculo: encontrado.observacoes ?? "",
        }));
        setAvisoChassi(`Veículo encontrado no ciclo ${encontrado.nosso_numero}. Confira os dados recuperados.`);
      }
      setChassiConferido(chassi);
    } catch (falha) {
      if (versao !== versaoPesquisaChassi.current) return;
      setErro(falha instanceof Error ? falha.message : "Não foi possível pesquisar o chassi.");
    } finally {
      if (versao === versaoPesquisaChassi.current) setPesquisandoChassi(false);
    }
  }

  function atualizarCampoCliente(
    campo: keyof FormularioCliente,
    valor: string,
  ) {
    setFormularioCliente((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function salvarNovoCliente() {
    setErro("");
    setMensagemCliente("");

    const documento = somenteNumeros(
      formularioCliente.cpf_cnpj,
    );

    const dados: CadastroCliente = {
      tipo_pessoa: formularioCliente.tipo_pessoa,
      nome_razao_social:
        formularioCliente.nome_razao_social.trim(),
      nome_fantasia: null,
      cpf:
        formularioCliente.tipo_pessoa === "PF"
          ? documento
          : null,
      cnpj:
        formularioCliente.tipo_pessoa === "PJ"
          ? documento
          : null,
      telefone: somenteNumeros(
        formularioCliente.telefone,
      ),
      email:
        formularioCliente.email.trim() || null,
      cep: null,
      logradouro: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      estado: null,
      observacoes:
        "Proprietário cadastrado pelo fluxo de consignação.",
    };

    setSalvandoCliente(true);

    try {
      const cliente = await cadastrarCliente(dados);

      onClienteCadastrado(cliente);

      atualizarCampo(
        "id_proprietario",
        String(cliente.id_cliente),
      );

      setFormularioCliente(
        formularioClienteInicial(),
      );

      setMostrarCadastroCliente(false);

      setMensagemCliente(
        "Proprietário cadastrado e selecionado com sucesso.",
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o proprietário.",
      );
    } finally {
      setSalvandoCliente(false);
    }
  }

  async function enviarFormulario(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const chassiAtual = formulario.chassi.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (chassiConferido !== chassiAtual) {
      setErro("Pesquise o chassi antes de registrar a consignação.");
      return;
    }

    setErro("");
    setMensagemCliente("");
    setSalvando(true);

    const descricaoAutomatica = [
      formulario.marca,
      formulario.modelo,
      formulario.versao,
      formulario.combustivel,
      `ano ${formulario.ano_fabricacao}`,
      `modelo ${formulario.ano_modelo}`,
    ]
      .filter((valor) => valor.trim() !== "")
      .join(" ");

    const dados: CadastroConsignacao = {
      id_proprietario: Number(
        formulario.id_proprietario,
      ),
      id_usuario_responsavel: 1,

      marca: formulario.marca.trim(),
      modelo: formulario.modelo.trim(),
      versao: formulario.versao.trim() || null,
      ano_fabricacao:
        formulario.ano_fabricacao.trim(),
      ano_modelo: formulario.ano_modelo.trim(),
      combustivel: formulario.combustivel.trim(),
      placa: formulario.placa
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase(),
      chassi: formulario.chassi
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase(),
      renavam:
        somenteNumeros(formulario.renavam) || null,
      cor: formulario.cor.trim(),
      quilometragem_entrada:
        formulario.quilometragem_entrada.trim() === ""
          ? null
          : Number(
              formulario.quilometragem_entrada,
            ),
      horimetro_entrada:
        formulario.horimetro_entrada.trim() === ""
          ? null
          : Number(formulario.horimetro_entrada),
      data_entrada: formulario.data_entrada,

      numero_nota: formulario.numero_nota.trim(),
      serie: formulario.serie.trim(),
      chave_acesso:
        somenteNumeros(formulario.chave_acesso) ||
        null,
      data_emissao: formulario.data_emissao,
      valor_total: formulario.valor_total.trim(),
      descricao_item:
        formulario.descricao_item.trim() ||
        descricaoAutomatica,
      natureza_operacao:
        formulario.natureza_operacao.trim(),

      valor_repasse_acordado:
        formulario.valor_repasse_acordado.trim(),
      responsavel_despesas:
        formulario.responsavel_despesas,
      data_acordo: formulario.data_acordo,

      observacoes_veiculo:
        formulario.observacoes_veiculo.trim() ||
        null,
      observacoes_nota:
        formulario.observacoes_nota.trim() || null,
      observacoes_consignacao:
        formulario.observacoes_consignacao.trim() ||
        null,
    };

    try {
      const consignacao =
        await cadastrarConsignacao(dados);

      onConsignacaoCadastrada(consignacao);
      onFechar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar a consignação.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        className="modal-card consignment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consignacao-modal-titulo"
      >
        <header className="modal-header">
          <h2 id="consignacao-modal-titulo">
            Nova entrada em consignação
          </h2>

          <button
            type="button"
            className="modal-close"
            onClick={onFechar}
            disabled={salvando}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <form
          id="formulario-consignacao"
          className="modal-body"
          onSubmit={enviarFormulario}
        >
          {erro && (
            <div className="alert error">{erro}</div>
          )}

          {mensagemCliente && (
            <div className="alert success">
              {mensagemCliente}
            </div>
          )}

          <section className="consignment-section">
            <div className="consignment-section-heading">
              <div>
                <h3>Proprietário</h3>

                <p>
                  Selecione o proprietário do veículo
                  consignado.
                </p>
              </div>

              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  setMostrarCadastroCliente(
                    (mostrar) => !mostrar,
                  )
                }
              >
                {mostrarCadastroCliente
                  ? "Cancelar cadastro"
                  : "+ Novo proprietário"}
              </button>
            </div>

            <label className="form-field">
              <span>Proprietário *</span>

              <select
                value={formulario.id_proprietario}
                onChange={(event) =>
                  atualizarCampo(
                    "id_proprietario",
                    event.target.value,
                  )
                }
                required
              >
                <option value="">Selecione...</option>

                {clientes.map((cliente) => (
                  <option
                    key={cliente.id_cliente}
                    value={cliente.id_cliente}
                  >
                    {cliente.nome_razao_social}

                    {cliente.cpf
                      ? ` — CPF ${cliente.cpf}`
                      : ""}

                    {cliente.cnpj
                      ? ` — CNPJ ${cliente.cnpj}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            {mostrarCadastroCliente && (
              <div className="consignment-inline-card">
                <h4>Cadastrar proprietário</h4>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Tipo de pessoa *</span>

                    <select
                      value={
                        formularioCliente.tipo_pessoa
                      }
                      onChange={(event) =>
                        atualizarCampoCliente(
                          "tipo_pessoa",
                          event.target.value as
                            | "PF"
                            | "PJ",
                        )
                      }
                    >
                      <option value="PF">
                        Pessoa física
                      </option>

                      <option value="PJ">
                        Pessoa jurídica
                      </option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>
                      {formularioCliente.tipo_pessoa ===
                      "PF"
                        ? "Nome completo *"
                        : "Razão social *"}
                    </span>

                    <input
                      type="text"
                      value={
                        formularioCliente.nome_razao_social
                      }
                      onChange={(event) =>
                        atualizarCampoCliente(
                          "nome_razao_social",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>
                      {formularioCliente.tipo_pessoa ===
                      "PF"
                        ? "CPF *"
                        : "CNPJ *"}
                    </span>

                    <input
                      type="text"
                      value={
                        formularioCliente.cpf_cnpj
                      }
                      onChange={(event) =>
                        atualizarCampoCliente(
                          "cpf_cnpj",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>Telefone *</span>

                    <input
                      type="text"
                      value={
                        formularioCliente.telefone
                      }
                      onChange={(event) =>
                        atualizarCampoCliente(
                          "telefone",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="form-field full-width">
                    <span>E-mail</span>

                    <input
                      type="email"
                      value={formularioCliente.email}
                      onChange={(event) =>
                        atualizarCampoCliente(
                          "email",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={() =>
                    void salvarNovoCliente()
                  }
                  disabled={salvandoCliente}
                >
                  {salvandoCliente
                    ? "Salvando..."
                    : "Cadastrar proprietário"}
                </button>
              </div>
            )}
          </section>

          <section className="consignment-section">
            <h3>Dados do veículo</h3>

            <div className="form-grid">
              <label className="form-field">
                <span>Marca *</span>

                <input
                  type="text"
                  value={formulario.marca}
                  onChange={(event) =>
                    atualizarCampo(
                      "marca",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className="form-field">
                <span>Modelo *</span>

                <input
                  type="text"
                  value={formulario.modelo}
                  onChange={(event) =>
                    atualizarCampo(
                      "modelo",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className="form-field">
                <span>Versão</span>

                <input
                  type="text"
                  value={formulario.versao}
                  onChange={(event) =>
                    atualizarCampo(
                      "versao",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label className="form-field">
                <span>Combustível *</span>

                <select
                  value={formulario.combustivel}
                  onChange={(event) =>
                    atualizarCampo(
                      "combustivel",
                      event.target.value,
                    )
                  }
                  required
                >
                  <option value="Flex">Flex</option>
                  <option value="Gasolina">
                    Gasolina
                  </option>
                  <option value="Etanol">Etanol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Elétrico">
                    Elétrico
                  </option>
                  <option value="Híbrido">
                    Híbrido
                  </option>
                </select>
              </label>

              <label className="form-field">
                <span>Ano de fabricação *</span>

                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={formulario.ano_fabricacao}
                  onChange={(event) =>
                    atualizarCampo(
                      "ano_fabricacao",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className="form-field">
                <span>Ano do modelo *</span>

                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={formulario.ano_modelo}
                  onChange={(event) =>
                    atualizarCampo(
                      "ano_modelo",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className="form-field">
                <span>Placa *</span>

                <input
                  type="text"
                  maxLength={7}
                  value={formulario.placa}
                  onChange={(event) =>
                    atualizarCampo(
                      "placa",
                      event.target.value.toUpperCase(),
                    )
                  }
                  required
                />
              </label>

              <div className="form-field">
                <label htmlFor="chassi-consignacao">Chassi *</label>

                <input
                  id="chassi-consignacao"
                  type="text"
                  maxLength={17}
                  value={formulario.chassi}
                  onChange={(event) =>
                    atualizarCampo(
                      "chassi",
                      event.target.value.toUpperCase(),
                    )
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => void pesquisarChassi()}
                  disabled={pesquisandoChassi || salvando}
                >
                  {pesquisandoChassi ? "Pesquisando..." : "Pesquisar chassi"}
                </button>
                {avisoChassi && <small role="status">{avisoChassi}</small>}
              </div>

              <label className="form-field">
                <span>RENAVAM</span>

                <input
                  type="text"
                  maxLength={11}
                  value={formulario.renavam}
                  onChange={(event) =>
                    atualizarCampo(
                      "renavam",
                      somenteNumeros(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="form-field">
                <span>Cor *</span>

                <input
                  type="text"
                  value={formulario.cor}
                  onChange={(event) =>
                    atualizarCampo(
                      "cor",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className="form-field">
                <span>Quilometragem</span>

                <input
                  type="number"
                  min="0"
                  value={
                    formulario.quilometragem_entrada
                  }
                  onChange={(event) =>
                    atualizarCampo(
                      "quilometragem_entrada",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label className="form-field">
                <span>Data de entrada *</span>

                <input
                  type="date"
                  value={formulario.data_entrada}
                  onChange={(event) =>
                    atualizarCampo(
                      "data_entrada",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className="form-field full-width">
                <span>Observações do veículo</span>

                <textarea
                  value={
                    formulario.observacoes_veiculo
                  }
                  onChange={(event) =>
                    atualizarCampo(
                      "observacoes_veiculo",
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          </section>

          <section className="consignment-section">
            <h3>Nota Fiscal de Entrada</h3>

            <div className="form-grid">
              <label className="form-field">
                <span>Número da nota *</span>

                <input
                  type="text"
                  value={formulario.numero_nota}
                  onChange={(event) =>
                    atualizarCampo(
                      "numero_nota",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className="form-field">
                <span>Série *</span>

                <input
                  type="text"
                  value={formulario.serie}
                  onChange={(event) =>
                    atualizarCampo(
                      "serie",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className="form-field">
                <span>Data de emissão *</span>

                <input
                  type="date"
                  value={formulario.data_emissao}
                  onChange={(event) =>
                    atualizarCampo(
                      "data_emissao",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className="form-field">
                <span>Valor de referência *</span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={formulario.valor_total}
                  onChange={(event) =>
                    atualizarCampo(
                      "valor_total",
                      event.target.value,
                    )
                  }
                  placeholder="0,00"
                  required
                />
              </label>

              <label className="form-field full-width">
                <span>Chave de acesso</span>

                <input
                  type="text"
                  maxLength={44}
                  value={formulario.chave_acesso}
                  onChange={(event) =>
                    atualizarCampo(
                      "chave_acesso",
                      somenteNumeros(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="form-field full-width">
                <span>Descrição do item</span>

                <textarea
                  value={formulario.descricao_item}
                  onChange={(event) =>
                    atualizarCampo(
                      "descricao_item",
                      event.target.value,
                    )
                  }
                  placeholder="Se ficar em branco, será preenchida automaticamente."
                />
              </label>

              <label className="form-field full-width">
                <span>
                  Natureza da operação (conforme a Nota
                  Fiscal) *
                </span>

                <input
                  type="text"
                  value={
                    formulario.natureza_operacao
                  }
                  onChange={(event) =>
                    atualizarCampo(
                      "natureza_operacao",
                      event.target.value,
                    )
                  }
                  placeholder="Copie a informação apresentada na Nota Fiscal"
                  required
                />
              </label>

              <label className="form-field full-width">
                <span>Observações da nota</span>

                <textarea
                  value={formulario.observacoes_nota}
                  onChange={(event) =>
                    atualizarCampo(
                      "observacoes_nota",
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          </section>

          <section className="consignment-section">
            <h3>Condições da consignação</h3>

            <div className="form-grid">
              <label className="form-field">
                <span>
                  Valor de repasse acordado *
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    formulario.valor_repasse_acordado
                  }
                  onChange={(event) =>
                    atualizarCampo(
                      "valor_repasse_acordado",
                      event.target.value,
                    )
                  }
                  placeholder="0,00"
                  required
                />
              </label>

              <label className="form-field">
                <span>
                  Responsável pelas despesas *
                </span>

                <select
                  value={
                    formulario.responsavel_despesas
                  }
                  onChange={(event) =>
                    atualizarCampo(
                      "responsavel_despesas",
                      event.target.value,
                    )
                  }
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="Revenda">
                    Revenda
                  </option>
                  <option value="Proprietário">
                    Proprietário
                  </option>
                  <option value="Desconto no repasse">
                    Desconto no repasse
                  </option>
                </select>
              </label>

              <label className="form-field">
                <span>Data do acordo *</span>

                <input
                  type="date"
                  value={formulario.data_acordo}
                  onChange={(event) =>
                    atualizarCampo(
                      "data_acordo",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>
            </div>
          </section>

          <section className="consignment-section">
            <h3>Observações da consignação</h3>

            <label className="form-field">
              <textarea
                value={
                  formulario.observacoes_consignacao
                }
                onChange={(event) =>
                  atualizarCampo(
                    "observacoes_consignacao",
                    event.target.value,
                  )
                }
                placeholder="Condições ou informações importantes da consignação."
              />
            </label>
          </section>
        </form>

        <footer className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="formulario-consignacao"
            className="button button-primary"
            disabled={salvando}
          >
            {salvando
              ? "Salvando..."
              : "Registrar consignação"}
          </button>
        </footer>
      </section>
    </div>
  );
}
