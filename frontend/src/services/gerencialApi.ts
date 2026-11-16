import type {IdentificacaoEmpresa} from './empresaApi';
import {apiFetch} from './authApi';
export type TipoAnalise='veiculos'|'aquisicoes'|'despesas'|'orcamentos'|'negociacoes'|'vendas'|'vendedores'|'cadeias';
export interface FiltrosGerenciais {inicio:string;fim:string;busca:string;modelo:string;ano:string;origem:string;vendedor:string}
export interface Indicador {label:string;value:string|number|null;type:'money'|'number'|'percent'}
export interface Coluna {key:string;label:string;type:'text'|'date'|'money'|'number'|'percent'}
export type Linha=Record<string,unknown>;
export interface Relatorio {tipo:TipoAnalise;titulo:string;empresa:string;identificacao_empresa?:IdentificacaoEmpresa;gerado_em:string;filtros:FiltrosGerenciais;colunas:Coluna[];itens:Linha[];resumo:Indicador[];notas:string[];avisos:string[];total:number}
export interface Dashboard {tipo:'dashboard';gerado_em:string;filtros:FiltrosGerenciais;avisos:string[];estoque:Indicador[];situacoes:Record<string,number>;vendas:Indicador[];resultados:Indicador[];meses:{mes:string;quantidade:number;valor:string;resultado:string|null}[];vendedores:Linha[];cadeias:Linha[]}
const URL=import.meta.env.VITE_API_GERENCIAL_URL??(import.meta.env.VITE_API_PEDIDOS_URL?String(import.meta.env.VITE_API_PEDIDOS_URL).replace(/pedidos-venda\.php(?:\?.*)?$/,'gerencial.php'):'http://localhost/autocar/api/routes/gerencial.php');
export async function consultarGerencial<T extends Relatorio|Dashboard>(tipo:TipoAnalise|'dashboard',f:FiltrosGerenciais,signal?:AbortSignal):Promise<T>{
 const r=await apiFetch(URL+'?'+new URLSearchParams({...f,tipo}),{signal,headers:{Accept:'application/json'}});
 let j:{sucesso:boolean;mensagem?:string;dados:T};try{j=await r.json();}catch{throw new Error('A análise retornou uma resposta inválida. Confira a API.');}
 if(!r.ok||!j.sucesso)throw new Error(j.mensagem??'Não foi possível gerar a análise.');return j.dados;
}
export function periodoInicial():FiltrosGerenciais {
 const d=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const parte=(t:string)=>d.find(p=>p.type===t)?.value??'';const hoje=`${parte('year')}-${parte('month')}-${parte('day')}`;
 return {inicio:hoje.slice(0,8)+'01',fim:hoje,busca:'',modelo:'',ano:'',origem:'',vendedor:''};
}
export function formatarGerencial(v:unknown,tipo:string='text'):string {
 if(v===null||v===undefined||v==='')return 'Não informado';
 if(tipo==='date'){const s=String(v),m=/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);return m?`${m[3]}/${m[2]}/${m[1]}${m[4]?` às ${m[4]}:${m[5]}`:''}`:'Não informado';}
 if(tipo==='money')return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
 if(tipo==='percent')return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
 if(tipo==='number')return Number(v).toLocaleString('pt-BR');
 return String(v);
}
