import type {
  NotaFiscalEntrada,
  NotaFiscalEntradaApiResponse,
} from "../types/NotaFiscalEntrada";

const API_URL =
  import.meta.env.VITE_API_NOTAS_FISCAIS_ENTRADA_URL
  ?? "http://localhost/autocar/api/routes/notas-fiscais-entrada.php";

async function lerResposta<T>(
  resposta: Response,
): Promise<NotaFiscalEntradaApiResponse<T>> {
  let conteudo: NotaFiscalEntradaApiResponse<T>;

  try {
    conteudo = await resposta.json();
  } catch {
    throw new Error(
      "A API retornou uma resposta inválida.",
    );
  }

  if (!resposta.ok || !conteudo.sucesso) {
    throw new Error(
      conteudo.mensagem
      ?? "Não foi possível concluir a operação.",
    );
  }

  return conteudo;
}

export async function listarNotasFiscaisEntrada():
Promise<NotaFiscalEntrada[]> {
  const resposta = await fetch(API_URL, {
    method: "GET",

    headers: {
      Accept: "application/json",
    },
  });

  const conteudo =
    await lerResposta<NotaFiscalEntrada[]>(
      resposta,
    );

  return conteudo.dados ?? [];
}

export async function buscarNotaFiscalEntrada(
  idNotaFiscalEntrada: number,
): Promise<NotaFiscalEntrada> {
  const resposta = await fetch(
    `${API_URL}?id=${idNotaFiscalEntrada}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },
    },
  );

  const conteudo =
    await lerResposta<NotaFiscalEntrada>(
      resposta,
    );

  if (!conteudo.dados) {
    throw new Error(
      "Nota fiscal de entrada não encontrada.",
    );
  }

  return conteudo.dados;
}