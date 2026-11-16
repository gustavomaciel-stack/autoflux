import './AnexosNotaFiscal.css';
import './NotaSaidaConsulta.css';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { anexarPdfDevolucao, baixarNotaSaida, listarNotasSaida, registrarNotaSaida, type NotaSaida } from '../services/notasSaidaApi';

export function NotaSaidaPanel({ nota, onSalva, aoFechar }: { nota: NotaSaida; onSalva: (nota: NotaSaida) => void; aoFechar?: () => void }) {
  const { pode } = useAuth();
  const [consultando, setConsultando] = useState(Boolean(aoFechar && nota.numero_nota));
  const [editando, setEditando] = useState(Boolean(aoFechar));
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [arquivoDevolucao, setArquivoDevolucao] = useState<File | null>(null);
  const [pdfAnexado, setPdfAnexado] = useState(false);

  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const podeRegistrar = !nota.numero_nota && nota.situacao !== 'Cancelado'
    && pode('notas.visualizar') && pode('pedidos.visualizar') && pode('pedidos.gerenciar');
  const modalAberto = editando && podeRegistrar;

  useEffect(() => {
    if ((modalAberto || consultando) && !dialogo.current?.open) dialogo.current?.showModal();
  }, [modalAberto, consultando]);

  function fechar() {
    setEditando(false);
    setConsultando(false);
    setErro('');
    aoFechar?.();
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setOcupado(true);
    setErro('');
    try {
      const salva = await registrarNotaSaida(nota.id_pedido, dados);
      dialogo.current?.close();
      onSalva(salva);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar a nota.');
    } finally { setOcupado(false); }
  }

  async function baixar() {
    setErro('');
    try { await baixarNotaSaida(nota); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível baixar o PDF.'); }
  }

  if (nota.numero_nota && consultando) return <dialog ref={dialogo} className="nf-saida-consulta" aria-labelledby={titulo} onClose={fechar}>
    <header className="modal-header">
      <h2 id={titulo}>Nota Fiscal de Saída {nota.numero_nota}/{nota.serie || '—'}</h2>
      <button type="button" className="modal-close" aria-label="Fechar" onClick={() => dialogo.current?.close()}>×</button>
    </header>
    <div className="modal-body">
      <section className="nf-anexos">
        <h3>Arquivos da nota fiscal</h3>
        <p>Consulte o PDF anexado à nota fiscal de saída.</p>
        {erro && <p className="alert error" role="alert">{erro}</p>}
        {nota.nome_original || pdfAnexado ? <div className="nf-saida-arquivo"><span>{nota.nome_original || arquivoDevolucao?.name || 'Nota fiscal de saída.pdf'}</span><button type="button" className="button primary" onClick={() => void baixar()}>Baixar PDF</button></div> : nota.id_pedido < 0 ? <div>
          <p>PDF ainda não anexado.</p>
          <div className="nf-anexos-envio"><label>Selecionar PDF (até 5 MB)<input type="file" accept=".pdf,application/pdf" disabled={ocupado} onChange={e => setArquivoDevolucao(e.target.files?.[0] ?? null)} /></label>
          <button type="button" className="button primary" disabled={ocupado || !arquivoDevolucao} onClick={async () => {
            if (!arquivoDevolucao) return;
            setOcupado(true); setErro('');
            try {await anexarPdfDevolucao(nota.id_pedido, arquivoDevolucao); setPdfAnexado(true);}
            catch (e) {setErro(e instanceof Error ? e.message : 'Não foi possível anexar o PDF.');}
            finally {setOcupado(false);}
          }}>{ocupado ? 'Anexando…' : 'Anexar arquivo'}</button></div>
        </div> : <p>PDF não disponível.</p>}
      </section>
      <h3>Dados da nota fiscal</h3>
      <div className="nf-saida-consulta-grid">
        <label className="field">Número da nota<input readOnly value={nota.numero_nota} /></label>
        <label className="field">Série<input readOnly value={nota.serie || 'Não informada'} /></label>
        <label className="field">Data de emissão<input readOnly value={nota.data_emissao?.slice(0,10).split('-').reverse().join('/') || 'Não informada'} /></label>
        <label className="field">{nota.id_pedido < 0 ? "Origem da saída" : "Pedido de venda"}<input readOnly value={nota.numero_pedido} /></label>
        <label className="field nf-saida-linha-inteira">Chave de acesso<input readOnly value={nota.chave_acesso || 'Não informada'} /></label>
      </div>
      <h3>Veículo</h3>
      <div className="nf-saida-consulta-grid">
        <label className="field nf-saida-linha-inteira">Veículo<input readOnly value={`${nota.marca} ${nota.modelo}`} /></label>
        <label className="field">Placa<input readOnly value={nota.placa} /></label>
        <label className="field">Nosso número<input readOnly value={nota.nosso_numero} /></label>
      </div>
      {nota.situacao === 'Cancelado' && <p className="alert error">Venda cancelada</p>}
    </div>
    <footer className="modal-footer"><button type="button" className="button primary" onClick={() => dialogo.current?.close()}>Fechar</button></footer>
  </dialog>;

  if (modalAberto) return <dialog ref={dialogo} className="nf-saida-dialog" aria-labelledby={titulo}
    onClose={fechar} onCancel={evento => { if (ocupado) evento.preventDefault(); }}>
      <h3 id={titulo}>Registrar nota fiscal de saída</h3>
      <p className="nf-saida-contexto">{nota.numero_pedido} · {nota.marca} {nota.modelo}</p>
      {erro && <p className="alert error" role="alert">{erro}</p>}
      <form onSubmit={salvar}>
        <fieldset disabled={ocupado}>
          <div className="nf-saida-campos">
            <label className="field">Número da nota<input name="numero" required inputMode="numeric" pattern="[0-9]{1,9}" maxLength={9} /></label>
            <label className="field">Série<input name="serie" required inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} /></label>
            <label className="field">Data de emissão<input name="data_emissao" type="date" required /></label>
            <label className="field">Chave de acesso (opcional)<input name="chave_acesso" inputMode="numeric" pattern="[0-9]{44}" maxLength={44} title="Informe os 44 dígitos da chave de acesso" /></label>
          </div>
          <div className="nf-anexos-envio"><label>Selecionar PDF (até 5 MB)<input name="arquivo" type="file" accept=".pdf,application/pdf" required /></label></div>
          <div className="nf-saida-acoes">
            <button type="button" className="button secondary" onClick={() => dialogo.current?.close()}>Fechar</button>
            <button type="submit" className="button primary">{ocupado ? 'Salvando…' : 'Salvar nota de saída'}</button>
          </div>
        </fieldset>
      </form>
  </dialog>;

  return <section className={nota.numero_nota ? "nf-anexos nf-saida-registrada" : "nf-anexos"}>
    <h3>{nota.numero_nota ? 'Nota fiscal de saída registrada' : 'Nota fiscal de saída pendente'}</h3>
    {erro && <p className="alert error" role="alert">{erro}</p>}
    {nota.numero_nota ? <button type="button" className="button secondary" onClick={() => setConsultando(true)}>Ver nota de saída</button> : podeRegistrar &&
      <button type="button" className="button primary" onClick={() => setEditando(true)}>Registrar nota de saída</button>}
  </section>;
}

export function NotaSaidaPedido({ pedido }: { pedido: number }) {
  const [nota, setNota] = useState<NotaSaida>();
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    listarNotasSaida(pedido)
      .then(([dados]) => { if (ativo) setNota(dados); })
      .catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [pedido, tentativa]);

  if (erro) return <div className="alert error" role="alert">{erro} <button type="button" className="button secondary" onClick={() => { setErro(''); setTentativa(t => t + 1); }}>Tentar novamente</button></div>;
  return nota ? <NotaSaidaPanel nota={nota} onSalva={setNota} /> : null;
}
