export interface VeiculoHistorico {
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
}

export interface CicloHistorico {
  id_ciclo: number;
  nosso_numero: string;
  origem_entrada: string;
  renavam: string | null;
  cor: string | null;
  quilometragem_entrada: number | null;
  horimetro_entrada: number | null;
  situacao_atual: string;
  data_entrada: string;
  data_encerramento: string | null;

  id_aquisicao: number | null;
  valor_aquisicao: string | null;
  data_aquisicao: string | null;
  origem_aquisicao: string | null;
  situacao_aquisicao: string | null;

  id_nota_fiscal_entrada: number | null;
  numero_nota: string | null;
  serie: string | null;
  data_emissao: string | null;
  valor_nota_fiscal: string | null;

  id_consignacao: number | null;
  situacao_consignacao: string | null;
  data_saida: string | null;
  motivo_saida: string | null;
  valor_repasse_acordado: string | null;
  responsavel_despesas: string | null;
  data_acordo: string | null;

  despesas_realizadas: string;
  despesas_previstas_pendentes: string;
  custo_acumulado: string;
  custo_projetado: string;
}

export interface HistoricoVeiculo {
  veiculo: VeiculoHistorico;
  ciclos: CicloHistorico[];
}

export interface HistoricoVeiculoApiResponse {
  sucesso: boolean;
  dados?: HistoricoVeiculo;
  mensagem?: string;
}