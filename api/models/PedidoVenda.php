<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';
require_once __DIR__.'/PagamentoPedido.php';
require_once __DIR__.'/RepasseConsignado.php';
require_once __DIR__.'/GarantiaVenda.php';
require_once __DIR__.'/CancelamentoVenda.php';

final class PedidoVenda {
    public function __construct(private PDO $pdo) {}
    private function executar(string $sql,array $args=[]): PDOStatement {
        $q=$this->pdo->prepare($sql);$q->execute($args);return $q;
    }
    private function um(string $sql,array $args=[]): array {
        $r=$this->executar($sql,$args)->fetch(PDO::FETCH_ASSOC);
        if(!$r)throw new InvalidArgumentException('Registro não encontrado.');
        return $r;
    }
    private static function json(array $d): string {return json_encode($d,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);}
    // A tabela própria evita interferir em estruturas legadas de pedidos que possam existir.
    public function doOrcamento(int $id): ?array {
        $p=$this->executar('SELECT id_pedido FROM pedidos_venda_autoflux WHERE id_orcamento=?',[$id])->fetchColumn();
        return $p===false?null:$this->detalhes((int)$p);
    }
    public function previa(int $id): array {
        $this->pdo->beginTransaction();
        try {$d=$this->preparar($id);$this->pdo->commit();return $d;}
        catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
    private function preparar(int $id): array {
        // Mesmo ordenamento de bloqueios das alterações do orçamento: orçamento -> ciclo.
        $o=$this->um('SELECT * FROM orcamentos WHERE id_orcamento=? FOR UPDATE',[$id]);
        if($o['situacao']!=='Autorizado')throw new DomainException('Somente um orçamento autorizado pode gerar pedido de venda.');
        if($o['data_validade']<date('Y-m-d'))throw new DomainException('O orçamento está vencido. Atualize e autorize a proposta antes de gerar o pedido.');
        $c=$this->um('SELECT * FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$o['id_ciclo']]);
        if($c['data_encerramento']!==null||!in_array($c['situacao_atual'],['Disponível','Reservado'],true))throw new DomainException('O veículo não está disponível para gerar este pedido.');
        $reserva=new ReservaOrcamento($this->pdo);$reserva->conferirCiclo((int)$o['id_ciclo'],$id);
        $r=$reserva->ativa((int)$o['id_ciclo']);
        if($c['situacao_atual']==='Reservado'&&!$r)throw new DomainException('Confira a reserva do veículo antes de gerar o pedido.');
        if($this->executar('SELECT id_pedido FROM pedidos_venda_autoflux WHERE id_orcamento=? OR ciclo_em_andamento=? LIMIT 1',[$id,$o['id_ciclo']])->fetchColumn())throw new DomainException('Já existe um pedido para este orçamento ou um pedido ativo para o veículo.');
        $orcamento=new Orcamento($this->pdo);$orcamento->conferirCusto($o);
        $d=$orcamento->detalhes($id);
        $origem=$c['origem_entrada'];$trocas=[];
        foreach($d['trocas_ativas'] as $t){
            // Trocas pendentes precisam ser avaliadas ou retiradas antes da formalização.
            if(!$t['avaliacao_vigente'])throw new DomainException('Avalie ou retire o veículo '.$t['placa'].' antes de gerar o pedido.');
            $a=$t['avaliacao_vigente'];
            $trocas[]=['id_veiculo_entrada'=>(int)$t['id_veiculo_entrada'],'id_avaliacao'=>(int)$a['id_avaliacao'],'marca'=>$t['marca'],'modelo'=>$t['modelo'],'versao'=>$t['versao'],'placa'=>$t['placa'],'ano'=>$t['ano'],'ano_modelo'=>$t['ano_modelo'],'quilometragem'=>$t['quilometragem'],'chassi'=>$t['chassi'],'renavam'=>$t['renavam'],'cor'=>$t['cor'],'combustivel'=>$t['combustivel'],'observacoes'=>$t['observacoes'],'proprietario_nome'=>$t['proprietario_nome']??null,'proprietario_documento'=>$t['proprietario_documento']??null,'despesas_identificadas'=>$a['despesas'],'valor_avaliado'=>$a['valor_avaliado'],'responsavel_avaliacao'=>$a['responsavel'],'data_avaliacao'=>$a['data_avaliacao']];
        }
        $snapshot=['id_orcamento'=>$id,'numero_orcamento'=>$d['numero_orcamento'],'id_ciclo'=>(int)$o['id_ciclo'],'nosso_numero'=>$d['nosso_numero'],'id_cliente'=>(int)$o['id_cliente'],'cliente'=>$d['cliente'],'id_vendedor'=>(int)$o['id_vendedor'],'vendedor'=>$d['vendedor'],'marca'=>$d['marca'],'modelo'=>$d['modelo'],'placa'=>$d['placa'],'origem'=>$origem,'valor_negociado'=>$d['valor_negociado_atual'],'valor_sinal'=>$r['valor_sinal']??'0.00','id_reserva'=>$r?(int)$r['id_reserva']:null,'valor_trocas'=>$d['valor_troca'],'saldo_restante'=>$d['saldo_proposta'],'trocas'=>$trocas,'composicao'=>$d['composicao'],'observacoes_orcamento'=>$o['observacoes'],'id_negociacao'=>(int)$d['historico'][0]['id_negociacao'],'versao_reserva'=>$d['versao_reserva'],'versao_troca'=>$d['versao_troca']];
        return ['dados'=>$snapshot,'assinatura'=>hash('sha256',self::json($snapshot))];
    }
    public function gerar(int $orcamento,array $d,int $usuario): int {
        $obs=Orcamento::texto($d['observacoes']??'',5000);
        $this->pdo->beginTransaction();
        try {
            $previa=$this->preparar($orcamento);
            if(!is_string($d['assinatura']??null)||!hash_equals($previa['assinatura'],$d['assinatura']))throw new DomainException('A proposta, as trocas ou o sinal mudaram. Atualize a conferência antes de confirmar.');
            $s=$previa['dados'];
            $pagamentos=PagamentoPedido::validar($d['pagamentos']??null,(int)round((float)$s['saldo_restante']*100));
            $this->executar("INSERT INTO pedidos_venda_autoflux(numero_pedido,id_orcamento,id_ciclo,id_cliente,id_vendedor,id_usuario_criacao,situacao,valor_negociado,valor_sinal,valor_trocas,saldo_restante,snapshot,observacoes) VALUES(?,?,?,?,?,?,'Em andamento',?,?,?,?,?,?)",['TMP-'.bin2hex(random_bytes(8)),$orcamento,$s['id_ciclo'],$s['id_cliente'],$s['id_vendedor'],$usuario,$s['valor_negociado'],$s['valor_sinal'],$s['valor_trocas'],$s['saldo_restante'],self::json($s),$obs?:null]);
            $id=(int)$this->pdo->lastInsertId();$numero='PV-'.str_pad((string)$id,6,'0',STR_PAD_LEFT);
            $this->executar('UPDATE pedidos_venda_autoflux SET numero_pedido=? WHERE id_pedido=?',[$numero,$id]);
            $c=$this->um('SELECT situacao_atual FROM ciclos_veiculo WHERE id_ciclo=?',[$s['id_ciclo']]);
            $this->movimentar($s['id_ciclo'],$usuario,$c['situacao_atual'],'Separado para venda','Geração do pedido '.$numero.' a partir do orçamento '.$s['numero_orcamento']);
            $this->executar("UPDATE orcamentos SET situacao='Convertido em pedido' WHERE id_orcamento=?",[$orcamento]);
            (new PagamentoPedido($this->pdo))->gravar($id,$pagamentos,$usuario);
            $this->evento($id,$usuario,'Pedido gerado','Veículo separado para venda. Valores, sinal e trocas preservados.');
            $this->pdo->commit();return $id;
        }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
    private function movimentar(int $ciclo,int $usuario,string $anterior,string $nova,string $obs): void {
        $this->executar('UPDATE ciclos_veiculo SET situacao_atual=? WHERE id_ciclo=?',[$nova,$ciclo]);
        $this->executar('INSERT INTO movimentacoes_veiculo(id_ciclo,id_usuario_responsavel,situacao_anterior,situacao_nova,observacoes) VALUES(?,?,?,?,?)',[$ciclo,$usuario,$anterior,$nova,$obs]);
    }
    private function evento(int $pedido,int $usuario,string $tipo,string $obs): void {
        $this->executar('INSERT INTO eventos_pedido_autoflux(id_pedido,id_usuario,tipo,observacoes) VALUES(?,?,?,?)',[$pedido,$usuario,$tipo,$obs]);
    }
    public function cancelar(int $id,array $d,int $usuario): void {
        $motivo=Orcamento::texto($d['motivo']??'',255);
        if($motivo==='')throw new InvalidArgumentException('Informe o motivo do cancelamento.');
        $origem=$this->um('SELECT id_orcamento,id_ciclo FROM pedidos_venda_autoflux WHERE id_pedido=?',[$id]);
        $this->pdo->beginTransaction();
        try {
            $o=$this->um('SELECT * FROM orcamentos WHERE id_orcamento=? FOR UPDATE',[$origem['id_orcamento']]);
            $c=$this->um('SELECT * FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$origem['id_ciclo']]);
            $p=$this->um('SELECT * FROM pedidos_venda_autoflux WHERE id_pedido=? FOR UPDATE',[$id]);
            if($p['situacao']!=='Em andamento')throw new DomainException('Somente pedidos em andamento podem ser cancelados.');
            if(Orcamento::id($d['versao']??null)!==(int)$p['versao'])throw new DomainException('O pedido mudou. Atualize os detalhes antes de cancelar.');
            $destino=null;$obs='';
            if(Orcamento::centavos($p['valor_sinal'])>0){
                $destino=$d['destino_sinal']??null;
                if(!in_array($destino,['Devolvido','Retido','Transferido'],true))throw new InvalidArgumentException('Informe o destino do sinal.');
                $obs=Orcamento::texto($d['observacoes_destino']??'',5000);
                if($obs==='')throw new InvalidArgumentException('Descreva o destino do sinal; em transferência, identifique a negociação de destino.');
            }
            $reservas=new ReservaOrcamento($this->pdo);$r=$reservas->ativa((int)$p['id_ciclo']);
            if($r&&(int)$r['id_orcamento']===(int)$p['id_orcamento']){
                if(Orcamento::centavos($r['valor_sinal'])!==Orcamento::centavos($p['valor_sinal']))throw new DomainException('O sinal da reserva difere do pedido. Confira os registros antes de cancelar.');
                $reservas->liberar($o,['destino_sinal'=>$destino,'observacoes_destino'=>$obs],$usuario,mb_substr('Cancelamento do pedido '.$p['numero_pedido'].': '.$motivo,0,255));
            }elseif(Orcamento::centavos($p['valor_sinal'])>0)throw new DomainException('A reserva com sinal deste pedido não está ativa. Confira os registros antes de cancelar.');
            $this->executar("UPDATE pedidos_venda_autoflux SET situacao='Cancelado',data_cancelamento=CURRENT_TIMESTAMP,id_usuario_cancelamento=?,motivo_cancelamento=?,destino_sinal=?,observacoes_destino=?,versao=versao+1 WHERE id_pedido=?",[$usuario,$motivo,$destino,$obs?:null,$id]);
            $outra=$this->executar('SELECT id_pedido FROM pedidos_venda_autoflux WHERE ciclo_em_andamento=? AND id_pedido<>?',[$p['id_ciclo'],$id])->fetchColumn();
            $r=$reservas->ativa((int)$p['id_ciclo']);
            if($c['data_encerramento']===null&&$c['situacao_atual']==='Separado para venda'&&!$outra&&!$r)$this->movimentar((int)$p['id_ciclo'],$usuario,'Separado para venda','Disponível','Cancelamento do pedido '.$p['numero_pedido'].': '.$motivo);
            $this->evento($id,$usuario,'Pedido cancelado',$motivo.($destino?' · Sinal '.$destino.': '.$obs:''));
            // O orçamento continua identificado como convertido, preservando a origem do pedido cancelado.
            $this->pdo->commit();
        }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
    // Pedidos antigos podem não ter preservado a comissão no snapshot.
    // Nunca usa o perfil de quem está concluindo: consulta o responsável da venda.
    private function recuperarComissao(array $p): array {
        $comp=$p['dados']['composicao']??[];
        if(is_array($comp)&&isset($comp['comissao_percentual']))return $p;
        $o=$this->um('SELECT composicao_comercial FROM orcamentos WHERE id_orcamento=?',[$p['id_orcamento']]);
        $original=json_decode($o['composicao_comercial']??'{}',true,512,JSON_THROW_ON_ERROR);
        if(is_array($original)&&isset($original['comissao_percentual'])){
            $comp=is_array($comp)?$comp:[];
            $comp['comissao_percentual']=$original['comissao_percentual'];
            $comp['comissao_recuperacao']='Regra recuperada do orçamento de origem';
        }else{
            $v=$this->um('SELECT id_usuario FROM vendedores WHERE id_vendedor=?',[$p['id_vendedor']]);
            if(!ComissaoVenda::semComissao($this->pdo,(int)$v['id_usuario']))return $p;
            $comp=is_array($comp)?$comp:[];
            $comp['comissao_percentual']='0.00';
            $comp['comissao_recuperacao']='Sem comissão para Gerente/Diretor (0%)';
        }
        $p['dados']['composicao']=$comp;
        return $p;
    }
    public function concluir(int $id,array $d,int $usuario): void {
        if(($d['conferido']??false)!==true)throw new InvalidArgumentException('Confirme a conferência da venda.');
        $obs=Orcamento::texto($d['observacoes']??'',5000);
        $origem=$this->um('SELECT id_orcamento,id_ciclo FROM pedidos_venda_autoflux WHERE id_pedido=?',[$id]);
        $this->pdo->beginTransaction();
        try {
            $o=$this->um('SELECT * FROM orcamentos WHERE id_orcamento=? FOR UPDATE',[$origem['id_orcamento']]);
            $c=$this->um('SELECT * FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE',[$origem['id_ciclo']]);
            $p=$this->decodificar($this->um('SELECT * FROM pedidos_venda_autoflux WHERE id_pedido=? FOR UPDATE',[$id]));
            if($p['situacao']!=='Em andamento')throw new DomainException('Somente pedidos em andamento podem ser concluídos.');
            if(Orcamento::id($d['versao']??null)!==(int)$p['versao'])throw new DomainException('O pedido mudou. Atualize e confira novamente.');
            if($c['data_encerramento']!==null||$c['situacao_atual']!=='Separado para venda')throw new DomainException('O ciclo não está separado para esta venda.');
            if($o['situacao']!=='Convertido em pedido')throw new DomainException('Confira o orçamento de origem antes de concluir.');
            $consignado=mb_strtolower(trim($c['origem_entrada']))==='consignação';
            if(!$consignado&&!in_array(mb_strtolower(trim($c['origem_entrada'])),['aquisição','aquisicao'],true))throw new DomainException('Origem do ciclo inválida para conclusão.');
            $repasse=null;
            if($consignado){
                $repasse=(new RepasseConsignado($this->pdo))->previa((int)$p['id_ciclo'],true);
                if(!is_string($d['assinatura_repasse']??null)||!hash_equals($repasse['assinatura'],$d['assinatura_repasse']))throw new DomainException('O repasse ou as despesas mudaram. Atualize o pedido e confira novamente.');
            }
            $p=$this->recuperarComissao($p);
            $dados=$p['dados'];$valor=Orcamento::centavos($p['valor_negociado']);
            $sinal=Orcamento::centavos($p['valor_sinal']);$trocas=Orcamento::centavos($p['valor_trocas']);
            $saldo=$valor-$sinal-$trocas;
            // Saldo negativo requer tratamento de crédito ao cliente, fora desta etapa.
            if($saldo<0)throw new DomainException('A negociação possui crédito para o cliente. Ajuste a negociação antes de concluir nesta etapa.');
            if(Orcamento::moeda($saldo)!==Orcamento::moeda(Orcamento::centavos($p['saldo_restante'])))throw new DomainException('A composição do pagamento está inconsistente.');
            $pagamentos=PagamentoPedido::validar((new PagamentoPedido($this->pdo))->listar($id),$saldo);
            $comp=$dados['composicao']??[];
            if(!is_array($comp)||!array_key_exists('comissao_percentual',$comp))throw new DomainException('O pedido não preservou a regra da comissão. Revise a negociação antes de concluir.');
            $percentual=Orcamento::centavos($comp['comissao_percentual']);
            if($percentual>10000)throw new DomainException('Percentual de comissão inválido no pedido.');
            $comissao=Orcamento::moeda((int)round($valor*$percentual/10000));
            $totalTrocas=0;$ids=[];
            foreach($dados['trocas'] as $t){
                $oferta=Orcamento::id($t['id_veiculo_entrada']);
                if(isset($ids[$oferta]))throw new DomainException('Veículo de troca duplicado no pedido.');
                $ids[$oferta]=true;$totalTrocas+=Orcamento::centavos($t['valor_avaliado']);
            }
            if($totalTrocas!==$trocas)throw new DomainException('A soma dos veículos de troca difere do pedido.');
            $reservas=new ReservaOrcamento($this->pdo);$r=$reservas->ativa((int)$p['id_ciclo']);
            if($r&&((int)$r['id_orcamento']!==(int)$p['id_orcamento']||Orcamento::centavos($r['valor_sinal'])!==$sinal))throw new DomainException('A reserva ou o sinal difere deste pedido.');
            if($sinal>0&&!$r)throw new DomainException('O sinal do pedido não possui reserva ativa correspondente.');
            $financeiro=(new GarantiaVenda($this->pdo))->baseFechamento($p,$comissao,$repasse);
            $fechamento=['financeiro'=>$financeiro,'repasse'=>$repasse,'pedido'=>$dados,'pagamentos'=>$pagamentos,'comissao_percentual'=>Orcamento::moeda($percentual),'comissao_final'=>$comissao,'observacoes'=>$obs];
            $this->executar('INSERT INTO vendas_fechamento_autoflux(id_pedido,id_ciclo,id_usuario,valor_final,valor_sinal,valor_trocas,saldo_restante,comissao_percentual,comissao_valor,snapshot,observacoes) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[$id,$p['id_ciclo'],$usuario,$p['valor_negociado'],$p['valor_sinal'],$p['valor_trocas'],$p['saldo_restante'],Orcamento::moeda($percentual),$comissao,self::json($fechamento),$obs?:null]);
            $venda=(int)$this->pdo->lastInsertId();
            if($repasse)(new RepasseConsignado($this->pdo))->gerar($venda,$id,$usuario,$repasse);
            foreach($dados['trocas'] as $t)$this->executar('INSERT INTO trocas_recebidas_autoflux(id_venda,id_pedido,id_veiculo_entrada,valor_atribuido,snapshot) VALUES(?,?,?,?,?)',[$venda,$id,$t['id_veiculo_entrada'],$t['valor_avaliado'],self::json($t)]);
            if($r){
                $motivo='Utilizada na conclusão do pedido '.$p['numero_pedido'];
                $this->executar('UPDATE reservas_orcamento SET data_liberacao=CURRENT_TIMESTAMP,id_usuario_liberacao=?,motivo_liberacao=? WHERE id_reserva=?',[$usuario,$motivo,$r['id_reserva']]);
                $this->executar("INSERT INTO eventos_reserva_orcamento(id_reserva,id_usuario_responsavel,tipo,valor_sinal,observacoes) VALUES(?,?,'Liberação',?,?)",[$r['id_reserva'],$usuario,$r['valor_sinal'],$motivo.'. Sinal incorporado ao pagamento da venda.']);
            }
            $this->movimentar((int)$p['id_ciclo'],$usuario,'Separado para venda','Vendido','Conclusão do pedido '.$p['numero_pedido']);
            $this->executar('UPDATE ciclos_veiculo SET data_encerramento=CURRENT_TIMESTAMP WHERE id_ciclo=?',[$p['id_ciclo']]);
            $this->executar("UPDATE pedidos_venda_autoflux SET situacao='Concluído',snapshot=?,versao=versao+1 WHERE id_pedido=?",[self::json($dados),$id]);
            $this->evento($id,$usuario,'Venda concluída','Comissão preservada do orçamento: '.Orcamento::moeda($percentual).'% · R$ '.$comissao.'. '.count($dados['trocas']).' troca(s) recebida(s), pendente(s) de aquisição com NF.'.($obs?' '.$obs:''));
            $this->pdo->commit();
        }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
    public function salvarPagamentos(int $id,array $d,int $usuario): void {
        $this->pdo->beginTransaction();try {
            $p=$this->um('SELECT * FROM pedidos_venda_autoflux WHERE id_pedido=? FOR UPDATE',[$id]);
            if($p['situacao']!=='Em andamento')throw new DomainException('Somente pedidos em andamento permitem alterar o pagamento.');
            if(Orcamento::id($d['versao']??null)!==(int)$p['versao'])throw new DomainException('O pedido mudou. Atualize os detalhes antes de salvar o pagamento.');
            $motivo=Orcamento::texto($d['motivo']??'',255);if($motivo==='')throw new InvalidArgumentException('Informe o motivo da atualização do pagamento.');
            $itens=PagamentoPedido::validar($d['pagamentos']??null,(int)round((float)$p['saldo_restante']*100));
            $m=new PagamentoPedido($this->pdo);$anteriores=$m->listar($id);
            $m->gravar($id,$itens,$usuario);
            $this->executar('UPDATE pedidos_venda_autoflux SET versao=versao+1 WHERE id_pedido=?',[$id]);
            $resumo=implode('; ',array_map(fn($r)=>$r['forma'].' R$ '.number_format((float)$r['valor'],2,',','.').($r['forma']==='Financiamento'?' · '.$r['banco'].' · '.$r['parcelas'].'x · previsão final '.$r['ultimo_vencimento']:''),$itens));
            $this->evento($id,$usuario,$anteriores?'Pagamento atualizado':'Pagamento informado',$motivo.($resumo!==''?' — '.$resumo:''));
            $this->pdo->commit();
        }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
    private function decodificar(array $p): array {$p['dados']=json_decode($p['snapshot'],true,512,JSON_THROW_ON_ERROR);unset($p['snapshot']);return $p;}
    public function detalhes(int $id): array {
        $p=$this->decodificar($this->um('SELECT p.*,u.nome responsavel_criacao,uc.nome responsavel_cancelamento,c.situacao_atual situacao_veiculo,c.data_encerramento FROM pedidos_venda_autoflux p JOIN usuarios u ON u.id_usuario=p.id_usuario_criacao LEFT JOIN usuarios uc ON uc.id_usuario=p.id_usuario_cancelamento JOIN ciclos_veiculo c ON c.id_ciclo=p.id_ciclo WHERE p.id_pedido=?',[$id]));
        if($p['situacao']==='Em andamento')$p=$this->recuperarComissao($p);
        $p['fechamento']=$this->executar('SELECT f.id_venda,f.data_venda,f.valor_final,f.comissao_percentual,f.comissao_valor,f.observacoes,u.nome responsavel FROM vendas_fechamento_autoflux f JOIN usuarios u ON u.id_usuario=f.id_usuario WHERE f.id_pedido=?',[$id])->fetch(PDO::FETCH_ASSOC)?:null;
        $p['trocas_recebidas']=$this->executar('SELECT id_recebimento,id_veiculo_entrada,valor_atribuido,situacao FROM trocas_recebidas_autoflux WHERE id_pedido=? ORDER BY id_recebimento',[$id])->fetchAll(PDO::FETCH_ASSOC);
        $p['cancelamento_venda']=(new CancelamentoVenda($this->pdo))->detalhes($id);
        $p['contexto_cancelamento']=$p['fechamento']?(new CancelamentoVenda($this->pdo))->contexto($id):null;
        $p['garantia']=$p['fechamento']?(new GarantiaVenda($this->pdo))->detalhes($id):null;
        $p['repasse']=(new RepasseConsignado($this->pdo))->detalhes($id);
        $p['previa_repasse']=null;
        if($p['situacao']==='Em andamento'&&mb_strtolower(trim($p['dados']['origem']))==='consignação'){
            try{$p['previa_repasse']=(new RepasseConsignado($this->pdo))->previa((int)$p['id_ciclo']);}
            catch(DomainException $e){$p['previa_repasse']=['erro'=>$e->getMessage()];}
        }
        $p['eventos']=$this->executar('SELECT e.*,u.nome responsavel FROM eventos_pedido_autoflux e JOIN usuarios u ON u.id_usuario=e.id_usuario WHERE e.id_pedido=? ORDER BY e.id_evento DESC',[$id])->fetchAll(PDO::FETCH_ASSOC);
        $m=new PagamentoPedido($this->pdo);$p['pagamentos']=$m->listar($id);$p['historico_pagamentos']=$m->listar($id,true);
        $p['pagamento_informado']=count($p['pagamentos'])>0||(float)$p['saldo_restante']<=0;
        return $p;
    }
    public function listar(array $f): array {
        $pagina=Orcamento::id($f['pagina']??1);$busca=Orcamento::texto($f['busca']??'',150);$situacao=Orcamento::texto($f['situacao']??'',30);
        if(!in_array($situacao,['','Em andamento','Concluído','Cancelado'],true))throw new InvalidArgumentException('Situação do pedido inválida.');
        $where=[];$args=[];
        if($busca!==''){
            $where[]="CONCAT_WS(' ',p.numero_pedido,JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.numero_orcamento')),JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.cliente')),JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.vendedor')),JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.marca')),JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.modelo')),JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.placa')),JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.nosso_numero'))) LIKE ? ESCAPE '!'";
            $args[]='%'.str_replace(['!','%','_'],['!!','!%','!_'],$busca).'%';
        }
        $inicio=Orcamento::texto($f['inicio']??'',10);$fim=Orcamento::texto($f['fim']??'',10);
        foreach([$inicio,$fim] as $dt)if($dt!==''){ $data=DateTimeImmutable::createFromFormat('!Y-m-d',$dt);if(!$data||$data->format('Y-m-d')!==$dt)throw new InvalidArgumentException('Período inválido.'); }
        if($inicio!==''&&$fim!==''&&$inicio>$fim)throw new InvalidArgumentException('A data inicial não pode superar a data final.');
        if($inicio!==''){$where[]='p.data_criacao>=?';$args[]=$inicio.' 00:00:00';}
        if($fim!==''){$where[]='p.data_criacao<DATE_ADD(?,INTERVAL 1 DAY)';$args[]=$fim.' 00:00:00';}
        $base=' FROM pedidos_venda_autoflux p'.($where?' WHERE '.implode(' AND ',$where):'');
        $contadores=$this->um("SELECT COUNT(*) total,COALESCE(SUM(p.situacao='Em andamento'),0) andamento,COALESCE(SUM(p.situacao='Concluído'),0) concluidos,COALESCE(SUM(p.situacao='Cancelado'),0) cancelados".$base,$args);
        if($situacao!==''){$base.=($where?' AND ':' WHERE ').'p.situacao=?';$args[]=$situacao;}
        $total=(int)$this->executar('SELECT COUNT(*)'.$base,$args)->fetchColumn();$paginas=max(1,(int)ceil($total/20));$pagina=min($pagina,$paginas);
        $itens=$this->executar('SELECT p.*'.$base.' ORDER BY p.id_pedido DESC LIMIT 20 OFFSET '.(($pagina-1)*20),$args)->fetchAll(PDO::FETCH_ASSOC);
        return ['itens'=>array_map(fn($p)=>$this->decodificar($p),$itens),'total'=>$total,'pagina'=>$pagina,'paginas'=>$paginas,'contadores'=>$contadores];
    }
}
