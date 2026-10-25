export type TipoPessoaCliente = "PF" | "PJ";

export interface Cliente {
  id_cliente: number;
  ativo: number | string;
  tipo_pessoa: TipoPessoaCliente;
  nome_razao_social: string;
  nome_fantasia: string | null;
  cpf: string | null;
  cnpj: string | null;
  telefone: string;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface ClienteApiResponse<T> {
  sucesso: boolean;
  dados?: T;
  mensagem?: string;
}