import { apiFetch } from "./authApi";
import type {
  Perfil,
  Usuario,
  UsuarioApiResponse,
  UsuarioDetalhado,
  UsuarioFormData,
} from "../types/Usuario";

const ENDPOINT =
  "http://localhost/autocar/api/routes/usuarios.php";

async function processarResposta<T>(
  resposta: Response,
): Promise<T> {
  let resultado: UsuarioApiResponse<T>;

  try {
    resultado =
      (await resposta.json()) as UsuarioApiResponse<T>;
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

export async function listarUsuarios(): Promise<
  Usuario[]
> {
  const resposta = await apiFetch(ENDPOINT);

  return processarResposta<Usuario[]>(resposta);
}

export async function listarPerfis(): Promise<
  Perfil[]
> {
  const resposta = await apiFetch(
    `${ENDPOINT}?acao=perfis`,
  );

  return processarResposta<Perfil[]>(resposta);
}

export async function buscarUsuario(
  idUsuario: number,
): Promise<UsuarioDetalhado> {
  const resposta = await apiFetch(
    `${ENDPOINT}?id=${idUsuario}`,
  );

  return processarResposta<UsuarioDetalhado>(
    resposta,
  );
}

export async function cadastrarUsuario(
  dados: UsuarioFormData,
): Promise<UsuarioDetalhado> {
  const resposta = await apiFetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  });

  return processarResposta<UsuarioDetalhado>(
    resposta,
  );
}

export async function atualizarUsuario(
  idUsuario: number,
  dados: UsuarioFormData,
): Promise<UsuarioDetalhado> {
  const resposta = await apiFetch(
    `${ENDPOINT}?id=${idUsuario}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    },
  );

  return processarResposta<UsuarioDetalhado>(
    resposta,
  );
}

export async function alterarSituacaoUsuario(
  idUsuario: number,
  ativo: boolean,
): Promise<UsuarioDetalhado> {
  const resposta = await apiFetch(
    `${ENDPOINT}?id=${idUsuario}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ativo }),
    },
  );

  return processarResposta<UsuarioDetalhado>(
    resposta,
  );
}