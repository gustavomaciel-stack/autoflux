export interface VeiculoVenda {
  id_veiculo: number;
  id_ciclo: number;
  nosso_numero: string;
  origem_entrada: string;

  marca: string;
  modelo: string;
  versao: string | null;

  ano_fabricacao: string;
  ano_modelo: string;

  combustivel: string;
  cor: string | null;

  placa: string;
  chassi: string;
  renavam: string | null;

  quilometragem: number | null;
  horimetro: number | null;

  situacao_atual: string;
  data_entrada: string;
  data_encerramento: string | null;

  id_aquisicao: number | null;
  valor_aquisicao: string | null;
  custo_acumulado: string | null;
  data_aquisicao: string | null;
  origem_aquisicao: string | null;
  situacao_aquisicao: string | null;

  observacoes: string | null;
  data_cadastro: string;
  data_atualizacao: string;
}

export interface VeiculoVendaApiResponse {
  sucesso: boolean;
  dados?: VeiculoVenda[];
  mensagem?: string;
}
