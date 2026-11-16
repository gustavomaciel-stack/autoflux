const root = document.getElementById("root");
const painel = document.createElement("div");
painel.className = "autoflux-menu-flutuante";
painel.hidden = true;
document.body.append(painel);
let aberto;

function fechar(foco = false) {
  if (!aberto) return;
  const { botao } = aberto;
  aberto = undefined;
  painel.hidden = true;
  painel.replaceChildren();
  botao.setAttribute("aria-expanded", "false");
  if (foco && botao.isConnected) botao.focus();
}

function abrir(botao, acoes) {
  if (aberto?.botao === botao) return fechar(true);
  fechar();
  aberto = { botao };
  botao.setAttribute("aria-expanded", "true");
  for (const acao of acoes) {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = acao.textContent.trim();
    item.disabled = acao.disabled;
    item.addEventListener("click", () => {
      fechar(true);
      if (acao.isConnected) acao.click();
    });
    painel.append(item);
  }
  painel.hidden = false;
  const pos = botao.getBoundingClientRect();
  painel.style.left = Math.max(8, Math.min(pos.right - painel.offsetWidth, innerWidth - painel.offsetWidth - 8)) + "px";
  painel.style.top = Math.max(8, pos.bottom + painel.offsetHeight + 8 <= innerHeight ? pos.bottom + 4 : pos.top - painel.offsetHeight - 4) + "px";
  painel.querySelector("button:not(:disabled)")?.focus();
}

function instalar(area, selecionar, rotulo, texto) {
  if (area.querySelector(":scope > .autoflux-menu-botao") || !selecionar().length) return;
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "autoflux-menu-botao";
  botao.textContent = texto;
  botao.setAttribute("aria-label", rotulo);
  botao.setAttribute("aria-expanded", "false");
  botao.addEventListener("click", () => abrir(botao, selecionar()));
  area.append(botao);
  area.classList.add("autoflux-menu-instalado");
}

function acoesDaLinha(area) {
  return [...area.querySelectorAll("button:not(.autoflux-menu-botao)")];
}

function atualizar() {
  if (aberto && !aberto.botao.isConnected) fechar();
  const listas = {
    "Lista de veículos": "Ações do veículo",
    "Lista de clientes": "Ações do cliente",
    "Lista de usuários": "Ações do usuário",
    "Lista de fornecedores": "Ações do fornecedor",
  };
  for (const [lista, rotulo] of Object.entries(listas)) {
    root.querySelectorAll(`.table-card[aria-label="${lista}"] .row-actions`).forEach(area => {
      instalar(area, () => acoesDaLinha(area), rotulo, "⋯");
    });
  }
  root.querySelectorAll("table").forEach(tabela => {
    const cabecalhos = [...tabela.querySelectorAll("thead th")].map(th => th.textContent.trim().toLowerCase());
    const saida = cabecalhos.includes("pedido / devolução") && cabecalhos.includes("nota de saída");
    const entrada = cabecalhos.includes("nota / série") && cabecalhos.includes("emissão");
    const coluna = cabecalhos.indexOf("ações");
    if (coluna < 0 || (!entrada && !saida)) return;

    for (const corpo of tabela.tBodies) {
      for (const linha of corpo.rows) {
        const area = linha.cells[coluna]?.querySelector(".row-actions");
        if (!area) continue;
        instalar(area, () => acoesDaLinha(area), saida ? "Ações da nota de saída" : "Ações da nota de entrada", "⋯");
        if (saida) area.querySelectorAll(':scope > span[aria-hidden="true"]').forEach(span => { span.hidden = true; });
      }
    }
  });
  const usuario = root.querySelector(".topbar .user-area");
  if (usuario) {
    const senha = () => [...usuario.querySelectorAll("button.session-action")].filter(b => b.textContent.trim() === "Alterar senha");
    for (const acao of senha()) acao.classList.add("autoflux-senha-original");
    instalar(usuario, senha, "Opções da conta", usuario.querySelector(".user-copy strong")?.textContent.trim() || "Conta");
  }
}

new MutationObserver(atualizar).observe(root, { childList: true, subtree: true });
atualizar();
document.addEventListener("pointerdown", e => {
  if (aberto && !painel.contains(e.target) && !aberto.botao.contains(e.target)) fechar();
});
document.addEventListener("focusin", e => {
  if (aberto && !painel.contains(e.target) && !aberto.botao.contains(e.target)) fechar();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && aberto) fechar(true);
});
window.addEventListener("hashchange", () => fechar());
window.addEventListener("resize", () => fechar());
window.addEventListener("scroll", e => { if (!painel.contains(e.target)) fechar(); }, true);
