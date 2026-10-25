import { apiFetch } from "./authApi";
import type {
  Cliente,
  ClienteApiResponse,
  TipoPessoaCliente,
} from "../types/Cliente";

const API_URL =
  import.meta.env.VITE_API_CLIENTES_URL ??
  "http://localhost/autocar/api/routes/clientes.php";

export interface CadastroCliente {
  ativo?: number;
  tipo_pessoa: TipoPessoaCliente;
  nome_razao_social: string;
  nome_fantasia: string | null;
  cpf: string | null;
  cnpj: string | null;
  telefone: string;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
}

async function lerResposta<T>(
  resposta: Response,
): Promise<ClienteApiResponse<T>> {
  let conteudo: ClienteApiResponse<T>;

  try {
    conteudo =
      (await resposta.json()) as ClienteApiResponse<T>;
  } catch {
    throw new Error(
      "A API de clientes retornou uma resposta inválida.",
    );
  }

  if (!resposta.ok || !conteudo.sucesso) {
    throw new Error(
      conteudo.mensagem ??
        "Não foi possível concluir a operação.",
    );
  }

  return conteudo;
}

export async function listarClientes(): Promise<Cliente[]> {
  let resposta: Response;

  try {
    resposta = await apiFetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error(
      "Não foi possível conectar com a API de clientes.",
    );
  }

  const conteudo = await lerResposta<Cliente[]>(
    resposta,
  );

  return Array.isArray(conteudo.dados)
    ? conteudo.dados
    : [];
}

export async function buscarCliente(
  idCliente: number,
): Promise<Cliente> {
  let resposta: Response;

  try {
    resposta = await apiFetch(
      `${API_URL}?id=${idCliente}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );
  } catch {
    throw new Error(
      "Não foi possível conectar com a API de clientes.",
    );
  }

  const conteudo = await lerResposta<Cliente>(
    resposta,
  );

  if (!conteudo.dados) {
    throw new Error(
      "O cliente solicitado não foi encontrado.",
    );
  }

  return conteudo.dados;
}

export async function cadastrarCliente(
  dados: CadastroCliente,
): Promise<Cliente> {
  let resposta: Response;

  try {
    resposta = await apiFetch(API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new Error(
      "Não foi possível conectar com a API de clientes.",
    );
  }

  const conteudo = await lerResposta<Cliente>(
    resposta,
  );

  if (!conteudo.dados) {
    throw new Error(
      "A API não retornou o cliente cadastrado.",
    );
  }

  return conteudo.dados;
}

// A tela própria usa uma rota com autorização de Gestão/Diretoria,
// Gerente de Vendas e Vendedor. A rota anterior permanece para consignados.
const CADASTRO_URL = import.meta.env.VITE_API_CADASTRO_CLIENTES_URL
  ?? API_URL.replace(/clientes\.php(?=$|\?)/, "cadastro-clientes.php");

async function requisitarCadastro<T>(url: string, method = "GET", dados?: unknown): Promise<T> {
  const resposta = await apiFetch(url, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: dados === undefined ? undefined : JSON.stringify(dados),
  });
  const resultado = await lerResposta<T>(resposta);
  if (resultado.dados === undefined) throw new Error("A API não retornou os dados do cliente.");
  return resultado.dados;
}
export function listarCadastroClientes(): Promise<Cliente[]> {
  return requisitarCadastro<Cliente[]>(CADASTRO_URL);
}
export function salvarCadastroCliente(dados: CadastroCliente, id?: number): Promise<Cliente> {
  return requisitarCadastro<Cliente>(id ? `${CADASTRO_URL}?id=${id}` : CADASTRO_URL, id ? "PUT" : "POST", dados);
}
export function alterarSituacaoCliente(id: number, ativo: boolean): Promise<Cliente> {
  return requisitarCadastro<Cliente>(`${CADASTRO_URL}?id=${id}`, "PATCH", { ativo: ativo ? 1 : 0 });
}
export function listarClientesAtivos(): Promise<Cliente[]> {
  return requisitarCadastro<Cliente[]>(`${CADASTRO_URL}?ativos=1`);
}
