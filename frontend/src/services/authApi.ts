export interface UsuarioAutenticado {
  id_usuario: number;
  expiraEm: number;
  nome: string;
  login: string;
  gestao: boolean;
  pode_corrigir_chassi?: boolean;
  permissoes: string[];
  perfis: { id_perfil: number; nome: string }[];
}
const AUTH_URL = import.meta.env.VITE_API_AUTH_URL
  ?? "http://localhost/autocar/api/routes/auth.php";
let csrf = "";

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.method && init.method.toUpperCase() !== "GET") headers.set("X-CSRF-Token", csrf);
  const resposta = await fetch(input, { ...init, headers, credentials: "include" });
  if (resposta.status === 401) window.dispatchEvent(new Event("autoflux-sessao-expirada"));
  return resposta;
}
async function requisitar(acao: string, dados?: Record<string, string>) {
  const headers = new Headers({ Accept: "application/json" });
  if (dados) {
    headers.set("Content-Type", "application/json");
    headers.set("X-CSRF-Token", csrf);
  }
  const resposta = await fetch(`${AUTH_URL}?acao=${acao}`, {
    method: dados ? "POST" : "GET", credentials: "include", headers,
    signal: AbortSignal.timeout(10_000),
    body: dados ? JSON.stringify(dados) : undefined,
  });
  let resultado;
  try { resultado = await resposta.json(); }
  catch { throw new Error("A autenticação retornou uma resposta inválida. Confira o Apache e os arquivos da API."); }
  if (resposta.status === 401 && acao !== "login") {
    window.dispatchEvent(new Event("autoflux-sessao-expirada"));
  }
  if (!resposta.ok || !resultado.sucesso) throw new Error(resultado.mensagem ?? "Não foi possível autenticar.");
  if (resultado.csrf) csrf = resultado.csrf;
  return resultado;
}
export async function consultarSessao(): Promise<UsuarioAutenticado | null> {
  const resultado = await requisitar("sessao");
  return resultado.dados ? { ...resultado.dados, expiraEm: prazo(resultado.segundos_restantes) } : null;
}
export async function entrar(login: string, senha: string): Promise<UsuarioAutenticado> {
  // Obtém também um token novo se a sessão anterior foi encerrada.
  await consultarSessao();
  const resultado = await requisitar("login", { login, senha });
  return { ...resultado.dados, expiraEm: prazo(resultado.segundos_restantes) };
}
export async function sair(): Promise<void> { await requisitar("sair", {}); csrf = ""; }
export async function alterarSenha(senha_atual: string, nova_senha: string, confirmacao: string): Promise<void> {
  await requisitar("senha", { senha_atual, nova_senha, confirmacao });
}

function prazo(segundos: number): number {
  return Date.now() + segundos * 1000;
}
export async function registrarAtividade(): Promise<number> {
  return prazo((await requisitar("atividade", {})).segundos_restantes);
}
