import {useState,type FormEvent} from 'react';
import {useAuth} from '../context/AuthContext';
import {alterarCancelamentoVenda,type Pedido,type DestinoTrocaCancelamento} from '../services/pedidosApi';
import {dataPedido,moedaPedido} from './PedidoResumo';
import './CancelamentoVendaPanel.css';
const hoje=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
type Props={pedido:Pedido;ocupado:boolean;onOcupado:(v:boolean)=>void;onSalvo:(p:Pedido)=>void};
const situacao=(t:DestinoTrocaCancelamento)=>t.pendente?'Destino pendente':t.destino==='Devolvida'?'Devolvida ao cliente':t.destino==='Mantida'?'Mantida conforme acordo':'Entrada cancelada';
function TrocaDestino({troca,pedido,ocupado,onOcupado,onSalvo,editar}:Props&{troca:DestinoTrocaCancelamento;editar:boolean}){
 const [destino,setDestino]=useState(troca.bloqueio_devolucao?'Mantida':'Devolvida');const [data,setData]=useState(hoje());const [just,setJust]=useState('');const [doc,setDoc]=useState('');const [conferido,setConferido]=useState(false);const [erro,setErro]=useState('');
 async function salvar(e:FormEvent<HTMLFormElement>){e.preventDefault();if(ocupado||!conferido)return;setErro('');onOcupado(true);try{onSalvo(await alterarCancelamentoVenda(pedido.id_pedido,{acao:'destino_troca',versao:pedido.versao,id_recebimento:troca.id_recebimento,destino,data_destino:data,justificativa:just,documento:doc,conferido:true}));}catch(e){setErro(e instanceof Error?e.message:'Não foi possível registrar o destino.');}finally{onOcupado(false);}}
 return <article className="destino-troca"><header><div><h4>{troca.marca} {troca.modelo}</h4><p>{troca.placa} · {troca.nosso_numero??'Sem entrada no estoque'}</p></div><strong>{moedaPedido(troca.valor_atribuido)}</strong></header>
 {!troca.pendente?<><strong className="destino-situacao">{troca.destino==='Devolvida'?'Devolvida ao cliente':troca.destino==='Mantida'?'Mantida na revenda / acordo registrado':'Pendência de entrada cancelada'}</strong><p>{troca.justificativa??'A venda foi cancelada antes da entrada desta troca. Nenhum veículo foi retirado do estoque.'}</p>{troca.data_destino&&<small>{dataPedido(troca.data_destino)} · {troca.responsavel}</small>}{troca.documento&&<p>Documento: {troca.documento}</p>}{troca.id_ciclo!==null&&<p>Situação atual do ciclo: {troca.situacao_atual}</p>}</>:<>
 <p><strong>Destino pendente</strong> · Situação atual do ciclo: {troca.situacao_atual}</p>
 {troca.bloqueio_devolucao&&<p className="cancelamento-aviso">Devolução bloqueada: {troca.bloqueio_devolucao} Você pode registrar um acordo para manter a troca sem alterar o estoque.</p>}
 {editar?<form onSubmit={salvar}><fieldset disabled={ocupado} className="destino-fieldset">
 {erro&&<div role="alert" className="alert error">{erro}</div>}
 <div className="orc-grid"><label className="field">Destino da troca<select value={destino} onChange={e=>{setDestino(e.target.value);setConferido(false);}}><option value="Devolvida" disabled={!!troca.bloqueio_devolucao}>Devolver ao cliente</option><option value="Mantida">Manter na revenda / registrar acordo</option></select></label><label className="field">Data da devolução ou do acordo *<input type="date" required value={data} onChange={e=>{setData(e.target.value);setConferido(false);}}/></label></div>
 <label className="field">{destino==='Devolvida'?'Motivo da devolução':'Acordo e justificativa para manter a troca'} *<textarea required maxLength={5000} value={just} onChange={e=>{setJust(e.target.value);setConferido(false);}}/></label>
 <label className="field">Documento da saída/devolução {destino==='Devolvida'?'*':'(opcional)'}<input required={destino==='Devolvida'} maxLength={150} value={doc} onChange={e=>{setDoc(e.target.value);setConferido(false);}} placeholder="Identificação do documento que comprova a devolução ou o acordo"/></label>
 <p>{destino==='Devolvida'?'A confirmação encerra este ciclo e retira o veículo do pátio. A aquisição, a NF e as despesas permanecem no histórico.':'A confirmação registra o acordo e mantém a situação atual do veículo. Não cria saída, venda ou movimentação de dinheiro.'}</p>
 <label className="pedido-check"><input type="checkbox" required checked={conferido} onChange={e=>setConferido(e.target.checked)}/>{destino==='Devolvida'?'Confirmo que este veículo foi entregue ao cliente e conferi o documento da devolução.':'Conferi o acordo com o cliente e confirmo a manutenção da troca conforme a justificativa.'}</label>
 <div className="pedido-actions"><button type="submit" className={'button '+(destino==='Devolvida'?'danger':'primary')} disabled={!conferido||ocupado}>{ocupado?'Registrando…':destino==='Devolvida'?'Confirmar devolução desta troca':'Confirmar manutenção desta troca'}</button></div>
 </fieldset></form>:<p>Somente usuários com permissão para cancelar vendas concluídas podem registrar o destino.</p>}
 </>}
 </article>;
}
export function DestinoTrocasCancelamentoPanel(props:Props){
 const {pode}=useAuth();const [selecionado,setSelecionado]=useState<number|null>(null);const x=props.pedido.cancelamento_venda;
 if(!x?.trocas?.length)return <p>Nenhum veículo recebido em troca nesta venda.</p>;
 const atual=x.trocas.find(t=>t.id_recebimento===selecionado);
 return <section className="destino-trocas destino-selecao">
  {!atual?<><header className="destino-selecao-header"><div><h3>Selecione um veículo de troca</h3><p>{x.pendencias_trocas??0} com destino pendente · {x.trocas.length} no total</p></div></header>
   <div className="destino-lista">{x.trocas.map(t=><article className="destino-linha" key={t.id_recebimento}><div><strong>{t.marca} {t.modelo}</strong><small>{t.placa} · {t.nosso_numero??'Sem entrada'}</small></div><span className={'destino-badge '+(t.pendente?'pendente':'')}>{situacao(t)}</span><strong>{moedaPedido(t.valor_atribuido)}</strong><button type="button" className="button secondary" disabled={props.ocupado} aria-label={(t.pendente?'Definir destino: ':'Ver registro: ')+t.marca+' '+t.modelo+' '+t.placa} onClick={()=>setSelecionado(t.id_recebimento)}>{t.pendente?'Definir destino':'Ver registro'}</button></article>)}</div>
  </>:<header className="destino-selecao-header"><div><h3>{atual.pendente?'Definir destino do veículo':'Registro do veículo'}</h3><p>Você está consultando somente {atual.marca} {atual.modelo} · {atual.placa}.</p></div><button data-ui-nav="back" type="button" className="button secondary" disabled={props.ocupado} onClick={()=>setSelecionado(null)}>Voltar aos veículos</button></header>}
  {x.trocas.map(t=><div hidden={selecionado!==t.id_recebimento} key={t.id_recebimento}><TrocaDestino key={t.id_recebimento+':'+t.destino} {...props} troca={t} editar={pode('vendas.cancelar_concluida')} onSalvo={p=>{props.onSalvo(p);setSelecionado(null);}}/></div>)}
 </section>;
}
