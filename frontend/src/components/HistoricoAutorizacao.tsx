import type {AutorizacaoComercial} from '../services/autorizacoesComerciaisApi';
import {HistoricoEventos,type EventoHistorico} from './HistoricoEventos';
const moeda=(v:string)=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const percentual=(v:string)=>Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
export function HistoricoAutorizacao({analise}:{analise:AutorizacaoComercial}){
 const eventos:EventoHistorico[]=[];
 const propostas=[...(analise.orcamento?.historico??[])].sort((a,b)=>Number(a.id_negociacao)-Number(b.id_negociacao));
 propostas.forEach((h,i)=>{const anterior=propostas[i-1];eventos.push({id:`proposta-${h.id_negociacao}`,tipo:'Propostas',titulo:h.tipo_registro,data:h.data_negociacao,responsavel:h.usuario_responsavel,resumo:`Condição registrada no orçamento ${analise.numero_orcamento}.`,campos:[{campo:'Valor da proposta',antes:anterior?moeda(anterior.valor_proposto):null,depois:moeda(h.valor_proposto)},{campo:'Resultado registrado',antes:anterior?moeda(anterior.resultado_previsto):null,depois:moeda(h.resultado_previsto)},{campo:'Margem registrada',antes:anterior?percentual(anterior.margem_prevista):null,depois:percentual(h.margem_prevista)},{campo:'Justificativa',depois:h.observacoes}]});});
 eventos.push(...eventosDeAutorizacao(analise.numero_orcamento,analise.orcamento?.autorizacoes??[analise]));
 return <HistoricoEventos key={analise.id_aprovacao} titulo="Histórico da autorização comercial" eventos={eventos}/>;
}

export function eventosDeAutorizacao(numero:string,autorizacoes:NonNullable<AutorizacaoComercial['orcamento']>['autorizacoes'] | AutorizacaoComercial[]):EventoHistorico[]{
 const eventos:EventoHistorico[]=[];
 for(const a of autorizacoes){
  eventos.push({id:`solicitacao-${a.id_aprovacao}`,tipo:'Solicitações',titulo:'Autorização comercial solicitada',data:a.data_solicitacao,responsavel:a.solicitante,resumo:`Proposta encaminhada para decisão comercial · ${moeda(a.valor_negociado_analisado)}.`,campos:[{campo:'Orçamento',depois:numero},{campo:'Valor analisado',depois:moeda(a.valor_negociado_analisado)},{campo:'Margem analisada',depois:percentual(a.margem_prevista_analisada)},{campo:'Situação na solicitação',depois:'Pendente'}]});
  if(a.data_decisao&&a.decisao!=='Pendente')eventos.push({id:`decisao-${a.id_aprovacao}`,tipo:'Decisões',titulo:a.decisao==='Aprovada'?'Proposta aprovada':a.decisao==='Rejeitada'?'Proposta rejeitada':'Decisão comercial registrada',data:a.data_decisao,responsavel:a.aprovador||'',resumo:a.decisao==='Aprovada'?'Condição comercial aprovada para esta versão da proposta.':'Decisão registrada com justificativa e histórico preservado.',campos:[{campo:'Orçamento',depois:numero},{campo:'Decisão',antes:'Pendente',depois:a.decisao},{campo:'Valor analisado',depois:moeda(a.valor_negociado_analisado)},{campo:'Margem analisada',depois:percentual(a.margem_prevista_analisada)},{campo:'Justificativa',depois:a.observacoes}]});
 }
 return eventos;
}
