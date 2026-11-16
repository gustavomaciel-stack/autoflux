import {useEffect,useId,useRef,useState} from 'react';
import './HistoricoPedidoPanel.css';
import './HistoricoEventos.css';
export interface CampoHistorico {campo:string;antes?:string|null;depois:string|null}
export interface EventoHistorico {id:string;tipo:string;titulo:string;data:string;responsavel:string;resumo:string;destaque?:{rotulo:string;valor:string};campos:CampoHistorico[]}
const data=(v:string)=>v?`${v.slice(0,10).split('-').reverse().join('/')} às ${v.slice(11,16)}`:'Data não informada';
export function HistoricoEventos({titulo,eventos,vazio='Nenhum evento registrado.'}:{titulo:string;eventos:EventoHistorico[];vazio?:string}){
 const [filtro,setFiltro]=useState('todos'),[limite,setLimite]=useState(10),[selecionado,setSelecionado]=useState<EventoHistorico|null>(null);
 const ref=useRef<HTMLDialogElement>(null),id=useId();
 useEffect(()=>{if(selecionado&&!ref.current?.open)ref.current?.showModal();else if(!selecionado&&ref.current?.open)ref.current?.close();},[selecionado]);
 const tipos=[...new Set(eventos.map(e=>e.tipo))];
 const ordenados=[...eventos].sort((a,b)=>b.data.localeCompare(a.data)||b.id.localeCompare(a.id,undefined,{numeric:true}));
 const filtrados=ordenados.filter(e=>filtro==='todos'||e.tipo===filtro);
 const comparar=selecionado?.campos.some(c=>c.antes!=null)??false;
 return <section className="historico-eventos"><div className="historico-cabecalho"><div><h3>{titulo}</h3><p>Veja o que aconteceu, quem registrou e os detalhes de cada alteração.</p></div><label>Exibir<select value={filtro} onChange={e=>{setFiltro(e.target.value);setLimite(10);}}><option value="todos">Todos os eventos</option>{tipos.map(t=><option key={t}>{t}</option>)}</select></label></div><ol className="historico-lista">{filtrados.slice(0,limite).map(e=><li key={e.id}><div><strong>{e.titulo}</strong><small>{data(e.data)} · {e.responsavel||'Responsável não informado'}</small><p>{e.resumo}</p>{e.destaque&&<div className="historico-evento-valor"><span>{e.destaque.rotulo}</span><b>{e.destaque.valor}</b></div>}</div><button type="button" className="button secondary" aria-label={'Ver detalhes: '+e.titulo} onClick={()=>setSelecionado(e)}>Ver detalhes</button></li>)}</ol>{!filtrados.length&&<p className="historico-eventos-vazio">{filtro==='todos'?vazio:'Nenhum evento neste filtro.'}</p>}{filtrados.length>limite&&<div className="historico-eventos-mais"><span>{limite} de {filtrados.length} eventos</span><button type="button" className="button secondary" onClick={()=>setLimite(n=>n+10)}>Mostrar mais eventos</button></div>}
 <dialog ref={ref} className="historico-dialog historico-eventos-dialog" aria-labelledby={id} onCancel={()=>setSelecionado(null)} onClose={()=>setSelecionado(null)}>{selecionado&&<><header><div><h3 id={id}>{selecionado.titulo}</h3><p>{data(selecionado.data)} · {selecionado.responsavel||'Responsável não informado'}</p></div><button type="button" className="button secondary" aria-label="Fechar detalhes" onClick={()=>setSelecionado(null)}>Fechar</button></header><p>{selecionado.resumo}</p><div className="historico-tabela"><table><thead><tr><th>Informação</th>{comparar&&<th>Antes</th>}<th>{comparar?'Depois':'Detalhe'}</th></tr></thead><tbody>{selecionado.campos.map((c,i)=><tr key={i}><th scope="row">{c.campo}</th>{comparar&&<td>{c.antes||'—'}</td>}<td>{c.depois||'—'}</td></tr>)}</tbody></table></div></>}</dialog>
 </section>;
}
