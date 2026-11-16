import {apiFetch} from './authApi';
export interface AnexoNota {id_anexo:number;nome_original:string;tipo:string;tamanho:number;data_envio:string;responsavel:string|null}
const base=import.meta.env.VITE_API_NOTAS_FISCAIS_ENTRADA_URL??'http://localhost/autocar/api/routes/notas-fiscais-entrada.php';
const url=new URL('anexos-notas-fiscais.php',new URL(base,window.location.href)).toString();
async function resposta(r:Response):Promise<AnexoNota[]>{let d;try{d=await r.json();}catch{throw new Error('Resposta inválida ao consultar anexos. Confira o limite de upload do PHP e a API.');}if(!r.ok||!d.sucesso)throw new Error(d.mensagem??'Não foi possível acessar os anexos.');return d.dados??[];}
export async function listarAnexos(nota:number){return resposta(await apiFetch(`${url}?nota=${nota}`));}
export async function enviarAnexo(nota:number,arquivo:File){const body=new FormData();body.append('arquivo',arquivo);return resposta(await apiFetch(`${url}?nota=${nota}`,{method:'POST',body}));}
export async function baixarAnexo(a:AnexoNota){const r=await apiFetch(`${url}?anexo=${a.id_anexo}`);if(!r.ok){await resposta(r);return;}const blob=await r.blob(),u=URL.createObjectURL(blob),link=document.createElement('a');link.href=u;link.download=a.nome_original;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
