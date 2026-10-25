import { useAuth } from '../context/AuthContext';
import { podeGerenciarOrcamentos } from '../services/clientesAcesso';
import { useState, type FormEvent } from 'react';
import { alterarOrcamento, type Orcamento } from '../services/orcamentosApi';
const moeda=(v:string)=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const data=(v:string|null)=>v?`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)} ${v.slice(11,19)}`:'—';
export function DestinoSinal({destino,observacoes,onDestino,onObservacoes}:{destino:string;observacoes:string;onDestino:(v:string)=>void;onObservacoes:(v:string)=>void}){
 return <div className="orc-grid"><label className="field">Destino do sinal *<select required value={destino} onChange={e=>onDestino(e.target.value)}><option value="">Selecione</option><option>Devolvido</option><option>Retido</option><option>Transferido</option></select></label><label className="field">Detalhes do destino *<textarea required maxLength={5000} value={observacoes} onChange={e=>onObservacoes(e.target.value)} placeholder="Descreva o destino e, se transferido, identifique a negociação que recebeu o sinal."/></label></div>;
}
export function ReservaOrcamentoPanel({orcamento:o,bloqueado:ocupado,onSalvo,onErro,onOcupado}:{orcamento:Orcamento;bloqueado:boolean;onSalvo:(o:Orcamento)=>Promise<void>;onErro:(s:string)=>void;onOcupado:(v:boolean)=>void}){
 const [acao,setAcao]=useState<'reservar'|'sinal'|'liberar_reserva'|''>('');
 const [valor,setValor]=useState(''),[motivo,setMotivo]=useState(''),[destino,setDestino]=useState(''),[observacoes,setObservacoes]=useState('');
 const { usuario } = useAuth();
 const bloqueado=ocupado || !podeGerenciarOrcamentos(usuario);
 const r=o.reserva_ativa;
 function abrir(a:typeof acao){setAcao(a);setValor('');setMotivo('');setDestino('');setObservacoes('');onErro('');}
 async function salvar(e:FormEvent){e.preventDefault();if(!acao||bloqueado)return;onOcupado(true);onErro('');try{
  const atualizado=await alterarOrcamento(Number(o.id_orcamento),{acao,situacao_anterior:o.situacao,id_negociacao_anterior:Number(o.historico[0].id_negociacao),versao_reserva:o.versao_reserva,valor_negociado:o.valor_negociado_atual,justificativa:motivo,valor_sinal:valor||'0',destino_sinal:destino,observacoes_destino:observacoes});
  setAcao('');await onSalvo(atualizado);
 }catch(e){onErro(e instanceof Error?e.message:'Não foi possível atualizar a reserva.');}finally{onOcupado(false);}}
 return <section className="orc-reservation"><h3>Reserva e sinal</h3>{r?<><p><strong>Veículo reservado nesta negociação.</strong> Responsável: {r.responsavel} · {data(r.data_reserva)}</p><p>Sinal: <strong>{moeda(r.valor_sinal)}</strong>{r.data_sinal&&<> · {r.responsavel_sinal} · {data(r.data_sinal)}</>}</p></>:<p>Esta negociação não possui reserva ativa.</p>}
 <p>Saldo da proposta: <strong>{moeda(o.saldo_proposta)}</strong></p>
 {r&&o.situacao!=='Autorizado'&&<p>A reserva continua ativa, mas a proposta precisa de nova autorização após o ajuste.</p>}
 {!acao&&o.situacao!=='Cancelado'&&<div className="orc-actions">{!r&&o.situacao==='Autorizado'&&<button className="button primary" disabled={bloqueado||o.revisao_custos_necessaria} onClick={()=>abrir('reservar')}>Reservar veículo</button>}{r&&o.situacao==='Autorizado'&&Number(r.valor_sinal)===0&&<button className="button primary" disabled={bloqueado||o.revisao_custos_necessaria} onClick={()=>abrir('sinal')}>Registrar sinal</button>}{r&&<button className="button secondary" disabled={bloqueado} onClick={()=>abrir('liberar_reserva')}>Liberar reserva</button>}</div>}
 {acao&&<form onSubmit={salvar}><fieldset disabled={bloqueado}><h4>{acao==='reservar'?'Reservar veículo':acao==='sinal'?'Registrar sinal':'Liberar reserva'}</h4>{acao!=='liberar_reserva'&&<label className="field">{acao==='reservar'?'Sinal opcional (R$)':'Valor do sinal (R$) *'}<input type="number" min={acao==='sinal'?'0.01':'0'} max={o.valor_negociado_atual} step="0.01" required={acao==='sinal'} value={valor} onChange={e=>setValor(e.target.value)}/></label>}
 <label className="field">{acao==='liberar_reserva'?'Motivo da liberação':'Observações da reserva / sinal'} *<textarea required maxLength={acao==='liberar_reserva'?255:5000} value={motivo} onChange={e=>setMotivo(e.target.value)}/></label>
 {acao==='liberar_reserva'&&r&&Number(r.valor_sinal)>0&&<DestinoSinal destino={destino} observacoes={observacoes} onDestino={setDestino} onObservacoes={setObservacoes}/>}
 <div className="orc-actions"><button type="button" className="button secondary" onClick={()=>setAcao('')}>Voltar</button><button className="button primary" type="submit">{bloqueado?'Salvando...':'Confirmar'}</button></div></fieldset></form>}
 {o.eventos_reserva.length>0&&<><details className="orc-disclosure"><summary>Histórico de reservas e sinais<span>{o.eventos_reserva.length} registro(s)</span></summary><div className="orc-disclosure-body"><h4>Histórico de reservas e sinais</h4><div className="orc-table"><table><thead><tr><th>Data/hora</th><th>Responsável</th><th>Evento</th><th>Sinal</th><th>Destino</th><th>Observações</th></tr></thead><tbody>{o.eventos_reserva.map(e=><tr key={e.id_evento}><td>{data(e.data_evento)}</td><td>{e.responsavel}</td><td>{e.tipo}<small>Reserva #{e.id_reserva}</small></td><td>{moeda(e.valor_sinal)}</td><td>{e.destino_sinal??'—'}</td><td>{e.observacoes??'—'}</td></tr>)}</tbody></table></div></div></details></>}
 </section>;
}
