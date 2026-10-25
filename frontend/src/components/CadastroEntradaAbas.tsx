import { useEffect, useId, useState, type InvalidEvent } from 'react';
import './CadastroEntradaAbas.css';
export function useCadastroEntradaAbas(aberto:boolean){
 const [etapa,setEtapa]=useState(0);const id=useId();
 useEffect(()=>{if(aberto)setEtapa(0);},[aberto]);
 function validar(e:InvalidEvent<HTMLFormElement>){const campo=e.target as HTMLInputElement;const painel=campo.closest<HTMLElement>('[data-etapa-entrada]');if(painel?.hidden){e.preventDefault();setEtapa(Number(painel.dataset.etapaEntrada));requestAnimationFrame(()=>{campo.focus();campo.reportValidity();});}}
 function proxima(botao:HTMLButtonElement){const painel=botao.form?.querySelector<HTMLElement>('[data-etapa-entrada="0"]');for(const campo of painel?.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')??[]){if(!campo.checkValidity()){campo.reportValidity();campo.focus();return;}}setEtapa(1);requestAnimationFrame(()=>document.getElementById(id+'-tab-1')?.focus());}
 return {etapa,setEtapa,id,validar,proxima};
}
export function CadastroEntradaAbas({id,etapa,onEtapa,tituloSegundo,bloqueado}:{id:string;etapa:number;onEtapa:(e:number)=>void;tituloSegundo:string;bloqueado:boolean}){
 return <div className="entrada-tabs" role="tablist" aria-label="Etapas do cadastro">{['Dados do veículo',tituloSegundo].map((titulo,i)=><button key={i} id={id+'-tab-'+i} type="button" role="tab" aria-selected={etapa===i} aria-controls={id+'-panel-'+i} tabIndex={etapa===i?0:-1} disabled={bloqueado} onClick={()=>onEtapa(i)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const proximo=e.key==='Home'?0:e.key==='End'?1:1-i;onEtapa(proximo);document.getElementById(id+'-tab-'+proximo)?.focus();}}}><span>{i+1}</span>{titulo}</button>)}</div>;
}
