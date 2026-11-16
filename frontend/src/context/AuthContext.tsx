import { AvisoInatividade } from "./AvisoInatividade";
import {limparConsultasNotificacoes} from '../services/notificacoesConsulta';
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { consultarSessao, entrar, sair, type UsuarioAutenticado } from "../services/authApi";
interface AuthState {
  usuario: UsuarioAutenticado | null;
  pode: (codigo: string) => boolean;
  carregando: boolean;
  erroInicial: string;
  autenticar: (login: string, senha: string) => Promise<void>;
  encerrar: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroInicial, setErroInicial] = useState("");
  useEffect(() => {
    let ativo = true;
    consultarSessao().then(u => { if (ativo) setUsuario(u); })
      .catch(e => { if (ativo) setErroInicial(e instanceof Error ? e.message : "Não foi possível consultar a sessão."); })
      .finally(() => { if (ativo) setCarregando(false); });
    function expirar() { limparConsultasNotificacoes(); setUsuario(null); window.location.hash = "login"; }
    window.addEventListener("autoflux-sessao-expirada", expirar);
    return () => { ativo = false; window.removeEventListener("autoflux-sessao-expirada", expirar); };
  }, []);
  async function autenticar(login: string, senha: string) {
    limparConsultasNotificacoes();
    const u = await entrar(login, senha);
    setErroInicial(""); setUsuario(u); window.location.hash = "veiculos";
  }
  async function encerrar() {
    await sair(); limparConsultasNotificacoes(); setUsuario(null); window.location.hash = "login";
  }
  function pode(codigo: string): boolean {
    if (!usuario) return false;
    if (codigo === "consignacoes.visualizar" &&
      usuario.perfis.some(perfil => perfil.nome.trim().toLowerCase() === "vendedor")) return true;
    // Consulta e movimentação do pátio disponíveis para toda sessão válida.
    if (["veiculos.visualizar", "veiculos.movimentar"].includes(codigo)) return true;
    if (["usuarios.administrar","perfis.administrar","consignacoes.devolver"].includes(codigo)) return usuario.gestao;
    if (["custos.visualizar", "despesas.visualizar", "despesas.cadastrar"].includes(codigo) &&
        usuario.perfis.some(perfil => perfil.nome.trim().toLowerCase() === "comprador")) return true;
    if (["pedidos.visualizar", "garantias.gerenciar", "repasses.gerenciar"].includes(codigo) &&
        usuario.perfis.some(perfil => perfil.nome.trim().toLowerCase() === "financeiro")) return true;
    if (codigo === "notas.saida.visualizar") {
      return usuario.perfis.some(perfil => ["financeiro", "comprador"].includes(perfil.nome.trim().toLowerCase())) ||
        (pode("notas.visualizar") && pode("pedidos.visualizar"));
    }
    return usuario.gestao || (usuario.permissoes ?? []).includes(codigo);
  }
  return <AuthContext.Provider value={{ pode, usuario, carregando, erroInicial, autenticar, encerrar }}>{children}{usuario && <AvisoInatividade key={usuario.id_usuario} expiraEm={usuario.expiraEm} />}</AuthContext.Provider>;
}
export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("AuthProvider não foi inicializado.");
  return contexto;
}
