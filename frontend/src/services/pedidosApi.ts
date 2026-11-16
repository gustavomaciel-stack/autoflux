import { apiFetch } from './authApi';
export interface TrocaPedido {id_veiculo_entrada:number;id_avaliacao:number;marca:string;modelo:string;versao:string|null;placa:string;ano:number;ano_modelo:number|null;quilometragem:number;chassi:string|null;renavam:string|null;valor_avaliado:string;responsavel_avaliacao:string;data_avaliacao:string}
export interface DadosPedido {id_orcamento:number;numero_orcamento:string;id_ciclo:number;nosso_numero:string;id_cliente:number;cliente:string;id_vendedor:number;vendedor:string;marca:string;modelo:string;placa:string;origem:string;valor_negociado:string;valor_sinal:string;id_reserva:number|null;valor_trocas:string;saldo_restante:string;trocas:TrocaPedido[];observacoes_orcamento:string|null;composicao:Record<string,unknown>|null}
export interface EventoPedido {id_evento:number;tipo:string;observacoes:string;data_evento:string;responsavel:string}
export type FormaPagamento='Dinheiro'|'Pix'|'Transferência'|'Cartão de débito'|'Cartão de crédito'|'Financiamento';
export interface PagamentoPedido {id_pagamento?:number;forma:FormaPagamento|'';valor:string;banco:string|null;parcelas:string|number|null;primeiro_vencimento:string|null;ultimo_vencimento?:string|null;data_registro?:string;responsavel?:string;ativo?:number}
export interface PreviaRepasse {id_consignacao:number;id_proprietario:number;proprietario:string;repasse_acordado:string;descontos:string;repasse_liquido:string;despesas_revenda:string;despesas_proprietario:string;itens_desconto:{id_despesa:number;descricao:string;valor:string}[];assinatura:string;erro?:string}
export interface RepassePedido {id_repasse:number;valor_devido:string;repasse_acordado:string;descontos:string;situacao:string;total_pago:string;saldo_devido:string;dados:PreviaRepasse;pagamentos:{id_pagamento:number;valor:string;data_pagamento:string;data_registro:string;responsavel:string;observacoes:string|null}[]}
export interface DespesaGarantia {id_despesa_garantia:number;id_atendimento:number|null;descricao:string;data_despesa:string;valor:string;valor_efetivo:string;id_fornecedor:number|null;fornecedor:string|null;responsavel_custo:string;id_despesa_ciclo:number|null;previsao_indice:number|null;ativo:number;considerada:boolean;responsavel:string;motivo_exclusao:string|null}
export interface EventoGarantia {id_evento:number;tipo:string;titulo:string;data_evento:string;responsavel:string;campos:{campo:string;antes:string|null;depois:string|null}[]}
export interface GarantiaPedido {config:{data_entrega:string;fim_garantia:string}|null;atendimentos:{id_atendimento:number;problema:string;data_reclamacao:string;situacao:string;parecer:string|null;responsavel:string;prazo:string}[];despesas:DespesaGarantia[];financeiro:{valor_venda:string;custo_origem:string;impostos_estimados:string;comissao:string;resultado_fechamento:string;resultado_atualizado:string;resultado_sem_previsoes:string;previsoes_pendentes:string;total_despesas_garantia:string;despesas_ciclo_atuais:string;despesas_novas_garantia:string;origem_registro:string;previsoes:{descricao:string;valor:string}[];previsoes_substituidas:number[]}|null;fornecedores:{id_fornecedor:number;razao_social_nome:string}[];despesas_ciclo:{id_despesa:number;descricao:string;valor:string}[];eventos:EventoGarantia[]}
export interface DestinoTrocaCancelamento {id_recebimento:number;id_ciclo:number|null;marca:string;modelo:string;placa:string;nosso_numero:string|null;valor_atribuido:string;situacao_atual:string|null;destino:string|null;pendente:boolean;bloqueio_devolucao:string|null;data_destino:string|null;justificativa:string|null;documento:string|null;responsavel:string|null}
export interface CancelamentoVenda {trocas?:DestinoTrocaCancelamento[];pendencias_trocas?:number;retorno_pendente?:boolean;processo_concluido?:boolean;id_cancelamento:number;motivo:string;data_efetiva:string;data_cancelamento:string;responsavel:string;acerto_financeiro:string;tratamento_vinculos:string;retorno_previsto:boolean;retorno_numero:string|null;data_retorno:string|null;responsavel_retorno:string|null}
export interface ContextoCancelamento {origem_entrada:string;valor_aquisicao:string|null;valor_repasse_acordado:string|null;quilometragem_entrada:number;trocas:number;trocas_com_entrada:number;repasse_pago:string;atendimentos:number}
export interface Pedido {cancelamento_venda?:CancelamentoVenda|null;contexto_cancelamento?:ContextoCancelamento|null;garantia?:GarantiaPedido|null;previa_repasse?:PreviaRepasse|null;repasse?:RepassePedido|null;fechamento?:{id_venda:number;data_venda:string;valor_final:string;comissao_percentual:string;comissao_valor:string;observacoes:string|null;responsavel:string}|null;trocas_recebidas?:{id_recebimento:number;id_veiculo_entrada:number;valor_atribuido:string;situacao:string}[];pagamentos?:PagamentoPedido[];historico_pagamentos?:PagamentoPedido[];pagamento_informado?:boolean;id_pedido:number;numero_pedido:string;id_orcamento:number;id_ciclo:number;situacao:'Em andamento'|'Concluído'|'Cancelado';data_criacao:string;responsavel_criacao:string;valor_negociado:string;valor_sinal:string;valor_trocas:string;saldo_restante:string;observacoes:string|null;versao:number;data_cancelamento:string|null;responsavel_cancelamento:string|null;motivo_cancelamento:string|null;destino_sinal:string|null;observacoes_destino:string|null;situacao_veiculo:string;dados:DadosPedido;eventos:EventoPedido[]}
export interface PreviaPedido {dados:DadosPedido;assinatura:string}
export interface ConsultaPedidos {itens:Pedido[];total:number;pagina:number;paginas:number;contadores:{total:number;andamento:number;concluidos:number;cancelados:number}}
export interface CancelamentoPedido {acao:'cancelar';versao:number;motivo:string;destino_sinal:string;observacoes_destino:string}
const URL=import.meta.env.VITE_API_PEDIDOS_URL??'http://localhost/autocar/api/routes/pedidos-venda.php';
async function requisitar<T>(params:Record<string,string>,metodo='GET',dados?:unknown):Promise<T>{
 const r=await apiFetch(URL+'?'+new URLSearchParams(params),{method:metodo,headers:{Accept:'application/json','Content-Type':'application/json'},body:dados===undefined?undefined:JSON.stringify(dados)});
 let j:{sucesso:boolean;mensagem?:string;dados:T};try{j=await r.json();}catch{throw new Error('Não foi possível ler a resposta dos pedidos. Confira o Apache e os arquivos da atualização.');}
 if(!r.ok||!j.sucesso)throw new Error(j.mensagem??'Não foi possível acessar os pedidos.');return j.dados;
}
export const consultarPedidos=(f:Record<string,string>)=>requisitar<ConsultaPedidos>(f);
export const consultarPedido=(id:number)=>requisitar<Pedido>({id:String(id)});
export const pedidoDoOrcamento=(id:number)=>requisitar<Pedido|null>({id_orcamento:String(id)});
export const previaPedido=(id:number)=>requisitar<PreviaPedido>({acao:'previa',id_orcamento:String(id)});
export const gerarPedido=(id:number,assinatura:string,observacoes:string,pagamentos:PagamentoPedido[])=>requisitar<Pedido>({},'POST',{id_orcamento:id,assinatura,observacoes,pagamentos});
export const cancelarPedido=(id:number,d:CancelamentoPedido)=>requisitar<Pedido>({id:String(id)},'PUT',d);
export function abrirPedidoDoOrcamento(id:number,gerar:boolean){sessionStorage.setItem('autoflux_pedido_origem',JSON.stringify({id,gerar}));window.location.hash='#pedidos';}

