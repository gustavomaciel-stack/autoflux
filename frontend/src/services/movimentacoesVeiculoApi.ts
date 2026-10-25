import { apiFetch } from "./authApi";
import type {
  DadosMovimentacaoVeiculo,
  MovimentacaoVeiculoApiResponse,
  MovimentacaoVeiculoFormData,
} from "../types/MovimentacaoVeiculo";

const API_URL =
  import.meta.env.VITE_API_MOVIMENTACOES_VEICULO_URL
  ?? "http://localhost/autocar/api/routes/movimentacoes-veiculo.php";

async function lerResposta<T>(
  resposta: Response,
): Promise<MovimentacaoVeiculoApiResponse<T>> {
  let conteudo:
    MovimentacaoVeiculoApiResponse<T>;

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

export async function buscarHistoricoMovimentacoes(
  idCiclo: number,
): Promise<DadosMovimentacaoVeiculo> {
  const resposta = await apiFetch(
    `${API_URL}?id_ciclo=${idCiclo}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },
    },
  );

  const conteudo =
    await lerResposta<DadosMovimentacaoVeiculo>(
      resposta,
    );

  if (!conteudo.dados) {
    throw new Error(
      "O histórico do veículo não foi encontrado.",
    );
  }

  return conteudo.dados;
}

export async function registrarMovimentacaoVeiculo(
  idCiclo: number,
  dados: MovimentacaoVeiculoFormData,
): Promise<DadosMovimentacaoVeiculo> {
  const resposta = await apiFetch(
    `${API_URL}?id_ciclo=${idCiclo}`,
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
    await lerResposta<DadosMovimentacaoVeiculo>(
      resposta,
    );

  if (!conteudo.dados) {
    throw new Error(
      "A movimentação foi registrada, mas o histórico não foi retornado.",
    );
  }

  return conteudo.dados;
}