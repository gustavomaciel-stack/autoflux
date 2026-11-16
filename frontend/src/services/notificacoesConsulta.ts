import {listarTrocas,type ResumoTroca} from './trocasApi';
import {listarAutorizacoes,type AutorizacaoComercial} from './autorizacoesComerciaisApi';
import {listarRepassesPendentes,type RepassePendente} from './pedidosApi';
import {consultarRecebidas,type TrocaRecebidaResumo} from './trocasRecebidasApi';
import {consultarPaginasNotificacoes} from './notificacoesLeitura';

export interface FontesNotificacoes {avaliacoes:boolean;autorizacoes:boolean;repasses:boolean;entradas:boolean}
function buscar(fontes:FontesNotificacoes){
 return Promise.allSettled([
  fontes.avaliacoes?consultarPaginasNotificacoes(p=>listarTrocas(p,'','Avaliação pendente')):Promise.resolve([] as ResumoTroca[]),
  fontes.autorizacoes?listarAutorizacoes():Promise.resolve([] as AutorizacaoComercial[]),
  fontes.repasses?listarRepassesPendentes():Promise.resolve([] as RepassePendente[]),
  fontes.entradas?consultarPaginasNotificacoes(p=>consultarRecebidas(p,'','pendentes')):Promise.resolve([] as TrocaRecebidaResumo[]),
 ]);
}
type Resultado=Awaited<ReturnType<typeof buscar>>;
type Cache={valor?:Resultado;ate:number;emCurso?:Promise<Resultado>};
const consultas=new Map<string,Cache>();
const chave=(usuario:string,fontes:FontesNotificacoes)=>JSON.stringify([usuario,fontes.avaliacoes,fontes.autorizacoes,fontes.repasses,fontes.entradas]);
export function invalidarNotificacoes(usuario:string,fontes:FontesNotificacoes):void {consultas.delete(chave(usuario,fontes));}
export function limparConsultasNotificacoes():void {consultas.clear();}
export function consultarNotificacoes(usuario:string,fontes:FontesNotificacoes):Promise<Resultado>{
 const id=chave(usuario,fontes);const agora=Date.now();let cache=consultas.get(id);
 if(cache?.emCurso)return cache.emCurso;
 if(cache?.valor&&cache.ate>agora)return Promise.resolve(cache.valor);
 cache={ate:0};consultas.set(id,cache);const entrada=cache;
 entrada.emCurso=buscar(fontes).then(resultado=>{
  if(consultas.get(id)===entrada){entrada.valor=resultado;entrada.ate=Date.now()+(resultado.some(r=>r.status==='rejected')?2000:30000);}
  return resultado;
 }).finally(()=>{entrada.emCurso=undefined;});
 return entrada.emCurso;
}
