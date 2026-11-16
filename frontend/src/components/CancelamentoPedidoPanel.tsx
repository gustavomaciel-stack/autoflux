import {useAuth} from '../context/AuthContext';
import type {Pedido} from '../services/pedidosApi';
import {dataPedido} from './PedidoResumo';
import {DestinoTrocasCancelamentoPanel} from './DestinoTrocasCancelamentoPanel';
import './CancelamentoVendaPanel.css';
export type SecaoCancelamento='visao'|'retorno'|'trocas';
export function CancelamentoPedidoPanel({pedido,ocupado,onOcupado,onSalvo,onRetorno,secao,onSecao}:{pedido:Pedido;ocupado:boolean;onOcupado:(v:boolean)=>void;onSalvo:(p:Pedido)=>void;onRetorno?:()=>void;secao:SecaoCancelamento;onSecao:(s:SecaoCancelamento)=>void}){
 const {pode}=useAuth();const x=pedido.cancelamento_venda;if(!x)return null;
 const pendentes=x.pendencias_trocas??0;const retornoPendente=x.retorno_pendente??(x.retorno_previsto&&!x.retorno_numero);const concluido=x.processo_concluido??(!retornoPendente&&!pendentes);
 const secoes:{id:SecaoCancelamento;nome:string}[]=[{id:'visao',nome:'Visão geral'},{id:'retorno',nome:'Retorno do veículo'},...(x.trocas?.length?[{id:'trocas' as const,nome:`Destino das trocas (${x.trocas.length})`}]:[])];
 const prefixo='cancelamento-'+pedido.id_pedido;
 return <div className="cancelamento-consulta">
  <header className="cancelamento-consulta-header"><div><h3>{concluido?'Processo de cancelamento concluído':'Cancelamento em acompanhamento'}</h3><p>{concluido?'Retorno previsto e destinos das trocas resolvidos.':'Confira o retorno do veículo vendido e o destino das trocas.'}</p></div><span className={'destino-badge '+(concluido?'':'pendente')}>{concluido?'Concluído':'Com pendências'}</span></header>
  <div className="cancelamento-subabas" role="tablist" aria-label="Etapas do cancelamento">{secoes.map((s,i)=><button type="button" role="tab" key={s.id} id={prefixo+'-'+s.id} aria-controls={prefixo+'-painel-'+s.id} aria-selected={secao===s.id} tabIndex={secao===s.id?0:-1} disabled={ocupado} onClick={()=>onSecao(s.id)} onKeyDown={e=>{let n=i;if(e.key==='ArrowRight')n=(i+1)%secoes.length;else if(e.key==='ArrowLeft')n=(i+secoes.length-1)%secoes.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=secoes.length-1;else return;e.preventDefault();onSecao(secoes[n].id);document.getElementById(prefixo+'-'+secoes[n].id)?.focus();}}>{s.nome}</button>)}</div>
  <section role="tabpanel" id={prefixo+'-painel-visao'} aria-labelledby={prefixo+'-visao'} hidden={secao!=='visao'}>
   <div className="cancelamento-resumo-cards"><article><small>Veículo vendido</small><strong>{x.retorno_numero?'Entrada registrada':retornoPendente?'Entrada pendente':'Sem retorno previsto'}</strong><p>{pedido.dados.marca} {pedido.dados.modelo} · {pedido.dados.placa}</p><button type="button" className="orc-link" onClick={()=>onSecao('retorno')}>Ver retorno do veículo →</button></article><article><small>Veículos recebidos em troca</small><strong>{pendentes?`${pendentes} com destino pendente`:'Nenhum destino pendente'}</strong><p>{x.trocas?.length??0} veículo(s) nesta operação.</p>{!!x.trocas?.length&&<button type="button" className="orc-link" onClick={()=>onSecao('trocas')}>Selecionar veículo de troca →</button>}</article></div>
   <details className="cancelamento-registro"><summary>Ver motivo e acertos do cancelamento</summary><p><strong>Motivo:</strong> {x.motivo}</p><small>{dataPedido(x.data_cancelamento)} · {x.responsavel} · Data informada: {dataPedido(x.data_efetiva)}</small><p><strong>Tratamento dos valores:</strong> {x.acerto_financeiro}</p>{x.tratamento_vinculos&&<p><strong>Tratamento dos vínculos:</strong> {x.tratamento_vinculos}</p>}</details>
  </section>
  <section role="tabpanel" id={prefixo+'-painel-retorno'} aria-labelledby={prefixo+'-retorno'} hidden={secao!=='retorno'}>
   <h3>Retorno do veículo vendido</h3><p>{pedido.dados.marca} {pedido.dados.modelo} · {pedido.dados.placa}</p>
   {x.retorno_numero?<><div className="cancelamento-resumo-cards"><article><small>Ciclo original preservado</small><strong>{pedido.dados.nosso_numero}</strong><p>Permanece encerrado.</p></article><article><small>Entrada registrada na revenda</small><strong>{x.retorno_numero}</strong><p>{dataPedido(x.data_retorno)} · {x.responsavel_retorno}</p></article></div><button type="button" className="button primary" onClick={()=>window.location.hash='#veiculos'}>Consultar veículo no pátio</button></>:<><p>{retornoPendente?'Aguardando a entrada física do veículo e a NF.':'Não há retorno previsto. Se o veículo retornar, registre a entrada com NF.'}</p>{onRetorno&&pode('vendas.cancelar_concluida')&&<button data-ui-nav="next" type="button" className="button primary" disabled={ocupado} onClick={onRetorno}>{retornoPendente?'Continuar entrada do veículo':'Registrar entrada do veículo'}</button>}</>}
  </section>
  {!!x.trocas?.length&&<section role="tabpanel" id={prefixo+'-painel-trocas'} aria-labelledby={prefixo+'-trocas'} hidden={secao!=='trocas'}><DestinoTrocasCancelamentoPanel pedido={pedido} ocupado={ocupado} onOcupado={onOcupado} onSalvo={onSalvo}/></section>}
 </div>;
}
