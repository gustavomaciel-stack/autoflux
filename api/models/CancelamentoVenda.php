<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';
require_once __DIR__.'/DestinoTrocaCancelada.php';
final class CancelamentoVenda {
 public function __construct(private PDO $pdo){}
 private function q(string $sql,array $a=[]):PDOStatement{$q=$this->pdo->prepare($sql);$q->execute($a);return $q;}
 private static function json(array $v):string{return json_encode($v,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);}
 private static function data(mixed $v,string $min,string $label):string{$s=Orcamento::texto($v,10);$d=DateTimeImmutable::createFromFormat('!Y-m-d',$s);if(!$d||$d->format('Y-m-d')!==$s||$s<$min||$s>date('Y-m-d'))throw new InvalidArgumentException($label.' deve estar entre '.date('d/m/Y',strtotime($min)).' e hoje.');return $s;}
 public function detalhes(int $pedido):?array {
  $r=$this->q('SELECT x.*,u.nome responsavel,ur.nome responsavel_retorno,c.nosso_numero retorno_numero FROM cancelamentos_venda_autoflux x JOIN usuarios u ON u.id_usuario=x.id_usuario LEFT JOIN usuarios ur ON ur.id_usuario=x.id_usuario_retorno LEFT JOIN ciclos_veiculo c ON c.id_ciclo=x.id_ciclo_retorno WHERE x.id_pedido=?',[$pedido])->fetch(PDO::FETCH_ASSOC);if(!$r)return null;
  $r['versao']=(int)$r['versao'];$r['retorno_previsto']=(bool)$r['retorno_previsto'];$r['retorno_dados']=$r['retorno_snapshot']?json_decode($r['retorno_snapshot'],true,512,JSON_THROW_ON_ERROR):null;unset($r['retorno_snapshot']);$r['trocas']=(new DestinoTrocaCancelada($this->pdo))->listar($pedido);$r['pendencias_trocas']=count(array_filter($r['trocas'],fn($t)=>$t['pendente']));$r['retorno_pendente']=$r['retorno_previsto']&&$r['id_ciclo_retorno']===null;$r['processo_concluido']=!$r['retorno_pendente']&&$r['pendencias_trocas']===0;return $r;
 }
 public function contexto(int $pedido):array {
  $r=$this->q('SELECT p.id_ciclo,p.id_cliente,c.id_veiculo,c.origem_entrada,c.quilometragem_entrada,v.marca,v.modelo,v.placa,a.valor_aquisicao,co.valor_repasse_acordado FROM pedidos_venda_autoflux p JOIN ciclos_veiculo c ON c.id_ciclo=p.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo LEFT JOIN aquisicoes a ON a.id_ciclo=c.id_ciclo LEFT JOIN consignacoes co ON co.id_ciclo=c.id_ciclo WHERE p.id_pedido=?',[$pedido])->fetch(PDO::FETCH_ASSOC);
  if(!$r)throw new InvalidArgumentException('Pedido não encontrado.');
  $r['trocas']=(int)$this->q('SELECT COUNT(*) FROM trocas_recebidas_autoflux WHERE id_pedido=?',[$pedido])->fetchColumn();
  $r['trocas_com_entrada']=(int)$this->q('SELECT COUNT(*) FROM trocas_recebidas_autoflux r JOIN entradas_troca_autoflux e ON e.id_recebimento=r.id_recebimento WHERE r.id_pedido=?',[$pedido])->fetchColumn();
  $r['repasse_pago']=$this->q('SELECT COALESCE(SUM(pg.valor),0) FROM pagamentos_repasse_autoflux pg JOIN repasses_consignado_autoflux r ON r.id_repasse=pg.id_repasse WHERE r.id_pedido=?',[$pedido])->fetchColumn();
  $r['atendimentos']=(int)$this->q('SELECT COUNT(*) FROM atendimentos_garantia_autoflux WHERE id_pedido=?',[$pedido])->fetchColumn();
  $cli=$this->q('SELECT nome_razao_social FROM clientes WHERE id_cliente=?',[$r['id_cliente']])->fetchColumn();$r['cliente']=$cli?:'';return $r;
 }
 public function cancelar(int $id,array $d,int $usuario):void {
  $motivo=Orcamento::texto($d['motivo']??'',1000);$acerto=Orcamento::texto($d['acerto_financeiro']??'',5000);$vinculos=Orcamento::texto($d['tratamento_vinculos']??'',5000);
  if($motivo===''||$acerto==='')throw new InvalidArgumentException('Informe o motivo e o tratamento dos valores da venda.');
  if(($d['conferido']??false)!==true||!is_bool($d['retorno_previsto']??null))throw new InvalidArgumentException('Confirme o cancelamento e informe a previsão de retorno.');
  $this->pdo->beginTransaction();try{
   $origem=$this->q('SELECT id_orcamento,id_ciclo FROM pedidos_venda_autoflux WHERE id_pedido=?',[$id])->fetch(PDO::FETCH_ASSOC);if(!$origem)throw new InvalidArgumentException('Pedido não encontrado.');
   $this->q('SELECT id_orcamento FROM orcamentos WHERE id_orcamento=? FOR UPDATE',[$origem['id_orcamento']]);
   $this->q('SELECT id_ciclo FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$origem['id_ciclo']]);
   $p=$this->q('SELECT * FROM pedidos_venda_autoflux WHERE id_pedido=? FOR UPDATE',[$id])->fetch(PDO::FETCH_ASSOC);
   if($p['situacao']!=='Concluído')throw new DomainException('Somente uma venda concluída pode ser cancelada nesta operação.');
   if(Orcamento::id($d['versao']??null)!==(int)$p['versao'])throw new DomainException('O pedido mudou. Atualize e confira novamente.');
   $f=$this->q('SELECT * FROM vendas_fechamento_autoflux WHERE id_pedido=? FOR UPDATE',[$id])->fetch(PDO::FETCH_ASSOC);if(!$f)throw new DomainException('Fechamento não encontrado.');
   $data=self::data($d['data_efetiva']??null,substr($f['data_venda'],0,10),'A data do cancelamento');$ctx=$this->contexto($id);
   if(($ctx['trocas']>0||Orcamento::centavos($ctx['repasse_pago'])>0||$ctx['atendimentos']>0)&&$vinculos==='')throw new InvalidArgumentException('Descreva o tratamento das trocas, repasses e atendimentos vinculados.');
   $this->q('INSERT INTO cancelamentos_venda_autoflux(id_pedido,id_venda,id_ciclo_origem,id_usuario,motivo,data_efetiva,acerto_financeiro,tratamento_vinculos,retorno_previsto) VALUES(?,?,?,?,?,?,?,?,?)',[$id,$f['id_venda'],$p['id_ciclo'],$usuario,$motivo,$data,$acerto,$vinculos,(int)$d['retorno_previsto']]);
   (new DestinoTrocaCancelada($this->pdo))->cancelarPendencias($id);
   // Fechamento, comissão, pagamentos e custos originais permanecem preservados.
   $this->q("UPDATE pedidos_venda_autoflux SET situacao='Cancelado',motivo_cancelamento=?,data_cancelamento=CURRENT_TIMESTAMP,id_usuario_cancelamento=?,versao=versao+1 WHERE id_pedido=?",[mb_substr($motivo,0,255),$usuario,$id]);
   $this->q("UPDATE repasses_consignado_autoflux SET situacao='Cancelada' WHERE id_pedido=?",[$id]);
   $this->q("INSERT INTO eventos_pedido_autoflux(id_pedido,id_usuario,tipo,observacoes) VALUES(?,?,'Venda concluída cancelada',?)",[$id,$usuario,$motivo.' · Data informada: '.$data.' · Valores: '.$acerto.($vinculos?' · Vínculos: '.$vinculos:'').' · '.($d['retorno_previsto']?'Retorno aguardando registro e NF.':'Sem retorno previsto no momento.').' O ciclo original permanece encerrado.']);
   $this->pdo->commit();
  }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
 }
 public function retornar(int $id,array $d,int $usuario):void {
  if(($d['conferido']??false)!==true)throw new InvalidArgumentException('Confirme o veículo, a base de custo e a nota fiscal de retorno.');
  $this->pdo->beginTransaction();try{
   $p=$this->q('SELECT * FROM pedidos_venda_autoflux WHERE id_pedido=? FOR UPDATE',[$id])->fetch(PDO::FETCH_ASSOC);
   if(!$p||$p['situacao']!=='Cancelado')throw new DomainException('Registre primeiro o cancelamento da venda concluída.');
   if(Orcamento::id($d['versao']??null)!==(int)$p['versao'])throw new DomainException('O pedido mudou. Atualize antes de registrar o retorno.');
   $x=$this->q('SELECT * FROM cancelamentos_venda_autoflux WHERE id_pedido=? FOR UPDATE',[$id])->fetch(PDO::FETCH_ASSOC);
   if(!$x)throw new DomainException('Este pedido não possui cancelamento de venda concluída.');
   if($x['id_ciclo_retorno']!==null)throw new DomainException('O retorno já foi registrado. Atualize para consultar o novo número AF.');
   $c=$this->q('SELECT * FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$p['id_ciclo']])->fetch(PDO::FETCH_ASSOC);
   $this->q('SELECT id_veiculo FROM veiculos WHERE id_veiculo=? FOR UPDATE',[$c['id_veiculo']]);
   if($this->q('SELECT id_ciclo FROM ciclos_veiculo WHERE id_veiculo=? AND data_encerramento IS NULL FOR UPDATE',[$c['id_veiculo']])->fetchColumn())throw new DomainException('Este veículo já possui um ciclo ativo. Consulte o pátio antes de registrar outro retorno.');
   $data=self::data($d['data_retorno']??null,$x['data_efetiva'],'A data do retorno');$emissao=self::data($d['data_emissao']??null,'1900-01-01','A emissão da NF');if($emissao>$data)throw new InvalidArgumentException('A emissão da NF não pode ser posterior ao retorno.');
   $nf=Orcamento::texto($d['numero_nota']??'',20);$serie=Orcamento::texto($d['serie']??'',10);$descricao=Orcamento::texto($d['descricao_item']??'',255);$nome=Orcamento::texto($d['proprietario_nome']??'',150);$chave=Orcamento::texto($d['chave_acesso']??'',44);$obs=Orcamento::texto($d['observacoes']??'',5000);
   if($nf===''||$serie===''||$descricao===''||$nome==='')throw new InvalidArgumentException('Informe número, série, descrição e proprietário/origem da NF.');
   if($chave!==''&&!preg_match('/^[0-9]{44}$/D',$chave))throw new InvalidArgumentException('A chave de acesso deve ter 44 dígitos.');
   $valor=Orcamento::moeda(Orcamento::centavos($d['valor_origem']??null));$km=filter_var($d['quilometragem']??null,FILTER_VALIDATE_INT);if($km===false||$km<0||$km<(int)$c['quilometragem_entrada'])throw new InvalidArgumentException('A quilometragem deve ser igual ou superior à entrada anterior.');
   $cons=mb_strtolower($c['origem_entrada'],'UTF-8')==='consignação';$co=null;
   if($cons){$co=$this->q('SELECT * FROM consignacoes WHERE id_ciclo=? FOR UPDATE',[$c['id_ciclo']])->fetch(PDO::FETCH_ASSOC);if(!$co)throw new DomainException('Consignação original não encontrada.');}
   if(!$cons&&Orcamento::centavos($valor)<=0)throw new InvalidArgumentException('Informe um valor positivo para a aquisição de reentrada.');
   $origem='Devolução - '.$p['numero_pedido'];$anotacao=$origem.' · Ciclo anterior '.$c['nosso_numero'].'. '.$obs;
   $this->q("INSERT INTO ciclos_veiculo(id_veiculo,nosso_numero,origem_entrada,origem_movimento,renavam,cor,quilometragem_entrada,horimetro_entrada,situacao_atual,data_entrada,observacoes) VALUES(?,?,?,'Devolução',?,?,?,?,'Disponível',?,?)",[$c['id_veiculo'],'TMP-'.bin2hex(random_bytes(6)),$c['origem_entrada'],$c['renavam'],$c['cor'],$km,$c['horimetro_entrada'],$data.' 00:00:00',$anotacao]);
   $novo=(int)$this->pdo->lastInsertId();$af='AF-'.str_pad((string)$novo,6,'0',STR_PAD_LEFT);$this->q('UPDATE ciclos_veiculo SET nosso_numero=? WHERE id_ciclo=?',[$af,$novo]);
   $aq=null;if(!$cons){$this->q("INSERT INTO aquisicoes(id_ciclo,id_veiculo,id_usuario_responsavel,valor_aquisicao,data_aquisicao,origem,situacao,data_conclusao,observacoes) VALUES(?,?,?,?,?,?,'Concluída',?,?)",[$novo,$c['id_veiculo'],$usuario,$valor,$data,$origem,$data.' 00:00:00',$anotacao]);$aq=(int)$this->pdo->lastInsertId();}
   $this->q('INSERT INTO notas_fiscais_entrada(id_aquisicao,id_fornecedor_origem,nome_fornecedor_avulso,id_ciclo,id_veiculo,descricao_item,id_usuario_responsavel,numero_nota,id_cliente_origem,serie,chave_acesso,data_emissao,valor_total,natureza_operacao,observacoes,data_entrada) VALUES(?,NULL,?,?,?,?,?,?,NULL,?,?,?,?,?,?,?)',[$aq,$nome,$novo,$c['id_veiculo'],$descricao,$usuario,$nf,$serie,$chave?:null,$emissao,$valor,'Retorno por cancelamento de venda',$anotacao,$data.' 00:00:00']);$idNF=(int)$this->pdo->lastInsertId();
   if($cons)$this->q("INSERT INTO consignacoes(id_ciclo,id_proprietario,id_nota_fiscal_entrada,id_usuario_responsavel,situacao,observacoes,valor_repasse_acordado,responsavel_despesas,data_acordo) VALUES(?,?,?,?,'Ativa',?,?,?,?)",[$novo,$co['id_proprietario'],$idNF,$usuario,$anotacao,$valor,$co['responsavel_despesas'],$data]);
   $this->q("INSERT INTO movimentacoes_veiculo(id_ciclo,id_usuario_responsavel,situacao_anterior,situacao_nova,data_movimentacao,observacoes) VALUES(?,?,'Fora do pátio','Disponível',CURRENT_TIMESTAMP,?)",[$novo,$usuario,$anotacao]);
   $this->q('UPDATE cancelamentos_venda_autoflux SET id_ciclo_retorno=?,data_retorno=?,id_usuario_retorno=?,retorno_snapshot=?,retorno_previsto=1,versao=versao+1 WHERE id_cancelamento=?',[$novo,$data,$usuario,self::json(['origem'=>'Devolução','natureza'=>$c['origem_entrada'],'ciclo_original'=>$c['nosso_numero'],'novo_ciclo'=>$af,'valor_origem'=>$valor,'numero_nota'=>$nf,'serie'=>$serie,'proprietario_nome'=>$nome,'observacoes'=>$obs]),$x['id_cancelamento']]);
   $this->q('UPDATE pedidos_venda_autoflux SET versao=versao+1 WHERE id_pedido=?',[$id]);
   $this->q("INSERT INTO eventos_pedido_autoflux(id_pedido,id_usuario,tipo,observacoes) VALUES(?,?,'Retorno de veículo registrado',?)",[$id,$usuario,$af.' · '.$origem.' · NF '.$nf.'/'.$serie.'. Custos e despesas anteriores permanecem no ciclo original.']);$this->pdo->commit();
  }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
 }
}
