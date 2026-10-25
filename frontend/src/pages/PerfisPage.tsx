import "./PerfisPage.css";
import { useEffect, useState, type FormEvent } from "react";
import { Layout } from "../components/Layout";
import { apiFetch } from "../services/authApi";
interface Perfil { id_perfil: number; nome: string; descricao: string | null; ativo: number | string; gestao: boolean; permissoes: string[] }
interface Item { codigo: string; nome: string; modulo: string }
const URL_PERFIS = import.meta.env.VITE_API_PERFIS_URL ?? "http://localhost/autocar/api/routes/perfis.php";
const reservadas = ["usuarios.administrar","perfis.administrar","consignacoes.devolver"];
export function PerfisPage() {
 const [perfis,setPerfis]=useState<Perfil[]>([]);
 const [catalogo,setCatalogo]=useState<Item[]>([]);
 const [selecionado,setSelecionado]=useState<Perfil|null>(null);
 const [nome,setNome]=useState("");const [descricao,setDescricao]=useState("");
 const [ativo,setAtivo]=useState(true);const [codigos,setCodigos]=useState<string[]>([]);
 const [editando,setEditando]=useState(false);const [ocupado,setOcupado]=useState(false);
 const [erro,setErro]=useState("");const [mensagem,setMensagem]=useState("");
 async function carregar() {
  const r=await apiFetch(URL_PERFIS);const j=await r.json();
  if(!r.ok || !j.sucesso) throw new Error(j.mensagem??"Não foi possível consultar os perfis.");
  setPerfis(j.dados.perfis);setCatalogo(j.dados.catalogo);
 }
 useEffect(()=>{carregar().catch(e=>setErro(e.message));},[]);
 function abrir(p:Perfil|null){setSelecionado(p);setNome(p?.nome??"");setDescricao(p?.descricao??"");setAtivo(p?Number(p.ativo)===1:true);setCodigos((p?.permissoes??[]).filter(c=>catalogo.some(item=>item.codigo===c)&&!reservadas.includes(c)));setErro("");setMensagem("");setEditando(true);}
 function marcar(c:string){setCodigos(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c]);}
 async function salvar(e:FormEvent){
  e.preventDefault();setOcupado(true);setErro("");setMensagem("");
  try{
   const r=await apiFetch(URL_PERFIS+(selecionado?`?id=${selecionado.id_perfil}`:""),{method:selecionado?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome,descricao,ativo:ativo?1:0,permissoes:codigos})});
   const j=await r.json();if(!r.ok||!j.sucesso)throw new Error(j.mensagem??"Não foi possível salvar.");
   await carregar();setEditando(false);setMensagem("Perfil salvo. Quem estiver conectado deve atualizar a página para renovar os menus; a API já aplica as novas regras.");
  }catch(e){setErro(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setOcupado(false);}
 }
 return <Layout>
 <div className="page-toolbar perfis-toolbar"><div><h1>Perfis e permissões</h1><p>Configure os acessos de cada perfil. Os perfis ativos de um usuário somam permissões.</p></div><button className="button primary" onClick={()=>abrir(null)}>+ Novo perfil</button></div>
 {erro&&<div className="alert error">{erro}</div>}{mensagem&&<div className="alert success">{mensagem}</div>}
 <div className="table-card"><table><thead><tr><th>Perfil</th><th>Descrição</th><th>Situação</th><th>Acessos</th><th>Ações</th></tr></thead><tbody>{perfis.map(p=><tr key={p.id_perfil}><td>{p.nome}</td><td>{p.descricao??"—"}</td><td>{Number(p.ativo)===1?"Ativo":"Inativo"}</td><td>{p.gestao?"Acesso integral":p.permissoes.length+" permissões"}</td><td>{p.gestao?<span>Acesso integral protegido</span>:<button className="button secondary" onClick={()=>abrir(p)}>Editar permissões</button>}</td></tr>)}</tbody></table></div>
 {editando&&<div className="modal-backdrop"><section className="modal expense-edit-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-perfil"><div className="modal-header"><h2 id="titulo-perfil">{selecionado?"Editar perfil":"Novo perfil"}</h2><button type="button" className="icon-button" disabled={ocupado} aria-label="Fechar" onClick={()=>setEditando(false)}>×</button></div>
 <form onSubmit={salvar}><div className="modal-body">
 {erro&&<div className="alert error">{erro}</div>}
 <label className="field">Nome<input value={nome} onChange={e=>setNome(e.target.value)} required maxLength={100} disabled={ocupado}/></label>
 <label className="field">Descrição<input value={descricao} onChange={e=>setDescricao(e.target.value)} maxLength={255} disabled={ocupado}/></label>
 <label><input type="checkbox" checked={ativo} disabled={ocupado} onChange={e=>setAtivo(e.target.checked)}/> Perfil ativo</label>
 {Array.from(new Set(catalogo.map(c=>c.modulo))).map(mod=><fieldset key={mod} style={{marginTop:16,border:"1px solid #ccd3df",borderRadius:7,padding:12}}><legend>{mod}</legend>{catalogo.filter(c=>c.modulo===mod&&!reservadas.includes(c.codigo)).map(c=><label key={c.codigo} style={{display:"flex",gap:8,alignItems:"center",margin:8}}><input type="checkbox" checked={codigos.includes(c.codigo)} disabled={ocupado} onChange={()=>marcar(c.codigo)}/>{c.nome}</label>)}{catalogo.filter(c=>c.modulo===mod).every(c=>reservadas.includes(c.codigo))&&<p>Exclusivo de Gestão/Diretoria.</p>}</fieldset>)}
 <p>Acesso a custos expõe aquisição, repasse e totais. Conceda leitura de despesas para abrir o resumo financeiro. Cadastro e edição são permissões separadas. Ao salvar, o sistema inclui as consultas necessárias para executar as ações selecionadas.</p>
 </div><div className="modal-footer expense-edit-actions"><button className="button secondary" type="button" disabled={ocupado} onClick={()=>setEditando(false)}>Cancelar</button><button className="button primary" disabled={ocupado} type="submit">{ocupado?"Salvando...":"Salvar perfil"}</button></div></form></section></div>}
 </Layout>;
}
