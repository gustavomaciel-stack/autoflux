import type { UsuarioAutenticado } from './authApi';

export function possuiPermissao(usuario: UsuarioAutenticado | null, codigo: string): boolean {
  return Boolean(usuario && (usuario.gestao || (usuario.permissoes ?? []).includes(codigo)));
}
export function podeGerenciarClientes(usuario: UsuarioAutenticado | null): boolean {
  return possuiPermissao(usuario, 'clientes.visualizar');
}
export function podeConsultarOrcamentos(usuario: UsuarioAutenticado | null): boolean {
  return possuiPermissao(usuario, 'orcamentos.visualizar');
}
export function podeGerenciarOrcamentos(usuario: UsuarioAutenticado | null): boolean {
  return possuiPermissao(usuario, 'orcamentos.gerenciar');
}
