import { useEffect, useRef, useState } from 'react';
import { podeConsultarOrcamentos } from '../services/clientesAcesso';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { TrocaOrcamentoPanel, moedaTroca } from '../components/TrocaOrcamentoPanel';
import { StatusComercial } from '../components/StatusComercial';
import { detalhesTroca, listarTrocas, type DetalhesTroca, type ConsultaTrocas } from '../services/trocasApi';
import './OrcamentosPage.css';
export function AvaliacoesTrocaPage(){
 const {usuario}=useAuth();
 const [ofertaSelecionada,setOfertaSelecionada]=useState<number|undefined>();
 const [aberturaSino,setAberturaSino]=useState(0);
 const [consulta,setConsulta]=useState<ConsultaTrocas>({itens:[],total:0,pagina:1,paginas:1,pendentes:0,avaliados:0,encerradas:0,todas:0});
 const [detalhe,setDetalhe]=useState<DetalhesTroca|null>(null),[historicoId,setHistoricoId]=useState<number|undefined>(),[erro,setErro]=useState(''),[sucesso,setSucesso]=useState(''),[ocupado,setOcupado]=useState(false),[busca,setBusca]=useState(''),[filtro,setFiltro]=useState(''),[pagina,setPagina]=useState(1);
 const requisicao=useRef(0), requisicaoDetalhe=useRef(0);
 const buscaAnterior=useRef(busca);
 const posicaoLista=useRef(0),origemLista=useRef<HTMLElement|null>(null);
 function voltarLista(){
  ++requisicaoDetalhe.current;setDetalhe(null);setHistoricoId(undefined);setSucesso('');setErro('');
  window.requestAnimationFrame(()=>{window.scrollTo({top:posicaoLista.current,behavior:'instant'});if(origemLista.current?.isConnected)origemLista.current.focus({preventScroll:true});});
 }
 async function carregar(){const atual=++requisicao.current;setOcupado(true);setErro('');try{const dados=await listarTrocas(pagina,busca,filtro);if(atual===requisicao.current)setConsulta(dados);}catch(e){if(atual===requisicao.current)setErro(e instanceof Error?e.message:'Falha ao consultar.');}finally{if(atual===requisicao.current)setOcupado(false);}}
 async function ver(id:number,oferta?:number,doSino=false){if(!detalhe){posicaoLista.current=window.scrollY;origemLista.current=document.activeElement as HTMLElement|null;}const atual=++requisicaoDetalhe.current;++requisicao.current;window.scrollTo({top:0,behavior:'smooth'});setOcupado(true);setErro('');setSucesso('');try{const d=await detalhesTroca(id);if(atual!==requisicaoDetalhe.current)return;setDetalhe(d);setOfertaSelecionada(oferta);setAberturaSino(atual=>doSino?atual+1:0);setHistoricoId(d.trocas.some(t=>Number(t.id_veiculo_entrada)===oferta&&Number(t.ativo)===0)?oferta:undefined);}catch(e){if(atual===requisicaoDetalhe.current)setErro(e instanceof Error?e.message:'Falha ao consultar.');}finally{if(atual===requisicaoDetalhe.current)setOcupado(false);}}
 useEffect(()=>{
  const digitando=buscaAnterior.current!==busca;
  buscaAnterior.current=busca;
  if(detalhe)return;
  // Somente a digitação aguarda uma breve pausa. Navegação e filtros consultam imediatamente.
  const t=digitando?window.setTimeout(()=>void carregar(),150):undefined;
  if(!digitando)void carregar();
  return()=>{if(t!==undefined)window.clearTimeout(t);++requisicao.current;};
 },[pagina,busca,filtro,detalhe]);
 useEffect(()=>{
  function abrirDoSino(){
   const destino=sessionStorage.getItem('autoflux-avaliacao-destino');
   if(!destino)return;
   sessionStorage.removeItem('autoflux-avaliacao-destino');
   try {
    const {orcamento,oferta}=JSON.parse(destino) as {orcamento:number;oferta:number};
    if(Number.isSafeInteger(orcamento)&&orcamento>0&&Number.isSafeInteger(oferta)&&oferta>0)void ver(orcamento,oferta,true);
   } catch { /* Um destino inválido deixa a lista aberta. */ }
  }
  const inicial=window.setTimeout(abrirDoSino,0);
  window.addEventListener('autoflux-abrir-avaliacao',abrirDoSino);
  return()=>{window.clearTimeout(inicial);++requisicaoDetalhe.current;window.removeEventListener('autoflux-abrir-avaliacao',abrirDoSino);};
 },[]);
 function filtrar(valor:string){setFiltro(valor);setPagina(1);}
 const filtrados=consulta.itens;
 return <Layout><div className="orc-page"><div className="breadcrumb">Compras / Avaliações de troca</div><div className="orc-heading"><div><h1>{detalhe?(historicoId?'Histórico · ':'Avaliação · ')+detalhe.contexto.numero_orcamento:'Avaliações de troca'}</h1><p>Analise o veículo oferecido, registre a avaliação e acompanhe o saldo da negociação.</p></div></div>{erro&&<div className="alert error" role="alert">{erro}</div>}{sucesso&&<div className="alert success" role="status">{sucesso}</div>}
 {detalhe?<><section className="orc-panel"><div className="orc-heading"><h2>{detalhe.contexto.marca} {detalhe.contexto.modelo} · {detalhe.contexto.nosso_numero}</h2><StatusComercial situacao={detalhe.contexto.situacao}/></div><p>Cliente: {detalhe.contexto.cliente} · Veículo principal: {detalhe.contexto.placa} · {detalhe.contexto.origem_entrada}</p><div data-ui-actions="navigation" className="orc-actions">{podeConsultarOrcamentos(usuario)&&<button className="button primary" disabled={ocupado} onClick={()=>{sessionStorage.setItem('autoflux_orcamento_detalhe',String(detalhe.contexto.id_orcamento));window.location.hash='#orcamentos';}}>Abrir orçamento</button>}<button data-ui-nav="back" className="button secondary" disabled={ocupado} onClick={voltarLista}>Voltar à lista</button><button className="button secondary" disabled={ocupado} onClick={()=>void ver(Number(detalhe.contexto.id_orcamento),ofertaSelecionada)}>Atualizar detalhes</button></div><div className="orc-summary"><div>Valor negociado<strong>{moedaTroca(detalhe.contexto.valor_negociado_atual)}</strong></div><div>Sinal ativo<strong>{moedaTroca(detalhe.contexto.sinal_ativo)}</strong></div><div>Avaliação vigente<strong>{moedaTroca(detalhe.valor_troca)}</strong></div><div>{Number(detalhe.saldo_proposta)<0?'Crédito na proposta':'Saldo a pagar'}<strong>{moedaTroca(Math.abs(Number(detalhe.saldo_proposta)))}</strong></div></div><TrocaOrcamentoPanel abrirAvaliacaoInicial={aberturaSino>0} ofertaInicialId={ofertaSelecionada} contexto={{numero:detalhe.contexto.numero_orcamento,cliente:detalhe.contexto.cliente,vendedor:'',veiculo:detalhe.contexto.marca+' '+detalhe.contexto.modelo,valor:detalhe.contexto.valor_negociado_atual}} historicoOfertaId={historicoId} key={String(detalhe.contexto.id_orcamento)+':'+String(ofertaSelecionada)+':'+String(historicoId)+':'+aberturaSino} id={Number(detalhe.contexto.id_orcamento)} somenteConsulta={!!historicoId} onFecharHistorico={historicoId?voltarLista:undefined} situacao={detalhe.contexto.situacao} estado={detalhe} bloqueado={ocupado} onErro={setErro} onOcupado={setOcupado} onSalvo={async d=>{setDetalhe(d);setSucesso('Avaliação/oferta registrada. Saldo atualizado e histórico preservado.');}}/></section></>:<><div className="orc-list-overview" style={{gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))'}}><button className="orc-metric-button" onClick={()=>filtrar('Avaliação pendente')} aria-pressed={filtro==='Avaliação pendente'}><small>Aguardando avaliação</small><strong>{consulta.pendentes}</strong></button><button className="orc-metric-button" onClick={()=>filtrar('Avaliado')} aria-pressed={filtro==='Avaliado'}><small>Avaliados</small><strong>{consulta.avaliados}</strong></button><button className="orc-metric-button" onClick={()=>filtrar('')} aria-pressed={filtro===''}><small>Todas as ofertas</small><strong>{consulta.todas}</strong></button><button className="orc-metric-button" onClick={()=>filtrar('Encerradas')} aria-pressed={filtro==='Encerradas'}><small>Encerradas</small><strong>{consulta.encerradas}</strong></button></div><div className="orc-filters"><label className="field">Buscar<input placeholder="Orçamento, cliente, veículo ou placa" value={busca} onChange={e=>{setBusca(e.target.value);setPagina(1);}}/></label><label className="field">Avaliação<select value={filtro} onChange={e=>filtrar(e.target.value)}><option value="">Todas</option><option>Avaliação pendente</option><option>Avaliado</option><option>Encerradas</option><option>Rejeitada</option><option>Retirada</option></select></label></div><div className="orc-actions"><button className="button secondary" disabled={ocupado} onClick={()=>void carregar()}>{ocupado?'Atualizando...':'Atualizar'}</button><button className="button secondary" onClick={()=>{setBusca('');filtrar('');}}>Limpar filtros</button></div><p className="orc-results" role="status">{consulta.total?`Mostrando ${(consulta.pagina-1)*10+1}–${Math.min(consulta.pagina*10,consulta.total)} de ${consulta.total} oferta(s)`:'Nenhuma oferta encontrada'}</p><div className="orc-table"><table><thead><tr><th>Negociação</th><th>Cliente</th><th>Veículo oferecido</th><th>Avaliação</th><th>Situação do orçamento</th><th>Ação</th></tr></thead><tbody>{filtrados.map(v=><tr key={v.id_veiculo_entrada}><td><button className="orc-link" disabled={ocupado} onClick={()=>void ver(Number(v.id_orcamento),Number(v.id_veiculo_entrada))}>{v.numero_orcamento}</button><small>{v.nosso_numero} · {v.data_cadastro.slice(0,10).split('-').reverse().join('/')}</small></td><td>{v.cliente}</td><td>{v.marca} {v.modelo}<small>{v.placa}</small></td><td><StatusComercial situacao={v.situacao}/>{v.motivo_encerramento&&<small>{v.motivo_encerramento}</small>}<small>{v.valor_avaliado===null?'Sem valor atribuído':moedaTroca(v.valor_avaliado)}</small></td><td><StatusComercial situacao={v.situacao_orcamento}/></td><td><button className="button secondary" disabled={ocupado} onClick={()=>void ver(Number(v.id_orcamento),Number(v.id_veiculo_entrada))}>{Number(v.ativo)===0?'Ver histórico':v.situacao==='Avaliação pendente'?'Abrir para avaliar':'Consultar avaliação'}</button></td></tr>)}{!filtrados.length&&<tr><td colSpan={6}>{ocupado?'Carregando...':'Nenhuma oferta encontrada.'}</td></tr>}</tbody></table></div><nav className="orc-pagination" aria-label="Páginas das ofertas de troca"><span>Página {consulta.pagina} de {consulta.paginas} · 10 por página</span><div><button data-ui-nav="back" className="button secondary" disabled={ocupado||consulta.pagina===1} onClick={()=>setPagina(consulta.pagina-1)}>Anterior</button><button data-ui-nav="next" className="button secondary" disabled={ocupado||consulta.pagina===consulta.paginas} onClick={()=>setPagina(consulta.pagina+1)}>Próxima</button></div></nav></>}
 </div></Layout>;
}
