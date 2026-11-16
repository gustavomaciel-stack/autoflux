import { NotaSaidaPedido } from './NotaSaidaPanel';
import {CancelamentoPedidoPanel,type SecaoCancelamento} from './CancelamentoPedidoPanel';
import { useAuth } from '../context/AuthContext';
import { HistoricoPedidoPanel } from './HistoricoPedidoPanel';
import { RepassePedidoPanel } from './RepassePedidoPanel';
import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import type { Pedido } from '../services/pedidosApi';
import { PedidoVeiculo, PedidoTrocas, PedidoComposicao, moedaPedido, dataPedido } from './PedidoResumo';
import { PagamentoPedidoPanel } from './PagamentoPedidoPanel';

type Aba='resumo'|'pagamento'|'trocas'|'historico'|'repasse'|'cancelamento';
export function PedidoDetalheAbas({pedido,abrirRepasse=0,gerenciar,ocupado,onOcupado,onErro,onSalvo,onRetorno}:{pedido:Pedido;abrirRepasse?:number;gerenciar:boolean;ocupado:boolean;onOcupado:(v:boolean)=>void;onErro:(s:string)=>void;onSalvo:(p:Pedido)=>void;onRetorno?:()=>void}){
 const [aba,setAba]=useState<Aba>('resumo');
 useEffect(()=>{if(abrirRepasse)setAba('repasse');},[abrirRepasse]);
 const [secaoCancelamento,setSecaoCancelamento]=useState<SecaoCancelamento>('visao');
 const cancelamentoAnterior=useRef(pedido.cancelamento_venda);
 useEffect(()=>{const anterior=cancelamentoAnterior.current;const atual=pedido.cancelamento_venda;if(atual&&(!anterior||atual.retorno_numero!==anterior.retorno_numero)){setAba('cancelamento');setSecaoCancelamento(atual.retorno_numero&&atual.pendencias_trocas?'trocas':'retorno');}cancelamentoAnterior.current=atual;},[pedido.cancelamento_venda]);
 const {pode}=useAuth();
 const trocasPendentes=pedido.trocas_recebidas?.filter(t=>t.situacao==='Pendente de aquisição').length??0;
 const d=pedido.dados;
 const pendente=Number(pedido.saldo_restante)>0&&!pedido.pagamentos?.length;
 const abas:{id:Aba;nome:string;contador?:number;pendente?:boolean}[]=[{id:'resumo',nome:'Resumo'},{id:'pagamento',nome:'Pagamento',pendente},{id:'trocas',nome:'Veículos de troca',contador:d.trocas.length},{id:'historico',nome:'Histórico',contador:pedido.eventos?.length??0}];
 if(pedido.cancelamento_venda)abas.splice(1,0,{id:'cancelamento',nome:'Cancelamento e devoluções'});
 if(pedido.repasse||pedido.previa_repasse)abas.splice(2,0,{id:'repasse',nome:'Repasse ao proprietário'});
 const prefixo='pedido-'+pedido.id_pedido;
 function navegar(e:KeyboardEvent<HTMLButtonElement>,i:number){
  let proximo=i;
  if(e.key==='ArrowRight')proximo=(i+1)%abas.length;
  else if(e.key==='ArrowLeft')proximo=(i+abas.length-1)%abas.length;
  else if(e.key==='Home')proximo=0;
  else if(e.key==='End')proximo=abas.length-1;
  else return;
  e.preventDefault();setAba(abas[proximo].id);document.getElementById(prefixo+'-tab-'+abas[proximo].id)?.focus();
 }
 return <div className="pedido-detail">
  <div className="pedido-highlights" aria-label="Valores do pedido">
   <div><span>Valor negociado</span><strong>{moedaPedido(d.valor_negociado)}</strong></div>
   <div><span>Sinal + trocas</span><strong>{moedaPedido(Number(d.valor_sinal)+Number(d.valor_trocas))}</strong></div>
   <div className="pedido-highlight-balance"><span>{Number(d.saldo_restante)<0?'Crédito do cliente':'Saldo restante a pagar'}</span><strong>{moedaPedido(Math.abs(Number(d.saldo_restante)))}</strong></div>
  </div>
  <div className="pedido-tab-shell">
   <div className="pedido-tabs" role="tablist" aria-label="Detalhes do pedido">{abas.map((t,i)=><button key={t.id} type="button" role="tab" id={prefixo+'-tab-'+t.id} aria-controls={prefixo+'-panel-'+t.id} aria-selected={aba===t.id} tabIndex={aba===t.id?0:-1} onClick={()=>setAba(t.id)} onKeyDown={e=>navegar(e,i)}>{t.nome}{t.contador!==undefined&&<span className="pedido-tab-count">{t.contador}</span>}{t.pendente&&<span className="pedido-tab-pending">Pendente</span>}</button>)}</div>
   <section role="tabpanel" id={prefixo+'-panel-resumo'} aria-labelledby={prefixo+'-tab-resumo'} hidden={aba!=='resumo'} tabIndex={0} className="pedido-tab-panel">
    <PedidoVeiculo dados={d}/>{pedido.cancelamento_venda&&<div className="cancelamento-atalho"><div><strong>{pedido.cancelamento_venda.processo_concluido?'Cancelamento concluído':'Cancelamento em acompanhamento'}</strong><small>{pedido.cancelamento_venda.pendencias_trocas??0} troca(s) com destino pendente.</small></div><button type="button" className="button secondary" onClick={()=>{setAba('cancelamento');setSecaoCancelamento('visao');}}>Acompanhar cancelamento</button></div>}
    {pendente&&pedido.situacao==='Em andamento'&&<div className="pedido-payment-reminder"><span>Falta informar como será pago o saldo restante.</span><button type="button" className="orc-link" onClick={()=>{setAba('pagamento');document.getElementById(prefixo+'-tab-pagamento')?.focus();}}>Ir para pagamento →</button></div>}
    {(pedido.observacoes||d.observacoes_orcamento)&&<section className="pedido-card pedido-spacing"><h3>Observações</h3>{pedido.observacoes&&<p className="pedido-text">{pedido.observacoes}</p>}{d.observacoes_orcamento&&<details className="pedido-disclosure pedido-spacing"><summary>Do orçamento de origem</summary><p className="pedido-text">{d.observacoes_orcamento}</p></details>}</section>}
    {pedido.fechamento&&<section className="pedido-card pedido-spacing"><h3>{pedido.situacao==='Cancelado'?'Fechamento original — venda cancelada':'Venda concluída'}</h3><p>{dataPedido(pedido.fechamento.data_venda)} · {pedido.fechamento.responsavel}</p><dl className="pedido-identification"><div><dt>Valor final</dt><dd>{moedaPedido(pedido.fechamento.valor_final)}</dd></div><div><dt>Comissão do vendedor ({pedido.fechamento.comissao_percentual}%)</dt><dd>{moedaPedido(pedido.fechamento.comissao_valor)}</dd></div></dl>{pedido.fechamento.observacoes&&<p>{pedido.fechamento.observacoes}</p>}{!!pedido.trocas_recebidas?.length&&<p>{pedido.trocas_recebidas.length} veículo(s) recebido(s): {trocasPendentes} pendente(s) de aquisição com NF e {pedido.trocas_recebidas.length-trocasPendentes} entrada(s) registrada(s).</p>}</section>}
    {pedido.fechamento&&pode('notas.visualizar')&&<NotaSaidaPedido key={pedido.id_pedido+':'+pedido.situacao} pedido={pedido.id_pedido}/>}
    {pedido.situacao==='Cancelado'&&!pedido.cancelamento_venda&&<section className="pedido-card pedido-spacing pedido-canceled"><h3>Cancelamento registrado</h3><p>{pedido.motivo_cancelamento}</p><small>{dataPedido(pedido.data_cancelamento)} · {pedido.responsavel_cancelamento}</small>{pedido.destino_sinal&&<p>Sinal: <strong>{pedido.destino_sinal}</strong> · {pedido.observacoes_destino}</p>}</section>}
   </section>
   {pedido.cancelamento_venda&&<section role="tabpanel" id={prefixo+'-panel-cancelamento'} aria-labelledby={prefixo+'-tab-cancelamento'} hidden={aba!=='cancelamento'} tabIndex={0} className="pedido-tab-panel"><CancelamentoPedidoPanel pedido={pedido} ocupado={ocupado} onOcupado={onOcupado} onSalvo={onSalvo} onRetorno={onRetorno} secao={secaoCancelamento} onSecao={setSecaoCancelamento}/></section>}
   <section role="tabpanel" id={prefixo+'-panel-pagamento'} aria-labelledby={prefixo+'-tab-pagamento'} hidden={aba!=='pagamento'} tabIndex={0} className="pedido-tab-panel">
    <div className="pedido-payment-grid"><PagamentoPedidoPanel key={pedido.id_pedido+':'+pedido.versao} pedido={pedido} gerenciar={gerenciar} ocupado={ocupado} onOcupado={onOcupado} onErro={onErro} onSalvo={onSalvo}/><PedidoComposicao dados={d}/></div>
   </section>
   <section role="tabpanel" id={prefixo+'-panel-trocas'} aria-labelledby={prefixo+'-tab-trocas'} hidden={aba!=='trocas'} tabIndex={0} className="pedido-tab-panel"><PedidoTrocas dados={d}/>{!!pedido.trocas_recebidas?.length&&<section className="pedido-card pedido-spacing"><h3>Entrada dos veículos recebidos</h3><p>{pedido.cancelamento_venda?'Venda cancelada: acompanhe cada veículo em Cancelamento e devoluções → Destino das trocas.':`${trocasPendentes} troca(s) aguardando entrada com nota fiscal.`}</p>{pedido.cancelamento_venda&&<button type="button" className="button primary" onClick={()=>{setAba('cancelamento');setSecaoCancelamento('trocas');}}>Acompanhar destino das trocas</button>}{pode('trocas.visualizar')&&<button type="button" className="button secondary" onClick={()=>{sessionStorage.setItem('autoflux_trocas_recebidas_busca',pedido.numero_pedido);window.location.hash='#trocas-recebidas';}}>Consultar trocas recebidas</button>}</section>}</section>
   {(pedido.repasse||pedido.previa_repasse)&&<section role="tabpanel" id={prefixo+'-panel-repasse'} aria-labelledby={prefixo+'-tab-repasse'} hidden={aba!=='repasse'} tabIndex={0} className="pedido-tab-panel"><RepassePedidoPanel abrirPagamentoSolicitado={abrirRepasse} pedido={pedido} ocupado={ocupado} onOcupado={onOcupado} onErro={onErro} onSalvo={onSalvo}/></section>}
   <section role="tabpanel" id={prefixo+'-panel-historico'} aria-labelledby={prefixo+'-tab-historico'} hidden={aba!=='historico'} tabIndex={0} className="pedido-tab-panel"><HistoricoPedidoPanel pedido={pedido}/></section>
  </div>
 </div>;
}
