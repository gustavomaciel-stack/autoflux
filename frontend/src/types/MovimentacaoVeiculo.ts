export type SituacaoVeiculo =
  | "Disponível"
  | "Em preparação"
  | "Em manutenção"
  | "Reservado"
  | "Bloqueado";

export interface CicloMovimentacao {
  id_ciclo: number;
  id_veiculo: number;
  nosso_numero: string;
  situacao_atual: SituacaoVeiculo;
  data_entrada: string;
  data_encerramento: string | null;
  marca: string;
  modelo: string;
  versao: string | null;
  placa: string;
}

export interface MovimentacaoVeiculo {
  id_movimentacao: number;
  id_ciclo: number;
  id_usuario_responsavel: number;
  situacao_anterior: string;
  situacao_nova: string;
  data_movimentacao: string;
  observacoes: string | null;
  usuario_responsavel: string;
}

export interface DadosMovimentacaoVeiculo {
  ciclo: CicloMovimentacao;
  historico: MovimentacaoVeiculo[];
}

export interface MovimentacaoVeiculoFormData {
  situacao_nova: SituacaoVeiculo | "";
  observacoes: string;
}

export interface MovimentacaoVeiculoApiResponse<T> {
  sucesso: boolean;
  mensagem?: string;
  id_movimentacao?: number;
  dados?: T;
}