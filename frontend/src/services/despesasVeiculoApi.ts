import type {
  CustosVeiculo,
  DespesaPrevistaFormData,
  DespesaRealizadaFormData,
  DespesaVeiculoApiResponse,
} from "../types/DespesaVeiculo";

const API_URL =
  import.meta.env.VITE_API_DESPESAS_VEICULO_URL
  ?? "http://localhost/autocar/api/routes/despesas-veiculo.php";

async function lerResposta<T>(
  resposta: Response,
): Promise<DespesaVeiculoApiResponse<T>> {
  let conteudo:
    DespesaVeiculoApiResponse<T>;

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

function obterDados(
  conteudo:
    DespesaVeiculoApiResponse<CustosVeiculo>,
): CustosVeiculo {
  if (!conteudo.dados) {
    throw new Error(
      "Os custos atualizados não foram retornados.",
    );
  }

  return conteudo.dados;
}

export async function consultarCustosVeiculo(
  idCiclo: number,
): Promise<CustosVeiculo> {
  const resposta = await fetch(
    `${API_URL}?id_ciclo=${idCiclo}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },
    },
  );

  const conteudo =
    await lerResposta<CustosVeiculo>(
      resposta,
    );

  return obterDados(conteudo);
}

export async function cadastrarDespesaPrevista(
  idCiclo: number,
  dados: DespesaPrevistaFormData,
): Promise<CustosVeiculo> {
  const resposta = await fetch(
    `${API_URL}?id_ciclo=${idCiclo}&tipo=prevista`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(dados),
    },
  );

  const conteudo =
    await lerResposta<CustosVeiculo>(
      resposta,
    );

  return obterDados(conteudo);
}

export async function atualizarDespesaPrevista(
  idCiclo: number,
  idDespesaPrevista: number,
  dados: DespesaPrevistaFormData,
): Promise<CustosVeiculo> {
  const resposta = await fetch(
    `${API_URL}?id_ciclo=${idCiclo}&tipo=prevista&id=${idDespesaPrevista}`,
    {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(dados),
    },
  );

  const conteudo =
    await lerResposta<CustosVeiculo>(
      resposta,
    );

  return obterDados(conteudo);
}

export async function cadastrarDespesaRealizada(
  idCiclo: number,
  dados: DespesaRealizadaFormData,
): Promise<CustosVeiculo> {
  const resposta = await fetch(
    `${API_URL}?id_ciclo=${idCiclo}&tipo=realizada`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(dados),
    },
  );

  const conteudo =
    await lerResposta<CustosVeiculo>(
      resposta,
    );

  return obterDados(conteudo);
}

export async function atualizarDespesaRealizada(
  idCiclo: number,
  idDespesa: number,
  dados: DespesaRealizadaFormData,
): Promise<CustosVeiculo> {
  const resposta = await fetch(
    `${API_URL}?id_ciclo=${idCiclo}&tipo=realizada&id=${idDespesa}`,
    {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(dados),
    },
  );

  const conteudo =
    await lerResposta<CustosVeiculo>(
      resposta,
    );

  return obterDados(conteudo);
}

export async function excluirDespesaPrevista(
  idCiclo: number,
  idDespesaPrevista: number,
): Promise<CustosVeiculo> {
  const resposta = await fetch(
    `${API_URL}?id_ciclo=${idCiclo}&tipo=prevista&id=${idDespesaPrevista}`,
    {
      method: "DELETE",

      headers: {
        Accept: "application/json",
      },
    },
  );

  const conteudo =
    await lerResposta<CustosVeiculo>(
      resposta,
    );

  return obterDados(conteudo);
}

export async function excluirDespesaRealizada(
  idCiclo: number,
  idDespesa: number,
): Promise<CustosVeiculo> {
  const resposta = await fetch(
    `${API_URL}?id_ciclo=${idCiclo}&tipo=realizada&id=${idDespesa}`,
    {
      method: "DELETE",

      headers: {
        Accept: "application/json",
      },
    },
  );

  const conteudo =
    await lerResposta<CustosVeiculo>(
      resposta,
    );

  return obterDados(conteudo);
}