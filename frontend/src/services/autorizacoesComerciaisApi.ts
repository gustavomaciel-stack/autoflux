import { apiFetch } from './authApi';
import type { Orcamento } from './orcamentosApi';
export interface AutorizacaoComercial {
 id_aprovacao:number;id_orcamento:number;id_negociacao:number;id_usuario_solicitante:number;data_solicitacao:string;id_usuario_aprovador:number|null;decisao:'Pendente'|'Aprovada'|'Rejeitada';data_decisao:string|null;observacoes:string|null;
 base_comercial_analisada:string;preco_sugerido_analisado:string;valor_negociado_analisado:string;resultado_previsto_analisado:string;margem_prevista_analisada:string;percentual_minimo_analisado:string;
 numero_orcamento:string;nosso_numero:string;marca:string;modelo:string;placa:string;cliente:string;vendedor:string;solicitante:string;aprovador:string|null;situacao_analise:string;situacao_orcamento:string;orcamento?:Orcamento;
}
const URL=import.meta.env.VITE_API_AUTORIZACOES_COMERCIAIS_URL??'http://localhost/autocar/api/routes/autorizacoes-comerciais.php';
async function requisitar<T>(query='',dados?:{decisao:'Aprovada'|'Rejeitada';justificativa:string;id_negociacao:number}):Promise<T>{
 const r=await apiFetch(URL+query,{method:dados?'POST':'GET',headers:{Accept:'application/json','Content-Type':'application/json'},body:dados?JSON.stringify(dados):undefined});
 let j:{sucesso:boolean;mensagem?:string;dados:T};try{j=await r.json();}catch{throw new Error('A API de autorizações retornou uma resposta inválida.');}
 if(!r.ok||!j.sucesso)throw new Error(j.mensagem??'Não foi possível consultar as autorizações.');return j.dados;
}
export const listarAutorizacoes=()=>requisitar<AutorizacaoComercial[]>();
export const consultarAutorizacao=(id:number)=>requisitar<AutorizacaoComercial>('?id='+id);
export const decidirAutorizacao=(id:number,decisao:'Aprovada'|'Rejeitada',justificativa:string,id_negociacao:number)=>requisitar<AutorizacaoComercial>('?id='+id,{decisao,justificativa,id_negociacao});
