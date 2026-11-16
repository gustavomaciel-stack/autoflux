import {StatusComercial} from '../components/StatusComercial';
import {formatarCnpj} from '../services/cnpj';
import {useAuth} from "../context/AuthContext";
import {useEffect,useRef,useState,Fragment} from 'react';
import {Layout} from '../components/Layout';
import {FiltrosAnalise} from '../components/FiltrosGerenciais';
import {IndicadoresGerenciais} from '../components/IndicadoresGerenciais';
import {consultarGerencial,formatarGerencial as fmt,periodoInicial,type TipoAnalise,type Relatorio,type Linha,type FiltrosGerenciais} from '../services/gerencialApi';
import {abrirPedidoFinanciamento} from '../services/financiamentosApi';
import './Gerencial.css';
export const tiposAnalise:{id:TipoAnalise;nome:string;descricao:string}[]=[
 {id:'vendas',nome:'Vendas e resultados',descricao:'Vendas concluídas, margem e custos atualizados.'},
 {id:'aquisicoes',nome:'Aquisições',descricao:'Entradas de veículos próprios e valores adquiridos.'},
 {id:'despesas',nome:'Despesas',descricao:'Gastos do ciclo e da garantia, com fornecedor e responsável.'},
 {id:'orcamentos',nome:'Orçamentos',descricao:'Propostas, clientes, vendedores e situação atual.'},
 {id:'vendedores',nome:'Vendedores',descricao:'Volume vendido, comissão, resultado e margem.'},
 {id:'cadeias',nome:'Cadeias de trocas',descricao:'Resultado do veículo de origem e das revendas vinculadas.'},
];
const camposDetalhe:Record<string,[string,string]>={numero:['Nosso número / orçamento','text'],pedido:['Pedido','text'],veiculo:['Veículo','text'],placa:['Placa','text'],ano:['Ano','text'],cliente:['Cliente','text'],vendedor:['Vendedor','text'],data:['Data','date'],origem:['Origem','text'],situacao:['Situação','text'],classificacao:['Classificação do resultado','text'],aquisicao:['Aquisição','money'],repasse:['Repasse acordado','money'],custo_origem:['Aquisição / repasse utilizado no resultado','money'],despesas:['Despesas realizadas da loja','money'],proprietario:['Despesas do proprietário sem desconto','money'],descontos:['Despesas descontadas do repasse','money'],garantia_nova:['Novos gastos de garantia da loja','money'],previsoes:['Previsões pendentes da loja','money'],investido:['Total investido no ciclo','money'],projetado:['Total projetado no ciclo','money'],valor:['Valor da operação','money'],impostos:['Impostos estimados','money'],comissao:['Comissão','money'],resultado_original:['Resultado preservado no fechamento','money'],resultado:['Resultado atualizado','money'],margem:['Margem atualizada','percent'],descricao:['Descrição','text'],categoria:['Categoria','text'],fornecedor:['Fornecedor','text'],responsavel:['Responsável','text'],tipo:['Tipo de registro','text'],observacoes:['Observações','text'],resultado_previsto:['Resultado previsto','money'],margem_prevista:['Margem prevista','percent'],vinculos:['Operações vinculadas','text'],pendentes:['Trocas aguardando venda','number'],origem_movimento:['Motivo de entrada no ciclo','text'],sem_resultado:['Operações sem resultado disponível','number']};
function detalhes(linha:Linha){return Object.entries(camposDetalhe).filter(([k])=>Object.hasOwn(linha,k)&&!(linha.custo_origem!==undefined&&['aquisicao','repasse','investido','projetado'].includes(k))).map(([key,[label,type]])=>({key,label,type,value:linha[key]}));}
function ModalDetalhe({linha,tipo,onClose}:{linha:Linha;tipo:TipoAnalise;onClose:()=>void}){
 const {pode}=useAuth();const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();},[]);
 const cadeia=Array.isArray(linha.veiculos_troca);
 const trocas=cadeia?linha.veiculos_troca as Linha[]:[];
 const membros=Array.isArray(linha.itens)?linha.itens as Linha[]:[];
 const resultadoLabel=linha.situacao==='Finalizada'?'Resultado final da cadeia':'Resultado estimado da cadeia';
 return <dialog ref={ref} className={cadeia?'ger-dialog ger-dialog-cadeia':'ger-dialog'} onClose={onClose} onClick={e=>{if(e.target===ref.current)ref.current.close();}}><div className="ger-dialog-header"><div><span className="ger-eyebrow">{cadeia?'Cadeia de trocas':'Detalhes da análise'}</span><h2>{String(linha.pedido??linha.numero??linha.vendedor??linha.veiculo??'Registro')}</h2></div><button className="button secondary" autoFocus onClick={()=>ref.current?.close()}>Fechar</button></div>{cadeia?<div className="ger-cadeia-resumo">
 <div><strong>{String(linha.veiculo)}</strong><small>{[linha.placa,linha.nosso_numero].filter(Boolean).join(' · ')}</small><small>Orçamento {fmt(linha.numero_orcamento,'text')}</small></div>
 <div><span className={linha.situacao==='Em aberto'?'ger-badge ger-badge-estimado':'ger-badge'}>{String(linha.situacao)}</span>
 {linha.situacao==='Em aberto'&&<small>{String(linha.pendentes)} troca(s) aguardando venda</small>}</div>
 <div><small>{resultadoLabel}</small><strong className={Number(linha.resultado)<0?'ger-negativo':undefined}>{fmt(linha.resultado,'money')}</strong></div>
 </div>:<dl className="ger-detalhes">{detalhes(linha).map(d=><div key={d.key}><dt>{tipo==='aquisicoes'&&d.key==='numero'?'Nosso número':d.label}</dt><dd>{linha.numero_orcamento&&d.key==='situacao'?<StatusComercial situacao={fmt(d.value,d.type)}/>:fmt(d.value,d.type)}</dd></div>)}</dl>}{trocas.length>0&&<section>
  <h3>Veículos recebidos em troca</h3>
  {trocas.map(t=><div className="ger-membro" key={String(t.id_recebimento)}>
   <div><strong>{String(t.veiculo || 'Veículo recebido')}</strong>
    <p>{[t.placa,t.numero,t.situacao].filter(Boolean).join(' · ')}</p>
    <p>Recebido no {String(t.pedido_origem)} por {fmt(t.valor_atribuido,'money')}</p>
    {t.pedido_revenda!=null&&<p>Revenda {String(t.pedido_revenda)} · <strong>{fmt(t.valor_revenda,'money')}</strong></p>}
   </div>
   {pode('trocas.visualizar')&&t.pedido_origem!=null&&<button type="button" className="button secondary" onClick={()=>{
    sessionStorage.setItem('autoflux_trocas_recebidas_busca',String(t.pedido_origem));
    window.location.hash='#trocas-recebidas';
   }}>Consultar troca</button>}
  </div>)}
 </section>}
 {membros.length>0&&<section><h3>Vendas desta cadeia</h3>{membros.map((m,i)=><div className="ger-membro" key={i}><strong>{String(m.pedido)} · {String(m.veiculo)}</strong><span>Vendido por {fmt(m.valor,'money')} · Resultado {fmt(m.resultado,'money')}</span></div>)}</section>}
 {pode("pedidos.visualizar")&&Number(linha.id_pedido)>0&&<button className={cadeia?"button secondary ger-cadeia-pedido":"button primary"} onClick={()=>abrirPedidoFinanciamento(Number(linha.id_pedido))}>Consultar pedido de origem</button>}</dialog>;
}
export function RelatoriosPage(){
 const [tipo,setTipo]=useState<TipoAnalise>(()=>{const t=sessionStorage.getItem('autoflux_analise_tipo');sessionStorage.removeItem('autoflux_analise_tipo');return tiposAnalise.some(x=>x.id===t)?t as TipoAnalise:'vendas';});
 function filtrosIniciais():FiltrosGerenciais {let f=periodoInicial();try{const salvo=JSON.parse(sessionStorage.getItem('autoflux_analise_filtros')??'null');if(salvo&&typeof salvo==='object')for(const k of Object.keys(f) as (keyof FiltrosGerenciais)[])if(typeof salvo[k]==='string')f[k]=salvo[k];}catch{/* Mantém o período padrão caso o navegador tenha dados antigos. */}if(['veiculos','aquisicoes','despesas'].includes(tipo))f={...f,vendedor:''};return f;}
 const [filtros,setFiltros]=useState(filtrosIniciais);const [aplicados,setAplicados]=useState<FiltrosGerenciais>(filtrosIniciais);
 useEffect(()=>{sessionStorage.removeItem('autoflux_analise_filtros');},[]);
 const [dados,setDados]=useState<Relatorio|null>(null);const [ocupado,setOcupado]=useState(true);const [erro,setErro]=useState('');const [atualizar,setAtualizar]=useState(0);const [pagina,setPagina]=useState(1);const [detalhe,setDetalhe]=useState<Linha|null>(null);const [impressao,setImpressao]=useState(false);const printRef=useRef<HTMLDialogElement>(null);
 const semVendedor=['veiculos','aquisicoes','despesas'].includes(tipo);
 useEffect(()=>{const controller=new AbortController();setOcupado(true);setDados(null);setErro('');setPagina(1);setDetalhe(null);setImpressao(false);consultarGerencial<Relatorio>(tipo,aplicados,controller.signal).then(setDados).catch(e=>{if(!controller.signal.aborted)setErro(e.message);}).finally(()=>{if(!controller.signal.aborted)setOcupado(false);});return()=>controller.abort();},[tipo,aplicados,atualizar]);
 useEffect(()=>{if(impressao)printRef.current?.showModal();},[impressao]);
 const pendente=JSON.stringify(filtros)!==JSON.stringify(aplicados);
 const filtroTexto=dados?Object.entries(dados.filtros).filter(([,v])=>v!=='').map(([k,v])=>`${({inicio:'De',fim:'Até',busca:'Busca',modelo:'Modelo',ano:'Ano',origem:'Origem',vendedor:'Vendedor'} as Record<string,string>)[k]}: ${['inicio','fim'].includes(k)?fmt(v,'date'):v}`).join(' · ')||'Todos os registros':'';
 function mudarTipo(t:TipoAnalise){const f=['veiculos','aquisicoes','despesas'].includes(t)?{...filtros,vendedor:''}:filtros;setFiltros(f);setAplicados(f);setTipo(t);}
 return <Layout><div className="ger-page"><div className="breadcrumb">Gestão / Análises e relatórios</div><header className="ger-hero"><div><span className="ger-eyebrow">GESTÃO</span><h1>Análises e relatórios</h1><p>Entenda os números de cada operação e consulte os detalhes.</p></div><button className="button secondary" onClick={()=>window.location.hash='#dashboard'}>Ver dashboard</button></header>
 <section className="ger-card ger-selecao"><label>O que você quer analisar?<select value={tipo} onChange={e=>mudarTipo(e.target.value as TipoAnalise)}>{tiposAnalise.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></label><p>{tiposAnalise.find(t=>t.id===tipo)?.descricao}</p></section>
 <FiltrosAnalise valor={filtros} onChange={setFiltros} onSubmit={()=>{setAplicados({...filtros});setAtualizar(n=>n+1);}} ocupado={ocupado} semVendedor={semVendedor}/>
 {pendente&&<p className="ger-status" role="status">Filtros alterados. Clique em “Aplicar filtros” para atualizar a análise.</p>}
 {erro&&<div className="ger-erro" role="alert"><strong>Não foi possível gerar o relatório.</strong><p>{erro}</p><button className="button secondary" onClick={()=>setAtualizar(n=>n+1)}>Tentar novamente</button></div>}
 {ocupado&&<div className="ger-card ger-vazio" role="status">Consultando os registros…</div>}
 {dados&&!ocupado&&<><div className="ger-report-header"><div><h2>{dados.titulo}</h2><p>{filtroTexto}</p><small>Atualizado em {fmt(dados.gerado_em,'date')}</small></div><button className="button primary" disabled={dados.total===0||pendente} onClick={()=>setImpressao(true)}>Visualizar impressão</button></div>
 {dados.avisos.map(a=><p className="ger-aviso" key={a}>{a}</p>)}<IndicadoresGerenciais itens={dados.resumo}/>
 <section className="ger-card"><div className="ger-section-heading"><h3>Registros encontrados <span className="ger-count">{dados.total}</span></h3><small>Totais consideram todos os registros filtrados.</small></div>{dados.total===0?<div className="ger-vazio"><strong>Nenhum registro neste filtro</strong><p>Amplie o período ou ajuste a busca para consultar outras operações.</p></div>:<><div className="ger-table-scroll"><table className={['vendedores','veiculos','cadeias'].includes(tipo)?'ger-table ger-table-vendedores':'ger-table'}><thead><tr>{dados.colunas.map(c=><th key={c.key}>{c.label}</th>)}<th>Detalhes</th></tr></thead><tbody>{dados.itens.slice((pagina-1)*25,pagina*25).map((r,i)=><tr key={i}>{dados.colunas.map(c=><td key={c.key} className={c.type==='money'&&Number(r[c.key])<0?'ger-negativo':undefined}>{tipo==='orcamentos'&&c.key==='situacao'?<StatusComercial situacao={fmt(r[c.key],c.type)}/>:c.key==='classificacao'||c.key==='situacao'?<span className={'ger-badge '+(String(r[c.key]).includes('Cancel')?'ger-badge-cancelado':String(r[c.key]).includes('Estim')?'ger-badge-estimado':'')}>{fmt(r[c.key],c.type)}</span>:fmt(r[c.key],c.type)}</td>)}<td><button className="ger-link" onClick={()=>setDetalhe(r)}>Ver detalhes</button></td></tr>)}</tbody></table></div><div className="ger-paginacao"><span>{Math.min((pagina-1)*25+1,dados.total)}–{Math.min(pagina*25,dados.total)} de {dados.total}</span><div><button data-ui-nav="back" className="button secondary" disabled={pagina===1} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Página {pagina} de {Math.ceil(dados.total/25)}</span><button data-ui-nav="next" className="button secondary" disabled={pagina*25>=dados.total} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div></div></>}
 </section><aside className="ger-notas">{dados.notas.map(n=><p key={n}>{n}</p>)}</aside></>}
 {detalhe&&<ModalDetalhe linha={detalhe} tipo={tipo} onClose={()=>setDetalhe(null)}/>}
 {impressao&&dados&&<dialog ref={printRef} className="ger-preview-dialog" onClose={()=>setImpressao(false)}><div className="ger-dialog-header ger-no-print"><div><h2>Conferir impressão</h2><p>{dados.total} registros · inclui todas as páginas da consulta</p></div><div className="ger-actions"><button data-ui-nav="back" className="button secondary" autoFocus onClick={()=>printRef.current?.close()}>Voltar</button><button className="button primary" onClick={()=>window.print()}>Imprimir / salvar PDF</button></div></div><article className="ger-print-content"><header><strong>{dados.empresa} · AutoFlux</strong><h1>{dados.titulo}</h1>{dados.identificacao_empresa&&<><p>{dados.identificacao_empresa.razao_social}{dados.identificacao_empresa.cnpj?` · CNPJ ${formatarCnpj(dados.identificacao_empresa.cnpj)}`:""}</p><p>{dados.identificacao_empresa.endereco}</p><p>{dados.identificacao_empresa.telefone} · {dados.identificacao_empresa.email}</p></>}<p>{filtroTexto}</p><small>Gerado em {fmt(dados.gerado_em,'date')} · {dados.total} registros</small></header><IndicadoresGerenciais itens={dados.resumo}/>{dados.avisos.map(a=><p className="ger-aviso" key={a}>{a}</p>)}<table className={['vendedores','veiculos','cadeias'].includes(tipo)?'ger-table ger-table-vendedores':'ger-table'}><thead><tr>{dados.colunas.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{dados.itens.map((r,i)=><Fragment key={i}><tr>{dados.colunas.map(c=><td key={c.key}>{fmt(r[c.key],c.type)}</td>)}</tr>{['vendas','veiculos','cadeias'].includes(tipo)&&<tr className="ger-print-composicao"><td colSpan={dados.colunas.length}>{detalhes(r).filter(d=>['custo_origem','aquisicao','repasse','despesas','proprietario','descontos','garantia_nova','previsoes','impostos','comissao','vinculos','resultado_original'].includes(d.key)&&d.value!==null).map(d=>`${d.label}: ${fmt(d.value,d.type)}`).join(' · ')}</td></tr>}</Fragment>)}</tbody></table><div className="ger-notas">{dados.notas.map(n=><p key={n}>{n}</p>)}</div></article></dialog>}
 </div></Layout>;
}
