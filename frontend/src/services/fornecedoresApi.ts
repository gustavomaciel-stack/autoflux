import { apiFetch } from "./authApi";
import type {
  ApiResponse,
  Fornecedor,
  FornecedorFormData,
} from "../types/Fornecedor";

const API_URL =
  import.meta.env.VITE_API_FORNECEDORES_URL ??
  "http://localhost/autocar/api/routes/fornecedores.php";

async function lerResposta<T>(
  resposta: Response,
): Promise<ApiResponse<T>> {
  const conteudo =
    (await resposta.json()) as ApiResponse<T>;

  if (!resposta.ok || !conteudo.sucesso) {
    throw new Error(
      conteudo.mensagem ??
        "Não foi possível concluir a operação.",
    );
  }

  return conteudo;
}

export async function listarFornecedores():
Promise<Fornecedor[]> {
  const resposta = await apiFetch(API_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  const conteudo =
    await lerResposta<Fornecedor[]>(resposta);

  return conteudo.dados ?? [];
}

export async function buscarFornecedor(
  idFornecedor: number,
): Promise<Fornecedor> {
  const resposta = await apiFetch(
    `${API_URL}?id=${idFornecedor}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  const conteudo =
    await lerResposta<Fornecedor>(resposta);

  if (!conteudo.dados) {
    throw new Error("Fornecedor não encontrado.");
  }

  return conteudo.dados;
}

export async function cadastrarFornecedor(
  dados: FornecedorFormData,
): Promise<ApiResponse<never>> {
  const resposta = await apiFetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(dados),
  });

  return lerResposta<never>(resposta);
}

export async function atualizarFornecedor(
  idFornecedor: number,
  dados: FornecedorFormData,
): Promise<ApiResponse<never>> {
  const resposta = await apiFetch(
    `${API_URL}?id=${idFornecedor}`,
    {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(dados),
    },
  );

  return lerResposta<never>(resposta);
}

export async function alterarSituacaoFornecedor(
  idFornecedor: number,
  ativo: boolean,
): Promise<ApiResponse<never>> {
  const resposta = await apiFetch(
    `${API_URL}?id=${idFornecedor}`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        ativo
      }),
    },
  );

  return lerResposta<never>(resposta);
}