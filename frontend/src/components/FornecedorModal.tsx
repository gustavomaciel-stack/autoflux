import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  atualizarFornecedor,
  cadastrarFornecedor,
} from "../services/fornecedoresApi";

import type {
  Fornecedor,
  FornecedorFormData,
  TipoPessoa,
} from "../types/Fornecedor";

const formularioInicial: FornecedorFormData = {
  tipo_pessoa: "PJ",
  razao_social_nome: "",
  nome_fantasia: "",
  cpf: "",
  cnpj: "",
  telefone: "",
  email: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "RS",
  tipo_servico: "",
  observacoes: "",
};

interface FornecedorModalProps {
  aberto: boolean;
  fornecedor: Fornecedor | null;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}

function dadosDoFornecedor(
  fornecedor: Fornecedor,
): FornecedorFormData {
  return {
    tipo_pessoa: fornecedor.tipo_pessoa,
    razao_social_nome: fornecedor.razao_social_nome,
    nome_fantasia: fornecedor.nome_fantasia ?? "",
    cpf: fornecedor.cpf ?? "",
    cnpj: fornecedor.cnpj ?? "",
    telefone: fornecedor.telefone,
    email: fornecedor.email ?? "",
    cep: fornecedor.cep ?? "",
    logradouro: fornecedor.logradouro ?? "",
    numero: fornecedor.numero ?? "",
    complemento: fornecedor.complemento ?? "",
    bairro: fornecedor.bairro ?? "",
    cidade: fornecedor.cidade ?? "",
    estado: fornecedor.estado ?? "RS",
    tipo_servico: fornecedor.tipo_servico,
    observacoes: fornecedor.observacoes ?? "",
  };
}

