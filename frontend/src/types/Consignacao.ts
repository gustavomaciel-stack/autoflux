export interface Consignacao {
  id_consignacao: number;
  id_ciclo: number;
  id_proprietario: number;
  id_nota_fiscal_entrada: number;
  id_usuario_responsavel: number;

  situacao: string;
  data_saida: string | null;
  motivo_saida: string | null;
  observacoes: string | null;
  valor_repasse_acordado: string | null;
  responsavel_despesas: string | null;
  data_acordo: string | null;

  data_cadastro: string;
  data_atualizacao: string;

  nosso_numero: string;
  origem_entrada: string;
  renavam: string | null;
  cor: string;
  quilometragem_entrada: number | null;
  horimetro_entrada: number | null;
  situacao_atual: string;
  data_entrada: string;
  data_encerramento: string | null;

  id_veiculo: number;
  marca: string;
  modelo: string;
  versao: string | null;
  ano_fabricacao: string;
  ano_modelo: string;
  combustivel: string;
  placa: string;
  chassi: string;
  observacoes_veiculo?: string | null;

  tipo_proprietario: "PF" | "PJ";
  nome_proprietario: string;
  nome_fantasia_proprietario?: string | null;
  cpf_proprietario: string | null;
  cnpj_proprietario: string | null;
  telefone_proprietario: string;
  email_proprietario?: string | null;

  numero_nota: string;
  serie: string;
  chave_acesso?: string | null;
  descricao_item?: string;
  data_emissao: string;
  data_entrada_nota?: string;
  valor_total: string;
  natureza_operacao?: string | null;
  observacoes_nota?: string | null;

  usuario_responsavel: string;
}

export interface CadastroConsignacao {
  id_proprietario: number;
  id_usuario_responsavel: number;

  marca: string;
  modelo: string;
  versao: string | null;
  ano_fabricacao: string;
  ano_modelo: string;
  combustivel: string;
  placa: string;
  chassi: string;
  renavam: string | null;
  cor: string;
  quilometragem_entrada: number | null;
  horimetro_entrada: number | null;
  data_entrada: string;

  numero_nota: string;
  serie: string;
  chave_acesso: string | null;
  data_emissao: string;
  valor_total: string;
  descricao_item: string;
  natureza_operacao: string;

  valor_repasse_acordado: string;
  responsavel_despesas: string;
  data_acordo: string;

  observacoes_veiculo: string | null;
  observacoes_nota: string | null;
  observacoes_consignacao: string | null;
}

export interface DevolucaoConsignacao {
  acao: "devolver";
  id_usuario_responsavel: number;
  data_saida: string;
  motivo_saida: string;
}

export interface ConsignacaoApiResponse<T> {
  sucesso: boolean;
  dados?: T;
  mensagem?: string;
}