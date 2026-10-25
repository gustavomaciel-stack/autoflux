import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function AnaliseComercialDialog({children,bloqueado,onFechar}:{children:ReactNode;bloqueado:boolean;onFechar:()=>void}){
 const ref=useRef<HTMLDivElement>(null);
 const fechar=useRef(onFechar);fechar.current=onFechar;
 useEffect(()=>{
  const anterior=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.focus();
  const teclado=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){if(!bloqueado)fechar.current();return;}
   if(e.key!=='Tab')return;
   const campos=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')??[]);
   const primeiro=campos[0],ultimo=campos[campos.length-1];
   if(!primeiro){e.preventDefault();return;}
   if(e.shiftKey&&(document.activeElement===primeiro||document.activeElement===ref.current)){e.preventDefault();ultimo.focus();}
   else if(!e.shiftKey&&(document.activeElement===ultimo||document.activeElement===ref.current)){e.preventDefault();primeiro.focus();}
  };
  document.addEventListener('keydown',teclado);
  return()=>{document.removeEventListener('keydown',teclado);document.body.style.overflow=overflow;anterior?.focus();};
 },[bloqueado]);
 return createPortal(<div className="comercial-overlay"><div ref={ref} className="orc-page comercial-dialog" role="dialog" aria-modal="true" aria-labelledby="comercial-dialog-title" tabIndex={-1}><header className="comercial-dialog-header"><h2 id="comercial-dialog-title">Analisar condição comercial</h2><button type="button" className="comercial-close" disabled={bloqueado} onClick={onFechar} aria-label="Fechar análise">×</button></header>{children}</div></div>,document.body);
}
