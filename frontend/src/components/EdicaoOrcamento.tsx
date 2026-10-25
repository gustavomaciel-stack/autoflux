import { calcularProposta } from '../services/orcamentosApi';
import { useRef, useState, type FormEvent, type InvalidEvent } from 'react';
import type { Orcamento, DespesaPosVenda } from '../services/orcamentosApi';
import { DespesasOrcamento } from './DespesasOrcamento';
import './CriacaoOrcamento.css';
import './EdicaoOrcamento.css';
const moeda=(v:string|number)=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
interface Props {
 orcamento:Orcamento; valor:string; sugerido:number; origem:number; base:number; custo:number;
 selecionadas:number[]; posVenda:DespesaPosVenda[]; motivo:string; salvando:boolean;
 onValor:(v:string)=>void; onDespesas:(ids:number[],itens:DespesaPosVenda[])=>void;
 onMotivo:(v:string)=>void; onCancelar:()=>void; onSalvar:(e:FormEvent)=>void;
}
export function EdicaoOrcamento(p:Props){
 const [etapa,setEtapa]=useState(1);
 const form=useRef<HTMLFormElement>(null);
 function conferir(n:number){
  const campos=form.current?.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>(`[data-etapa="${n}"] input,[data-etapa="${n}"] textarea`);
  for(const c of campos??[])if(!c.checkValidity()){setEtapa(n);requestAnimationFrame(()=>{c.focus();c.reportValidity();});return false;}return true;
 }
 function navegar(n:number){if(n<=etapa||conferir(etapa))setEtapa(n);}
 function salvar(e:FormEvent){if(etapa!==3){e.preventDefault();navegar(etapa+1);return;}if(!conferir(2)||!conferir(3)){e.preventDefault();return;}p.onSalvar(e);}
 function invalidar(e:InvalidEvent<HTMLFormElement>){const c=e.target as HTMLInputElement;const panel=c.closest<HTMLElement>('[data-etapa]');if(panel?.hidden){e.preventDefault();setEtapa(Number(panel.dataset.etapa));requestAnimationFrame(()=>{c.focus();c.reportValidity();});}}
 const o=p.orcamento;
 return <form className="proposta-editor" ref={form} onSubmit={salvar} onInvalidCapture={invalidar}><fieldset disabled={p.salvando}>
  <nav className="proposta-steps" aria-label="Etapas da edição">{[['Negociação','Cliente e veículo'],['Valores','Preço e condições'],['Revisão','Confira e salve']].map(([titulo,desc],i)=><button type="button" key={titulo} className={etapa===i+1?'active':etapa>i+1?'complete':''} aria-current={etapa===i+1?'step':undefined} onClick={()=>{if(i+1<=etapa||(conferir(1)&&(i<2||conferir(2))))setEtapa(i+1);}}><span className="proposta-step-circle">{etapa>i+1?'✓':i+1}</span><span><strong>{titulo}</strong><small>{desc}</small></span></button>)}</nav>
  <section className="proposta-card" data-etapa="1" hidden={etapa!==1}><header><span className="proposta-icon" aria-hidden="true">✓</span><div><h2>Dados da negociação</h2><p>Revise os dados da proposta que será atualizada.</p></div></header><div className="proposta-fields">
   <label className="field">Veículo<input readOnly value={`${o.marca} ${o.modelo} · ${o.placa}`}/><small>{o.nosso_numero} · {o.numero_orcamento}</small></label>
   <label className="field">Cliente<input readOnly value={o.cliente}/></label><label className="field">Vendedor responsável<input readOnly value={o.vendedor}/></label><label className="field">Validade<input type="date" readOnly value={o.data_validade.slice(0,10)}/></label>
  </div><div className="proposta-hint">A proposta registrada permanece preservada até salvar esta revisão. A troca e a reserva continuam nas suas abas.</div></section>
  <section className="proposta-card" data-etapa="2" hidden={etapa!==2}><header><span className="proposta-icon" aria-hidden="true">$</span><div><h2>Defina os valores da proposta</h2><p>O preço acompanha a composição. Você pode negociar um valor manualmente.</p></div></header>
   <div className="proposta-price-entry"><label className="field">Valor negociado (R$)<input type="number" required min="0.01" max="9999999999.99" step="0.01" value={p.valor} onChange={e=>p.onValor(e.target.value)}/><button type="button" className="proposta-inline" onClick={()=>p.onValor(p.sugerido.toFixed(2))}>Usar preço sugerido: {moeda(p.sugerido)}</button></label><div className="proposta-price-note"><strong>Preço sugerido atualizado</strong><small>{moeda(p.sugerido)}</small></div></div>
   <div className="proposta-origin"><span>{o.valor_repasse_base===null?'Aquisição do veículo':'Repasse acordado'}<small>Valor obrigatório na composição</small></span><strong>{moeda(p.origem)}</strong><span className="proposta-fixed">Fixo</span></div>
   <DespesasOrcamento realizadas={(o.composicao?.modelo??0)>=2?o.realizadas_disponiveis:[]} selecionadas={p.selecionadas} posVenda={p.posVenda} onSelecao={ids=>p.onDespesas(ids,p.posVenda)} onPosVenda={itens=>p.onDespesas(p.selecionadas,itens)}/>
   <div className="proposta-rule"><span>Base do preço sugerido <strong>{moeda(p.base)}</strong></span><span>Acréscimo sobre a base <strong>{o.percentual_padrao_utilizado}%</strong></span></div>
  </section>
  <section className="proposta-card" data-etapa="3" hidden={etapa!==3}><header><span className="proposta-icon" aria-hidden="true">✓</span><div><h2>Revise antes de salvar</h2><p>A nova proposta ficará registrada no histórico.</p></div></header><div className="proposta-review-grid">{[['Cliente',o.cliente],['Veículo',`${o.marca} ${o.modelo}`],['Valor negociado',moeda(p.valor)],['Preço sugerido',moeda(p.sugerido)],['Custo da operação',moeda(p.custo)],['Impostos estimados',moeda(calcularProposta(p.custo,Number(p.valor),Number(o.composicao?.imposto_percentual??0),Number(o.composicao?.comissao_percentual??0)).impostos)],['Comissão estimada do vendedor',moeda(calcularProposta(p.custo,Number(p.valor),Number(o.composicao?.imposto_percentual??0),Number(o.composicao?.comissao_percentual??0)).comissao)],['Resultado estimado',moeda(calcularProposta(p.custo,Number(p.valor),Number(o.composicao?.imposto_percentual??0),Number(o.composicao?.comissao_percentual??0)).resultado)]].map(([titulo,valor])=><div key={titulo}><small>{titulo}</small><strong>{valor}</strong></div>)}</div>
   <label className="field">Justificativa da alteração *<textarea required maxLength={5000} value={p.motivo} onChange={e=>p.onMotivo(e.target.value)} placeholder="Informe o motivo da revisão"/></label><div className="proposta-hint">A composição anterior será mantida no histórico. Os limites comerciais serão reavaliados ao salvar.</div>
  </section>
  <footer className="proposta-footer"><button type="button" className="button abandonar-edicao" onClick={p.onCancelar}><span aria-hidden="true">×</span> Abandonar alteração</button><span>{etapa} de 3</span><div>{etapa>1&&<button type="button" className="button secondary" onClick={()=>setEtapa(etapa-1)}>Voltar</button>}{etapa<3?<button type="button" className="button primary" onClick={()=>navegar(etapa+1)}>Continuar →</button>:<button type="submit" className="button primary">{p.salvando?'Salvando...':'Salvar nova proposta'}</button>}</div></footer>
 </fieldset></form>;
}
