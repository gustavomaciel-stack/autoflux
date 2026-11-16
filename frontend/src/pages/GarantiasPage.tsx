import {GarantiaPedidoPanel} from '../components/GarantiaPedidoPanel';
import {consultarPedido,type Pedido} from '../services/pedidosApi';
import {useEffect,useRef,useState} from 'react';
import {Layout} from '../components/Layout';
import {moedaPedido} from '../components/PedidoResumo';
import {consultarGarantias,type ConsultaGarantias} from '../services/garantiasApi';
import './OrcamentosPage.css';import './PedidosPage.css';import './GarantiasPage.css';
const formatarData=(v:string|null)=>v?v.slice(0,10).split('-').reverse().join('/'):'—';
const vazio:ConsultaGarantias={itens:[],total:0,pagina:1,paginas:1,contadores:{total:0,vigentes:0,vence30:0,vencidas:0}};
export function GarantiasPage(){
 const [preferencias]=useState(()=>{try{const p=JSON.parse(sessionStorage.getItem('autoflux_garantias_filtros')??'null');return p&&typeof p.busca==='string'&&['vigente','vence30','vencida','todas'].includes(p.situacao)?p:null;}catch{return null;}});
 const [busca,setBusca]=useState<string>(preferencias?.busca??''),[situacao,setSituacao]=useState<string>(preferencias?.situacao??'vigente'),[pagina,setPagina]=useState<number>(Number.isInteger(preferencias?.pagina)&&preferencias.pagina>0?preferencias.pagina:1),[recarregar,setRecarregar]=useState(0),[dados,setDados]=useState(vazio),[carregando,setCarregando]=useState(true),[erro,setErro]=useState('');
 useEffect(()=>{sessionStorage.setItem('autoflux_garantias_filtros',JSON.stringify({busca,situacao,pagina}));},[busca,situacao,pagina]);
 const ultimaBuscaLista=useRef(busca);
 useEffect(()=>{const espera=ultimaBuscaLista.current===busca?0:250;ultimaBuscaLista.current=busca;let atual=true;setCarregando(true);setErro('');const timer=window.setTimeout(()=>{void consultarGarantias({busca,situacao,pagina:String(pagina)}).then(r=>{if(atual)setDados(r);}).catch(e=>{if(atual){setErro(e instanceof Error?e.message:'Não foi possível carregar as garantias.');setDados(vazio);}}).finally(()=>{if(atual)setCarregando(false);});},espera);return()=>{atual=false;window.clearTimeout(timer);};},[busca,situacao,pagina,recarregar]);
 const [pedido,setPedido]=useState<Pedido|null>(null),[ocupado,setOcupado]=useState(false),[erroDetalhe,setErroDetalhe]=useState('');
 async function abrir(id:number){
  setOcupado(true);setErroDetalhe('');
  try{setPedido(await consultarPedido(id));}
  catch(e){setErroDetalhe(e instanceof Error?e.message:'Não foi possível abrir a garantia.');}
  finally{setOcupado(false);}
 }
 function filtrar(v:string){setSituacao(v);setPagina(1);}
 if(pedido)return <Layout><div className="orc-page pedidos-page garantias-page">
  <div className="breadcrumb">Financeiro / Garantias e pós-venda</div>
  <header className="pedido-page-header"><div><h1>{pedido.dados.marca} {pedido.dados.modelo}</h1><p>{pedido.numero_pedido} · {pedido.dados.placa} · {pedido.dados.cliente}</p></div>
   <button type="button" className="button secondary" disabled={ocupado} onClick={()=>{setPedido(null);setErroDetalhe('');setRecarregar(n=>n+1);}}>Voltar à lista</button></header>
  {erroDetalhe&&<div className="alert error" role="alert">{erroDetalhe}</div>}
  <section className="pedido-card"><GarantiaPedidoPanel pedido={pedido} ocupado={ocupado} onOcupado={setOcupado} onErro={setErroDetalhe} onSalvo={setPedido}/></section>
 </div></Layout>;
 return <Layout><div className="orc-page pedidos-page garantias-page"><div className="breadcrumb">Financeiro / Garantias e pós-venda</div><header className="pedido-page-header"><div><h1>Garantias e pós-venda</h1><p>Acompanhe os prazos dos veículos vendidos e as despesas de garantia.</p></div><button type="button" className="button secondary" disabled={carregando} onClick={()=>setRecarregar(n=>n+1)}>Atualizar consulta</button></header>
 <div className="garantias-indicadores">{[{id:'vigente',nome:'Em garantia',n:dados.contadores.vigentes},{id:'vence30',nome:'Vencem em até 30 dias',n:dados.contadores.vence30},{id:'vencida',nome:'Vencidas',n:dados.contadores.vencidas}].map(c=><button type="button" key={c.id} aria-pressed={situacao===c.id} onClick={()=>filtrar(c.id)}><span>{c.nome}</span><strong>{carregando?'—':c.n}</strong></button>)}</div>
 <section className="pedido-card"><div className="garantias-filtros"><label className="field">Buscar veículo ou cliente<input type="search" maxLength={150} value={busca} onChange={e=>{setBusca(e.target.value);setPagina(1);}} placeholder="Placa, marca, modelo, cliente, pedido ou nosso número"/></label><label className="field">Situação<select value={situacao} onChange={e=>filtrar(e.target.value)}><option value="vigente">Em garantia</option><option value="vence30">Vencem em até 30 dias</option><option value="vencida">Vencidas</option><option value="todas">Todas as vendas concluídas</option></select></label></div><div className="garantias-toolbar"><button type="button" className="orc-link" onClick={()=>{setBusca('');setSituacao('vigente');setPagina(1);}}>Limpar filtros</button></div>
 {erroDetalhe&&<div className="alert error" role="alert">{erroDetalhe}</div>}{erro&&<div className="alert error" role="alert">{erro}</div>}<p className="garantias-contagem" role="status">{carregando?'Carregando garantias...':dados.total+' veículo(s) encontrado(s)'}</p>
 <div className="orc-table garantias-tabela" aria-busy={carregando}><table><thead><tr><th>Veículo / pedido</th><th>Cliente</th><th>Período de garantia</th><th>Situação / prazo</th><th>Gastos da loja</th><th></th></tr></thead><tbody>{!erro&&dados.itens.map(v=><tr key={v.id_pedido}><td><strong>{v.marca} {v.modelo}</strong><small>{v.placa} · {v.nosso_numero}</small><small>{v.numero_pedido}</small></td><td>{v.cliente}</td><td><span>{formatarData(v.data_venda)}</span><small>Até {formatarData(v.fim_garantia)}</small></td><td><span className={'garantias-status '+(v.situacao_garantia==='Vigente'?'vigente':v.situacao_garantia==='Vencida'?'vencida':'pendente')}>{v.situacao_garantia}</span>{v.dias_restantes!==null&&<small>{v.dias_restantes===0?'Vence hoje':v.dias_restantes>0?v.dias_restantes+' dia(s) restante(s)':'Vencida há '+Math.abs(v.dias_restantes)+' dia(s)'}</small>}</td><td>{moedaPedido(v.gastos_garantia)}</td><td><button type="button" className="button secondary" disabled={carregando||ocupado} onClick={()=>void abrir(v.id_pedido)}>Abrir garantia</button></td></tr>)}{(!dados.itens.length||erro)&&<tr><td colSpan={6} className="pedido-empty">{carregando?'Carregando...':erro?'Tente atualizar a consulta.':'Nenhum veículo neste filtro.'}</td></tr>}</tbody></table></div>
 <nav className="orc-pagination" aria-label="Páginas de garantias"><span>Página {dados.pagina} de {dados.paginas} · {dados.total} registro(s) · 20 por página</span><div><button data-ui-nav="back" type="button" className="button secondary" disabled={carregando||dados.pagina<=1} onClick={()=>setPagina(dados.pagina-1)}>Anterior</button><button data-ui-nav="next" type="button" className="button secondary" disabled={carregando||dados.pagina>=dados.paginas} onClick={()=>setPagina(dados.pagina+1)}>Próxima</button></div></nav><p className="garantias-nota">O prazo informado é de 90 dias corridos contados da conclusão da venda no sistema. Os indicadores acompanham a busca.</p></section></div></Layout>;
}
