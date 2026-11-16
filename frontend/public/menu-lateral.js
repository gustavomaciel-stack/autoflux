const mobile = window.matchMedia("(max-width: 700px)");
let header;
let navigation;
let toggle;
let backdrop;

function setMenu(open, restoreFocus = true) {
  if (!header) return;
  const visible = mobile.matches && open;
  header.classList.toggle("menu-lateral-aberto", visible);
  document.documentElement.classList.toggle("menu-lateral-bloqueio", visible);
  toggle.setAttribute("aria-expanded", String(visible));
  toggle.setAttribute("aria-label", visible ? "Fechar menu" : "Abrir menu");
  toggle.textContent = visible ? "×" : "☰";
  backdrop.hidden = !visible;
  if (visible) navigation.querySelector("button")?.focus();
  else if (restoreFocus && mobile.matches) toggle.focus();
}

function montarMenu() {
  const nextHeader = document.querySelector(".topbar");
  if (nextHeader === header) return;
  document.documentElement.classList.remove("menu-lateral-bloqueio");
  header = nextHeader;
  if (!header) return;
  navigation = header.querySelector(".main-nav");
  if (!navigation) return;

  navigation.id = "navegacao-principal";
  toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "menu-lateral-botao";
  toggle.setAttribute("aria-controls", navigation.id);
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));

  backdrop = document.createElement("div");
  backdrop.className = "menu-lateral-fundo";
  backdrop.addEventListener("click", () => setMenu(false));
  navigation.before(toggle, backdrop);
  navigation.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (mobile.matches && button && !button.hasAttribute("aria-expanded")) setMenu(false);
  });
  setMenu(false, false);
}

new MutationObserver(montarMenu).observe(document.getElementById("root"), { childList: true, subtree: true });
montarMenu();
mobile.addEventListener("change", () => setMenu(false, false));
window.addEventListener("hashchange", () => setMenu(false, false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && header?.classList.contains("menu-lateral-aberto")) setMenu(false);
});
