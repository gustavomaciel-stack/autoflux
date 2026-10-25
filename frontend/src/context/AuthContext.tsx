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
    function expirar() { setUsuario(null); window.location.hash = "login"; }
    window.addEventListener("autoflux-sessao-expirada", expirar);
    return () => { ativo = false; window.removeEventListener("autoflux-sessao-expirada", expirar); };
  }, []);
  async function autenticar(login: string, senha: string) {
    const u = await entrar(login, senha);
    setErroInicial(""); setUsuario(u); window.location.hash = "veiculos";
  }
  async function encerrar() {
    await sair(); setUsuario(null); window.location.hash = "login";
  }
  function pode(codigo: string) {
    if (!usuario) return false;
    // Consulta básica do pátio disponível para toda sessão válida.
    if (codigo === "veiculos.visualizar") return true;
    if (["usuarios.administrar","perfis.administrar","consignacoes.devolver"].includes(codigo)) return usuario.gestao;
    return usuario.gestao || (usuario.permissoes ?? []).includes(codigo);
  }
  return <AuthContext.Provider value={{ pode, usuario, carregando, erroInicial, autenticar, encerrar }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("AuthProvider não foi inicializado.");
  return contexto;
}
