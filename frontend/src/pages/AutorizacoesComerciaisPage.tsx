import { HistoricoAutorizacao } from "../components/HistoricoAutorizacao";
import { AvisoReservaOutraNegociacao } from "../components/AvisoReservaOutraNegociacao";
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { AnaliseComercialDialog } from '../components/AnaliseComercialDialog';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { consultarAutorizacao,decidirAutorizacao,paginarAutorizacoes,type AutorizacaoComercial } from '../services/autorizacoesComerciaisApi';
import './OrcamentosPage.css';
import { StatusComercial } from '../components/StatusComercial';
const moeda=(v:string)=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const percentual=(v:string)=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
const data=(v:string|null)=>{if(!v)return '—';const [a,m,d]=v.slice(0,10).split('-');return `${d}/${m}/${a} ${v.slice(11,19)}`;};
export function AutorizacoesComerciaisPage(){
 const {pode}=useAuth();const permitido=pode('autorizacoes.decidir');
 const [lista,setLista]=useState<AutorizacaoComercial[]>([]),[analise,setAnalise]=useState<AutorizacaoComercial|null>(null);
 const [erro,setErro]=useState(''),[sucesso,setSucesso]=useState(''),[carregando,setCarregando]=useState(false),[salvando,setSalvando]=useState(false),[justificativa,setJustificativa]=useState('');
 const [busca,setBusca]=useState(''),[situacao,setSituacao]=useState(''),[vendedor,setVendedor]=useState(''),[inicio,setInicio]=useState(''),[fim,setFim]=useState('');
 const [aba, setAba] = useState('condicao');
 const trava=useRef(false);
 const [pagina, setPagina] = useState(1);
 const [resultado, setResultado] = useState<Awaited<ReturnType<typeof paginarAutorizacoes>>>();
 const [atualizacao, setAtualizacao] = useState(0);
 const [carregandoLista, setCarregandoLista] = useState(false);
 const pendencias = resultado?.pendencias ?? 0;
 const vendedores = resultado?.vendedores ?? [];
 const filtrados = resultado?.itens ?? [];
 function carregar() { setAtualizacao(atual => atual + 1); }
 const ultimaBuscaLista=useRef(busca);
 useEffect(() => {
  if (!permitido) return;
  const espera=ultimaBuscaLista.current===busca?0:250;ultimaBuscaLista.current=busca;
  let ativo = true;
  setCarregandoLista(true);
  setErro('');
  const timer = window.setTimeout(async () => {
   try {
    const dados = await paginarAutorizacoes({ pagina: String(pagina), busca, situacao, vendedor, inicio, fim });
    if (ativo) setResultado(dados);
   } catch (e) {
    if (ativo) {
     setResultado(undefined);
     setErro(e instanceof Error ? e.message : 'Falha na consulta.');
    }
   } finally {
    if (ativo) setCarregandoLista(false);
   }
  }, espera);
  return () => { ativo = false; window.clearTimeout(timer); };
 }, [permitido, pagina, busca, situacao, vendedor, inicio, fim, atualizacao]);
 async function analisar(id:number, manterAba=false){if(!manterAba)setAba('condicao');setCarregando(true);setErro('');setSucesso('');setAnalise(null);try{setAnalise(await consultarAutorizacao(id));setJustificativa('');}catch(e){setErro(e instanceof Error?e.message:'Falha ao abrir análise.');}finally{setCarregando(false);}}
 useEffect(() => {
  if (!permitido) return;
  function abrirPendencia() {
   const destino = sessionStorage.getItem('autoflux-autorizacao-destino');
   if (destino === null) return;
   sessionStorage.removeItem('autoflux-autorizacao-destino');
   const id = Number(destino);
   if (Number.isSafeInteger(id) && id > 0) void analisar(id);
  }
  abrirPendencia();
  window.addEventListener('autoflux-abrir-autorizacao', abrirPendencia);
  return () => window.removeEventListener('autoflux-abrir-autorizacao', abrirPendencia);
 }, [permitido]);
 async function decidir(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!analise||trava.current)return;const acao=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;if(!acao||!['Aprovada','Rejeitada'].includes(acao.value))return;if(acao.value==='Aprovada'&&analise.reserva_outro_orcamento){setErro('Não é possível aprovar, pois o veículo está reservado em outro orçamento.');return;}
  trava.current=true;setSalvando(true);setErro('');try{const resultado=await decidirAutorizacao(Number(analise.id_aprovacao),acao.value as 'Aprovada'|'Rejeitada',justificativa,Number(analise.id_negociacao));setAnalise(resultado);window.dispatchEvent(new Event('autoflux-autorizacoes-alteradas'));setJustificativa('');carregar();setSucesso(resultado.decisao==='Aprovada'?'Proposta aprovada. Orçamento autorizado.':'Proposta rejeitada. Negociação devolvida ao vendedor para revisão.');}catch(e){setErro(e instanceof Error?e.message:'Falha ao decidir.');}finally{trava.current=false;setSalvando(false);}
 }
 if(!permitido)return <Layout><div className="alert error">Seu perfil não permite consultar ou decidir autorizações.</div></Layout>;
 return <Layout><div className="orc-page"><div className="breadcrumb">Vendas / Autorizações comerciais</div><div className="orc-heading"><div><h1>{analise?'Análise da condição comercial':'Autorizações comerciais'}</h1><p>{pendencias} {pendencias===1?'solicitação pendente':'solicitações pendentes'} · Decisões preservadas no histórico.</p></div>{!analise&&<button className="button secondary" onClick={()=>void carregar()} disabled={carregandoLista}>{carregandoLista?'Atualizando...':'Atualizar'}</button>}</div>
 {erro&&<div className="alert error" role="alert">{erro}</div>}{sucesso&&<div className="alert success" role="status">{sucesso}</div>}
 {analise?<AnaliseComercialDialog bloqueado={salvando||carregando} onFechar={()=>{setAnalise(null);setJustificativa('');setErro('');}}><section className="orc-panel comercial-analysis">{erro&&<div className="alert error" role="alert">{erro}</div>}{sucesso&&<div className="alert success" role="status">{sucesso}</div>}<div className="orc-tabs" role="tablist" aria-label="Análise comercial">
 {([['condicao', 'Condição comercial'], ['historico', 'Histórico']] as const).map(([id, titulo]) => (
  <button key={id} id={'analise-tab-' + id} type="button" role="tab"
   aria-selected={aba === id} aria-controls={'analise-panel-' + id} tabIndex={aba === id ? 0 : -1}
   onClick={() => setAba(id)} onKeyDown={e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const destino = e.key === 'Home' ? 'condicao' : e.key === 'End' ? 'historico' : id === 'condicao' ? 'historico' : 'condicao';
    setAba(destino);
    e.currentTarget.parentElement?.querySelector<HTMLButtonElement>('#analise-tab-' + destino)?.focus();
   }}>{titulo}</button>
 ))}
 </div>
 <div id="analise-panel-condicao" role="tabpanel" aria-labelledby="analise-tab-condicao" hidden={aba !== 'condicao'}>
 {analise.situacao_analise==='Pendente'&&<div className="comercial-warning">Esta proposta precisa de autorização comercial. Confira os valores e informe a justificativa da decisão.</div>}<h3>Resumo da proposta</h3><div className="orc-heading"><h2>{analise.numero_orcamento} · {analise.marca} {analise.modelo}</h2><StatusComercial situacao={analise.situacao_analise}/></div><p>Nosso Número: {analise.nosso_numero} · Placa: {analise.placa}</p><p>Cliente: {analise.cliente} · Vendedor: {analise.vendedor}</p><p>Solicitante: {analise.solicitante} · Data: {data(analise.data_solicitacao)}</p>
 <div className="orc-summary comercial-decision-summary"><div>Base comercial analisada<strong>{moeda(analise.base_comercial_analisada)}</strong></div><div>Preço sugerido original<strong>{moeda(analise.preco_sugerido_analisado)}</strong></div><div>Valor negociado analisado<strong>{moeda(analise.valor_negociado_analisado)}</strong></div><div>Resultado previsto<strong>{moeda(analise.resultado_previsto_analisado)}</strong></div><div>Margem prevista<strong className={Number(analise.margem_prevista_analisada)<Number(analise.percentual_minimo_analisado)?'orc-negative':''}>{percentual(analise.margem_prevista_analisada)}</strong></div><div>Margem mínima preservada<strong>{percentual(analise.percentual_minimo_analisado)}</strong></div></div>
 {analise.situacao_analise==='Pendente'&&<AvisoReservaOutraNegociacao reserva={analise.reserva_outro_orcamento}/>}
 {analise.orcamento?.revisao_custos_necessaria&&<div className="orc-cost-warning"><strong>A proposta precisa de revisão dos custos.</strong><p>A margem registrada não corresponde ao cálculo atual. Edite e salve o orçamento antes de aprovar.</p><button className="button secondary" onClick={()=>{sessionStorage.setItem('autoflux_orcamento_detalhe',String(analise.id_orcamento));window.location.hash='#orcamentos';}}>Revisar orçamento</button></div>}{analise.situacao_analise==='Pendente'?<form onSubmit={decidir}><fieldset disabled={salvando||carregando} style={{border:0,padding:0}}><label className="field">Justificativa da decisão *<textarea value={justificativa} onChange={e=>setJustificativa(e.target.value)} required maxLength={5000} placeholder="Registre os motivos da aprovação excepcional ou da rejeição."/></label><div className="orc-actions"><button data-ui-tone="approve" className="button avaliacao-approve" type="submit" value="Aprovada" disabled={analise.orcamento?.revisao_custos_necessaria||!!analise.reserva_outro_orcamento}>{salvando?'Salvando...':'Aprovar proposta'}</button><button data-ui-tone="reject" className="button danger" type="submit" value="Rejeitada">Rejeitar proposta</button></div></fieldset></form>:<div><p>Decisão: <StatusComercial situacao={analise.situacao_analise}/></p>{analise.aprovador&&<p>Responsável: {analise.aprovador} · Data/hora: {data(analise.data_decisao)}</p>}{analise.observacoes&&<p>Justificativa: {analise.observacoes}</p>}{analise.situacao_analise==='Encerrada sem decisão'&&<p>A proposta foi substituída ou a negociação foi encerrada. Esta solicitação permanece no histórico e não pode receber uma decisão.</p>}</div>}
 </div>
 <div id="analise-panel-historico" role="tabpanel" aria-labelledby="analise-tab-historico" hidden={aba !== 'historico'}>
  <HistoricoAutorizacao analise={analise}/>
 </div>
 <div data-ui-actions="navigation" className="orc-actions"><button data-ui-nav="back" className="button secondary" disabled={salvando} onClick={()=>{setAnalise(null);setJustificativa('');setErro('');}}>Fechar / Voltar</button><button className="button secondary" disabled={salvando||carregando} onClick={()=>void analisar(Number(analise.id_aprovacao), true)}>Atualizar análise</button></div></section></AnaliseComercialDialog>:<><div className="orc-filters"><label className="field">Buscar<input value={busca} onChange={e=>{setPagina(1);setBusca(e.target.value);}} placeholder="Orçamento, veículo, cliente ou vendedor"/></label><label className="field">Situação<select value={situacao} onChange={e=>{setPagina(1);setSituacao(e.target.value);}}><option value="">Todas / histórico</option>{['Pendente','Aprovada','Rejeitada','Encerrada sem decisão'].map(s=><option key={s}>{s}</option>)}</select></label><label className="field">Vendedor<select value={vendedor} onChange={e=>{setPagina(1);setVendedor(e.target.value);}}><option value="">Todos</option>{vendedores.map(v=><option key={v}>{v}</option>)}</select></label><label className="field">Solicitada a partir de<input type="date" value={inicio} onChange={e=>{setPagina(1);setInicio(e.target.value);}}/></label><label className="field">Solicitada até<input type="date" value={fim} onChange={e=>{setPagina(1);setFim(e.target.value);}}/></label></div><div className="orc-actions"><button className="button secondary" onClick={()=>{setPagina(1);setBusca('');setSituacao('');setVendedor('');setInicio('');setFim('');}}>Limpar filtros</button></div><div className="orc-table"><table><thead><tr><th>Orçamento / veículo</th><th>Cliente / vendedor</th><th>Sugerido</th><th>Negociado</th><th>Margem / limite</th><th>Solicitante / data</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{filtrados.map(a=><tr key={a.id_aprovacao}><td>{a.numero_orcamento}<small>{a.nosso_numero} · {a.marca} {a.modelo}</small></td><td>{a.cliente}<small>{a.vendedor}</small></td><td>{moeda(a.preco_sugerido_analisado)}</td><td>{moeda(a.valor_negociado_analisado)}</td><td>{percentual(a.margem_prevista_analisada)}<small>Mínima: {percentual(a.percentual_minimo_analisado)}</small></td><td>{a.solicitante}<small>{data(a.data_solicitacao)}</small></td><td><StatusComercial situacao={a.situacao_analise}/></td><td><button className="button secondary" onClick={()=>void analisar(Number(a.id_aprovacao))} disabled={carregando}>{a.situacao_analise==='Pendente'?'Analisar':'Ver decisão'}</button></td></tr>)}{!filtrados.length&&<tr><td colSpan={8}>{carregandoLista?'Carregando...':'Nenhuma autorização encontrada para estes filtros.'}</td></tr>}</tbody></table></div>
 {resultado && <div className="orc-actions" aria-label="Paginação das autorizações">
  <span>Página {resultado.pagina} de {resultado.paginas} · {resultado.total} registro(s) · 20 por página</span>
  <button type="button" className="button secondary" disabled={carregandoLista || resultado.pagina <= 1}
   onClick={() => setPagina(resultado.pagina - 1)}>Anterior</button>
  <button type="button" className="button secondary" disabled={carregandoLista || resultado.pagina >= resultado.paginas}
   onClick={() => setPagina(resultado.pagina + 1)}>Próxima</button>
 </div>}
 </>}
 </div></Layout>;
}
