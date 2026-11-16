import {apiFetch} from './authApi';
export interface VeiculoGarantia {id_pedido:number;numero_pedido:string;id_ciclo:number;nosso_numero:string;marca:string;modelo:string;placa:string;cliente:string;data_venda:string;fim_garantia:string|null;dias_restantes:number|null;situacao_garantia:string;gastos_garantia:string}
export interface ConsultaGarantias {itens:VeiculoGarantia[];total:number;pagina:number;paginas:number;contadores:{total:number;vigentes:number;vence30:number;vencidas:number}}
export async function consultarGarantias(f:Record<string,string>):Promise<ConsultaGarantias>{
 const pedidos=import.meta.env.VITE_API_PEDIDOS_URL;
 const url=import.meta.env.VITE_API_GARANTIAS_URL??(pedidos?pedidos.replace(/pedidos-venda\.php(?:\?.*)?$/,'garantias.php'):'http://localhost/autocar/api/routes/garantias.php');
 const r=await apiFetch(url+'?'+new URLSearchParams(f),{headers:{Accept:'application/json'}});let j;
 try{j=await r.json();}catch{throw new Error('A consulta de garantias retornou uma resposta inválida. Confira os arquivos da API.');}
 if(!r.ok||!j.sucesso)throw new Error(j.mensagem??'Não foi possível consultar as garantias.');return j.dados;
}
