import { useState, type FormEvent } from "react";
import { alterarSenha } from "../services/authApi";
export function AlterarSenhaModal({ aoFechar }: { aoFechar: () => void }) {
 const [atual,setAtual]=useState(""); const [nova,setNova]=useState(""); const [confirmacao,setConfirmacao]=useState("");
 const [erro,setErro]=useState(""); const [sucesso,setSucesso]=useState(false); const [salvando,setSalvando]=useState(false);
 async function salvar(e:FormEvent<HTMLFormElement>) {
  e.preventDefault(); setErro("");
  if(nova!==confirmacao){setErro("A nova senha e a confirmação devem ser iguais.");return;}
  setSalvando(true);
  try{await alterarSenha(atual,nova,confirmacao);setAtual("");setNova("");setConfirmacao("");setSucesso(true);}
  catch(e){setErro(e instanceof Error?e.message:"Não foi possível alterar a senha.");}
  finally{setSalvando(false);}
 }
 return <div className="modal-backdrop"><section className="modal expense-edit-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-alterar-senha">
 <div className="modal-header"><h2 id="titulo-alterar-senha">Alterar senha</h2><button type="button" className="icon-button" onClick={aoFechar} disabled={salvando} aria-label="Fechar">×</button></div>
 <form onSubmit={salvar}><div className="modal-body">
 {erro&&<div className="alert error">{erro}</div>}
 {sucesso?<div className="alert success">Senha alterada com sucesso.</div>:<>
 <label className="field field-full">Senha atual<input type="password" autoComplete="current-password" value={atual} onChange={e=>setAtual(e.target.value)} required disabled={salvando}/></label>
 <label className="field field-full">Nova senha<input type="password" autoComplete="new-password" value={nova} onChange={e=>setNova(e.target.value)} minLength={8} required disabled={salvando}/></label>
 <label className="field field-full">Confirmar nova senha<input type="password" autoComplete="new-password" value={confirmacao} onChange={e=>setConfirmacao(e.target.value)} minLength={8} required disabled={salvando}/></label>
 </>}
 </div><div className="modal-footer expense-edit-actions"><button className="button secondary" type="button" onClick={aoFechar} disabled={salvando}>Fechar</button>{!sucesso&&<button className="button primary" type="submit" disabled={salvando}>{salvando?"Salvando...":"Salvar senha"}</button>}</div></form>
 </section></div>;
}
