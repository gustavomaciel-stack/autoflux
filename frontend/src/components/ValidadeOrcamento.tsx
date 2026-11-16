import type { VersaoValidade } from '../services/orcamentosApi';
import './ValidadeOrcamento.css';
const data=(v:string|null)=>v?`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}`:'—';
export function ValidadeOrcamento({validade,hoje,novaValidade,situacao,podeRenovar,ocupado,onRenovar}:{validade:string;hoje:string;novaValidade:string;situacao:string;podeRenovar:boolean;ocupado:boolean;onRenovar:()=>void}){
 if(validade>=hoje||!['Em negociação','Aguardando aprovação','Autorizado'].includes(situacao))return null;
 return <div className="orc-expiry" role="status"><div><strong>Orçamento vencido</strong><p>A validade terminou em {data(validade)}. O versionamento renova o prazo até <b>{data(novaValidade)}</b> e registra a alteração no histórico.</p>{!podeRenovar&&<small>Um usuário com permissão para gerenciar orçamentos pode renovar a validade.</small>}</div>{podeRenovar&&<button type="button" className="button primary" disabled={ocupado} onClick={onRenovar}>{ocupado?'Aguarde...':'Versionamento'}</button>}</div>;
}
export function HistoricoValidade({registros=[]}:{registros?:VersaoValidade[]}){
 if(!registros.length)return null;
 return <details className="orc-disclosure"><summary>Versionamentos da validade<span>{registros.length} renovação(ões)</span></summary><div className="orc-disclosure-body"><div className="orc-table"><table><thead><tr><th>Versão</th><th>Renovação</th><th>Responsável</th><th>Validade anterior</th><th>Nova validade</th></tr></thead><tbody>{registros.map((v,i)=><tr key={v.id_negociacao}><td>V{registros.length-i+1}</td><td>{data(v.data_negociacao)}<small>{v.data_negociacao.slice(11,16)}</small></td><td>{v.usuario_responsavel}</td><td>{data(v.validade_anterior)}</td><td><strong>{data(v.validade_nova)}</strong></td></tr>)}</tbody></table></div><p className="orc-expiry-note">Cada renovação mantém o registro anterior. Valores, sinal, trocas e autorizações não são alterados pelo versionamento da validade.</p></div></details>;
}
