export interface Veiculo {
  id_veiculo: number;
  marca: string;
  modelo: string;
  versao: string | null;
  ano_fabricacao: string;
  ano_modelo: string;
  combustivel: string;
  placa: string;
  chassi: string;
  observacoes: string | null;
  data_cadastro: string;
  data_atualizacao: string;

  id_ciclo: number;
  nosso_numero: string;
  origem_entrada: string;
  renavam: string | null;
  cor: string;
  quilometragem: number | null;
  horimetro: number | null;
  status: string;
  data_entrada: string;
  data_encerramento: string | null;

  id_aquisicao: number | null;
  valor_compra: string | null;
  valor_repasse_acordado: string | null;
  responsavel_despesas: string | null;
  data_compra: string | null;
  origem_aquisicao: string | null;
  situacao_aquisicao: string | null;

  id_nota_fiscal_entrada: number | null;
  id_fornecedor_origem: number | null;
  nome_fornecedor_avulso: string | null;
  nome_fornecedor_nf: string | null;
  numero_nota: string | null;
  serie: string | null;
  chave_acesso: string | null;
  data_emissao_nf: string | null;
  descricao_item_nf: string | null;
  natureza_operacao: string | null;
  observacoes_nf: string | null;
}

export interface VeiculoFormData {
  marca: string;
  modelo: string;
  versao: string;
  ano_fabricacao: string;
  ano_modelo: string;
  combustivel: string;
  placa: string;
  chassi: string;
  observacoes: string;

  renavam: string;
  cor: string;
  quilometragem: string;
  horimetro: string;

  valor_compra: string;
  data_compra: string;
  origem: string;

  id_fornecedor_origem: string;
  nome_fornecedor_avulso: string;
  numero_nota: string;
  serie: string;
  chave_acesso: string;
  data_emissao_nf: string;
  descricao_item_nf: string;
  natureza_operacao: string;
  observacoes_nf: string;
}

export interface VeiculoApiResponse<T> {
  sucesso: boolean;
  mensagem?: string;
  dados: T;
}
