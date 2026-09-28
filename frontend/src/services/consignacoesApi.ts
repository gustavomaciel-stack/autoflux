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
    resposta = await fetch(API_URL, {
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
    resposta = await fetch(
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
    resposta = await fetch(
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