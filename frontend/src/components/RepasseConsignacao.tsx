import { useEffect, useState, type FormEvent } from "react";
import {
  alterarRepasse, listarHistoricoRepasse, type HistoricoRepasse,
} from "../services/consignacoesApi";
import type { Consignacao } from "../types/Consignacao";
import "./RepasseConsignacao.css";

function moeda(valor: string | null): string {
  if (valor === null) return "Não informado";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataHora(valor: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(valor);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]} às ${partes[4]}` : valor;
}

export function RepasseConsignacao({
  consignacao, onSalvo,
}: {
  consignacao: Consignacao;
  onSalvo: (atualizada: Consignacao) => void;
}) {
  const [historico, setHistorico] = useState<HistoricoRepasse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroHistorico, setErroHistorico] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErroHistorico("");
    listarHistoricoRepasse(consignacao.id_consignacao)
      .then(dados => { if (ativo) setHistorico(dados); })
      .catch(e => { if (ativo) setErroHistorico(e instanceof Error ? e.message : "Não foi possível carregar o histórico."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [consignacao.id_consignacao, tentativa]);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    if (!motivo.trim()) { setErro("Informe o motivo da alteração."); return; }
    setSalvando(true); setErro(""); setMensagem("");
    try {
      const atualizada = await alterarRepasse(
        consignacao.id_consignacao, valor.trim(), motivo.trim(),
        consignacao.valor_repasse_acordado,
      );
      onSalvo(atualizada);
      setEditando(false);
      setMensagem("Repasse atualizado. A alteração foi registrada no histórico.");
      setTentativa(n => n + 1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível alterar o repasse.");
    } finally { setSalvando(false); }
  }

  const podeEditar = consignacao.situacao === "Ativa" && consignacao.data_encerramento === null;
  return (
    <section className="repasse-editor">
      <h3>Repasse e histórico</h3>
      <p className="repasse-current">Repasse atual: <strong>{moeda(consignacao.valor_repasse_acordado)}</strong></p>
      {mensagem && <div className="alert success" role="status">{mensagem}</div>}
      {erro && <div className="alert error" role="alert">{erro}</div>}
      {podeEditar && !editando && (
        <button type="button" className="button primary" onClick={() => {
          setValor(consignacao.valor_repasse_acordado ?? "");
          setMotivo(""); setErro(""); setMensagem(""); setEditando(true);
        }}>Editar repasse</button>
      )}
      {!podeEditar && <p>O repasse só pode ser alterado enquanto a consignação e o ciclo estiverem ativos.</p>}
      {editando && (
        <form onSubmit={salvar}>
          <div className="repasse-form-grid">
            <label className="form-field">
              <span>Novo valor de repasse *</span>
              <input type="number" min="0.01" max="9999999999.99" step="0.01"
                value={valor} onChange={e => setValor(e.target.value)} required disabled={salvando} />
            </label>
            <label className="form-field full-width">
              <span>Motivo da alteração *</span>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
                maxLength={250} required disabled={salvando} />
            </label>
          </div>
          <div className="repasse-form-actions">
            <button type="submit" className="button primary" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar repasse"}
            </button>
            <button type="button" className="button secondary" disabled={salvando}
              onClick={() => { setEditando(false); setErro(""); }}>Cancelar</button>
          </div>
        </form>
      )}
      <h4>Histórico de alterações</h4>
      {carregando ? <p>Carregando histórico...</p> : erroHistorico ? (
        <div className="alert error" role="alert">
          <span>{erroHistorico}</span>
          <button type="button" className="consignment-link-button" onClick={() => setTentativa(n => n + 1)}>
            Tentar novamente
          </button>
        </div>
      ) : historico.length === 0 ? <p>Nenhuma alteração de repasse registrada.</p> : (
        <div className="repasse-table-wrapper">
          <table className="repasse-table">
            <thead><tr><th>Data e hora</th><th>Usuário</th><th>Valor anterior</th><th>Novo valor</th><th>Motivo</th></tr></thead>
            <tbody>{historico.map(item => (
              <tr key={item.id_historico}>
                <td>{dataHora(item.data_alteracao)}</td>
                <td>{item.usuario ?? "Não informado"}</td>
                <td>{moeda(item.valor_anterior)}</td>
                <td>{moeda(item.valor_novo)}</td>
                <td style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.motivo}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
