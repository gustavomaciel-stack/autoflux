import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Layout} from '../components/Layout';
import {useEmpresa} from '../context/EmpresaContext';
import {acessarEmpresa,type Empresa} from '../services/empresaApi';
import {normalizarCnpj,formatarCnpj} from '../services/cnpj';
import './Gerencial.css';
import './EmpresaPage.css';

type Aba='empresa'|'endereco';
const camposCadastro=['razao_social','nome_fantasia','cnpj','telefone','email','cep','logradouro','numero','complemento','bairro','cidade','estado'] as const;
const estados='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

export function EmpresaPage(){
 const {empresa,carregando,erro:erroCarga,definir}=useEmpresa();
 const [form,setForm]=useState<Empresa|null>(null);
 const [aba,setAba]=useState<Aba>('empresa');
 const [erro,setErro]=useState('');
 const [sucesso,setSucesso]=useState('');
 const [salvando,setSalvando]=useState(false);
 const formulario=useRef<HTMLFormElement>(null);
 const aviso=useRef<HTMLDivElement>(null);
 const alterado=!!form&&!!empresa&&camposCadastro.some(k=>form[k]!==empresa[k]);
 useEffect(()=>{if(empresa)setForm({...empresa});},[empresa]);
 useEffect(()=>{if(erro||erroCarga||sucesso)aviso.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[erro,erroCarga,sucesso]);
 function mudar(k:keyof Empresa,valor:string){
  setErro('');setSucesso('');
  setForm(f=>f?{...f,[k]:k==='cnpj'?normalizarCnpj(valor):valor}:f);
 }
 function campo(k:keyof Empresa,label:string,obrigatorio=true,type='text',max=150){
  return <label htmlFor={'empresa-'+k}>{label}{obrigatorio?' *':''}<input id={'empresa-'+k} name={k} data-label={label} type={type} required={obrigatorio} maxLength={max} value={String(form?.[k]??'')} onChange={e=>mudar(k,e.target.value)}/></label>;
 }
 function conferir(secao?:Aba){
  const raiz=secao?formulario.current?.querySelector(`[data-aba="${secao}"]`):formulario.current;
  const invalido=raiz?.querySelector<HTMLInputElement|HTMLSelectElement>('input:invalid, select:invalid');
  if(!invalido)return true;
  setSucesso('');
  setErro(`O cadastro ainda não foi salvo. Confira o campo “${invalido.dataset.label??'obrigatório'}”.`);
  setAba(invalido.closest('section')?.getAttribute('data-aba')==='endereco'?'endereco':'empresa');
  window.setTimeout(()=>{invalido.focus();invalido.reportValidity();},0);
  return false;
 }
 async function salvar(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!form||salvando||!conferir())return;
  setErro('');setSucesso('');setSalvando(true);
  try{
   const nova=await acessarEmpresa(form);
   definir(nova);
   setSucesso('Dados da empresa salvos. A identificação dos próximos relatórios foi atualizada.');
  }catch(e){setErro(e instanceof Error?e.message:'Não foi possível salvar. Seus dados preenchidos foram mantidos.');}
  finally{setSalvando(false);}
 }
 return <Layout><div className="ger-page empresa-page">
  <div className="breadcrumb">Configurações / Dados da empresa</div>
  <header className="ger-hero">
   <div><span className="ger-eyebrow">CONFIGURAÇÕES</span><h1>Dados da empresa</h1><p>Identificação usada no AutoFlux e na impressão dos relatórios.</p></div>
  </header>
  <div ref={aviso}>
   {(erro||erroCarga)&&<div className="ger-erro" role="alert">{erro||erroCarga}</div>}
   {sucesso&&<div className="alert success" role="status">{sucesso}</div>}
  </div>
  {carregando&&<p role="status">Carregando cadastro…</p>}
  {form&&!carregando&&<form id="empresa-form" ref={formulario} noValidate onSubmit={salvar}>
   <fieldset disabled={salvando} className="empresa-fieldset">
    <div className="empresa-form-status"><span className={alterado?'empresa-pendente':''}>{alterado?'Alterações não salvas':empresa?.cadastrada?'Dados salvos no sistema':'Preencha os dados da empresa'}</span><small>Os campos com * são obrigatórios nas duas abas.</small></div>
    <div className="ger-tabs" aria-label="Seções do cadastro">
     <button type="button" aria-pressed={aba==='empresa'} onClick={()=>setAba('empresa')}>Identificação e contato</button>
     <button type="button" aria-pressed={aba==='endereco'} onClick={()=>setAba('endereco')}>Endereço</button>
    </div>
    <section data-aba="empresa" className="ger-card" hidden={aba!=='empresa'}>
     <h2>Identificação e contato</h2><div className="empresa-grid">
      {campo('razao_social','Razão social')}{campo('nome_fantasia','Nome fantasia')}{campo('cnpj','CNPJ',true,'text',18)}{campo('telefone','Telefone com DDD',true,'tel',20)}{campo('email','E-mail',true,'email')}
     </div>
    </section>
    <section data-aba="endereco" className="ger-card" hidden={aba!=='endereco'}>
     <h2>Endereço da empresa</h2><div className="empresa-grid">
      {campo('cep','CEP',true,'text',9)}{campo('logradouro','Logradouro')}{campo('numero','Número ou S/N',true,'text',20)}{campo('complemento','Complemento',false,'text',100)}{campo('bairro','Bairro',true,'text',80)}{campo('cidade','Cidade',true,'text',80)}
      <label htmlFor="empresa-estado">UF *<select id="empresa-estado" name="estado" data-label="UF" required value={form.estado} onChange={e=>mudar('estado',e.target.value)}><option value="">Selecione</option>{estados.map(uf=><option key={uf}>{uf}</option>)}</select></label>
     </div>
    </section>
    <aside className="ger-card empresa-previa">
     <small>Prévia da identificação nos relatórios</small><strong>{form.nome_fantasia||form.razao_social||'Preencha o nome da empresa'}</strong>
     <span>{form.razao_social}{form.cnpj?' · CNPJ '+formatarCnpj(form.cnpj):''}</span><span>{form.telefone}{form.email?' · '+form.email:''}</span><span>{[form.logradouro,form.numero,form.bairro,form.cidade,form.estado].filter(Boolean).join(' · ')}</span>
    </aside>
    <div data-ui-actions="navigation" className="ger-actions empresa-actions">
     {aba==='empresa'?<button data-ui-nav="next" type="button" className="button secondary" onClick={()=>{if(conferir('empresa'))setAba('endereco');}}>Próximo: endereço</button>:<button data-ui-nav="back" type="button" className="button secondary" onClick={()=>setAba('empresa')}>Anterior</button>}
     <button type="submit" className="button primary" disabled={salvando}>{salvando?'Salvando…':'Salvar alterações'}</button>
    </div>
   </fieldset>
  </form>}
 </div></Layout>;
}
