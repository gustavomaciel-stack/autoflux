import { useEffect, useRef, useState } from "react";
import { consultarSessao, registrarAtividade } from "../services/authApi";

const AVISO_MS = 60_000;
const INTERVALO_ATIVIDADE_MS = 15_000;

export function AvisoInatividade({ expiraEm }: { expiraEm: number }) {
  const [aviso, setAviso] = useState(false);
  const [erro, setErro] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);
  const continuar = useRef<() => void>(() => {});

  useEffect(() => {
    let ativo = true;
    let emCurso = false;
    let verificando = false;
    let prazo = expiraEm;
    let ultimaTentativa = 0;
    let timer: number;

    function agendar() {
      window.clearTimeout(timer);
      const restante = prazo - Date.now();
      setAviso(restante <= AVISO_MS);
      timer = window.setTimeout(verificar, Math.max(0, restante > AVISO_MS ? restante - AVISO_MS : restante));
    }

    async function verificar() {
      if (Date.now() < prazo) {
        agendar();
        return;
      }
      if (emCurso || verificando) return;
      verificando = true;
      try {
        const sessao = await consultarSessao();
        if (!ativo) return;
        if (sessao && sessao.expiraEm > Date.now()) {
          prazo = sessao.expiraEm;
          agendar();
          return;
        }
      } catch {
        if (!ativo) return;
      } finally {
        verificando = false;
      }
      window.dispatchEvent(new Event("autoflux-sessao-expirada"));
    }

    async function renovar(explicito: boolean) {
      if (emCurso || (!explicito && Date.now() - ultimaTentativa < INTERVALO_ATIVIDADE_MS)) return;
      if (Date.now() >= prazo) {
        void verificar();
        return;
      }
      ultimaTentativa = Date.now();
      emCurso = true;
      try {
        const novoPrazo = await registrarAtividade();
        if (!ativo) return;
        prazo = novoPrazo;
        setErro("");
        agendar();
      } catch {
        if (ativo && explicito) setErro("Não foi possível renovar a sessão. Tente novamente.");
      } finally {
        emCurso = false;
        if (ativo && Date.now() >= prazo) void verificar();
      }
    }

    function atividade(evento: Event) {
      if (evento.isTrusted && !dialogo.current?.open) void renovar(false);
    }

    function voltarParaAba() {
      if (document.visibilityState === "visible") void verificar();
    }

    continuar.current = () => { void renovar(true); };
    const eventos = ["pointerdown", "keydown", "input", "wheel"] as const;
    eventos.forEach(evento => window.addEventListener(evento, atividade, { passive: true }));
    document.addEventListener("visibilitychange", voltarParaAba);
    agendar();
    return () => {
      ativo = false;
      window.clearTimeout(timer);
      eventos.forEach(evento => window.removeEventListener(evento, atividade));
      document.removeEventListener("visibilitychange", voltarParaAba);
    };
  }, [expiraEm]);

  useEffect(() => {
    const elemento = dialogo.current;
    if (aviso && elemento && !elemento.open) elemento.showModal();
    if (!aviso && elemento?.open) elemento.close();
  }, [aviso]);

  return (
    <dialog ref={dialogo} className="ger-dialog sessao-inatividade" aria-labelledby="titulo-inatividade"
      onCancel={evento => evento.preventDefault()}>
      <h2 id="titulo-inatividade">Sua sessão vai expirar</h2>
      <p>Por inatividade, o AutoFlux vai voltar para a tela de login em até 1 minuto.</p>
      {erro && <p role="alert">{erro}</p>}
      <button type="button" className="button button-primary" onClick={() => continuar.current()}>
        Continuar conectado
      </button>
    </dialog>
  );
}
