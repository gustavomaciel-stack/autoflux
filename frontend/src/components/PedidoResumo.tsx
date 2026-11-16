import type { DadosPedido } from '../services/pedidosApi';
export const moedaPedido=(v:string|number)=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const dataPedido=(v:string|null)=>v?`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}${v.length>=16?' às '+v.slice(11,16):''}`:'—';
export function PedidoVeiculo({dados:d}:{dados:DadosPedido}){
 const consignado=d.origem.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='consignacao';
 return <section className="pedido-card"><div className="pedido-card-title"><span className="pedido-eyebrow">Veículo da venda</span><span className="pedido-origin">{consignado?'Consignado':'Próprio'}</span></div><h2>{d.marca} {d.modelo}</h2><p className="pedido-car-meta">{d.placa} <span>·</span> {d.nosso_numero}</p><dl className="pedido-identification"><div><dt>Cliente</dt><dd>{d.cliente}</dd></div><div><dt>Vendedor responsável</dt><dd>{d.vendedor}</dd></div><div><dt>Orçamento de origem</dt><dd>{d.numero_orcamento}</dd></div><div><dt>Origem do veículo</dt><dd>{d.origem}</dd></div></dl></section>;
}
export function PedidoTrocas({dados:d}:{dados:DadosPedido}){
 return <section className="pedido-card"><div className="pedido-card-title"><h3>Veículos de troca</h3><span className="pedido-count">{d.trocas.length}</span></div>{d.trocas.length?<><div className="pedido-trades">{d.trocas.map(t=><div key={t.id_veiculo_entrada}><span><strong>{t.marca} {t.modelo}</strong><small>{t.placa} · {t.ano}{t.ano_modelo?'/'+t.ano_modelo:''}</small></span><strong>{moedaPedido(t.valor_avaliado)}</strong></div>)}</div><p className="pedido-note">As trocas compõem o pagamento. Sua entrada na revenda depende da conclusão da venda e do registro da aquisição com nota fiscal.</p></>:<p className="pedido-empty-inline">Sem veículo de troca nesta negociação.</p>}</section>;
}
export function PedidoComposicao({dados:d}:{dados:DadosPedido}){
 return <aside className="pedido-card pedido-payment"><span className="pedido-eyebrow">Composição do pagamento</span><p className="pedido-payment-label">Valor negociado</p><strong className="pedido-price">{moedaPedido(d.valor_negociado)}</strong><dl><div><dt>Sinal já registrado</dt><dd>− {moedaPedido(d.valor_sinal)}</dd></div><div><dt>Veículos de troca ({d.trocas.length})</dt><dd>− {moedaPedido(d.valor_trocas)}</dd></div></dl><div className="pedido-balance"><small>{Number(d.saldo_restante)<0?'Crédito do cliente na negociação':'Saldo restante a pagar'}</small><strong>{moedaPedido(Math.abs(Number(d.saldo_restante)))}</strong></div><p className="pedido-note">O saldo considera o sinal uma única vez. Os valores da troca não representam dinheiro recebido.</p></aside>;
}
export function PedidoResumo({dados:d}:{dados:DadosPedido}){
 return <div className="pedido-grid"><div className="pedido-main"><PedidoVeiculo dados={d}/><PedidoTrocas dados={d}/>
 {d.observacoes_orcamento&&<details className="pedido-card pedido-disclosure"><summary>Observações do orçamento</summary><p className="pedido-text">{d.observacoes_orcamento}</p></details>}</div>
 <PedidoComposicao dados={d}/></div>;
}
