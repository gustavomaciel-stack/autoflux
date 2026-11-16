import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useAuth} from './AuthContext';
import {acessarEmpresa,type Empresa} from '../services/empresaApi';
const Context=createContext<{empresa:Empresa|null;erro:string;carregando:boolean;atualizar:()=>Promise<void>;definir:(e:Empresa)=>void}|null>(null);
export function EmpresaProvider({children}:{children:ReactNode}){
 const {usuario}=useAuth();const [empresa,setEmpresa]=useState<Empresa|null>(null);const [erro,setErro]=useState('');const [carregando,setCarregando]=useState(false);
 async function atualizar(){setCarregando(true);setErro('');try{setEmpresa(await acessarEmpresa());}catch(e){setErro(e instanceof Error?e.message:'Não foi possível carregar a empresa.');}finally{setCarregando(false);}}
 useEffect(()=>{let ativo=true;if(!usuario){setEmpresa(null);setErro('');setCarregando(false);return;}setEmpresa(null);setCarregando(true);setErro('');acessarEmpresa().then(e=>{if(ativo)setEmpresa(e);}).catch(e=>{if(ativo)setErro(e.message);}).finally(()=>{if(ativo)setCarregando(false);});return()=>{ativo=false;};},[usuario?.id_usuario]);
 return <Context.Provider value={{empresa,erro,carregando,atualizar,definir:e=>{setEmpresa(e);setErro('');}}}>{children}</Context.Provider>;
}
export function useEmpresa(){const c=useContext(Context);if(!c)throw new Error('EmpresaProvider não inicializado.');return c;}
