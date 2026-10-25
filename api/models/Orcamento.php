<?php
declare(strict_types=1);
require_once __DIR__.'/AutorizacaoComercial.php';
require_once __DIR__.'/ReservaOrcamento.php';
require_once __DIR__.'/TrocaOrcamento.php';
final class Orcamento {
 public function __construct(private PDO $pdo) {}
 private function rows(string $sql,array $args=[]): array { $q=$this->pdo->prepare($sql);$q->execute($args);return $q->fetchAll(PDO::FETCH_ASSOC); }
 private function row(string $sql,array $args=[]): array { $r=$this->rows($sql,$args);if(!$r)throw new InvalidArgumentException('Registro não encontrado.');return $r[0]; }
 public static function id(mixed $v): int { $i=filter_var($v,FILTER_VALIDATE_INT);if(!$i||$i<1)throw new InvalidArgumentException('Identificador inválido.');return $i; }
 public static function centavos(mixed $v): int {
  if(!is_string($v)&&!is_int($v)&&!is_float($v))throw new InvalidArgumentException('Valor monetário inválido.');
  $s=str_replace(',','.',trim((string)$v));
  if(!preg_match('/^([0-9]{1,10})(?:\.([0-9]{1,2}))?$/',$s,$m))throw new InvalidArgumentException('Informe um valor monetário com até duas casas decimais.');
  return (int)$m[1]*100+(int)str_pad($m[2]??'',2,'0');
 }
 public static function texto(mixed $v,int $limite): string {
  if($v===null)return '';if(!is_string($v))throw new InvalidArgumentException('Texto inválido.');
  $s=trim($v);if(mb_strlen($s)>$limite)throw new InvalidArgumentException('Texto maior que o limite permitido.');return $s;
 }
 public static function moeda(int $v): string { return ($v<0?'-':'').intdiv(abs($v),100).'.'.str_pad((string)(abs($v)%100),2,'0',STR_PAD_LEFT); }
 public static function sugerir(int $base,int $padrao,int $imposto): int {
  if($imposto<0||$imposto>=10000)throw new InvalidArgumentException('Imposto estimado inválido.');
  $alvo=$base+(int)round($base*$padrao/10000);
  return (int)ceil($alvo*10000/(10000-$imposto));
 }
 public static function taxa(array $composicao): int { return self::centavos($composicao['imposto_percentual']??'0'); }
 public static function calcular(int $base,int $valor,int $imposto=0,int $comissao=0): array {
  if($base<=0||$valor<=0||$base>999999999999||$valor>999999999999)throw new InvalidArgumentException('A base e o valor negociado devem ser positivos e caber no limite monetário.');
  if($comissao<0||$comissao>10000)throw new InvalidArgumentException('Comissão do vendedor inválida.');
  $valorComissao=(int)round($valor*$comissao/10000);
  $tributo=(int)round($valor*$imposto/10000);
  $resultado=$valor-$base-$tributo-$valorComissao;
  $margem=round($resultado/$valor*100,2);
  if($margem < -99999.99)throw new InvalidArgumentException('O valor negociado gera uma margem fora do limite suportado.');
  return ['comissao_estimada'=>self::moeda($valorComissao),'impostos_estimados'=>self::moeda($tributo),'resultado_previsto'=>self::moeda($resultado),'margem_prevista'=>number_format($margem,2,'.','')];
 }
 public function opcoes(int $usuario): array {
  return [
   'clientes'=>$this->rows('SELECT id_cliente,nome_razao_social FROM clientes WHERE ativo=1 ORDER BY nome_razao_social'),
   'vendedores'=>$this->rows("SELECT v.id_vendedor,u.nome,v.percentual_comissao FROM vendedores v JOIN usuarios u ON u.id_usuario=v.id_usuario AND u.ativo=1 WHERE v.ativo=1 AND v.id_usuario=? ORDER BY v.id_vendedor",[$usuario]),
   'veiculos'=>$this->rows("SELECT c.id_ciclo,c.nosso_numero,v.marca,v.modelo,v.placa FROM ciclos_veiculo c JOIN veiculos v ON v.id_veiculo=c.id_veiculo WHERE c.data_encerramento IS NULL AND c.situacao_atual='Disponível' ORDER BY c.id_ciclo DESC")];
 }
 public function realizadas(int $id): array {
  return $this->rows("SELECT d.id_despesa,d.descricao,d.valor,COALESCE(d.responsavel_despesa,'Revenda') responsavel_despesa FROM despesas_veiculo d JOIN ciclos_veiculo c ON c.id_ciclo=d.id_ciclo WHERE d.id_ciclo=? AND d.ativo=1 AND (d.responsavel_despesa='Revenda' OR (d.responsavel_despesa IS NULL AND c.origem_entrada<>'Consignação')) ORDER BY d.id_despesa".($this->pdo->inTransaction()?' FOR UPDATE':''),[$id]);
 }
 public function custoAtual(int $ciclo,array $pos=[]): array {
  $origem=$this->row("SELECT c.origem_entrada,a.valor_aquisicao,co.valor_repasse_acordado FROM ciclos_veiculo c LEFT JOIN aquisicoes a ON a.id_ciclo=c.id_ciclo LEFT JOIN consignacoes co ON co.id_ciclo=c.id_ciclo WHERE c.id_ciclo=?".($this->pdo->inTransaction()?' FOR UPDATE':''),[$ciclo]);
  $valor=mb_strtolower($origem['origem_entrada'],'UTF-8')==='consignação'?$origem['valor_repasse_acordado']:$origem['valor_aquisicao'];
  if($valor===null)throw new DomainException('Informe a aquisição ou o repasse para calcular o resultado.');
  $realizadas=$this->realizadas($ciclo);$custo=self::centavos($valor);
  foreach($realizadas as $item)$custo+=self::centavos($item['valor']);
  foreach($pos as $item)$custo+=self::centavos($item['valor']);
  if($custo<=0||$custo>999999999999)throw new InvalidArgumentException('O custo da operação ultrapassa o limite permitido.');
  return ['custo_origem'=>self::moeda(self::centavos($valor)),'custo_realizadas'=>$realizadas,'custo_total'=>self::moeda($custo)];
 }
 public function conferirCusto(array $o): void {
  $comp=$o['composicao_comercial']?json_decode($o['composicao_comercial'],true,512,JSON_THROW_ON_ERROR):[];
  $atual=$this->custoAtual((int)$o['id_ciclo'],$comp['pos_venda']??[]);
  if(($comp['modelo']??0)!==3||($comp['custo_total']??null)!==$atual['custo_total'])throw new DomainException('Revise e salve a proposta: os custos precisam ser atualizados antes de autorizar, reservar ou registrar sinal.');
 }
 public static function posVenda(mixed $itens): array {
  if(!is_array($itens)||count($itens)>100)throw new InvalidArgumentException('Informe até 100 despesas pós-venda.');
  $saida=[];foreach($itens as $item){if(!is_array($item))throw new InvalidArgumentException('Despesa pós-venda inválida.');$descricao=self::texto($item['descricao']??'',255);$valor=self::centavos($item['valor']??null);if($descricao===''||$valor<=0)throw new InvalidArgumentException('Informe descrição e valor positivo para cada despesa pós-venda.');$saida[]=['descricao'=>$descricao,'valor'=>self::moeda($valor)];}return $saida;
 }
 private function compor(int $ciclo,array $d,string $origem): array {
  $ids=$d['despesas_realizadas']??[];if(!is_array($ids))throw new InvalidArgumentException('Selecione as despesas realizadas.');$ids=array_map([self::class,'id'],$ids);if(count(array_unique($ids))!==count($ids))throw new InvalidArgumentException('Despesa realizada duplicada.');
  $opcoes=[];foreach($this->realizadas($ciclo) as $item)$opcoes[(int)$item['id_despesa']]=$item;
  $selecionadas=[];$base=self::centavos($origem);foreach($ids as $id){if(!isset($opcoes[$id]))throw new DomainException('Uma despesa deixou de estar disponível. Atualize os detalhes.');$item=$opcoes[$id];$base+=self::centavos($item['valor']);$selecionadas[]=$item;}
  $pos=self::posVenda($d['despesas_pos_venda']??[]);foreach($pos as $item)$base+=self::centavos($item['valor']);
  if($base<=0||$base>999999999999)throw new InvalidArgumentException('A base comercial ultrapassa o limite permitido.');
  return array_merge(['modelo'=>3,'base_origem'=>$origem,'realizadas'=>$selecionadas,'pos_venda'=>$pos,'base'=>self::moeda($base)],$this->custoAtual($ciclo,$pos));
 }
 public function base(int $id,int $usuario=0): array {
  $c=$this->row("SELECT c.*,a.valor_aquisicao,co.valor_repasse_acordado,v.marca,v.modelo,v.placa FROM ciclos_veiculo c JOIN veiculos v ON v.id_veiculo=c.id_veiculo LEFT JOIN aquisicoes a ON a.id_ciclo=c.id_ciclo LEFT JOIN consignacoes co ON co.id_ciclo=c.id_ciclo WHERE c.id_ciclo=?",[$id]);
  if($c['data_encerramento']!==null||$c['situacao_atual']!=='Disponível')throw new DomainException('O veículo não está disponível para novo orçamento.');
  $p=$this->row('SELECT * FROM parametros_comerciais WHERE ativo=1 AND inicio_vigencia<=CURRENT_TIMESTAMP ORDER BY id_parametro DESC LIMIT 1');
  (new ReservaOrcamento($this->pdo))->conferirCiclo($id);
  $c['parametro']=$p;
  $c['realizadas']=$this->realizadas($id);
  $t=['realizadas'=>self::moeda(array_sum(array_map(fn($d)=>self::centavos($d['valor']),$c['realizadas'])))];
  $consignado=mb_strtolower($c['origem_entrada'],'UTF-8')==='consignação';
  $origem=$consignado?$c['valor_repasse_acordado']:$c['valor_aquisicao'];
  if($origem===null)throw new DomainException('Informe a aquisição ou o repasse antes de criar o orçamento.');
  $c['valor_base']=self::moeda(self::centavos($origem));
  $c['consignado']=$consignado;
  $vendedores=$usuario?$this->rows('SELECT percentual_comissao FROM vendedores WHERE id_usuario=? AND ativo=1'.($this->pdo->inTransaction()?' FOR UPDATE':''),[$usuario]):[];
  $c['comissao_percentual']=$vendedores[0]['percentual_comissao']??'0.00';
  $c['imposto_percentual']=$p['percentual_imposto_estimado'];
  $c['custo_total']=$this->custoAtual($id)['custo_total'];
  // Custo informativo usa aquisição para próprio; consignado não tem capital de aquisição.
  $c['custo_projetado_informativo']=self::moeda(($consignado?0:self::centavos($origem))+self::centavos($t['realizadas']));
  $c['assinatura_base']=hash('sha256',json_encode([$c['valor_base'],$c['comissao_percentual'],$p,$c['realizadas'],$c['custo_projetado_informativo']],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
  return $c;
 }
 public function paginar(array $f): array {
  $where=[];$args=[];
  $busca=self::texto($f['busca']??'',150);
  if($busca!==''){
   $where[]="(o.numero_orcamento LIKE ? OR c.nosso_numero LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ? OR v.placa LIKE ? OR cli.nome_razao_social LIKE ? OR u.nome LIKE ? OR CONCAT(v.marca,' ',v.modelo) LIKE ?)";
   // Escape wildcards: a pesquisa trata % e _ como texto.
   $termo='%'.strtr($busca,['\\'=>'\\\\','%'=>'\\%','_'=>'\\_']).'%';
   for($i=0;$i<8;$i++)$args[]=$termo;
  }
  $situacao=self::texto($f['situacao']??'',40);
  if($situacao==='andamento')$where[]="o.situacao IN ('Em negociação','Aguardando aprovação','Autorizado')";
  elseif($situacao!==''){
   if(!in_array($situacao,['Em negociação','Aguardando aprovação','Autorizado','Cancelado','Convertido em pedido'],true))throw new InvalidArgumentException('Situação inválida.');
   $where[]='o.situacao=?';$args[]=$situacao;
  }
  foreach(['inicio','fim'] as $campo){
   $valor=self::texto($f[$campo]??'',10);
   if($valor==='')continue;
   $data=DateTimeImmutable::createFromFormat('!Y-m-d',$valor);
   if(!$data||$data->format('Y-m-d')!==$valor)throw new InvalidArgumentException('Período inválido.');
   $where[]=$campo==='inicio'?'o.data_orcamento>=?':'o.data_orcamento<?';
   $args[]=$campo==='inicio'?$valor.' 00:00:00':$data->modify('+1 day')->format('Y-m-d').' 00:00:00';
  }
  foreach(['margemMin'=>'>=','margemMax'=>'<='] as $campo=>$operador){
   $valor=self::texto($f[$campo]??'',30);
   if($valor==='')continue;
   if(!is_numeric($valor)||!is_finite((float)$valor))throw new InvalidArgumentException('Margem inválida.');
   $where[]='o.margem_prevista'.$operador.'?';$args[]=$valor;
  }
  $aprovacao=self::texto($f['aprovacao']??'',3);
  if($aprovacao!==''){
   if(!in_array($aprovacao,['sim','nao'],true))throw new InvalidArgumentException('Filtro de aprovação inválido.');
   $where[]=$aprovacao==='sim'?"o.situacao='Aguardando aprovação'":"o.situacao<>'Aguardando aprovação'";
  }
  $sqlWhere=$where?' WHERE '.implode(' AND ',$where):'';
  $joins=' FROM orcamentos o JOIN ciclos_veiculo c ON c.id_ciclo=o.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo JOIN clientes cli ON cli.id_cliente=o.id_cliente JOIN vendedores vd ON vd.id_vendedor=o.id_vendedor JOIN usuarios u ON u.id_usuario=vd.id_usuario';
  $resumo=$this->row("SELECT COUNT(*) total,COALESCE(SUM(o.situacao='Aguardando aprovação'),0) aguardando,COALESCE(SUM(o.situacao='Autorizado'),0) autorizados".$joins.$sqlWhere,$args);
  $total=(int)$resumo['total'];$paginas=max(1,(int)ceil($total/20));
  $pagina=min(self::id($f['pagina']??1),$paginas);$offset=($pagina-1)*20;
  return ['itens'=>$this->listar($sqlWhere,$args,'LIMIT 20 OFFSET '.$offset),'total'=>$total,'pagina'=>$pagina,'paginas'=>$paginas,'aguardando'=>(int)$resumo['aguardando'],'autorizados'=>(int)$resumo['autorizados']];
 }
 public function listar(string $where="",array $args=[],string $limite=""): array {$lista=$this->rows('SELECT o.*,COALESCE((SELECT r.valor_sinal FROM reservas_orcamento r WHERE r.id_orcamento=o.id_orcamento AND r.data_liberacao IS NULL LIMIT 1),0) sinal_ativo,c.nosso_numero,v.marca,v.modelo,v.placa,cli.nome_razao_social cliente,u.nome vendedor FROM orcamentos o JOIN ciclos_veiculo c ON c.id_ciclo=o.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo JOIN clientes cli ON cli.id_cliente=o.id_cliente JOIN vendedores vd ON vd.id_vendedor=o.id_vendedor JOIN usuarios u ON u.id_usuario=vd.id_usuario '.$where.' ORDER BY o.data_orcamento DESC,o.id_orcamento DESC '.$limite,$args);
  if(!$lista)return [];
  $ids=implode(',',array_unique(array_map(static fn($o)=>(int)$o['id_ciclo'],$lista)));
  $custos=$this->rows("SELECT c.id_ciclo,CASE WHEN c.origem_entrada='Consignação' THEN co.valor_repasse_acordado ELSE a.valor_aquisicao END origem,COALESCE(d.total,0) despesas FROM ciclos_veiculo c LEFT JOIN aquisicoes a ON a.id_ciclo=c.id_ciclo LEFT JOIN consignacoes co ON co.id_ciclo=c.id_ciclo LEFT JOIN (SELECT d.id_ciclo,SUM(d.valor) total FROM despesas_veiculo d JOIN ciclos_veiculo c ON c.id_ciclo=d.id_ciclo WHERE d.id_ciclo IN ($ids) AND d.ativo=1 AND (d.responsavel_despesa='Revenda' OR (d.responsavel_despesa IS NULL AND c.origem_entrada<>'Consignação')) GROUP BY d.id_ciclo) d ON d.id_ciclo=c.id_ciclo WHERE c.id_ciclo IN ($ids)");
  $map=[];foreach($custos as $c)$map[(int)$c['id_ciclo']]=$c;
  foreach($lista as &$o){$comp=$o['composicao_comercial']?json_decode($o['composicao_comercial'],true,512,JSON_THROW_ON_ERROR):[];$o['composicao']=$comp?:null;$c=$map[(int)$o['id_ciclo']];$total=self::centavos($c['origem']??'0')+self::centavos($c['despesas']);foreach($comp['pos_venda']??[] as $item)$total+=self::centavos($item['valor']);$o['financeiro_atual']=array_merge(['custo_total'=>self::moeda($total)],self::calcular($total,self::centavos($o['valor_negociado_atual']),self::taxa($comp),self::centavos($comp['comissao_percentual']??'0')));$o['revisao_custos_necessaria']=($comp['modelo']??0)!==3||($comp['custo_total']??null)!==self::moeda($total);}
  unset($o);return $lista;
 }
 public function detalhes(int $id): array {
  $o=$this->row('SELECT o.*,c.nosso_numero,v.marca,v.modelo,v.placa,cli.nome_razao_social cliente,u.nome vendedor FROM orcamentos o JOIN ciclos_veiculo c ON c.id_ciclo=o.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo JOIN clientes cli ON cli.id_cliente=o.id_cliente JOIN vendedores vd ON vd.id_vendedor=o.id_vendedor JOIN usuarios u ON u.id_usuario=vd.id_usuario WHERE o.id_orcamento=?',[$id]);
  $o['composicao']=$o['composicao_comercial']?json_decode($o['composicao_comercial'],true,512,JSON_THROW_ON_ERROR):null;
  $o['realizadas_disponiveis']=$this->realizadas((int)$o['id_ciclo']);
  $o['financeiro_atual']=$this->custoAtual((int)$o['id_ciclo'],$o['composicao']['pos_venda']??[]);
  $o['financeiro_atual']=array_merge($o['financeiro_atual'],self::calcular(self::centavos($o['financeiro_atual']['custo_total']),self::centavos($o['valor_negociado_atual']),self::taxa($o['composicao']??[]),self::centavos($o['composicao']['comissao_percentual']??'0')));
  $o['revisao_custos_necessaria']=($o['composicao']['modelo']??0)!==3||($o['composicao']['custo_total']??null)!==$o['financeiro_atual']['custo_total'];
  // A composição salva mantém o histórico; a edição oferece só despesas ativas do ciclo.
  $o['previsoes']=json_decode($o['previsoes_preservadas'],true,512,JSON_THROW_ON_ERROR);
  $o['autorizacoes']=$this->rows('SELECT a.*,s.nome solicitante,u.nome aprovador FROM aprovacoes_orcamento a JOIN usuarios s ON s.id_usuario=a.id_usuario_solicitante LEFT JOIN usuarios u ON u.id_usuario=a.id_usuario_aprovador WHERE a.id_orcamento=? ORDER BY a.id_aprovacao DESC',[$id]);
  $o['historico']=$this->rows('SELECT n.*,u.nome usuario_responsavel FROM negociacoes_orcamento n JOIN usuarios u ON u.id_usuario=n.id_usuario_responsavel WHERE n.id_orcamento=? ORDER BY n.id_negociacao DESC',[$id]);
  $o=array_merge($o,(new ReservaOrcamento($this->pdo))->detalhes($id));
  $o=array_merge($o,(new TrocaOrcamento($this->pdo))->detalhes($id));
  $o['saldo_proposta']=TrocaOrcamento::saldo(self::centavos($o['valor_negociado_atual']),self::centavos($o['valor_troca']),self::centavos($o['reserva_ativa']['valor_sinal']??'0'));return $o;
 }
 private function registrar(int $id,int $usuario,string $tipo,string $valor,array $calc,?string $obs): void {
  $snapshot=$this->row('SELECT base_comercial_planejada,preco_sugerido,composicao_comercial FROM orcamentos WHERE id_orcamento=?',[$id]);
  $q=$this->pdo->prepare('INSERT INTO negociacoes_orcamento(id_orcamento,id_usuario_responsavel,tipo_registro,valor_proposto,resultado_previsto,margem_prevista,observacoes,composicao_comercial) VALUES(?,?,?,?,?,?,?,?)');$q->execute([$id,$usuario,$tipo,$valor,$calc['resultado_previsto'],$calc['margem_prevista'],$obs,json_encode($snapshot,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
 }
 public function criar(array $d,int $usuario,bool $gestor=false): int {
  $id=self::id($d['id_ciclo']??null);$cliente=self::id($d['id_cliente']??null);
  $validade=(new DateTimeImmutable('today',new DateTimeZone('America/Sao_Paulo')))->modify('+7 days')->format('Y-m-d');
  $obs=self::texto($d['observacoes']??'',5000);
  $this->pdo->beginTransaction();try {
   $this->row('SELECT id_ciclo FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$id]);
   // Mesmo bloqueio da manutenção de parâmetros, inclusive no primeiro cadastro.
   $this->pdo->query('SELECT id_usuario FROM usuarios ORDER BY id_usuario LIMIT 1 FOR UPDATE')->fetchColumn();
   $b=$this->base($id,$usuario);$p=$b['parametro'];
   if(!is_string($d['assinatura_base']??null)||!hash_equals($b['assinatura_base'],$d['assinatura_base']))throw new DomainException('A composição mudou. Atualize os valores antes de salvar.');
   if(self::id($d['id_parametro']??null)!==(int)$p['id_parametro'])throw new DomainException('Os parâmetros mudaram. Atualize os valores antes de salvar.');
   $this->row('SELECT id_cliente FROM clientes WHERE id_cliente=? AND ativo=1 FOR UPDATE',[$cliente]);
   $vinculo=$this->row("SELECT v.id_vendedor FROM vendedores v JOIN usuarios u ON u.id_usuario=v.id_usuario AND u.ativo=1 WHERE v.id_usuario=? AND v.ativo=1 FOR UPDATE",[$usuario]);
   $vendedor=(int)$vinculo['id_vendedor'];
   if(isset($d['id_vendedor'])&&self::id($d['id_vendedor'])!==$vendedor)throw new InvalidArgumentException('O vendedor do orçamento deve ser o usuário conectado.');
   $composicao=$this->compor($id,$d,$b['valor_base']);$base=self::centavos($composicao['base']);$total=0;foreach($composicao['realizadas'] as $item)$total+=self::centavos($item['valor']);
   $composicao['comissao_percentual']=$b['comissao_percentual'];
   $composicao['imposto_percentual']=$b['imposto_percentual'];
   $composicao['impostos_config']=!empty($p['impostos_config'])?json_decode($p['impostos_config'],true,512,JSON_THROW_ON_ERROR):null;
   $composicao['imposto_status']='Estimativa sobre o valor total da venda, sujeita à validação contábil';
   $padrao=self::centavos($p['percentual_padrao']);$sugerido=self::sugerir($base,$padrao,self::taxa($composicao));
   if($sugerido>999999999999)throw new InvalidArgumentException('O preço sugerido ultrapassa o limite monetário.');
   // O cliente deve confirmar a mesma composição mostrada na tela; não salva preço antigo sobre base nova.
   if(self::centavos($d['base_confirmada']??null)!==$base||self::centavos($d['preco_confirmado']??null)!==$sugerido)throw new DomainException('A aquisição, o repasse ou as despesas mudaram. Atualize os valores antes de salvar.');
   $valor=self::centavos($d['valor_negociado']??null);$calc=self::calcular(self::centavos($composicao['custo_total']),$valor,self::taxa($composicao),self::centavos($composicao['comissao_percentual']??'0'));
   $composicao['impostos_estimados']=$calc['impostos_estimados'];
   $composicao['comissao_estimada']=$calc['comissao_estimada'];
   $situacao=(float)$calc['margem_prevista']<(float)$p['percentual_minimo']?'Aguardando aprovação':'Em negociação';
   $q=$this->pdo->prepare('INSERT INTO orcamentos(numero_orcamento,id_ciclo,id_cliente,id_vendedor,id_parametro,percentual_padrao_utilizado,percentual_minimo_aplicado,preco_sugerido,valor_negociado_atual,resultado_previsto,margem_prevista,situacao,observacoes,valor_aquisicao_base,valor_repasse_base,despesas_previstas_base,base_comercial_planejada,data_validade,previsoes_preservadas,custo_projetado_informativo) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
   $q->execute(['TMP-'.bin2hex(random_bytes(8)),$id,$cliente,$vendedor,$p['id_parametro'],$p['percentual_padrao'],$p['percentual_minimo'],self::moeda($sugerido),self::moeda($valor),$calc['resultado_previsto'],$calc['margem_prevista'],$situacao,$obs?:null,$b['consignado']?null:$b['valor_base'],$b['consignado']?$b['valor_base']:null,self::moeda($total),self::moeda($base),$validade,'[]',$b['custo_projetado_informativo']]);
   $novo=(int)$this->pdo->lastInsertId();$q=$this->pdo->prepare('UPDATE orcamentos SET composicao_comercial=?,despesas_previstas_base=0 WHERE id_orcamento=?');$q->execute([json_encode($composicao,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$novo]);$q=$this->pdo->prepare('UPDATE orcamentos SET numero_orcamento=? WHERE id_orcamento=?');$q->execute(['OR-'.str_pad((string)$novo,6,'0',STR_PAD_LEFT),$novo]);
   $this->registrar($novo,$usuario,'Proposta inicial',self::moeda($valor),$calc,$obs?:null);
   if($situacao==='Aguardando aprovação')AutorizacaoComercial::solicitar($this->pdo,$novo,$usuario);
   if($gestor){if($situacao==='Aguardando aprovação')AutorizacaoComercial::aprovarPeloGestor($this->pdo,$novo,$usuario);else{$q=$this->pdo->prepare("UPDATE orcamentos SET situacao='Autorizado' WHERE id_orcamento=?");$q->execute([$novo]);$this->registrar($novo,$usuario,'Autorização pelo gestor',self::moeda($valor),$calc,'Autorização direta pelo usuário Gestão/Diretoria que criou a proposta.');}}
   if(isset($d['troca'])){
    if(!is_array($d['troca']))throw new InvalidArgumentException('Dados da troca inválidos.');
    $oferta=$d['troca'];$troca=new TrocaOrcamento($this->pdo);
    if(!$gestor&&array_key_exists('valor_avaliado',$oferta))throw new InvalidArgumentException('Somente Gestão/Diretoria pode registrar avaliação na criação do orçamento.');
    if($gestor)$oferta['valor_solicitado']='';
    $troca->registrarOferta(['id_orcamento'=>$novo,'id_cliente'=>$cliente],$oferta,$usuario);
    if($gestor)$troca->avaliarNaCriacaoPeloGestor($novo,$oferta['valor_avaliado']??null,$usuario);
   }
   $this->pdo->commit();return $novo;
  }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
 }
 public function alterar(int $id,array $d,int $usuario,bool $gestor=false): void {
  $this->pdo->beginTransaction();try {
   $o=$this->row('SELECT * FROM orcamentos WHERE id_orcamento=? FOR UPDATE',[$id]);
   if(!in_array($o['situacao'],['Em negociação','Aguardando aprovação','Autorizado'],true))throw new DomainException('Este orçamento não permite alterações.');
   if(!is_string($d['situacao_anterior']??null)||$d['situacao_anterior']!==$o['situacao'])throw new DomainException('A situação mudou. Atualize os detalhes antes de alterar.');
   $ultimo=$this->row('SELECT id_negociacao FROM negociacoes_orcamento WHERE id_orcamento=? ORDER BY id_negociacao DESC LIMIT 1',[$id]);
   if(self::id($d['id_negociacao_anterior']??null)!==(int)$ultimo['id_negociacao'])throw new DomainException('Outra pessoa alterou a proposta. Reabra os detalhes.');
   $c=$this->row('SELECT situacao_atual,data_encerramento FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$o['id_ciclo']]);
   $reserva=new ReservaOrcamento($this->pdo);
   $reserva->conferirVersao($id,$d);
   $motivo=self::texto($d['justificativa']??'',5000);if($motivo==='')throw new InvalidArgumentException('Informe a justificativa, com até 5.000 caracteres.');
   $acao=$d['acao']??'ajustar';
   if(in_array($acao,['reservar','sinal','solicitar','autorizar'],true))$this->conferirCusto($o);
   if(in_array($acao,['reservar','sinal','liberar_reserva'],true)){
    if($acao==='reservar')$reserva->reservar($o,$c,$d,$usuario);
    elseif($acao==='sinal')$reserva->sinal($o,$d,$usuario);
    else {if(mb_strlen($motivo)>255)throw new InvalidArgumentException('Motivo de liberação: máximo de 255 caracteres.');$reserva->liberar($o,$d,$usuario,$motivo,true);}
   }elseif($acao==='cancelar'){
    if(mb_strlen($motivo)>255)throw new InvalidArgumentException('Motivo de cancelamento: máximo de 255 caracteres.');
    $reserva->liberar($o,$d,$usuario,$motivo);
    $q=$this->pdo->prepare("UPDATE orcamentos SET situacao='Cancelado',data_cancelamento=CURRENT_TIMESTAMP,id_usuario_cancelamento=?,motivo_cancelamento=? WHERE id_orcamento=?");$q->execute([$usuario,$motivo,$id]);
    $this->registrar($id,$usuario,'Cancelamento',$o['valor_negociado_atual'],['resultado_previsto'=>$o['resultado_previsto'],'margem_prevista'=>$o['margem_prevista']],$motivo);
   }elseif($acao==='ajustar'){
    $c=$this->row('SELECT situacao_atual,data_encerramento FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$o['id_ciclo']]);
    $reserva->conferirCiclo((int)$o['id_ciclo'],$id);
    $propria=$reserva->ativa((int)$o['id_ciclo']);
    if($c['data_encerramento']!==null||!in_array($c['situacao_atual'],['Disponível', 'Reservado'],true)||($c['situacao_atual']==='Reservado'&&!$propria))throw new DomainException('O veículo não está disponível para ajuste.');
    $valor=self::centavos($d['valor_negociado']??null);
    if($valor<self::centavos($propria['valor_sinal']??'0'))throw new InvalidArgumentException('O valor negociado não pode ser menor que o sinal registrado.');
    $anterior=$o['composicao_comercial']?json_decode($o['composicao_comercial'],true,512,JSON_THROW_ON_ERROR):null;
    $nova=$anterior;
    if(array_key_exists('despesas_pos_venda',$d)||array_key_exists('despesas_realizadas',$d)){
     $origemEdicao=($anterior['modelo']??0)>=2?$this->custoAtual((int)$o['id_ciclo'])['custo_origem']:($anterior['base_origem']??$o['base_comercial_planejada']);
     $nova=$this->compor((int)$o['id_ciclo'],$d,$origemEdicao);
     if(!$anterior||($anterior['modelo']??1)<2)$nova['base_origem']=$anterior['base_origem']??$o['base_comercial_planejada'];
     if((!$anterior||($anterior['modelo']??1)<2)&&count($nova['realizadas'])>0)throw new InvalidArgumentException('Orçamento antigo: mantenha a base histórica; despesas realizadas podem ser selecionadas em um novo orçamento.');
    }
    $baseNova=$nova?self::centavos($nova['base']):self::centavos($o['base_comercial_planejada']);
    if(isset($d['base_confirmada'])&&self::centavos($d['base_confirmada'])!==$baseNova)throw new DomainException('As despesas mudaram. Atualize os detalhes antes de salvar.');
    $custos=$this->custoAtual((int)$o['id_ciclo'],$nova['pos_venda']??[]);
    $nova=array_merge($nova??['base'=>self::moeda($baseNova),'base_origem'=>$o['base_comercial_planejada'],'realizadas'=>[],'pos_venda'=>[]],$custos,['modelo'=>3]);
    if(isset($d['custo_confirmado'])&&self::centavos($d['custo_confirmado'])!==self::centavos($custos['custo_total']))throw new DomainException('Os custos mudaram. Atualize os detalhes antes de salvar.');
    $nova['comissao_percentual']=$anterior['comissao_percentual']??'0.00';
    $nova['imposto_percentual']=$anterior['imposto_percentual']??'0.00';
    $nova['impostos_config']=$anterior['impostos_config']??null;
    $nova['imposto_status']=$anterior['imposto_status']??'Orçamento anterior à estimativa de impostos';
    $calc=self::calcular(self::centavos($custos['custo_total']),$valor,self::taxa($nova),self::centavos($nova['comissao_percentual']??'0'));
    $nova['impostos_estimados']=$calc['impostos_estimados'];
    $nova['comissao_estimada']=$calc['comissao_estimada'];
    $mudouComposicao=$nova!==$anterior;
    $sugeridoNovo=$mudouComposicao?self::sugerir($baseNova,self::centavos($o['percentual_padrao_utilizado']),self::taxa($nova)):self::centavos($o['preco_sugerido']);
    if($sugeridoNovo>999999999999)throw new InvalidArgumentException('Preço sugerido ultrapassa o limite permitido.');
    if($o['situacao']==='Autorizado'&&!$mudouComposicao&&$valor===self::centavos($o['valor_negociado_atual']))throw new InvalidArgumentException('O valor não mudou. A autorização atual continua válida; abandone a alteração ou informe um novo valor.');
    $situacao=(float)$calc['margem_prevista']<(float)$o['percentual_minimo_aplicado']?'Aguardando aprovação':'Em negociação';
    $q=$this->pdo->prepare('UPDATE orcamentos SET valor_negociado_atual=?,resultado_previsto=?,margem_prevista=?,situacao=? WHERE id_orcamento=?');$q->execute([self::moeda($valor),$calc['resultado_previsto'],$calc['margem_prevista'],$situacao,$id]);
    if($mudouComposicao){$q=$this->pdo->prepare('UPDATE orcamentos SET base_comercial_planejada=?,preco_sugerido=?,composicao_comercial=? WHERE id_orcamento=?');$q->execute([self::moeda($baseNova),self::moeda($sugeridoNovo),json_encode($nova,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$id]);}
    $this->registrar($id,$usuario,'Ajuste',self::moeda($valor),$calc,$motivo);
    if($situacao==='Aguardando aprovação')AutorizacaoComercial::solicitar($this->pdo,$id,$usuario);
    if($gestor){if($situacao==='Aguardando aprovação')AutorizacaoComercial::aprovarPeloGestor($this->pdo,$id,$usuario,$motivo);else{$q=$this->pdo->prepare("UPDATE orcamentos SET situacao='Autorizado' WHERE id_orcamento=?");$q->execute([$id]);$this->registrar($id,$usuario,'Autorização pelo gestor',self::moeda($valor),$calc,'Autorização direta pelo usuário Gestão/Diretoria que ajustou a proposta. '.$motivo);}}
   }elseif($acao==='solicitar'){
    $reserva->conferirCiclo((int)$o['id_ciclo'],$id);
    AutorizacaoComercial::solicitar($this->pdo,$id,$usuario);
   }elseif($acao==='autorizar'){
    if((float)$o['margem_prevista']<(float)$o['percentual_minimo_aplicado'])throw new DomainException('Esta proposta depende de aprovação excepcional.');
    if($o['situacao']==='Autorizado')throw new DomainException('Esta proposta já está autorizada.');
    $c=$this->row('SELECT situacao_atual,data_encerramento FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$o['id_ciclo']]);
    $reserva->conferirCiclo((int)$o['id_ciclo'],$id);
    $propria=$reserva->ativa((int)$o['id_ciclo']);
    if($c['data_encerramento']!==null||!in_array($c['situacao_atual'],['Disponível','Reservado'],true)||($c['situacao_atual']==='Reservado'&&!$propria))throw new DomainException('O veículo não está disponível para autorizar.');
    $q=$this->pdo->prepare("UPDATE orcamentos SET situacao='Autorizado' WHERE id_orcamento=?");$q->execute([$id]);
    $this->registrar($id,$usuario,'Autorização normal',$o['valor_negociado_atual'],['resultado_previsto'=>$o['resultado_previsto'],'margem_prevista'=>$o['margem_prevista']],$motivo);
   }else throw new InvalidArgumentException('Ação inválida.');
   $this->pdo->commit();
  }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
 }
}
