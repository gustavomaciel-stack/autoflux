export function normalizarCnpj(valor: string): string {
  return valor.trim().toUpperCase().replace(/[.\/\-\s]/g, '');
}

export function formatarCnpj(valor: string): string {
  const documento = normalizarCnpj(valor);
  return documento.replace(/^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([0-9]{2})$/, '$1.$2.$3/$4-$5');
}
