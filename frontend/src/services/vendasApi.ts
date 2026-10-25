import { apiFetch } from "./authApi";
import type {
  VeiculoVenda,
  VeiculoVendaApiResponse,
} from "../types/VeiculoVenda";

const API_URL =
  import.meta.env.VITE_API_VEICULOS_URL ??
  "http://localhost/autocar/api/routes/veiculos.php";

type VeiculoRecebido = VeiculoVenda & {
  status?: string | null;
  valor_compra?: string | number | null;
};

function extrairMensagem(
  conteudo: VeiculoVendaApiResponse | null,
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

function normalizarVeiculo(veiculo: VeiculoRecebido): VeiculoVenda {
  const situacao =
    typeof veiculo.situacao_atual === "string" &&
    veiculo.situacao_atual.trim() !== ""
      ? veiculo.situacao_atual.trim()
      : typeof veiculo.status === "string" && veiculo.status.trim() !== ""
        ? veiculo.status.trim()
        : "Não informada";

  const valorAquisicao =
    veiculo.valor_aquisicao !== null &&
    veiculo.valor_aquisicao !== undefined &&
    String(veiculo.valor_aquisicao).trim() !== ""
      ? String(veiculo.valor_aquisicao)
      : veiculo.valor_compra !== null &&
          veiculo.valor_compra !== undefined &&
          String(veiculo.valor_compra).trim() !== ""
        ? String(veiculo.valor_compra)
        : "0.00";

  return {
    ...veiculo,
    situacao_atual: situacao,
    valor_aquisicao: valorAquisicao,
  };
}

export async function listarVeiculosParaVenda(): Promise<VeiculoVenda[]> {
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
      "Não foi possível conectar com a API de veículos. Verifique se o Apache está ligado.",
    );
  }

  let conteudo: VeiculoVendaApiResponse | null = null;

  try {
    conteudo = (await resposta.json()) as VeiculoVendaApiResponse;
  } catch {
    throw new Error("A API de veículos retornou uma resposta inválida.");
  }

  if (!resposta.ok || !conteudo.sucesso) {
    throw new Error(
      extrairMensagem(conteudo, "Não foi possível listar os veículos."),
    );
  }

  if (!Array.isArray(conteudo.dados)) {
    return [];
  }

  return conteudo.dados.map((veiculo) =>
    normalizarVeiculo(veiculo as VeiculoRecebido),
  );
}

export function veiculoEstaDisponivel(
  veiculo: Pick<VeiculoVenda, "situacao_atual">,
): boolean {
  const situacao =
    typeof veiculo.situacao_atual === "string"
      ? veiculo.situacao_atual
      : "";

  return situacao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase() === "disponivel";
}