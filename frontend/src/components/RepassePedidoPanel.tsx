import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { registrarRepasse, type Pedido, type PreviaRepasse } from '../services/pedidosApi';
import { moedaPedido } from './PedidoResumo';
import './RepassePedidoPanel.css';

function hoje() {
 const partes=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const obter=(tipo:string)=>partes.find(p=>p.type===tipo)?.value??'';
 return `${obter('year')}-${obter('month')}-${obter('day')}`;
}
function dataBR(valor:string) {
 const partes=/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(valor);
 return partes?`${partes[3]}/${partes[2]}/${partes[1]}`:'—';
}
function ComposicaoRepasse({dados:d}:{dados:PreviaRepasse}) {
 return <div className="repasse-composicao">
  <h4>Como o repasse foi calculado</h4>
  <dl className="repasse-conta"><div><dt>Valor acordado com o proprietário</dt><dd>{moedaPedido(d.repasse_acordado)}</dd></div><div><dt>Despesas descontadas</dt><dd>− {moedaPedido(d.descontos)}</dd></div><div className="repasse-conta-total"><dt>Valor líquido do repasse</dt><dd>{moedaPedido(d.repasse_liquido)}</dd></div></dl>
  {d.itens_desconto.length>0?<details className="repasse-despesas"><summary>Ver despesas descontadas ({d.itens_desconto.length})</summary><ul>{d.itens_desconto.map(i=><li key={i.id_despesa}><span>{i.descricao}</span><strong>{moedaPedido(i.valor)}</strong></li>)}</ul></details>:<p className="repasse-ajuda">Nenhuma despesa descontada deste repasse.</p>}
  <details className="repasse-outras"><summary>Outras despesas do veículo</summary><dl className="repasse-conta"><div><dt>Despesas da loja</dt><dd>{moedaPedido(d.despesas_revenda)}</dd></div><div><dt>Do proprietário, sem desconto no repasse</dt><dd>{moedaPedido(d.despesas_proprietario)}</dd></div></dl><p className="repasse-ajuda">Esses valores não foram abatidos do repasse. Somente despesas realizadas e marcadas para desconto entram no cálculo acima.</p></details>
 </div>;
}
export function ConferenciaRepasse({dados:d}:{dados:PreviaRepasse}) {
 if(d.erro)return <div className="alert error" role="alert">{d.erro}</div>;
 return <section className="repasse-panel"><header className="repasse-cabecalho"><div><h3>Repasse ao proprietário</h3><p>{d.proprietario}</p></div><span className="repasse-selo neutro">Prévia do repasse</span></header><ComposicaoRepasse dados={d}/><p className="repasse-ajuda">O valor será preservado ao concluir a venda. Depois, você poderá informar o pagamento ao proprietário.</p></section>;
}
export function RepassePedidoPanel({pedido,abrirPagamentoSolicitado=0,ocupado,onOcupado,onErro,onSalvo}:{pedido:Pedido;abrirPagamentoSolicitado?:number;ocupado:boolean;onOcupado:(v:boolean)=>void;onErro:(s:string)=>void;onSalvo:(p:Pedido)=>void}) {
 const {pode}=useAuth();
 const [aba,setAba]=useState<'composicao'|'pagamentos'>('composicao');
 const [editando,setEditando]=useState(false),[valor,setValor]=useState(''),[data,setData]=useState(hoje),[obs,setObs]=useState(''),[aviso,setAviso]=useState('');
 const prefixo=useId();const r=pedido.repasse;
 useEffect(()=>{setAba('composicao');setEditando(false);setValor('');setData(hoje());setObs('');setAviso('');},[pedido.id_pedido]);
 useEffect(()=>{
  if(!abrirPagamentoSolicitado||!r||!pode('repasses.gerenciar')||pedido.situacao!=='Concluído'||r.situacao==='Cancelada'||Number(r.saldo_devido)<=0)return;
  setValor(r.saldo_devido);setData(hoje());setObs('');setAviso('');setAba('pagamentos');setEditando(true);
 },[abrirPagamentoSolicitado,pedido.id_pedido]);
 if(!r)return pedido.previa_repasse?<ConferenciaRepasse dados={pedido.previa_repasse}/>:null;
 if(r.dados.erro)return <div className="alert error" role="alert">{r.dados.erro}</div>;
 const cancelado=r.situacao==='Cancelada',semValor=Number(r.valor_devido)===0,quitado=!cancelado&&!semValor&&Number(r.saldo_devido)<=0;
 const titulo=cancelado?'Repasse cancelado':semValor?'Sem valor a repassar':quitado?'Repasse quitado':Number(r.total_pago)>0?'Repasse parcialmente pago':'Repasse pendente';
 const permitido=pode('repasses.gerenciar')&&pedido.situacao==='Concluído'&&Number(r.saldo_devido)>0&&!cancelado;
 function abrirPagamento(){if(!permitido)return;setValor(r!.saldo_devido);setData(hoje());setObs('');setAviso('');setAba('pagamentos');setEditando(true);onErro('');}
 async function salvar(e:FormEvent){e.preventDefault();if(ocupado||!permitido)return;onOcupado(true);onErro('');setAviso('');try{const atualizado=await registrarRepasse(Number(pedido.id_pedido),Number(pedido.versao),valor,data,obs);onSalvo(atualizado);window.dispatchEvent(new Event('autoflux-repasses-alterados'));setEditando(false);setValor('');setObs('');setAviso('Pagamento do repasse informado com sucesso.');}catch(e){onErro(e instanceof Error?e.message:'Não foi possível informar o pagamento do repasse.');}finally{onOcupado(false);}}
 function navegar(e:KeyboardEvent<HTMLButtonElement>){if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const proxima=e.key==='Home'?'composicao':e.key==='End'?'pagamentos':aba==='composicao'?'pagamentos':'composicao';setAba(proxima);document.getElementById(prefixo+'-tab-'+proxima)?.focus();}
 return <section className="repasse-panel">
  <header className="repasse-cabecalho"><div><h3>Repasse ao proprietário</h3><p>{r.dados.proprietario}</p></div><span className={'repasse-selo '+(cancelado||semValor?'neutro':quitado?'quitado':'pendente')}>{titulo}</span></header>
  <dl className="repasse-indicadores"><div><dt>Valor líquido do repasse</dt><dd>{moedaPedido(r.valor_devido)}</dd></div><div><dt>Informado como pago</dt><dd>{moedaPedido(r.total_pago)}</dd></div><div className={quitado?'sem-saldo':'saldo'}><dt>{cancelado?'Saldo do registro cancelado':'Saldo pendente'}</dt><dd>{moedaPedido(r.saldo_devido)}</dd></div></dl>
  <div className="repasse-orientacao"><p>A situação considera os pagamentos informados no AutoFlux. Esse acompanhamento é opcional.</p>{permitido&&<button type="button" className="button primary" disabled={ocupado||editando} onClick={abrirPagamento}>Informar pagamento do repasse</button>}</div>
  {aviso&&<p className="alert success" role="status">{aviso}</p>}
  <div className="repasse-abas" role="tablist" aria-label="Informações do repasse">{([['composicao','Composição do repasse'],['pagamentos','Pagamentos informados']] as const).map(([id,nome])=><button key={id} type="button" role="tab" id={prefixo+'-tab-'+id} aria-controls={prefixo+'-painel-'+id} aria-selected={aba===id} tabIndex={aba===id?0:-1} onKeyDown={navegar} onClick={()=>setAba(id)}>{nome}{id==='pagamentos'&&<span>{r.pagamentos.length}</span>}</button>)}</div>
  <div role="tabpanel" id={prefixo+'-painel-composicao'} aria-labelledby={prefixo+'-tab-composicao'} hidden={aba!=='composicao'} tabIndex={0}><ComposicaoRepasse dados={r.dados}/></div>
  <div role="tabpanel" id={prefixo+'-painel-pagamentos'} aria-labelledby={prefixo+'-tab-pagamentos'} hidden={aba!=='pagamentos'} tabIndex={0}>
   {editando&&permitido&&<form className="repasse-formulario" onSubmit={salvar}><fieldset disabled={ocupado}><legend>Informar pagamento realizado</legend><p>Informe o valor efetivamente pago. Você pode registrar o repasse em mais de um pagamento.</p><div className="repasse-form-grid"><label className="field">Valor pago (R$) *<input autoFocus type="number" step="0.01" min="0.01" max={r.saldo_devido} value={valor} onChange={e=>setValor(e.target.value)} required/></label><label className="field">Data do pagamento *<input type="date" min={pedido.fechamento?.data_venda.slice(0,10)} max={hoje()} required value={data} onChange={e=>setData(e.target.value)}/></label></div><label className="field">Observações (opcional)<textarea maxLength={5000} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Ex.: repasse realizado por transferência."/></label><div className="pedido-actions"><button data-ui-nav="back" type="button" className="button secondary" onClick={()=>{setEditando(false);onErro('');}}>Cancelar</button><button type="submit" className="button primary">{ocupado?'Salvando...':'Salvar pagamento informado'}</button></div></fieldset></form>}
   {r.pagamentos.length>0?<div className="repasse-tabela"><table><caption>Pagamentos informados ao proprietário</caption><thead><tr><th>Data do pagamento</th><th>Valor</th><th>Informado por</th><th>Observações</th></tr></thead><tbody>{r.pagamentos.map(pg=><tr key={pg.id_pagamento}><td>{dataBR(pg.data_pagamento)}</td><td><strong>{moedaPedido(pg.valor)}</strong></td><td>{pg.responsavel}<small>Registro em {dataBR(pg.data_registro)}</small></td><td className="repasse-observacoes">{pg.observacoes||'—'}</td></tr>)}</tbody></table></div>:<div className="repasse-vazio"><h4>Nenhum pagamento informado</h4><p>Quando o repasse for realizado, você pode informar o valor e a data para acompanhar o saldo.</p></div>}
  </div>
 </section>;
}
