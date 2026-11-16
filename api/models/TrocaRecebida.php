<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';
require_once __DIR__.'/Veiculo.php';
require_once __DIR__.'/../controllers/VeiculoController.php';

final class TrocaRecebida
{
    public function __construct(private PDO $pdo) {}
    private function q(string $sql,array $args=[]): PDOStatement { $q=$this->pdo->prepare($sql);$q->execute($args);return $q; }
    private static function json(array $d): string { return json_encode($d,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); }
    public function listar(array $f): array {
        $pagina=filter_var($f['pagina']??1,FILTER_VALIDATE_INT);
        if(!$pagina||$pagina<1)throw new InvalidArgumentException('Página inválida.');
        $busca=Orcamento::texto($f['busca']??'',200);$situacao=$f['situacao']??'pendentes';
        if(!in_array($situacao,['pendentes','registradas','todas'],true))throw new InvalidArgumentException('Situação inválida.');
        $from=' FROM trocas_recebidas_autoflux r JOIN pedidos_venda_autoflux p ON p.id_pedido=r.id_pedido LEFT JOIN entradas_troca_autoflux e ON e.id_recebimento=r.id_recebimento LEFT JOIN ciclos_veiculo c ON c.id_ciclo=e.id_ciclo';
        $where=" WHERE (p.situacao='Concluído' OR e.id_recebimento IS NOT NULL)";$args=[];
        if($busca!==''){
            if(preg_match('/^PV-[0-9]+$/i',$busca)){
                // O atalho do pedido usa o número exato, sem concatenar campos JSON.
                $where.=' AND p.numero_pedido=?';$args[]=strtoupper($busca);
            }else{
                // Os textos vêm de tabelas e de JSON, que podem ter collations diferentes.
                // Normaliza cada argumento antes de concatenar, sem alterar o banco.
                $campos=["p.numero_pedido","JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.cliente'))","JSON_UNQUOTE(JSON_EXTRACT(r.snapshot,'$.placa'))","JSON_UNQUOTE(JSON_EXTRACT(r.snapshot,'$.marca'))","JSON_UNQUOTE(JSON_EXTRACT(r.snapshot,'$.modelo'))","c.nosso_numero"];
                $campos=array_map(static fn(string $campo):string=>"CONVERT($campo USING utf8mb4) COLLATE utf8mb4_unicode_ci",$campos);
                $where.=" AND CONCAT_WS(' ',".implode(',',$campos).") LIKE CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci ESCAPE '!'";
                $args[]='%'.str_replace(['!','%','_'],['!!','!%','!_'],$busca).'%';
            }
        }
        $cont=$this->q('SELECT COUNT(*) total,COALESCE(SUM(e.id_recebimento IS NULL),0) pendentes,COALESCE(SUM(e.id_recebimento IS NOT NULL),0) registradas'.$from.$where,$args)->fetch(PDO::FETCH_ASSOC);
        if($situacao!=='todas')$where.=$situacao==='pendentes'?' AND e.id_recebimento IS NULL':' AND e.id_recebimento IS NOT NULL';
        $total=(int)$this->q('SELECT COUNT(*)'.$from.$where,$args)->fetchColumn();$paginas=max(1,(int)ceil($total/20));$pagina=min($pagina,$paginas);
        $itens=$this->q("SELECT r.id_recebimento,r.id_pedido,r.valor_atribuido,r.data_recebimento,r.situacao situacao_recebimento,r.snapshot,p.numero_pedido,JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.cliente')) cliente,e.id_ciclo,c.nosso_numero,e.data_registro".$from.$where.' ORDER BY r.id_recebimento DESC LIMIT 20 OFFSET '.(($pagina-1)*20),$args)->fetchAll(PDO::FETCH_ASSOC);
        foreach($itens as &$r){$s=json_decode($r['snapshot'],true,512,JSON_THROW_ON_ERROR);$r['marca']=$s['marca']??'';$r['modelo']=$s['modelo']??'';$r['placa']=$s['placa']??'';$r['situacao']=$r['situacao_recebimento']==='Devolvida ao cliente'?'Devolvida ao cliente':($r['id_ciclo']?'Entrada registrada':'Pendente de aquisição');unset($r['situacao_recebimento']);unset($r['snapshot']);}unset($r);
        return ['itens'=>$itens,'total'=>$total,'pagina'=>$pagina,'paginas'=>$paginas,'pendentes'=>(int)$cont['pendentes'],'registradas'=>(int)$cont['registradas']];
    }
    private function carregar(int $id,bool $bloquear=false): array {
        $r=$this->q('SELECT * FROM trocas_recebidas_autoflux WHERE id_recebimento=?'.($bloquear?' FOR UPDATE':''),[$id])->fetch(PDO::FETCH_ASSOC);
        if(!$r)throw new InvalidArgumentException('Troca recebida não encontrada.');
        $p=$this->q('SELECT * FROM pedidos_venda_autoflux WHERE id_pedido=?'.($bloquear?' FOR UPDATE':''),[$r['id_pedido']])->fetch(PDO::FETCH_ASSOC);
        if(!$p||($p['situacao']!=='Concluído'&&!($p['situacao']==='Cancelado'&&$this->q('SELECT id_recebimento FROM entradas_troca_autoflux WHERE id_recebimento=?',[$id])->fetchColumn())))throw new DomainException('A entrada da troca exige uma venda concluída.');
        $s=json_decode($r['snapshot'],true,512,JSON_THROW_ON_ERROR);$pedido=json_decode($p['snapshot'],true,512,JSON_THROW_ON_ERROR);
        // Ofertas antigas preservaram menos campos; usa apenas a oferta original vinculada.
        $oferta=$this->q('SELECT * FROM veiculos_entrada WHERE id_veiculo_entrada=?',[$r['id_veiculo_entrada']])->fetch(PDO::FETCH_ASSOC)?:[];
        foreach(['cor','combustivel','observacoes','proprietario_nome','proprietario_documento'] as $campo)if(!array_key_exists($campo,$s))$s[$campo]=$oferta[$campo]??'';
        // Identifica o cliente pelo vínculo do pedido, sem buscar pessoas apenas pelo nome.
        $idCliente=(int)($p['id_cliente']??$pedido['id_cliente']??0);
        $cliente=$idCliente>0?$this->q('SELECT nome_razao_social,cpf,cnpj FROM clientes WHERE id_cliente=?',[$idCliente])->fetch(PDO::FETCH_ASSOC):false;
        if($cliente){
            $nome=trim((string)($s['proprietario_nome']??''));
            $normalizar=static fn(string $v):string=>mb_strtolower(preg_replace('/\s+/u',' ',trim($v))??trim($v),'UTF-8');
            $mesmoCliente=$nome===''||$normalizar($nome)===$normalizar((string)$cliente['nome_razao_social'])||$normalizar($nome)===$normalizar((string)($pedido['cliente']??''));
            if($mesmoCliente){
                if($nome==='')$s['proprietario_nome']=$cliente['nome_razao_social'];
                // Um documento informado na troca tem prioridade sobre o cadastro atual.
                if(trim((string)($s['proprietario_documento']??''))===''){
                    $cpf=trim((string)($cliente['cpf']??''));
                    $s['proprietario_documento']=$cpf!==''?$cpf:trim((string)($cliente['cnpj']??''));
                }
            }
        }
        if(!array_key_exists('despesas_identificadas',$s))$s['despesas_identificadas']=isset($s['id_avaliacao'])?$this->q('SELECT categoria,descricao,valor_previsto,observacoes FROM despesas_previstas WHERE id_avaliacao=? ORDER BY id_despesa_prevista',[$s['id_avaliacao']])->fetchAll(PDO::FETCH_ASSOC):[];
        $entrada=$this->q('SELECT e.*,c.nosso_numero,c.situacao_atual,c.data_encerramento,u.nome responsavel FROM entradas_troca_autoflux e JOIN ciclos_veiculo c ON c.id_ciclo=e.id_ciclo JOIN usuarios u ON u.id_usuario=e.id_usuario WHERE e.id_recebimento=?',[$id])->fetch(PDO::FETCH_ASSOC)?:null;
        $assinatura=hash('sha256',self::json([$r,$s,$entrada]));
        return ['recebimento'=>$r,'oferta'=>$s,'pedido'=>$p,'cliente'=>$pedido['cliente']??'','entrada'=>$entrada,'assinatura'=>$assinatura];
    }
    public function detalhes(int $id): array {
        $d=$this->carregar($id);$r=$d['recebimento'];unset($r['snapshot']);$d['recebimento']=$r;
        $d['pedido']=['id_pedido'=>$d['pedido']['id_pedido'],'numero_pedido'=>$d['pedido']['numero_pedido']];
        if($d['entrada'])$d['entrada']['dados']=json_decode($d['entrada']['snapshot'],true,512,JSON_THROW_ON_ERROR);
        return $d;
    }
    public function registrar(int $id,array $dados,int $usuario): array {
        $this->pdo->beginTransaction();
        try {
            $ctx=$this->carregar($id,true);$r=$ctx['recebimento'];$s=$ctx['oferta'];
            if($ctx['entrada'])throw new DomainException('Esta troca já possui uma entrada registrada. Atualize a consulta.');
            if($r['situacao']!=='Pendente de aquisição')throw new DomainException('A situação desta troca não permite uma nova aquisição.');
            if(!is_string($dados['assinatura']??null)||!hash_equals($ctx['assinatura'],$dados['assinatura']))throw new DomainException('Os dados da troca mudaram. Atualize a conferência.');
            if(($dados['conferido']??false)!==true)throw new InvalidArgumentException('Confirme a conferência do veículo e da nota fiscal.');
            Orcamento::texto($dados['cor']??'',30);Orcamento::texto($dados['combustivel']??'',30);
            $veiculo=TrocaOrcamento::dadosOferta(array_merge($dados,['ano'=>$dados['ano_fabricacao']??null,'valor_solicitado'=>'']));
            if($veiculo['chassi']===''||$veiculo['ano_modelo']===null)throw new InvalidArgumentException('Complete o chassi e o ano-modelo para registrar a entrada.');
            $correcao=Orcamento::texto($dados['justificativa_correcao']??'',1000);
            if(($veiculo['placa']!==($s['placa']??'')||(!empty($s['chassi'])&&$veiculo['chassi']!==$s['chassi']))&&$correcao==='')throw new InvalidArgumentException('Explique a correção da placa ou do chassi em relação à troca aprovada.');
            $hoje=date('Y-m-d');$data=Orcamento::texto($dados['data_compra']??'',10);
            $dt=DateTimeImmutable::createFromFormat('!Y-m-d',$data);
            if(!$dt||$dt->format('Y-m-d')!==$data||$data<substr($r['data_recebimento'],0,10)||$data>$hoje)throw new InvalidArgumentException('A data de entrada deve estar entre o recebimento da troca e hoje.');
            $emissao=Orcamento::texto($dados['data_emissao_nf']??'',10);
            if($emissao>$data)throw new InvalidArgumentException('A emissão da NF não pode ser posterior à entrada.');
            $nome=Orcamento::texto($dados['nome_fornecedor_avulso']??'',150);
            if($nome==='')throw new InvalidArgumentException('Confirme o nome do proprietário que consta na nota fiscal.');
            foreach(['numero_nota'=>20,'serie'=>10,'descricao_item_nf'=>255,'natureza_operacao'=>100,'observacoes_nf'=>5000] as $campo=>$limite)Orcamento::texto($dados[$campo]??'',$limite);
            // Valor e origem sempre obtidos do recebimento aprovado, nunca do navegador.
            $dados=array_merge($dados,$veiculo,['ano_fabricacao'=>$veiculo['ano'],'valor_compra'=>$r['valor_atribuido'],'origem'=>'Troca - '.$ctx['pedido']['numero_pedido'],'id_fornecedor_origem'=>null,'nome_fornecedor_avulso'=>$nome]);
            $preparados=(new VeiculoController($this->pdo))->prepararEntradaTroca($dados);
            $entrada=(new Veiculo($this->pdo))->cadastrarEmTransacao($preparados);
            $this->q('UPDATE aquisicoes SET id_usuario_responsavel=?,observacoes=? WHERE id_aquisicao=?',[$usuario,'Recebida na troca do pedido '.$ctx['pedido']['numero_pedido'].'.',$entrada['id_aquisicao']]);
            // Copia as previsões; a avaliação e suas despesas originais ficam preservadas.
            foreach($s['despesas_identificadas']??[] as $d)$this->q("INSERT INTO despesas_previstas(id_aquisicao,id_ciclo,id_usuario_responsavel,categoria,descricao,valor_previsto,observacoes,responsavel_despesa,integra_base_comercial) VALUES(?,?,?,?,?,?,?,'Revenda',0)",[$entrada['id_aquisicao'],$entrada['id_ciclo'],$usuario,$d['categoria'],$d['descricao'],$d['valor_previsto'],$d['observacoes']??null]);
            $registro=['oferta_aprovada'=>$s,'entrada'=>array_merge($preparados,['proprietario_documento'=>Orcamento::texto($dados['proprietario_documento']??'',18),'justificativa_correcao'=>$correcao]),'justificativa_correcao'=>$correcao];
            $this->q('INSERT INTO entradas_troca_autoflux(id_recebimento,id_ciclo,id_aquisicao,id_usuario,snapshot) VALUES(?,?,?,?,?)',[$id,$entrada['id_ciclo'],$entrada['id_aquisicao'],$usuario,self::json($registro)]);
            $this->q("UPDATE trocas_recebidas_autoflux SET situacao='Aquisição concluída' WHERE id_recebimento=?",[$id]);
            $af='AF-'.str_pad((string)$entrada['id_ciclo'],6,'0',STR_PAD_LEFT);
            $this->q('INSERT INTO eventos_pedido_autoflux(id_pedido,id_usuario,tipo,observacoes) VALUES(?,?,?,?)',[$r['id_pedido'],$usuario,'Entrada de troca registrada',$veiculo['marca'].' '.$veiculo['modelo'].' · '.$veiculo['placa'].' · '.$af.' · NF '.$preparados['numero_nota'].' / '.$preparados['serie'].'. Valor de aquisição: R$ '.$r['valor_atribuido'].'.']);
            $this->q('UPDATE pedidos_venda_autoflux SET versao=versao+1 WHERE id_pedido=?',[$r['id_pedido']]);
            $this->pdo->commit();return $this->detalhes($id);
        }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
}
