import type { PaginaNotas } from '../components/ConsultaNotasFiscais';
import { apiFetch } from "./authApi";
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

export async function listarNotasFiscaisEntrada(params: URLSearchParams, signal: AbortSignal): Promise<PaginaNotas<NotaFiscalEntrada>> {
  const url = new URL(API_URL, window.location.href);
  params.forEach((valor, campo) => url.searchParams.set(campo, valor));
  const resposta = await apiFetch(url, { signal, headers: { Accept: 'application/json' } });
  const conteudo = await lerResposta<PaginaNotas<NotaFiscalEntrada>>(resposta);
  if (!conteudo.dados) throw new Error('A API não retornou a página de notas fiscais.');
  return conteudo.dados;
}

export async function buscarNotaFiscalEntrada(
  idNotaFiscalEntrada: number,
): Promise<NotaFiscalEntrada> {
  const resposta = await apiFetch(
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