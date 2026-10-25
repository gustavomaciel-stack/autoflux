import { useEffect, useRef, useState, type FormEvent } from 'react';
import { salvarCadastroCliente, type CadastroCliente } from '../services/clientesApi';
import type { Cliente } from '../types/Cliente';
import './ClienteModal.css';

const campos = ['nome_razao_social','nome_fantasia','cpf','cnpj','telefone','email','cep','logradouro','numero','complemento','bairro','cidade','estado','observacoes'] as const;
type Campo = typeof campos[number];
type Formulario = Record<Campo, string> & { tipo_pessoa: 'PF' | 'PJ'; ativo: number };
const inicial: Formulario = { tipo_pessoa:'PF', ativo:1, nome_razao_social:'', nome_fantasia:'', cpf:'', cnpj:'', telefone:'', email:'', cep:'', logradouro:'', numero:'', complemento:'', bairro:'', cidade:'', estado:'', observacoes:'' };
const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function ClienteModal({ cliente, aoFechar, aoSalvar }: { cliente: Cliente | null; aoFechar: () => void; aoSalvar: (cliente: Cliente) => void }) {
  const [form, setForm] = useState<Formulario>(() => {
    if (!cliente) return { ...inicial };
    const dados = { ...inicial, tipo_pessoa:cliente.tipo_pessoa, ativo:Number(cliente.ativo) };
    for (const campo of campos) dados[campo] = cliente[campo] ?? '';
    return dados;
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogo.current?.showModal(); }, []);
  function campo(nome: Campo, valor: string) { setForm(atual => ({ ...atual, [nome]:nome === 'cnpj' ? valor.toUpperCase() : valor })); }
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setErro(''); setSalvando(true);
    try {
      const dados: CadastroCliente = {
        ...form, nome_razao_social:form.nome_razao_social.trim(),
        nome_fantasia:form.tipo_pessoa === 'PJ' ? form.nome_fantasia.trim() || null : null,
        cpf:form.tipo_pessoa === 'PF' ? form.cpf : null,
        cnpj:form.tipo_pessoa === 'PJ' ? form.cnpj : null,
      };
      const salvo = await salvarCadastroCliente(dados, cliente?.id_cliente);
      aoSalvar(salvo); aoFechar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar o cliente.'); }
    finally { setSalvando(false); }
  }
  function input(nome: Campo, titulo: string, maxLength: number, required = false, type = 'text') {
    return <label className="field"><span>{titulo}{required ? ' *' : ''}</span><input value={form[nome]} onChange={e => campo(nome,e.target.value)} maxLength={maxLength} required={required} type={type} autoCapitalize={nome === 'cnpj' ? 'characters' : undefined} placeholder={nome === 'cnpj' ? '12.ABC.345/01DE-35' : undefined} /></label>;
  }
  return <dialog ref={dialogo} className="cliente-dialog" aria-labelledby="cliente-titulo" onCancel={e => { e.preventDefault(); if (!salvando) aoFechar(); }}>
    <header className="modal-header"><h2 id="cliente-titulo">{cliente ? 'Editar cliente' : 'Novo cliente'}</h2><button type="button" className="icon-button" aria-label="Fechar" disabled={salvando} onClick={aoFechar}>×</button></header>
    <form onSubmit={salvar}>
      <div className="cliente-conteudo">
        {erro && <div className="alert error" role="alert">{erro}</div>}
        <fieldset disabled={salvando} className="cliente-grupo"><legend>Identificação e contato</legend>
          <label className="field"><span>Tipo de pessoa *</span><select value={form.tipo_pessoa} onChange={e => setForm(atual => ({ ...atual, tipo_pessoa:e.target.value as 'PF'|'PJ' }))}><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select></label>
          {input('nome_razao_social', form.tipo_pessoa === 'PF' ? 'Nome completo' : 'Razão social',150,true)}
          {form.tipo_pessoa === 'PJ' && input('nome_fantasia','Nome fantasia',150)}
          {form.tipo_pessoa === 'PF' ? input('cpf','CPF',14,true) : input('cnpj','CNPJ',18,true)}
          {input('telefone','Telefone com DDD',20,true,'tel')}{input('email','E-mail',150,false,'email')}
          <label className="field"><span>Situação *</span><select value={form.ativo} onChange={e => setForm(atual => ({ ...atual, ativo:Number(e.target.value) }))}><option value={1}>Ativo</option><option value={0}>Inativo</option></select></label>
        </fieldset>
        <fieldset disabled={salvando} className="cliente-grupo"><legend>Endereço</legend>
          {input('cep','CEP',9)}{input('logradouro','Logradouro',150)}{input('numero','Número',10)}{input('complemento','Complemento',100)}{input('bairro','Bairro',80)}{input('cidade','Cidade',80)}
          <label className="field"><span>Estado</span><select value={form.estado} onChange={e => campo('estado',e.target.value)}><option value="">Selecione</option>{estados.map(uf => <option key={uf}>{uf}</option>)}</select></label>
        </fieldset>
        <label className="field"><span>Observações</span><textarea disabled={salvando} value={form.observacoes} onChange={e => campo('observacoes',e.target.value)} rows={3} /></label>
      </div>
      <footer className="modal-footer"><button type="button" className="button secondary" disabled={salvando} onClick={aoFechar}>Cancelar</button><button className="button primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar cliente'}</button></footer>
    </form>
  </dialog>;
}
