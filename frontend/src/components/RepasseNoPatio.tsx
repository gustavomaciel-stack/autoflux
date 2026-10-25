import { useEffect, useState } from "react";
import { buscarConsignacaoPorCiclo } from "../services/consignacoesApi";
import type { Consignacao } from "../types/Consignacao";
import { RepasseConsignacao } from "./RepasseConsignacao";

export function RepasseNoPatio({ idCiclo }: { idCiclo: number }) {
  const [consignacao, setConsignacao] = useState<Consignacao | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    setCarregando(true); setErro("");
    buscarConsignacaoPorCiclo(idCiclo)
      .then(dados => { if (ativo) setConsignacao(dados); })
      .catch(e => { if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível consultar o repasse."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [idCiclo, tentativa]);
  if (carregando) return <p>Carregando consignação...</p>;
  if (erro) return <div className="alert error" role="alert">
    <span>{erro}</span>
    <button type="button" className="button secondary" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button>
  </div>;
  if (!consignacao) return null;
  return <>
    <RepasseConsignacao consignacao={consignacao} onSalvo={setConsignacao} />
  </>;
}
