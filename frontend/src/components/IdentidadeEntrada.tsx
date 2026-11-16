import {useEffect,useState} from 'react';
import {buscarVeiculoPorChassi} from '../services/veiculosApi';
import type {Veiculo} from '../types/Veiculo';

const campos=['marca','modelo','versao','ano_fabricacao','ano_modelo','combustivel','placa'] as const;
type Campo=typeof campos[number];
type Dados={chassi:string;renavam?:string|null;cor?:string|null}&Record<Campo,string|number|null>;
export type ConfirmacaoRetorno={id_veiculo:number;chassi:string}&Record<Campo,string|number|null>;
const normalizar=(v:unknown)=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
const rotulos:Record<Campo,string>={marca:'Marca',modelo:'Modelo',versao:'Versão',ano_fabricacao:'Ano de fabricação',ano_modelo:'Ano-modelo',combustivel:'Combustível',placa:'Placa'};

type AtualizarDados<T> = (atualizar: (anterior:T) => T) => void;
const camposPreenchiveis=[...campos,'renavam','cor'] as const;

export function useIdentidadeEntrada<T extends Dados|null>(dados:T,ativo:boolean,atualizarDados:AtualizarDados<T>){
 const chassi=dados?.chassi.trim().toUpperCase()??'';
 const [consulta,setConsulta]=useState<{chassi:string;veiculo:Veiculo|null;erro:string}|null>(null);
 const [tentativa,setTentativa]=useState(0),[confirmado,setConfirmado]=useState('');
 useEffect(()=>{
  let valido=true;setConsulta(null);setConfirmado('');
  if(!ativo||!/^[A-Z0-9]{17}$/.test(chassi))return;
  const timer=window.setTimeout(()=>{
   void buscarVeiculoPorChassi(chassi).then(v=>{if(valido)setConsulta({chassi,veiculo:v,erro:''});})
    .catch(e=>{if(valido)setConsulta({chassi,veiculo:null,erro:e instanceof Error?e.message:'Não foi possível verificar o chassi.'});});
  },250);
  return()=>{valido=false;window.clearTimeout(timer);};
 },[chassi,ativo,tentativa]);
 const atual=ativo&&consulta?.chassi===chassi?consulta:null;
 const encontrado=atual?.veiculo??null;
 const cicloAtivo=!!encontrado&&(Number(encontrado.possui_ciclo_ativo)===1||encontrado.data_encerramento===null);
 useEffect(()=>{
  if(!encontrado||cicloAtivo)return;
  atualizarDados(anterior=>{
   if(!anterior||anterior.chassi.trim().toUpperCase()!==chassi)return anterior;
   const novos=camposPreenchiveis.filter(c=>!normalizar(anterior[c])&&normalizar(encontrado[c]));
   return novos.length?{...anterior,...Object.fromEntries(novos.map(c=>[c,String(encontrado[c])]))}:anterior;
  });
 },[atualizarDados,chassi,cicloAtivo,encontrado]);
 function usarDadosCadastrados(){
  if(!encontrado||cicloAtivo)return;
  atualizarDados(anterior=>{
   if(!anterior||anterior.chassi.trim().toUpperCase()!==chassi)return anterior;
   return {...anterior,...Object.fromEntries(camposPreenchiveis
    .filter(c=>(c!=='renavam'&&c!=='cor')||normalizar(encontrado[c]))
    .map(c=>[c,String(encontrado[c]??'')]))};
  });
 }
 const divergencias=encontrado&&dados?campos.filter(c=>normalizar(encontrado[c])!==normalizar(dados[c])):[];
 const renavamDivergente=!!(encontrado?.renavam&&dados?.renavam&&encontrado.renavam!==dados.renavam);
 const chave=JSON.stringify([chassi,...campos.map(c=>normalizar(dados?.[c])),dados?.renavam??'',encontrado?.id_veiculo,tentativa]);
 useEffect(()=>{setConfirmado('');},[chave]);
 const confirmadoAgora=confirmado===chave;
 const pronto=!ativo||!!atual&&!atual.erro&&!cicloAtivo&&!divergencias.length&&!renavamDivergente&&(!encontrado||confirmadoAgora);
 const confirmacao:ConfirmacaoRetorno|null=pronto&&encontrado?{id_veiculo:Number(encontrado.id_veiculo),chassi:encontrado.chassi,...Object.fromEntries(campos.map(c=>[c,encontrado[c]??'']))} as ConfirmacaoRetorno:null;
 const aviso=!ativo?null:<section className="field-full" aria-label="Conferência do chassi" aria-live="polite" style={{gridColumn:'1 / -1',padding:'16px',border:'1px solid #dce5f2',borderRadius:10}}>
  {!/^[A-Z0-9]{17}$/.test(chassi)?<p>Informe os 17 caracteres alfanuméricos do chassi para consultar o histórico automaticamente.</p>:!atual?<p role="status">Consultando chassi… Aguarde antes de continuar.</p>:atual.erro?<><p className="alert error" role="alert">{atual.erro}</p><button type="button" className="button secondary" onClick={()=>setTentativa(n=>n+1)}>Consultar novamente</button></>:!encontrado?<p>Chassi não cadastrado. Nova entrada liberada.</p>:<>
   <strong>Chassi já cadastrado: {encontrado.marca} {encontrado.modelo}</strong>
   <p>Placa {encontrado.placa} · {encontrado.ano_fabricacao}/{encontrado.ano_modelo} · último ciclo {encontrado.nosso_numero??'sem ciclo'}</p>
   {cicloAtivo?<p className="alert error" role="alert">Este veículo possui ciclo ativo. Outra entrada está bloqueada.</p>:<>
    {!!divergencias.length&&<><p className="alert error" role="alert">A identificação difere do cadastro deste chassi. Confira os documentos e corrija os dados desta entrada. Se o cadastro antigo estiver errado, solicite revisão da Gestão.</p><ul>{divergencias.map(c=><li key={c}><strong>{rotulos[c]}</strong> — cadastrado: {encontrado[c]||'—'} · informado: {dados?.[c]||'—'}</li>)}</ul></>}
    {renavamDivergente&&<p className="alert error" role="alert">O RENAVAM difere do histórico deste chassi. Confira os documentos e solicite revisão da Gestão.</p>}
    {(!!divergencias.length||renavamDivergente)&&<button type="button" className="button secondary" onClick={usarDadosCadastrados}>Usar dados cadastrados</button>}
    {!divergencias.length&&!renavamDivergente&&(confirmadoAgora
     ?<p role="status">Retorno confirmado. A entrada terá um novo AF e os ciclos anteriores serão preservados.</p>
     :<button type="button" className="button secondary" onClick={()=>setConfirmado(chave)}>Confirmar retorno do veículo</button>)}
   </>}
  </>}
 </section>;
 return {pronto,confirmacao,aviso};
}
