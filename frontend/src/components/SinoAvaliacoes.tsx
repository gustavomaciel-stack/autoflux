import {consultarNotificacoes,invalidarNotificacoes} from '../services/notificacoesConsulta';
import { type TrocaRecebidaResumo } from '../services/trocasRecebidasApi';
import { useAuth } from '../context/AuthContext';
import { type RepassePendente } from '../services/pedidosApi';
import { moedaPedido } from './PedidoResumo';
import { useEffect, useRef, useState } from 'react';
import { type ResumoTroca } from '../services/trocasApi';
import { type AutorizacaoComercial } from '../services/autorizacoesComerciaisApi';
import {chaveLeituraNotificacoes,lerNotificacoesVistas,salvarNotificacoesVistas} from '../services/notificacoesLeitura';
import './SinoAvaliacoes.css';

const idEntrada=(t:TrocaRecebidaResumo)=>'entrada-'+t.id_recebimento;
const idRepasse=(r:RepassePendente)=>'repasse-'+r.id_repasse;
const idAutorizacao=(a:AutorizacaoComercial)=>'autorizacao-'+a.id_aprovacao;
const idTroca=(t:ResumoTroca)=>'troca-'+t.id_veiculo_entrada;
const unicos=<T,>(itens:T[],chave:(item:T)=>string)=>[...new Map(itens.map(item=>[chave(item),item])).values()];

function preservarVistas<T>(vistas:string[],prefixo:string,resposta:PromiseSettledResult<T[]>,identificador:(item:T)=>string,pendente:(item:T)=>boolean=()=>true):string[]{
 if(resposta.status!=='fulfilled')return vistas;
 const ids=new Set(resposta.value.filter(pendente).map(identificador));
 return vistas.filter(id=>!id.startsWith(prefixo)||ids.has(id));
}

