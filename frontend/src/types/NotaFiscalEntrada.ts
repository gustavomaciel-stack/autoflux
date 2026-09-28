export interface NotaFiscalEntrada {
  id_nota_fiscal_entrada: number;
  id_aquisicao: number | null;
  id_fornecedor_origem: number | null;
  nome_fornecedor_avulso: string | null;
  id_cliente_origem: number | null;
  id_ciclo: number;
  id_veiculo: number;
  descricao_item: string;
  id_usuario_responsavel: number;
  numero_nota: string;
  serie: string;
  chave_acesso: string | null;
  data_emissao: string;
  valor_total: string;
  natureza_operacao: string | null;
  observacoes: string | null;
  data_entrada: string;
  data_cadastro: string;
  data_atualizacao: string;

  marca: string;
  modelo: string;
  versao: string | null;
  placa: string;
  chassi: string;
  ano_fabricacao: string;
  ano_modelo: string;

  nosso_numero: string;
  situacao_atual: string;

  valor_aquisicao: string | null;
  data_aquisicao: string | null;
  origem_aquisicao: string | null;

  usuario_responsavel: string;
  tipo_origem:
    | "Fornecedor cadastrado"
    | "Cliente cadastrado"
    | "Pessoa particular";
  nome_origem: string;
  documento_origem: string | null;
}

export interface NotaFiscalEntradaApiResponse<T> {
  sucesso: boolean;
  mensagem?: string;
  dados?: T;
}