<?php
declare(strict_types=1);

final class TrocaOrcamento
{
    public function __construct(private PDO $pdo) {}
    private function executar(string $sql, array $args=[]): PDOStatement {
        $q=$this->pdo->prepare($sql);$q->execute($args);return $q;
    }
    public static function saldo(int $negociado, int $avaliacao, int $sinal): string {
        return Orcamento::moeda($negociado-$avaliacao-$sinal);
    }
    public function versao(int $id): string {
        $q=$this->executar('SELECT COALESCE(MAX(v.id_veiculo_entrada),0) oferta,COALESCE(MAX(a.id_avaliacao),0) avaliacao FROM veiculos_entrada v LEFT JOIN avaliacoes_veiculo_entrada a ON a.id_veiculo_entrada=v.id_veiculo_entrada WHERE v.id_orcamento=?',[$id])->fetch(PDO::FETCH_ASSOC);
        // Inclui retiradas, que não geram uma nova oferta/avaliação.
        $inativas=$this->executar('SELECT COUNT(*) FROM veiculos_entrada WHERE id_orcamento=? AND ativo=0',[$id])->fetchColumn();
        return $q['oferta'].':'.$q['avaliacao'].':'.$inativas;
    }
    public function detalhes(int $id): array {
        $ofertas=$this->executar('SELECT v.*,u.nome responsavel,ue.nome responsavel_encerramento FROM veiculos_entrada v JOIN usuarios u ON u.id_usuario=v.id_usuario_responsavel LEFT JOIN usuarios ue ON ue.id_usuario=v.id_usuario_encerramento WHERE v.id_orcamento=? ORDER BY v.id_veiculo_entrada DESC',[$id])->fetchAll(PDO::FETCH_ASSOC);
        $ativa=null;
        foreach($ofertas as &$v){
            $v['avaliacoes']=$this->executar('SELECT a.*,u.nome responsavel FROM avaliacoes_veiculo_entrada a JOIN usuarios u ON u.id_usuario=a.id_usuario_avaliador WHERE a.id_veiculo_entrada=? ORDER BY a.id_avaliacao DESC',[$v['id_veiculo_entrada']])->fetchAll(PDO::FETCH_ASSOC);
            $v['avaliacao_vigente']=null;
            foreach($v['avaliacoes'] as &$a){
                $a['despesas']=$this->executar('SELECT id_despesa_prevista,categoria,descricao,valor_previsto,observacoes FROM despesas_previstas WHERE id_avaliacao=? ORDER BY id_despesa_prevista',[$a['id_avaliacao']])->fetchAll(PDO::FETCH_ASSOC);
                $total=0;foreach($a['despesas'] as $despesa)$total+=Orcamento::centavos($despesa['valor_previsto']);
                $a['total_despesas']=Orcamento::moeda($total);
                if((int)$a['vigente']===1)$v['avaliacao_vigente']=$a;
            }unset($a);
            if((int)$v['ativo']===1)$ativa=$v;
        }unset($v);
        return ['troca_ativa'=>$ativa,'trocas'=>$ofertas,'versao_troca'=>$this->versao($id),'valor_troca'=> $ativa['avaliacao_vigente']['valor_avaliado']??'0.00'];
    }
    public function contexto(int $id): array {
        $o=$this->executar('SELECT o.id_orcamento,o.id_cliente,o.numero_orcamento,o.id_ciclo,o.situacao,o.valor_negociado_atual,o.data_validade,cli.nome_razao_social cliente,c.nosso_numero,c.origem_entrada,v.marca,v.modelo,v.placa FROM orcamentos o JOIN clientes cli ON cli.id_cliente=o.id_cliente JOIN ciclos_veiculo c ON c.id_ciclo=o.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo WHERE o.id_orcamento=?',[$id])->fetch(PDO::FETCH_ASSOC);
        if(!$o)throw new InvalidArgumentException('Orçamento não encontrado.');
        $d=$this->detalhes($id);
        $sinal=$this->executar('SELECT valor_sinal FROM reservas_orcamento WHERE id_orcamento=? AND data_liberacao IS NULL',[$id])->fetchColumn();
        $o['sinal_ativo']=$sinal===false?'0.00':$sinal;
        return array_merge($d,['contexto'=>$o,'saldo_proposta'=>self::saldo(Orcamento::centavos($o['valor_negociado_atual']),Orcamento::centavos($d['valor_troca']),Orcamento::centavos($o['sinal_ativo']))]);
    }
    public function listar(array $f=[]): array {
        $pagina=filter_var($f['pagina']??1,FILTER_VALIDATE_INT);
        if($pagina===false||$pagina<1)throw new InvalidArgumentException('Página inválida.');
        $busca=Orcamento::texto($f['busca']??'',200);
        $situacao=Orcamento::texto($f['situacao']??'',30);
        if(!in_array($situacao,['','Avaliação pendente','Avaliado','Encerradas','Rejeitada','Retirada'],true))throw new InvalidArgumentException('Filtro de avaliação inválido.');
        // Ofertas encerradas usam a última avaliação histórica, sem alterar sua vigência.
        $status="CASE WHEN v.ativo=0 THEN CASE WHEN v.motivo_encerramento LIKE 'Rejeitada:%' THEN 'Rejeitada' ELSE 'Retirada' END ELSE v.situacao END";
        $base=" FROM veiculos_entrada v JOIN orcamentos o ON o.id_orcamento=v.id_orcamento JOIN clientes cli ON cli.id_cliente=v.id_cliente JOIN ciclos_veiculo c ON c.id_ciclo=o.id_ciclo ";
        $where='';$args=[];
        if($busca!==''){
            $campos=['o.numero_orcamento','cli.nome_razao_social','c.nosso_numero','v.marca','v.modelo','v.placa'];
            $where=" WHERE CONCAT_WS(' ',".implode(',',$campos).") LIKE ? ESCAPE '!'";
            $args=['%'.str_replace(['!','%','_'],['!!','!%','!_'],$busca).'%'];
        }
        // Contadores abrangem todas as páginas da pesquisa, antes do filtro de situação.
        $r=$this->executar("SELECT COUNT(*) total,COALESCE(SUM(v.ativo=1 AND v.situacao='Avaliação pendente'),0) pendentes,COALESCE(SUM(v.ativo=1 AND v.situacao='Avaliado'),0) avaliados,COALESCE(SUM(v.ativo=0),0) encerradas".$base.$where,$args)->fetch(PDO::FETCH_ASSOC);
        if($situacao!==''){
            $where.=($where===''?' WHERE ':' AND ');
            if($situacao==='Encerradas')$where.='v.ativo=0';
            else {$where.="($status)=?";$args[]=$situacao;}
        }
        $total=(int)$this->executar('SELECT COUNT(*)'.$base.$where,$args)->fetchColumn();
        $paginas=max(1,(int)ceil($total/20));$pagina=min($pagina,$paginas);$offset=($pagina-1)*20;
        $itens=$this->executar("SELECT v.id_veiculo_entrada,v.id_orcamento,v.marca,v.modelo,v.placa,v.ativo,($status) situacao,v.data_cadastro,v.data_encerramento,v.motivo_encerramento,o.numero_orcamento,o.situacao situacao_orcamento,cli.nome_razao_social cliente,c.nosso_numero,a.valor_avaliado".$base.' LEFT JOIN avaliacoes_veiculo_entrada a ON a.id_avaliacao=(SELECT MAX(av.id_avaliacao) FROM avaliacoes_veiculo_entrada av WHERE av.id_veiculo_entrada=v.id_veiculo_entrada) '.$where.' ORDER BY v.data_cadastro DESC,v.id_veiculo_entrada DESC LIMIT 20 OFFSET '.$offset,$args)->fetchAll(PDO::FETCH_ASSOC);
        return ['itens'=>$itens,'total'=>$total,'pagina'=>$pagina,'paginas'=>$paginas,'pendentes'=>(int)$r['pendentes'],'avaliados'=>(int)$r['avaliados'],'encerradas'=>(int)$r['encerradas'],'todas'=>(int)$r['total']];
    }
    public static function dadosOferta(array $d): array {
        $r=[];
        foreach(['marca'=>50,'modelo'=>80,'versao'=>80,'cor'=>50,'combustivel'=>50,'observacoes'=>5000] as $campo=>$limite)$r[$campo]=Orcamento::texto($d[$campo]??'',$limite);
        if($r['marca']===''||$r['modelo']==='')throw new InvalidArgumentException('Informe marca e modelo do veículo oferecido.');
        foreach(['ano','ano_modelo','quilometragem'] as $campo){
            $v=$d[$campo]??null;
            if($campo==='ano_modelo'&&($v===null||$v==='')){$r[$campo]=null;continue;}
            $i=filter_var($v,FILTER_VALIDATE_INT);
            if($i===false||$i===null||($campo==='quilometragem'?($i<0||$i>4294967295):($i<1901||$i>(int)date('Y')+1)))throw new InvalidArgumentException('Confira os anos e a quilometragem do veículo oferecido.');
            $r[$campo]=$i;
        }
        if($r['ano_modelo']!==null&&$r['ano_modelo']<$r['ano'])throw new InvalidArgumentException('O ano-modelo não pode ser anterior ao ano de fabricação.');
        $r['placa']=strtoupper(str_replace(['-',' '],'',Orcamento::texto($d['placa']??'',10)));
        if(!preg_match('/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/',$r['placa']))throw new InvalidArgumentException('Informe uma placa válida, antiga ou Mercosul.');
        $r['chassi']=strtoupper(Orcamento::texto($d['chassi']??'',17));
        if($r['chassi']!==''&&!preg_match('/^[A-Z0-9]{17}$/',$r['chassi']))throw new InvalidArgumentException('Chassi deve ter 17 caracteres alfanuméricos.');
        $r['renavam']=Orcamento::texto($d['renavam']??'',11);
        if($r['renavam']!==''&&!self::renavamValido($r['renavam']))throw new InvalidArgumentException('RENAVAM inválido. Informe os 11 dígitos, incluindo zeros iniciais.');
        $r['valor_solicitado']=($d['valor_solicitado']??'')===''?null:Orcamento::moeda(Orcamento::centavos($d['valor_solicitado']));
        return $r;
    }
    private static function renavamValido(string $v): bool {
        return (bool)preg_match('/^[0-9]{11}$/',$v);
    }
    // Chamado dentro da transação do orçamento; ofertas anteriores são preservadas.
    public function registrarOferta(array $o,array $d,int $usuario): void {
        $r=self::dadosOferta($d);
        $this->encerrarOferta((int)$o['id_orcamento'],$usuario,'Oferta substituída; dados anteriores preservados.');
        $campos=['marca','modelo','versao','ano','ano_modelo','placa','quilometragem','chassi','renavam','cor','combustivel','valor_solicitado','observacoes'];
        $args=[$o['id_orcamento'],$o['id_cliente'],$usuario];foreach($campos as $campo)$args[]=$r[$campo]===''?null:$r[$campo];
        $this->executar('INSERT INTO veiculos_entrada(id_orcamento,id_cliente,id_usuario_responsavel,'.implode(',',$campos).') VALUES('.implode(',',array_fill(0,count($args),'?')).')',$args);
    }
    // Executado somente pelo fluxo de criação que verifica Gestão pela sessão.
    public function avaliarNaCriacaoPeloGestor(int $id,mixed $valor,int $usuario): void {
        if(Orcamento::centavos($valor)<=0)throw new InvalidArgumentException('Informe um valor positivo para a avaliação da troca.');
        $v=$this->executar('SELECT id_veiculo_entrada FROM veiculos_entrada WHERE orcamento_ativo=? FOR UPDATE',[$id])->fetch(PDO::FETCH_ASSOC);
        if(!$v)throw new DomainException('Oferta de troca não encontrada.');
        $this->avaliar($id,['id_veiculo_entrada'=>$v['id_veiculo_entrada'],'valor_avaliado'=>$valor,'data_avaliacao'=>(new DateTimeImmutable('now',new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d\TH:i'),'observacoes'=>'Avaliação registrada diretamente por Gestão/Diretoria no orçamento.','despesas'=>[]],$usuario);
    }
    private function encerrarOferta(int $id,int $usuario,string $motivo): void {
        $this->executar("UPDATE veiculos_entrada SET ativo=0,situacao='Cancelado',id_usuario_encerramento=?,motivo_encerramento=?,data_encerramento=CURRENT_TIMESTAMP WHERE id_orcamento=? AND ativo=1",[$usuario,$motivo,$id]);
    }
    public function alterar(int $id,array $d,int $usuario,bool $gestor=false): void {
        $this->pdo->beginTransaction();try{
            $o=$this->executar('SELECT * FROM orcamentos WHERE id_orcamento=? FOR UPDATE',[$id])->fetch(PDO::FETCH_ASSOC);
            if(!$o)throw new InvalidArgumentException('Orçamento não encontrado.');
            if(!in_array($o['situacao'],['Em negociação','Aguardando aprovação','Autorizado'],true))throw new DomainException('A negociação está encerrada e permite somente consulta.');
            // Mesmo ordenamento orçamento -> ciclo usado em reserva/cancelamento.
            $c=$this->executar('SELECT data_encerramento,situacao_atual FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$o['id_ciclo']])->fetch(PDO::FETCH_ASSOC);
            if(!$c||$c['data_encerramento']!==null)throw new DomainException('O ciclo do veículo principal está encerrado.');
            (new ReservaOrcamento($this->pdo))->conferirCiclo((int)$o['id_ciclo'],$id);
            if(!is_string($d['versao_troca']??null)||$d['versao_troca']!==$this->versao($id))throw new DomainException('A oferta ou avaliação mudou. Atualize os detalhes antes de salvar.');
            $acao=$d['acao']??'';
            if($acao==='ofertar'){
                if(!$gestor&&array_key_exists('valor_avaliado',$d))throw new InvalidArgumentException('Somente Gestão/Diretoria pode avaliar diretamente a oferta.');
                if($gestor)$d['valor_solicitado']='';
                $this->registrarOferta($o,$d,$usuario);
                if($gestor)$this->avaliarNaCriacaoPeloGestor($id,$d['valor_avaliado']??null,$usuario);
            }
            elseif(in_array($acao,['retirar','rejeitar'],true)){
                $motivo=Orcamento::texto($d['justificativa']??'',$acao==='rejeitar'?4989:5000);if($motivo==='')throw new InvalidArgumentException('Informe o motivo da retirada da oferta.');
                if(!$this->detalhes($id)['troca_ativa'])throw new DomainException('Não existe oferta ativa para retirar.');
                $this->encerrarOferta($id,$usuario,$acao==='rejeitar'?'Rejeitada: '.$motivo:$motivo);
            }elseif($acao==='avaliar')$this->avaliar($id,$d,$usuario);
            else throw new InvalidArgumentException('Ação de troca inválida.');
            $this->pdo->commit();
        }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
    private function avaliar(int $id,array $d,int $usuario): void {
        $v=$this->executar('SELECT * FROM veiculos_entrada WHERE orcamento_ativo=? FOR UPDATE',[$id])->fetch(PDO::FETCH_ASSOC);
        if(!$v||Orcamento::id($d['id_veiculo_entrada']??null)!==(int)$v['id_veiculo_entrada'])throw new DomainException('A oferta foi retirada ou substituída. Atualize os detalhes.');
        $valor=Orcamento::centavos($d['valor_avaliado']??null);
        if($valor<=0)throw new InvalidArgumentException('Informe um valor positivo para a avaliação da troca.');
        $obs=Orcamento::texto($d['observacoes']??'',5000);
        $data=Orcamento::texto($d['data_avaliacao']??'',19);
        $dt=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i',$data,new DateTimeZone('America/Sao_Paulo'));
        if(!$dt||$dt->format('Y-m-d\TH:i')!==$data||$dt>new DateTimeImmutable('now',new DateTimeZone('America/Sao_Paulo')))throw new InvalidArgumentException('Informe uma data e hora válidas para a avaliação, sem data futura.');
        $despesas=$d['despesas']??null;if(!is_array($despesas)||count($despesas)>100)throw new InvalidArgumentException('Informe até 100 despesas identificadas na compra.');
        $preparadas=[];$total=0;
        foreach($despesas as $despesa){
            if(!is_array($despesa))throw new InvalidArgumentException('Despesa inválida.');
            $categoria=Orcamento::texto($despesa['categoria']??'',30);$descricao=Orcamento::texto($despesa['descricao']??'',255);$valorDespesa=Orcamento::centavos($despesa['valor_previsto']??null);
            if($categoria===''||$descricao===''||$valorDespesa<=0)throw new InvalidArgumentException('Cada despesa exige categoria, descrição e valor positivo.');
            $total+=$valorDespesa;if($total>999999999999)throw new InvalidArgumentException('O total previsto ultrapassa o limite monetário.');
            $preparadas[]=[$categoria,$descricao,Orcamento::moeda($valorDespesa),Orcamento::texto($despesa['observacoes']??'',5000)?:null];
        }
        $this->executar('UPDATE avaliacoes_veiculo_entrada SET vigente=0 WHERE id_veiculo_entrada=? AND vigente=1',[$v['id_veiculo_entrada']]);
        $this->executar('INSERT INTO avaliacoes_veiculo_entrada(id_veiculo_entrada,id_usuario_avaliador,valor_avaliado,data_avaliacao,observacoes) VALUES(?,?,?,?,?)',[$v['id_veiculo_entrada'],$usuario,Orcamento::moeda($valor),$dt->format('Y-m-d H:i:s'),$obs?:null]);
        $avaliacao=(int)$this->pdo->lastInsertId();
        foreach($preparadas as $p)$this->executar("INSERT INTO despesas_previstas(id_avaliacao,id_usuario_responsavel,categoria,descricao,valor_previsto,observacoes,responsavel_despesa,integra_base_comercial) VALUES(?,?,?,?,?,?,'Revenda',0)",[$avaliacao,$usuario,...$p]);
        $this->executar("UPDATE veiculos_entrada SET situacao='Avaliado' WHERE id_veiculo_entrada=?",[$v['id_veiculo_entrada']]);
    }
}
