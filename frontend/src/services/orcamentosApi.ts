import type { DadosTroca, EstadoTroca } from './trocasApi';
import { apiFetch } from './authApi';
export interface DespesaPosVenda {descricao:string;valor:string}
export interface DespesaRealizadaOrcamento {id_despesa:number;descricao:string;valor:string;responsavel_despesa:string}
export interface ComposicaoOrcamento {comissao_percentual?:string;comissao_estimada?:string;imposto_percentual?:string;impostos_estimados?:string;imposto_status?:string;modelo:number;custo_total?:string;custo_origem?:string;custo_realizadas?:DespesaRealizadaOrcamento[];base_origem:string;realizadas:DespesaRealizadaOrcamento[];pos_venda:DespesaPosVenda[];base:string}
export interface PrevisaoOrcamento { id_despesa_prevista:number; descricao:string; valor_previsto:string; situacao:string; responsavel_despesa:string; data_inclusao_planejamento:string }
export interface ParametroOrcamento { id_parametro:number; percentual_padrao:string; percentual_minimo:string }
export interface BaseOrcamento { comissao_percentual:string; imposto_percentual:string; custo_total:string; assinatura_base:string; id_ciclo:number; nosso_numero:string; marca:string; modelo:string; placa:string; valor_base:string; consignado:boolean; custo_projetado_informativo:string; parametro:ParametroOrcamento; realizadas:DespesaRealizadaOrcamento[] }
export interface OpcoesOrcamento { clientes:{id_cliente:number;nome_razao_social:string}[]; vendedores:{id_vendedor:number;nome:string;percentual_comissao:string}[]; veiculos:{id_ciclo:number;nosso_numero:string;marca:string;modelo:string;placa:string}[] }
export interface Negociacao {composicao_comercial?:string|null; id_negociacao:number; tipo_registro:string; valor_proposto:string;resultado_previsto:string;margem_prevista:string;data_negociacao:string;usuario_responsavel:string;observacoes:string|null }
export interface AutorizacaoOrcamento {id_aprovacao:number;id_negociacao:number;decisao:string;data_solicitacao:string;data_decisao:string|null;solicitante:string;aprovador:string|null;observacoes:string|null;valor_negociado_analisado:string;margem_prevista_analisada:string}
export interface ReservaOrcamento {id_reserva:number;valor_sinal:string;data_reserva:string;data_sinal:string|null;data_liberacao:string|null;responsavel:string;responsavel_sinal:string|null;responsavel_liberacao:string|null;destino_sinal:string|null;observacoes_destino:string|null;motivo_liberacao:string|null}
export interface EventoReserva {id_evento:number;id_reserva:number;tipo:string;data_evento:string;responsavel:string;valor_sinal:string;destino_sinal:string|null;observacoes:string|null}
export interface Orcamento extends EstadoTroca {revisao_custos_necessaria:boolean;financeiro_atual:{custo_realizadas?:DespesaRealizadaOrcamento[];custo_origem?:string;custo_total:string;resultado_previsto:string;margem_prevista:string};composicao:ComposicaoOrcamento|null;realizadas_disponiveis:DespesaRealizadaOrcamento[];sinal_ativo?:string;reserva_ativa:ReservaOrcamento|null;reservas:ReservaOrcamento[];eventos_reserva:EventoReserva[];versao_reserva:number;saldo_proposta:string;autorizacoes:AutorizacaoOrcamento[];id_orcamento:number;numero_orcamento:string;id_ciclo:number;nosso_numero:string;marca:string;modelo:string;placa:string;cliente:string;vendedor:string;preco_sugerido:string;valor_negociado_atual:string;resultado_previsto:string;margem_prevista:string;percentual_padrao_utilizado:string;percentual_minimo_aplicado:string;situacao:string;data_orcamento:string;data_validade:string;observacoes:string|null;valor_aquisicao_base:string|null;valor_repasse_base:string|null;despesas_previstas_base:string;base_comercial_planejada:string;custo_projetado_informativo:string;motivo_cancelamento:string|null;previsoes:PrevisaoOrcamento[];historico:Negociacao[] }
export interface NovoOrcamento {troca?:DadosTroca;assinatura_base:string;id_ciclo:string;id_cliente:string;id_vendedor:string;id_parametro:number;data_validade:string;despesas_realizadas:number[];despesas_pos_venda:DespesaPosVenda[];base_confirmada:string;preco_confirmado:string;valor_negociado:string;observacoes:string}
export interface AlteracaoOrcamento {custo_confirmado?:string;base_confirmada?:string;despesas_realizadas?:number[];despesas_pos_venda?:DespesaPosVenda[];situacao_anterior:string;acao:'ajustar'|'cancelar'|'solicitar'|'autorizar'|'reservar'|'sinal'|'liberar_reserva';versao_reserva:number;valor_sinal?:string;destino_sinal?:string;observacoes_destino?:string;valor_negociado:string;justificativa:string;id_negociacao_anterior:number}
const URL = import.meta.env.VITE_API_ORCAMENTOS_URL ?? 'http://localhost/autocar/api/routes/orcamentos.php';
async function requisitar<T>(query='',dados?:NovoOrcamento|AlteracaoOrcamento,method='GET'):Promise<T>{
 const r=await apiFetch(URL+query,{method,headers:{Accept:'application/json','Content-Type':'application/json'},body:dados?JSON.stringify(dados):undefined});
 let j:{sucesso:boolean;mensagem?:string;dados:T};try{j=await r.json();}catch{throw new Error('A API de orçamentos retornou uma resposta inválida.');}
 if(!r.ok||!j.sucesso)throw new Error(j.mensagem??'Não foi possível acessar os orçamentos.');return j.dados;
}
export interface FiltrosOrcamento {busca:string;situacao:string;inicio:string;fim:string;margemMin:string;margemMax:string;aprovacao:string;pagina:number}
export interface PaginaOrcamentos {itens:Orcamento[];total:number;pagina:number;paginas:number;aguardando:number;autorizados:number}
export const consultarOrcamentos=(f:FiltrosOrcamento)=>requisitar<PaginaOrcamentos>('?'+new URLSearchParams({...f,pagina:String(f.pagina),paginado:'1'}).toString());
export const listarOrcamentos=()=>requisitar<Orcamento[]>();
export const opcoesOrcamento=()=>requisitar<OpcoesOrcamento>('?opcoes=1');
export const baseOrcamento=(ciclo:number)=>requisitar<BaseOrcamento>('?ciclo='+ciclo);
export const detalhesOrcamento=(id:number)=>requisitar<Orcamento>('?id='+id);
export const criarOrcamento=(dados:NovoOrcamento)=>requisitar<Orcamento>('',dados,'POST');
export const alterarOrcamento=(id:number,dados:AlteracaoOrcamento)=>requisitar<Orcamento>('?id='+id,dados,'PUT');
export function sugerirPreco(base:number,padrao:number,imposto:number){
 const alvo=base+Math.round(base*Math.round(padrao*100)/10000);
 return Math.ceil(alvo*10000/(10000-Math.round(imposto*100)));
}
export function calcularProposta(base:number,valor:number,imposto=0,comissaoPercentual=0){
 const impostos=Math.round(Math.round(valor*100)*Math.round(imposto*100)/10000)/100;
 const comissao=Math.round(Math.round(valor*100)*Math.round(comissaoPercentual*100)/10000)/100;
 const resultado=(Math.round(valor*100)-Math.round(base*100)-Math.round(impostos*100)-Math.round(comissao*100))/100;
 return {impostos,comissao,resultado,margem:valor>0?resultado/valor*100:0};
}