export const salvarPagamentoPedido=(id:number,versao:number,pagamentos:PagamentoPedido[],motivo:string)=>requisitar<Pedido>({id:String(id)},'PUT',{acao:'pagamento',versao,pagamentos,motivo});

export const concluirPedido=(id:number,versao:number,observacoes:string,assinatura_repasse?:string)=>requisitar<Pedido>({id:String(id)},'PUT',{acao:'concluir',versao,observacoes,conferido:true,assinatura_repasse});

export const registrarRepasse=(id:number,versao:number,valor:string,data_pagamento:string,observacoes:string)=>requisitar<Pedido>({id:String(id)},'PUT',{acao:'repasse',versao,valor,data_pagamento,observacoes});

export const salvarGarantia=(id:number,versao:number,dados:Record<string,unknown>)=>requisitar<Pedido>({id:String(id)},'PUT',{...dados,acao:'garantia',versao});

export const alterarCancelamentoVenda=(id:number,d:Record<string,unknown>)=>requisitar<Pedido>({id:String(id)},'PUT',d);

export interface RepassePendente {id_repasse:number;id_pedido:number;numero_pedido:string;marca:string;modelo:string;placa:string;saldo_devido:string}
export async function listarRepassesPendentes():Promise<RepassePendente[]> {
 const endpoint=new globalThis.URL('repasses-pendentes.php',new globalThis.URL(URL,window.location.href));
 const r=await apiFetch(endpoint.toString());
 const j=await r.json();
 if(!r.ok||!j.sucesso)throw new Error(j.mensagem??'Não foi possível consultar os repasses pendentes.');
 return j.dados;
}
