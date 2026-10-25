import { apiFetch } from "./authApi";
import type {
  Veiculo,
  VeiculoApiResponse,
  VeiculoFormData,
} from "../types/Veiculo";

const ENDPOINT =
  "http://localhost/autocar/api/routes/veiculos.php";

async function processarResposta<T>(
  resposta: Response,
): Promise<T> {
  let resultado: VeiculoApiResponse<T>;

  try {
    resultado =
      (await resposta.json()) as VeiculoApiResponse<T>;
  } catch {
    throw new Error(
      "A API retornou uma resposta inválida.",
    );
  }

  if (!resposta.ok || !resultado.sucesso) {
    throw new Error(
      resultado.mensagem ??
        "Não foi possível concluir a operação.",
    );
  }

  return resultado.dados;
}

export async function listarVeiculos(): Promise<
  Veiculo[]
> {
  const resposta = await apiFetch(ENDPOINT);

  return processarResposta<Veiculo[]>(resposta);
}

export async function buscarVeiculo(
  idVeiculo: number,
): Promise<Veiculo> {
  const resposta = await apiFetch(
    `${ENDPOINT}?id=${idVeiculo}`,
  );

  return processarResposta<Veiculo>(resposta);
}

export async function cadastrarVeiculo(
  dados: VeiculoFormData,
): Promise<Veiculo> {
  const resposta = await apiFetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  });

  return processarResposta<Veiculo>(resposta);
}

export async function atualizarVeiculo(
  idVeiculo: number,
  dados: VeiculoFormData,
): Promise<Veiculo> {
  const resposta = await apiFetch(
    `${ENDPOINT}?id=${idVeiculo}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    },
  );

  return processarResposta<Veiculo>(resposta);
}

export async function buscarVeiculoPorChassi(chassi: string): Promise<Veiculo | null> {
  const resposta = await apiFetch(`${ENDPOINT}?chassi=${encodeURIComponent(chassi)}`);
  return processarResposta<Veiculo | null>(resposta);
}