export function SinoAvaliacoes({mostrarAvaliacoes,mostrarAutorizacoes}:{mostrarAvaliacoes:boolean;mostrarAutorizacoes:boolean}){
 const {pode,usuario}=useAuth();
 const mostrarEntradas=!!usuario?.perfis.some(p=>p.nome.trim().toLowerCase()==='comprador')&&pode('trocas.visualizar')&&pode('veiculos.cadastrar')&&pode('avaliacoes.gerenciar');
 const mostrarRepasses=pode('pedidos.visualizar')&&pode('repasses.gerenciar');
 const painel=useRef<HTMLDetailsElement>(null);
 const [entradas,setEntradas]=useState<TrocaRecebidaResumo[]>([]),[repasses,setRepasses]=useState<RepassePendente[]>([]),[trocas,setTrocas]=useState<ResumoTroca[]>([]),[autorizacoes,setAutorizacoes]=useState<AutorizacaoComercial[]>([]);
 const [paginaEntradas,setPaginaEntradas]=useState(1),[pagina,setPagina]=useState(1);
 const [carregado,setCarregado]=useState(false),[erro,setErro]=useState(false);
 const chave=usuario?chaveLeituraNotificacoes(Number(usuario.id_usuario),window.location.pathname):'';
 const [leitura,setLeitura]=useState(()=>({chave,ids:lerNotificacoesVistas(chave)}));
 const vistas=leitura.chave===chave?leitura.ids:lerNotificacoesVistas(chave);
 const vistasRef=useRef(vistas);vistasRef.current=vistas;
 const chaveRef=useRef(chave);chaveRef.current=chave;
 const total=entradas.length+repasses.length+autorizacoes.length+trocas.length;
 const paginasEntradas=Math.max(1,Math.ceil(entradas.length/20)),paginasTrocas=Math.max(1,Math.ceil(trocas.length/20));
 const pagEntrada=Math.min(paginaEntradas,paginasEntradas),pagTroca=Math.min(pagina,paginasTrocas);
 const entradasExibidas=entradas.slice((pagEntrada-1)*20,pagEntrada*20),trocasExibidas=trocas.slice((pagTroca-1)*20,pagTroca*20);
 const ids=[...entradas.map(idEntrada),...repasses.map(idRepasse),...autorizacoes.map(idAutorizacao),...trocas.map(idTroca)];
 const idsExibidos=[...entradasExibidas.map(idEntrada),...repasses.map(idRepasse),...autorizacoes.map(idAutorizacao),...trocasExibidas.map(idTroca)];
 const exibidosRef=useRef(idsExibidos);exibidosRef.current=idsExibidos;
 const naoVistas=ids.filter(id=>!vistas.includes(id)).length;
 const classeItem=(id:string)=>vistas.includes(id)?'sino-vista':'sino-nova';
 function marcarExibidas(){
  const anteriores=vistasRef.current;const proximas=[...new Set([...anteriores,...exibidosRef.current])];
  if(proximas.length===anteriores.length)return;
  vistasRef.current=proximas;setLeitura({chave:chaveRef.current,ids:proximas});salvarNotificacoesVistas(chaveRef.current,proximas);
 }
 useEffect(()=>{
  const ids=lerNotificacoesVistas(chave);vistasRef.current=ids;setLeitura({chave,ids});
  function sincronizar(e:StorageEvent){if(e.key===chave||e.key===null){const ids=lerNotificacoesVistas(chave);vistasRef.current=ids;setLeitura({chave,ids});}}
  window.addEventListener('storage',sincronizar);return()=>window.removeEventListener('storage',sincronizar);
 },[chave]);
 const assinaturaExibidos=JSON.stringify(idsExibidos);
 useEffect(()=>{if(painel.current?.open)marcarExibidas();},[assinaturaExibidos,chave]);

 useEffect(()=>{
  let ativa=true,versao=0;
  const fontes={avaliacoes:mostrarAvaliacoes,autorizacoes:mostrarAutorizacoes,repasses:mostrarRepasses,entradas:mostrarEntradas};
  async function atualizar(){
   const requisicao=++versao;
   const resultados=await consultarNotificacoes(chave,fontes);
   if(!ativa||requisicao!==versao)return;
   const [avaliacoes,aprovacoes,pagamentos,recebidas]=resultados;
   // Se uma fonte falhar, mantém suas pendências já carregadas e informa a falha.
   if(avaliacoes.status==='fulfilled')setTrocas(unicos(avaliacoes.value,idTroca));
   if(aprovacoes.status==='fulfilled')setAutorizacoes(unicos(aprovacoes.value.filter(a=>a.situacao_analise==='Pendente'),idAutorizacao));
   if(pagamentos.status==='fulfilled')setRepasses(unicos(pagamentos.value,idRepasse));
   if(recebidas.status==='fulfilled')setEntradas(unicos(recebidas.value,idEntrada));
   // Uma pendência resolvida deixa de ser vista; se voltar, alerta novamente.
   let mantidas=preservarVistas(vistasRef.current,'troca-',avaliacoes,idTroca);
   mantidas=preservarVistas(mantidas,'autorizacao-',aprovacoes,idAutorizacao,a=>a.situacao_analise==='Pendente');
   mantidas=preservarVistas(mantidas,'repasse-',pagamentos,idRepasse);
   mantidas=preservarVistas(mantidas,'entrada-',recebidas,idEntrada);
   if(mantidas.length!==vistasRef.current.length){vistasRef.current=mantidas;setLeitura({chave,ids:mantidas});salvarNotificacoesVistas(chave,mantidas);}
   setErro(resultados.some(r=>r.status==='rejected'));setCarregado(true);
  }
  const atualizarVisivel=()=>{if(!document.hidden)void atualizar();};
  void atualizar();const intervalo=window.setInterval(atualizarVisivel,60000);
  const eventos=['autoflux-repasses-alterados','autoflux-entradas-alteradas','autoflux-trocas-alteradas','autoflux-autorizacoes-alteradas'];
  const atualizarAlteracao=()=>{invalidarNotificacoes(chave,fontes);atualizarVisivel();};
  window.addEventListener('focus',atualizarVisivel);
  eventos.forEach(e=>window.addEventListener(e,atualizarAlteracao));document.addEventListener('visibilitychange',atualizarVisivel);
  const elemento=painel.current;
  function alternar(){if(elemento?.open){marcarExibidas();void atualizar();}}
  function fecharFora(e:PointerEvent){if(elemento?.open&&e.target instanceof Node&&!elemento.contains(e.target))elemento.open=false;}
  elemento?.addEventListener('toggle',alternar);document.addEventListener('pointerdown',fecharFora);
  return()=>{ativa=false;window.clearInterval(intervalo);window.removeEventListener('focus',atualizarVisivel);eventos.forEach(e=>window.removeEventListener(e,atualizarAlteracao));document.removeEventListener('visibilitychange',atualizarVisivel);elemento?.removeEventListener('toggle',alternar);document.removeEventListener('pointerdown',fecharFora);};
 },[mostrarAvaliacoes,mostrarAutorizacoes,mostrarRepasses,mostrarEntradas,chave]);

 function fechar(){if(painel.current)painel.current.open=false;}
 function abrir(orcamento:number,oferta:number){fechar();sessionStorage.setItem('autoflux-avaliacao-destino',JSON.stringify({orcamento,oferta}));if(window.location.hash==='#avaliacoes-troca')window.dispatchEvent(new Event('autoflux-abrir-avaliacao'));else window.location.hash='#avaliacoes-troca';}
 function abrirAutorizacao(id:number){fechar();sessionStorage.setItem('autoflux-autorizacao-destino',String(id));if(window.location.hash==='#autorizacoes-comerciais')window.dispatchEvent(new Event('autoflux-abrir-autorizacao'));else window.location.hash='#autorizacoes-comerciais';}
 function abrirEntrada(id:number){fechar();sessionStorage.setItem('autoflux-entrada-troca-destino',String(id));if(window.location.hash==='#trocas-recebidas')window.dispatchEvent(new Event('autoflux-abrir-entrada-troca'));else window.location.hash='#trocas-recebidas';}
 function abrirRepasse(id:number){fechar();sessionStorage.setItem('autoflux-repasse-destino',String(id));if(window.location.hash==='#pedidos')window.dispatchEvent(new Event('autoflux-abrir-repasse'));else window.location.hash='#pedidos';}
 return <details className="sino-avaliacoes" ref={painel} onKeyDown={e=>{if(e.key==='Escape'&&painel.current?.open){painel.current.open=false;painel.current.querySelector('summary')?.focus();}}}>
  <summary aria-label={'Pendências'+(carregado?`, ${total} pendentes, ${naoVistas} novas`:'')}>
   <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
   {naoVistas>0&&<span className="sino-contador">{naoVistas}</span>}
  </summary>
  <div className="sino-lista"><strong>Pendências</strong>{carregado&&total>0&&<p className="sino-resumo">{total} pendente(s) · {naoVistas} nova(s)</p>}
   {erro&&<p role="status">Não foi possível atualizar todas as pendências.</p>}
   {!carregado?<p>Carregando…</p>:!total?!erro&&<p>Nenhuma pendência.</p>:<>
    <ul>
     {entradasExibidas.map(t=><li key={idEntrada(t)}><button className={classeItem(idEntrada(t))} type="button" onClick={()=>abrirEntrada(Number(t.id_recebimento))}><small>Veículo recebido · entrada pendente</small><strong>{t.marca} {t.modelo} · {t.placa}</strong><small>{t.numero_pedido} · Registrar entrada com nota fiscal</small></button></li>)}
     {repasses.map(r=><li key={idRepasse(r)}><button className={classeItem(idRepasse(r))} type="button" onClick={()=>abrirRepasse(Number(r.id_pedido))}><small>Pagamento de repasse pendente</small><strong>{r.numero_pedido} · {r.marca} {r.modelo}</strong><small>{r.placa} · Saldo: {moedaPedido(r.saldo_devido)}</small></button></li>)}
     {autorizacoes.map(a=><li key={idAutorizacao(a)}><button className={classeItem(idAutorizacao(a))} type="button" onClick={()=>abrirAutorizacao(Number(a.id_aprovacao))}><small>Autorização de orçamento</small><strong>{a.numero_orcamento} · {a.marca} {a.modelo}</strong></button></li>)}
     {trocasExibidas.map(t=><li key={idTroca(t)}><button className={classeItem(idTroca(t))} type="button" onClick={()=>abrir(Number(t.id_orcamento),Number(t.id_veiculo_entrada))}><small>Avaliação de compra</small><strong>{t.marca} {t.modelo} · {t.placa}</strong><small>{t.numero_orcamento} · {t.data_cadastro.slice(0,10).split('-').reverse().join('/')}</small></button></li>)}
    </ul>
    {paginasEntradas>1&&<div className="sino-paginacao"><button type="button" disabled={pagEntrada<=1} onClick={()=>setPaginaEntradas(pagEntrada-1)}>Anterior</button><span>Entradas {pagEntrada}/{paginasEntradas}</span><button type="button" disabled={pagEntrada>=paginasEntradas} onClick={()=>setPaginaEntradas(pagEntrada+1)}>Próxima</button></div>}
    {paginasTrocas>1&&<div className="sino-paginacao"><button type="button" disabled={pagTroca<=1} onClick={()=>setPagina(pagTroca-1)}>Anterior</button><span>Avaliações {pagTroca}/{paginasTrocas}</span><button type="button" disabled={pagTroca>=paginasTrocas} onClick={()=>setPagina(pagTroca+1)}>Próxima</button></div>}
   </>}
  </div>
 </details>;
}
