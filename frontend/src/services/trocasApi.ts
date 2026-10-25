import { apiFetch } from './authApi';
export interface DadosTroca {valor_avaliado?:string;marca:string;modelo:string;versao:string;ano:string;ano_modelo:string;placa:string;quilometragem:string;chassi:string;renavam:string;cor:string;combustivel:string;valor_solicitado:string;observacoes:string}
export interface DespesaAvaliacao {categoria:string;descricao:string;valor_previsto:string;observacoes:string|null}
export interface AvaliacaoTroca {id_avaliacao:number;valor_avaliado:string;data_avaliacao:string;data_registro:string;responsavel:string;vigente:number;observacoes:string|null;despesas:DespesaAvaliacao[];total_despesas:string}
export interface OfertaTroca extends Omit<DadosTroca,'observacoes'|'valor_solicitado'> {id_veiculo_entrada:number;id_orcamento:number;id_cliente:number;ativo:number;situacao:string;responsavel:string;data_cadastro:string;data_encerramento:string|null;responsavel_encerramento:string|null;motivo_encerramento:string|null;observacoes:string|null;valor_solicitado:string|null;avaliacao_vigente:AvaliacaoTroca|null;avaliacoes:AvaliacaoTroca[]}
export interface EstadoTroca {troca_ativa:OfertaTroca|null;trocas:OfertaTroca[];versao_troca:string;valor_troca:string}
export interface ContextoTroca {id_orcamento:number;numero_orcamento:string;cliente:string;nosso_numero:string;marca:string;modelo:string;placa:string;origem_entrada:string;situacao:string;valor_negociado_atual:string;sinal_ativo:string;data_validade:string}
export interface DetalhesTroca extends EstadoTroca {contexto:ContextoTroca;saldo_proposta:string}
export interface ResumoTroca {ativo:number;data_encerramento:string|null;motivo_encerramento:string|null;id_veiculo_entrada:number;id_orcamento:number;marca:string;modelo:string;placa:string;situacao:string;situacao_orcamento:string;numero_orcamento:string;cliente:string;nosso_numero:string;data_cadastro:string;valor_avaliado:string|null}
export type AlteracaoTroca=({acao:'ofertar'}&DadosTroca)|{acao:'retirar'|'rejeitar';justificativa:string}|{acao:'avaliar';id_veiculo_entrada:number;valor_avaliado:string;data_avaliacao:string;observacoes:string;despesas:DespesaAvaliacao[]};
const URL=import.meta.env.VITE_API_TROCAS_URL??'http://localhost/autocar/api/routes/trocas-orcamento.php';
async function requisitar<T>(query='',dados?:AlteracaoTroca&{versao_troca:string}):Promise<T>{
 const r=await apiFetch(URL+query,{method:dados?'PUT':'GET',headers:{Accept:'application/json','Content-Type':'application/json'},body:dados?JSON.stringify(dados):undefined});
 let j:{sucesso:boolean;mensagem?:string;dados:T};try{j=await r.json();}catch{throw new Error('A API de trocas retornou uma resposta inválida.');}
 if(!r.ok||!j.sucesso)throw new Error(j.mensagem??'Não foi possível acessar a troca.');return j.dados;
}
export interface ConsultaTrocas {itens:ResumoTroca[];total:number;pagina:number;paginas:number;pendentes:number;avaliados:number;encerradas:number;todas:number}
export const listarTrocas=(pagina=1,busca='',situacao='')=>requisitar<ConsultaTrocas>('?'+new URLSearchParams({pagina:String(pagina),busca,situacao}));
export const detalhesTroca=(id:number)=>requisitar<DetalhesTroca>('?id_orcamento='+id);
export const alterarTroca=(id:number,versao:string,dados:AlteracaoTroca)=>requisitar<DetalhesTroca>('?id_orcamento='+id,{...dados,versao_troca:versao});
export const ofertaVazia=():DadosTroca=>({marca:'',modelo:'',versao:'',ano:'',ano_modelo:'',placa:'',quilometragem:'',chassi:'',renavam:'',cor:'',combustivel:'',valor_solicitado:'',observacoes:''});
