export type TipoPessoa = "PF" | "PJ";

export interface Fornecedor {
  id_fornecedor: number;
  tipo_pessoa: TipoPessoa;
  razao_social_nome: string;
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
  tipo_servico: string;
  observacoes: string | null;
  ativo: number;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface FornecedorFormData {
  tipo_pessoa: TipoPessoa;
  razao_social_nome: string;
  nome_fantasia: string;
  cpf: string;
  cnpj: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  tipo_servico: string;
  observacoes: string;
}

export interface ApiResponse<T> {
  sucesso: boolean;
  dados?: T;
  mensagem?: string;
  id_fornecedor?: number;
}