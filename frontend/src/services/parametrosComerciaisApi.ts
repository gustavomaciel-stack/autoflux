import { apiFetch } from './authApi';

export const nomesImpostos=['ICMS','PIS','COFINS','CSLL','IRPJ'] as const;
export type NomeImposto=typeof nomesImpostos[number];
export type ImpostosConfig=Record<NomeImposto,{base:string;aliquota:string}>;
export const impostosPadrao=():ImpostosConfig=>({ICMS:{base:'5.00',aliquota:'17.00'},PIS:{base:'100.00',aliquota:'0.65'},COFINS:{base:'100.00',aliquota:'3.00'},CSLL:{base:'12.00',aliquota:'9.00'},IRPJ:{base:'8.00',aliquota:'15.00'}});
export function totalImpostos(itens:ImpostosConfig){return Math.round(nomesImpostos.reduce((s,n)=>s+Math.round(Number(itens[n].base)*100)*Math.round(Number(itens[n].aliquota)*100),0)/10000)/100;}
export interface ParametroComercial {
  impostos:ImpostosConfig|null;
  id_parametro: number;
  percentual_padrao: string;
  percentual_minimo: string; percentual_imposto_estimado: string;
  inicio_vigencia: string;
  fim_vigencia: string | null;
  data_cadastro: string;
  usuario_responsavel: string;
  ativo: number;
}
export interface DadosParametros { vigente: ParametroComercial | null; historico: ParametroComercial[] }
const URL = import.meta.env.VITE_API_PARAMETROS_COMERCIAIS_URL ?? 'http://localhost/autocar/api/routes/parametros-comerciais.php';

async function requisitar(dados?: { percentual_padrao: string; percentual_minimo: string; impostos:ImpostosConfig; id_parametro_anterior: number | null }): Promise<DadosParametros> {
  const resposta = await apiFetch(URL, { method:dados ? 'POST' : 'GET', headers:{Accept:'application/json','Content-Type':'application/json'}, body:dados ? JSON.stringify(dados) : undefined });
  let resultado: { sucesso: boolean; mensagem?: string; dados: DadosParametros };
  try { resultado = await resposta.json(); }
  catch { throw new Error('A API de parâmetros retornou uma resposta inválida.'); }
  if (!resposta.ok || !resultado.sucesso) throw new Error(resultado.mensagem ?? 'Não foi possível acessar os parâmetros.');
  return resultado.dados;
}
export function consultarParametros(): Promise<DadosParametros> { return requisitar(); }
export function salvarParametros(percentual_padrao: string, percentual_minimo: string, id_parametro_anterior: number | null, impostos:ImpostosConfig): Promise<DadosParametros> {
  return requisitar({percentual_padrao,percentual_minimo,id_parametro_anterior,impostos});
}
