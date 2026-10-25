export type CategoriaDespesa =
  | "Mecânica"
  | "Funilaria"
  | "Pintura"
  | "Elétrica"
  | "Higienização"
  | "Documentação"
  | "Transporte"
  | "Pneus"
  | "Outros";

export type SituacaoDespesaPrevista =
  | "Pendente"
  | "Realizada"
  | "Cancelada";

export interface DespesaRealizada {
  responsavel_despesa: string | null;
  id_despesa: number;
  id_ciclo: number;
  id_fornecedor: number;
  id_usuario_responsavel: number;
  categoria: CategoriaDespesa;
  descricao: string;
  data_despesa: string;
  valor: string;
  observacoes: string | null;
  data_cadastro: string;
  data_atualizacao: string;
  fornecedor: string;
  usuario_responsavel: string;
}

export interface DespesaPrevista {
  integra_base_comercial: number;
  data_inclusao_planejamento: string | null;
  responsavel_despesa: string | null;
  id_despesa_prevista: number;
  id_aquisicao: number;
  id_avaliacao: number | null;
  id_despesa_realizada: number | null;
  id_usuario_responsavel: number;
  categoria: CategoriaDespesa;
  descricao: string;
  valor_previsto: string;
  situacao: SituacaoDespesaPrevista;
  observacoes: string | null;
  data_cadastro: string;
  data_atualizacao: string;
  usuario_responsavel: string;
}

export interface CustosVeiculo {
  id_ciclo: number;
  id_veiculo: number;
  nosso_numero: string;
  origem_entrada: string;
  situacao_atual: string;
  marca: string;
  modelo: string;
  versao: string | null;
  placa: string;
  id_aquisicao: number | null;
  valor_aquisicao: string;
  valor_repasse_acordado: string | null;
  responsavel_despesas: string | null;
  total_despesas_realizadas: string;
  total_despesas_previstas: string;
  custo_acumulado: string;
  custo_projetado: string;
  despesas_realizadas: DespesaRealizada[];
  despesas_previstas: DespesaPrevista[];
}

export interface DespesaPrevistaFormData {
  integra_base_comercial: boolean;
  responsavel_despesa: string;
  categoria: CategoriaDespesa | "";
  descricao: string;
  valor: string;
  observacoes: string;
}

export interface DespesaRealizadaFormData {
  responsavel_despesa: string;
  id_fornecedor: string;
  id_despesa_prevista: string;
  categoria: CategoriaDespesa | "";
  descricao: string;
  data_despesa: string;
  valor: string;
  observacoes: string;
}

export interface DespesaVeiculoApiResponse<T> {
  sucesso: boolean;
  mensagem?: string;
  id_despesa?: number;
  id_despesa_prevista?: number;
  dados?: T;
}
