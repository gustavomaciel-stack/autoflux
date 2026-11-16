import type { PaginaNotas } from '../components/ConsultaNotasFiscais';
import { apiFetch } from './authApi';

export interface NotaSaida {
  id_pedido: number;
  numero_pedido: string;
  id_ciclo: number;
  nosso_numero: string;
  marca: string;
  modelo: string;
  placa: string;
  situacao: string;
  numero_nota: string | null;
  serie: string | null;
  chave_acesso: string | null;
  data_emissao: string | null;
  nome_original: string | null;
}

const base = import.meta.env.VITE_API_NOTAS_FISCAIS_ENTRADA_URL ?? 'http://localhost/autocar/api/routes/notas-fiscais-entrada.php';
const endpoint = new URL('notas-fiscais-saida.php', new URL(base, window.location.href));

function url(pedido?: number, baixar = false) {
  const destino = new URL(endpoint);
  if (pedido !== undefined) destino.searchParams.set('pedido', String(pedido));
  if (baixar) destino.searchParams.set('baixar', '1');
  return destino;
}

async function resposta<T = NotaSaida[]>(r: Response): Promise<T> {
  const dados = await r.json().catch(() => null);
  if (!r.ok || !dados?.sucesso) throw new Error(dados?.mensagem ?? 'Não foi possível acessar a nota fiscal de saída.');
  return dados.dados;
}

export async function listarNotasSaida(pedido?: number) {
  return resposta(await apiFetch(url(pedido)));
}

export async function listarPaginaNotasSaida(params: URLSearchParams, signal: AbortSignal) {
  const destino = url();
  params.forEach((valor, campo) => destino.searchParams.set(campo, valor));
  return resposta<PaginaNotas<NotaSaida>>(await apiFetch(destino, { signal }));
}

export async function registrarNotaSaida(pedido: number, formulario: FormData) {
  const [nota] = await resposta(await apiFetch(url(pedido), { method: 'POST', body: formulario }));
  return nota;
}

export async function baixarNotaSaida(nota: NotaSaida) {
  const respostaArquivo = await apiFetch(url(nota.id_pedido, true));
  if (!respostaArquivo.ok) { await resposta(respostaArquivo); return; }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(await respostaArquivo.blob());
  link.download = nota.nome_original ?? 'nota-fiscal-saida.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export async function anexarPdfDevolucao(id: number, arquivo: File): Promise<void> {
  const dados = new FormData(); dados.append('arquivo', arquivo);
  await resposta(await apiFetch(url(id), {method: 'POST', body: dados}));
}