export function FornecedorModal({
  aberto,
  fornecedor,
  aoFechar,
  aoSalvar,
}: FornecedorModalProps) {
  const [formulario, setFormulario] =
    useState<FornecedorFormData>(formularioInicial);

  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setFormulario(
        fornecedor
          ? dadosDoFornecedor(fornecedor)
          : formularioInicial,
      );

      setErro("");
    }
  }, [aberto, fornecedor]);

  if (!aberto) {
    return null;
  }

  function atualizarCampo(
    campo: keyof FornecedorFormData,
    valor: string,
  ) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function alterarTipoPessoa(tipo: TipoPessoa) {
    setFormulario((atual) => ({
      ...atual,
      tipo_pessoa: tipo,
      cpf: tipo === "PF" ? atual.cpf : "",
      cnpj: tipo === "PJ" ? atual.cnpj : "",
      nome_fantasia:
        tipo === "PJ" ? atual.nome_fantasia : "",
    }));
  }

  async function enviar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    setErro("");
    setSalvando(true);

    try {
      if (fornecedor) {
        await atualizarFornecedor(
          fornecedor.id_fornecedor,
          formulario,
        );
      } else {
        await cadastrarFornecedor(formulario);
      }

      await aoSalvar();
      aoFechar();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Erro ao salvar fornecedor.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-header">
          <h2 id="modal-title">
            {fornecedor
              ? "Editar Fornecedor"
              : "Novo Fornecedor"}
          </h2>

          <button
            className="icon-button"
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <form onSubmit={enviar}>
          <div className="modal-body">
            {erro && (
              <div className="alert error">
                {erro}
              </div>
            )}

            <label className="field field-full">
              <span>Tipo de Pessoa</span>

              <select
                value={formulario.tipo_pessoa}
                onChange={(evento) =>
                  alterarTipoPessoa(
                    evento.target.value as TipoPessoa,
                  )
                }
              >
                <option value="PJ">
                  Pessoa Jurídica
                </option>

                <option value="PF">
                  Pessoa Física
                </option>
              </select>
            </label>

            <label className="field field-full">
              <span>
                {formulario.tipo_pessoa === "PJ"
                  ? "Razão Social"
                  : "Nome Completo"}{" "}
                *
              </span>

              <input
                required
                value={formulario.razao_social_nome}
                onChange={(evento) =>
                  atualizarCampo(
                    "razao_social_nome",
                    evento.target.value,
                  )
                }
              />
            </label>

            <div className="form-grid">
              <label className="field">
                <span>Nome Fantasia</span>

                <input
                  value={formulario.nome_fantasia}
                  disabled={
                    formulario.tipo_pessoa === "PF"
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      "nome_fantasia",
                      evento.target.value,
                    )
                  }
                />
              </label>

              {formulario.tipo_pessoa === "PJ" ? (
                <label className="field">
                  <span>CNPJ *</span>

                  <input
                    required
                    inputMode="text"
                    autoCapitalize="characters"
                    maxLength={18}
                    placeholder="12.ABC.345/01DE-35"
                    value={formulario.cnpj}
                    onChange={(evento) =>
                      atualizarCampo(
                        "cnpj",
                        evento.target.value.toUpperCase(),
                      )
                    }
                  />
                </label>
              ) : (
                <label className="field">
                  <span>CPF *</span>

                  <input
                    required
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={formulario.cpf}
                    onChange={(evento) =>
                      atualizarCampo(
                        "cpf",
                        evento.target.value,
                      )
                    }
                  />
                </label>
              )}

              <label className="field">
                <span>Telefone *</span>

                <input
                  required
                  placeholder="(51) 99999-9999"
                  value={formulario.telefone}
                  onChange={(evento) =>
                    atualizarCampo(
                      "telefone",
                      evento.target.value,
                    )
                  }
                />
              </label>

              <label className="field">
                <span>E-mail</span>

                <input
                  type="email"
                  value={formulario.email}
                  onChange={(evento) =>
                    atualizarCampo(
                      "email",
                      evento.target.value,
                    )
                  }
                />
              </label>
            </div>

            <label className="field field-full">
              <span>Tipo de Serviço *</span>

              <select
                required
                value={formulario.tipo_servico}
                onChange={(evento) =>
                  atualizarCampo(
                    "tipo_servico",
                    evento.target.value,
                  )
                }
              >
                <option value="">
                  Selecione...
                </option>

                <option value="Revenda de veículos">
                  Revenda de veículos
                </option>

                <option value="Mecânica">
                  Mecânica
                </option>

                <option value="Elétrica">
                  Elétrica
                </option>

                <option value="Funilaria e pintura">
                  Funilaria e pintura
                </option>

                <option value="Estética automotiva">
                  Estética automotiva
                </option>

                <option value="Documentação">
                  Documentação
                </option>

                <option value="Transporte">
                  Transporte
                </option>

                <option value="Outro">
                  Outro
                </option>
              </select>
            </label>

            <div className="form-grid">
              <label className="field">
                <span>Cidade</span>

                <input
                  value={formulario.cidade}
                  onChange={(evento) =>
                    atualizarCampo(
                      "cidade",
                      evento.target.value,
                    )
                  }
                />
              </label>

              <label className="field">
                <span>Estado</span>

                <input
                  maxLength={2}
                  value={formulario.estado}
                  onChange={(evento) =>
                    atualizarCampo(
                      "estado",
                      evento.target.value.toUpperCase(),
                    )
                  }
                />
              </label>
            </div>

            <details className="more-fields">
              <summary>
                Adicionar endereço completo
              </summary>

              <div className="form-grid details-grid">
                <label className="field">
                  <span>CEP</span>

                  <input
                    value={formulario.cep}
                    onChange={(evento) =>
                      atualizarCampo(
                        "cep",
                        evento.target.value,
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Logradouro</span>

                  <input
                    value={formulario.logradouro}
                    onChange={(evento) =>
                      atualizarCampo(
                        "logradouro",
                        evento.target.value,
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Número</span>

                  <input
                    value={formulario.numero}
                    onChange={(evento) =>
                      atualizarCampo(
                        "numero",
                        evento.target.value,
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Bairro</span>

                  <input
                    value={formulario.bairro}
                    onChange={(evento) =>
                      atualizarCampo(
                        "bairro",
                        evento.target.value,
                      )
                    }
                  />
                </label>

                <label className="field field-full">
                  <span>Complemento</span>

                  <input
                    value={formulario.complemento}
                    onChange={(evento) =>
                      atualizarCampo(
                        "complemento",
                        evento.target.value,
                      )
                    }
                  />
                </label>
              </div>
            </details>

            <label className="field field-full">
              <span>Observações</span>

              <textarea
                rows={3}
                value={formulario.observacoes}
                onChange={(evento) =>
                  atualizarCampo(
                    "observacoes",
                    evento.target.value,
                  )
                }
              />
            </label>
          </div>

          <footer className="modal-actions">
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
                : fornecedor
                  ? "Salvar Alterações"
                  : "Salvar"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}