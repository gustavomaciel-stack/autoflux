import type {Negociacao,Orcamento} from '../services/orcamentosApi';
import {eventosDeAutorizacao} from './HistoricoAutorizacao';
import {HistoricoEventos,type CampoHistorico,type EventoHistorico} from './HistoricoEventos';
import './HistoricoOrcamento.css';

const moeda=(v:string|number|null|undefined)=>v==null?'Não informado':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const percentual=(v:string|number)=>Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
const data=(v:string|null|undefined)=>v?v.slice(0,10).split('-').reverse().join('/'):'Não informada';

function camposComposicao(snapshot:string|null|undefined):CampoHistorico[]{
 if(!snapshot)return [];
 try{
  const dados=JSON.parse(snapshot);
  const composicao=typeof dados.composicao_comercial==='string'?JSON.parse(dados.composicao_comercial):dados.composicao_comercial;
  const campos:CampoHistorico[]=[
   {campo:'Base do preço',depois:moeda(dados.base_comercial_planejada)},
   {campo:'Preço sugerido',depois:moeda(dados.preco_sugerido)},
  ];
  if(composicao){
   campos.push(
    {campo:'Impostos estimados',depois:moeda(composicao.impostos_estimados??0)+' · '+percentual(composicao.imposto_percentual??0)},
    {campo:'Comissão estimada do vendedor',depois:moeda(composicao.comissao_estimada??0)+' · '+percentual(composicao.comissao_percentual??0)},
   );
   if(composicao.custo_total!=null)campos.push({campo:'Custo total registrado',depois:moeda(composicao.custo_total)});
   for(const despesa of composicao.realizadas??[])campos.push({campo:'Despesa realizada',depois:despesa.descricao+' · '+moeda(despesa.valor)});
   for(const despesa of composicao.pos_venda??[])campos.push({campo:'Despesa pós-venda',depois:despesa.descricao+' · '+moeda(despesa.valor)});
  }
  return campos;
 }catch{return [{campo:'Composição dos valores',depois:'Composição histórica indisponível.'}];}
}

export function HistoricoOrcamento({orcamento,propostas,podeAutorizar,onAutorizar}:{orcamento:Orcamento;propostas:Negociacao[];podeAutorizar:boolean;onAutorizar:()=>void}){
 const eventos:EventoHistorico[]=propostas.map(h=>({
  id:'proposta-'+h.id_negociacao,tipo:'Propostas',titulo:h.tipo_registro,data:h.data_negociacao,
  responsavel:h.usuario_responsavel,resumo:'Valor da proposta · '+moeda(h.valor_proposto),
  campos:[
   {campo:'Valor da proposta',depois:moeda(h.valor_proposto)},
   {campo:'Resultado registrado',depois:moeda(h.resultado_previsto)},
   {campo:'Margem registrada',depois:percentual(h.margem_prevista)},
   {campo:'Justificativa',depois:h.observacoes},
   ...camposComposicao(h.composicao_comercial),
  ],
 }));
 eventos.push(...eventosDeAutorizacao(orcamento.numero_orcamento,orcamento.autorizacoes));
 for(const renovacao of orcamento.versionamentos??[]){
  eventos.push({
   id:'validade-'+renovacao.id_negociacao,tipo:'Renovações da validade',titulo:'Validade renovada',
   data:renovacao.data_negociacao,responsavel:renovacao.usuario_responsavel,
   resumo:'Nova validade · '+data(renovacao.validade_nova),
   campos:[
    {campo:'Validade',antes:data(renovacao.validade_anterior),depois:data(renovacao.validade_nova)},
    {campo:'Observações',depois:renovacao.observacoes},
   ],
  });
 }
 const propostaRejeitada=orcamento.autorizacoes.some(a=>a.decisao==='Rejeitada'&&Number(a.id_negociacao)===Number(orcamento.historico[0]?.id_negociacao));
 return <section className="budget-history" aria-label="Histórico do orçamento">
  {propostaRejeitada&&<p className="alert error" role="status">A proposta atual foi rejeitada. Revise o valor negociado e salve uma nova proposta para continuar.</p>}
  {orcamento.situacao==='Aguardando aprovação'&&<p className="budget-history-notice" role="status">A proposta atual aguarda uma decisão comercial.</p>}
  <HistoricoEventos titulo="Histórico do orçamento" eventos={eventos}/>
  {podeAutorizar&&<footer><button type="button" className="button secondary" onClick={onAutorizar}>Abrir autorizações comerciais</button></footer>}
 </section>;
}
