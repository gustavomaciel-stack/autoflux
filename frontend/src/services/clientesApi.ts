import type {
  Cliente,
  ClienteApiResponse,
  TipoPessoaCliente,
} from "../types/Cliente";

const API_URL =
  import.meta.env.VITE_API_CLIENTES_URL ??
  "http://localhost/autocar/api/routes/clientes.php";

export interface CadastroCliente {
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
    resposta = await fetch(API_URL, {
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
    resposta = await fetch(
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
    resposta = await fetch(API_URL, {
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