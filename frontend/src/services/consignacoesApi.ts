import { apiFetch } from "./authApi";
import type {
  CadastroConsignacao,
  Consignacao,
  ConsignacaoApiResponse,
  DevolucaoConsignacao,
} from "../types/Consignacao";

const API_URL =
  import.meta.env.VITE_API_CONSIGNACOES_URL ??
  "http://localhost/autocar/api/routes/consignacoes.php";

async function lerResposta<T>(
  resposta: Response,
): Promise<ConsignacaoApiResponse<T>> {
  let conteudo: ConsignacaoApiResponse<T>;

  try {
    conteudo =
      (await resposta.json()) as ConsignacaoApiResponse<T>;
  } catch {
    throw new Error(
      "A API de consignações retornou uma resposta inválida.",
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

export async function listarConsignacoes(): Promise<
  Consignacao[]
> {
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
      "Não foi possível conectar com a API de consignações.",
    );
  }

  const conteudo = await lerResposta<Consignacao[]>(
    resposta,
  );

  return Array.isArray(conteudo.dados)
    ? conteudo.dados
    : [];
}

export async function buscarConsignacao(
  idConsignacao: number,
): Promise<Consignacao> {
  let resposta: Response;

  try {
    resposta = await apiFetch(
      `${API_URL}?id=${idConsignacao}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );
  } catch {
    throw new Error(
      "Não foi possível conectar com a API de consignações.",
    );
  }

  const conteudo = await lerResposta<Consignacao>(
    resposta,
  );

  if (!conteudo.dados) {
    throw new Error(
      "A consignação solicitada não foi encontrada.",
    );
  }

  return conteudo.dados;
}

export async function cadastrarConsignacao(
  dados: CadastroConsignacao,
): Promise<Consignacao> {
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
      "Não foi possível conectar com a API de consignações.",
    );
  }

  const conteudo = await lerResposta<Consignacao>(
    resposta,
  );

  if (!conteudo.dados) {
    throw new Error(
      "A API não retornou a consignação cadastrada.",
    );
  }

  return conteudo.dados;
}

export async function devolverConsignacao(
  idConsignacao: number,
  dados: DevolucaoConsignacao,
): Promise<Consignacao> {
  let resposta: Response;

  try {
    resposta = await apiFetch(
      `${API_URL}?id=${idConsignacao}`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dados),
      },
    );
  } catch {
    throw new Error(
      "Não foi possível conectar com a API de consignações.",
    );
  }

  const conteudo = await lerResposta<Consignacao>(
    resposta,
  );

  if (!conteudo.dados) {
    throw new Error(
      "A API não retornou a consignação atualizada.",
    );
  }

  return conteudo.dados;
}

export interface HistoricoRepasse {
  id_historico: number;
  valor_anterior: string | null;
  valor_novo: string;
  motivo: string;
  usuario: string | null;
  data_alteracao: string;
}

export async function listarHistoricoRepasse(id: number): Promise<HistoricoRepasse[]> {
  const resposta = await apiFetch(`${API_URL}?id=${id}&acao=historico_repasse`, {
    method: "GET", headers: { Accept: "application/json" },
  });
  const conteudo = await lerResposta<HistoricoRepasse[]>(resposta);
  return conteudo.dados ?? [];
}

export async function alterarRepasse(
  id: number, valor: string, motivo: string, anterior: string | null,
): Promise<Consignacao> {
  const resposta = await apiFetch(`${API_URL}?id=${id}`, {
    method: "PATCH",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      acao: "alterar_repasse", valor_repasse_acordado: valor,
      motivo, valor_anterior: anterior,
    }),
  });
  const conteudo = await lerResposta<Consignacao>(resposta);
  if (!conteudo.dados) throw new Error("A API não retornou o repasse atualizado.");
  return conteudo.dados;
}


export async function buscarConsignacaoPorCiclo(idCiclo: number): Promise<Consignacao> {
  const resposta = await apiFetch(`${API_URL}?id_ciclo=${idCiclo}`, {
    method: "GET", headers: { Accept: "application/json" },
  });
  const conteudo = await lerResposta<Consignacao>(resposta);
  if (!conteudo.dados) throw new Error("Consignação não encontrada para este ciclo.");
  return conteudo.dados;
}
