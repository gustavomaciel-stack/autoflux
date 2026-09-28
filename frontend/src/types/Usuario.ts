export interface Perfil {
  id_perfil: number;
  nome: string;
  descricao: string | null;
}

export interface PerfilDoUsuario {
  id_perfil: number;
  nome: string;
}

export interface Usuario {
  id_usuario: number;
  nome: string;
  email: string;
  login: string;
  ativo: number;
  percentual_comissao: string | null;
  data_cadastro: string;
  data_atualizacao: string;
  perfis: string[];
}

export interface UsuarioDetalhado {
  id_usuario: number;
  nome: string;
  email: string;
  login: string;
  ativo: number;
  percentual_comissao: string | null;
  data_cadastro: string;
  data_atualizacao: string;
  perfis: PerfilDoUsuario[];
}

export interface UsuarioFormData {
  nome: string;
  email: string;
  login: string;
  senha: string;
  percentual_comissao: string;
  ids_perfis: number[];
}

export interface UsuarioApiResponse<T> {
  sucesso: boolean;
  mensagem?: string;
  dados: T;
}