export function chaveLeituraNotificacoes(usuario:number,caminho:string):string {
 return `autoflux-notificacoes-vistas:${caminho}:${usuario}`;
}
export function lerNotificacoesVistas(chave:string):string[]{
 if(!chave)return [];
 try{const valor=JSON.parse(localStorage.getItem(chave)??'[]');return Array.isArray(valor)?valor.filter((v):v is string=>typeof v==='string'):[];}catch{return [];}
}
export function salvarNotificacoesVistas(chave:string,ids:string[]):void{
 if(!chave)return;
 try{localStorage.setItem(chave,JSON.stringify([...new Set(ids)]));}catch{/* A leitura continua válida em memória quando o navegador bloqueia armazenamento. */}
}
/** Todas as páginas são consultadas para contar novidades por identidade, não só por quantidade. */
export async function consultarPaginasNotificacoes<T>(buscar:(pagina:number)=>Promise<{itens:T[];paginas:number}>):Promise<T[]>{
 const primeira=await buscar(1);const itens=[...primeira.itens];
 for(let inicio=2;inicio<=primeira.paginas;inicio+=4){
  const paginas=Array.from({length:Math.min(4,primeira.paginas-inicio+1)},(_,i)=>inicio+i);
  const respostas=await Promise.all(paginas.map(buscar));for(const resposta of respostas)itens.push(...resposta.itens);
 }
 return itens;
}
