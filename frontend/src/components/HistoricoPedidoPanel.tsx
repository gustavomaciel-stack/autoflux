import {useRef,useState,useEffect} from 'react';
import type {Pedido} from '../services/pedidosApi';
import {dataPedido,moedaPedido} from './PedidoResumo';
import './HistoricoPedidoPanel.css';
type Campo={campo:string;antes:string|null;depois:string|null};
type Item={id:string;titulo:string;data:string;responsavel:string;resumo:string;campos:Campo[]};
const textos:Record<string,string>={prazo:'Entrega e período de atendimento atualizados.',atendimento:'Problema relatado pelo cliente registrado.',encerrar:'Atendimento encerrado com solução ou parecer.',despesa:'Novo gasto associado a um atendimento.',editar_despesa:'Dados da despesa foram corrigidos.',excluir_despesa:'Registro excluído ou desvinculado, com histórico preservado.'};
function itensPedido(p:Pedido):Item[]{
 const auditoria=p.garantia?.eventos??[];
 const eventos=(p.eventos??[]).filter(e=>!(e.tipo==='Garantia e pós-venda'&&auditoria.length)).map(e=>{
  const registro=e.tipo==='Repasse registrado'
   ? e.observacoes?.replace(/^(Pagamento de R\$ .*? ao proprietário em )(\d{4})-(\d{2})-(\d{2})(?= · |$)/, '$1$4/$3/$2') ?? null
   : e.observacoes;
  const campos:Campo[]=[{campo:'Registro',antes:null,depois:registro}];
  if(e.tipo==='Venda concluída'&&p.fechamento)campos.push({campo:'Valor final',antes:null,depois:moedaPedido(p.fechamento.valor_final)},{campo:'Comissão',antes:null,depois:moedaPedido(p.fechamento.comissao_valor)},{campo:'Veículos recebidos em troca',antes:null,depois:String(p.dados.trocas.length)});
  return {id:'pedido-'+e.id_evento,titulo:e.tipo,data:e.data_evento,responsavel:e.responsavel,resumo:e.tipo==='Garantia e pós-venda'?'Alteração de pós-venda registrada.':e.tipo==='Pedido gerado'?'Negociação formalizada e veículo separado para venda.':e.tipo==='Venda concluída'?'Venda concluída e ciclo do veículo encerrado.':e.tipo==='Repasse registrado'?'Pagamento ao proprietário registrado.':e.tipo==='Pedido cancelado'?'Pedido cancelado com histórico preservado.':e.tipo==='Destino da troca registrado'?'Destino de uma troca definido após o cancelamento da venda.':e.tipo==='Entrada de troca registrada'?'Veículo recebido na troca entrou no estoque com nota fiscal.':'Condições do pedido atualizadas.',campos};
 });
 const garantia=auditoria.map(e=>({id:'garantia-'+e.id_evento,titulo:e.titulo,data:e.data_evento,responsavel:e.responsavel,resumo:textos[e.tipo]??'Alteração registrada.',campos:e.campos}));
 return [...eventos,...garantia].sort((a,b)=>b.data.localeCompare(a.data)||b.id.localeCompare(a.id,undefined,{numeric:true}));
}
function formatar(v:string|null){if(v===null||v==='')return '—';return /^\d{4}-\d{2}-\d{2}$/.test(v)?v.split('-').reverse().join('/'):v;}
export function HistoricoPedidoPanel({pedido}:{pedido:Pedido}){
 const [selecionado,setSelecionado]=useState<Item|null>(null),[filtro,setFiltro]=useState('todos'),[limite,setLimite]=useState(10);const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(selecionado&&!dialog.current?.open)dialog.current?.showModal();else if(!selecionado&&dialog.current?.open)dialog.current?.close();},[selecionado]);
 const itens=itensPedido(pedido),filtrados=itens.filter(e=>filtro==='todos'||(filtro==='garantia'?e.id.startsWith('garantia-'):e.id.startsWith('pedido-')));
 return <section className="historico-pedido"><div className="historico-cabecalho"><div><h3>Histórico do pedido</h3><p>Veja o que aconteceu, quem registrou e os detalhes de cada alteração.</p></div><label>Exibir<select value={filtro} onChange={e=>{setFiltro(e.target.value);setLimite(10);}}><option value="todos">Todos os eventos</option><option value="pedido">Venda e pagamento</option><option value="garantia">Garantia e pós-venda</option></select></label></div><ol className="historico-lista">{filtrados.slice(0,limite).map(e=><li key={e.id}><div><strong>{e.titulo}</strong><small>{dataPedido(e.data)} · {e.responsavel}</small><p>{e.resumo}</p></div><button type="button" className="button secondary" onClick={()=>setSelecionado(e)} aria-label={'Ver detalhes: '+e.titulo}>Ver detalhes</button></li>)}</ol>{filtrados.length>limite&&<div className="pedido-actions"><span className="garantia-nota">{limite} de {filtrados.length} eventos</span><button type="button" className="button secondary" onClick={()=>setLimite(n=>n+10)}>Mostrar mais eventos</button></div>}{!filtrados.length&&<p className="garantia-nota">Nenhum evento neste filtro.</p>}<dialog ref={dialog} className="historico-dialog" aria-labelledby="historico-detalhe-titulo" onCancel={()=>setSelecionado(null)} onClose={()=>setSelecionado(null)}>{selecionado&&<><header><div><h3 id="historico-detalhe-titulo">{selecionado.titulo}</h3><p>{dataPedido(selecionado.data)} · {selecionado.responsavel}</p></div><button type="button" className="button secondary" onClick={()=>setSelecionado(null)} aria-label="Fechar detalhes">Fechar</button></header><p>{selecionado.resumo}</p><div className="historico-tabela"><table><thead><tr><th>Informação</th>{selecionado.campos.some(c=>c.antes!==null)&&<th>Antes</th>}<th>{selecionado.campos.some(c=>c.antes!==null)?'Depois':'Detalhe'}</th></tr></thead><tbody>{selecionado.campos.map((c,i)=><tr key={i}><th scope="row">{c.campo}</th>{selecionado.campos.some(c=>c.antes!==null)&&<td>{formatar(c.antes)}</td>}<td>{formatar(c.depois)}</td></tr>)}</tbody></table></div></>}</dialog></section>;
}
