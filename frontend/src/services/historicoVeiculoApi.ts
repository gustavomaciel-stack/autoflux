import { apiFetch } from "./authApi";
import type {
  HistoricoVeiculo,
  HistoricoVeiculoApiResponse,
} from "../types/HistoricoVeiculo";

const API_URL =
  import.meta.env.VITE_API_HISTORICO_VEICULO_URL ??
  "http://localhost/autocar/api/routes/historico-veiculo.php";

function extrairMensagem(
  conteudo: HistoricoVeiculoApiResponse | null,
  mensagemPadrao: string,
): string {
  if (
    conteudo &&
    typeof conteudo.mensagem === "string" &&
    conteudo.mensagem.trim() !== ""
  ) {
    return conteudo.mensagem;
  }

  return mensagemPadrao;
}

export async function buscarHistoricoVeiculo(
  idVeiculo: number,
): Promise<HistoricoVeiculo> {
  let resposta: Response;

  try {
    resposta = await apiFetch(
      `${API_URL}?id_veiculo=${idVeiculo}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );
  } catch {
    throw new Error(
      "Não foi possível conectar com a API do histórico do veículo.",
    );
  }

  let conteudo: HistoricoVeiculoApiResponse | null =
    null;

  try {
    conteudo =
      (await resposta.json()) as HistoricoVeiculoApiResponse;
  } catch {
    throw new Error(
      "A API do histórico retornou uma resposta inválida.",
    );
  }

  if (
    !resposta.ok ||
    !conteudo.sucesso ||
    !conteudo.dados
  ) {
    throw new Error(
      extrairMensagem(
        conteudo,
        "Não foi possível consultar o histórico do veículo.",
      ),
    );
  }

  return conteudo.dados;
}