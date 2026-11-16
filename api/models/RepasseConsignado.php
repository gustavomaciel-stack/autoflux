<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';

final class RepasseConsignado {
    public function __construct(private PDO $pdo) {}
    private function executar(string $sql,array $args=[]): PDOStatement {$q=$this->pdo->prepare($sql);$q->execute($args);return $q;}
    public static function calcular(string $acordado,array $despesas): array {
        $base=Orcamento::centavos($acordado);$desconto=0;$loja=0;$proprietario=0;$itens=[];
        foreach($despesas as $d){
            $valor=Orcamento::centavos($d['valor']);
            if($d['responsavel_despesa']==='Desconto no repasse'){$desconto+=$valor;$itens[]=$d;}
            elseif($d['responsavel_despesa']==='Revenda')$loja+=$valor;
            elseif($d['responsavel_despesa']==='Proprietário')$proprietario+=$valor;
            else throw new DomainException('Confira o responsável das despesas do consignado.');
        }
        if($desconto>$base)throw new DomainException('As despesas descontadas ultrapassam o repasse acordado. Revise os lançamentos antes de concluir.');
        return ['repasse_acordado'=>Orcamento::moeda($base),'descontos'=>Orcamento::moeda($desconto),'repasse_liquido'=>Orcamento::moeda($base-$desconto),'despesas_revenda'=>Orcamento::moeda($loja),'despesas_proprietario'=>Orcamento::moeda($proprietario),'itens_desconto'=>$itens];
    }
    public function previa(int $ciclo,bool $bloquear=false): array {
        $q=$this->executar('SELECT co.id_consignacao,co.id_proprietario,co.valor_repasse_acordado,co.situacao,cli.nome_razao_social proprietario FROM consignacoes co JOIN clientes cli ON cli.id_cliente=co.id_proprietario WHERE co.id_ciclo=?'.($bloquear?' FOR UPDATE':''),[$ciclo]);
        $c=$q->fetch(PDO::FETCH_ASSOC);
        if(!$c||$c['situacao']!=='Ativa'||$c['valor_repasse_acordado']===null)throw new DomainException('A consignação deve estar ativa e possuir valor de repasse acordado.');
        $itens=$this->executar('SELECT id_despesa,descricao,valor,responsavel_despesa FROM despesas_veiculo WHERE id_ciclo=? AND ativo=1 ORDER BY id_despesa'.($bloquear?' FOR UPDATE':''),[$ciclo])->fetchAll(PDO::FETCH_ASSOC);
        $dados=array_merge(['id_consignacao'=>(int)$c['id_consignacao'],'id_proprietario'=>(int)$c['id_proprietario'],'proprietario'=>$c['proprietario']],self::calcular($c['valor_repasse_acordado'],$itens));
        $dados['assinatura']=hash('sha256',json_encode([$dados,$itens],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
        return $dados;
    }
    // Chamado na mesma transação do fechamento, com ciclo e consignação bloqueados.
    public function gerar(int $venda,int $pedido,int $usuario,array $d): void {
        $this->executar('INSERT INTO repasses_consignado_autoflux(id_venda,id_pedido,id_consignacao,id_proprietario,id_usuario_criacao,repasse_acordado,descontos,valor_devido,situacao,snapshot) VALUES(?,?,?,?,?,?,?,?,?,?)',[$venda,$pedido,$d['id_consignacao'],$d['id_proprietario'],$usuario,$d['repasse_acordado'],$d['descontos'],$d['repasse_liquido'],Orcamento::centavos($d['repasse_liquido'])===0?'Paga':'Pendente',json_encode($d,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
        $this->executar("UPDATE consignacoes SET situacao='Vendida',data_saida=CURRENT_TIMESTAMP,motivo_saida=? WHERE id_consignacao=? AND situacao='Ativa'",['Conclusão do pedido '.$pedido,$d['id_consignacao']]);
    }
    public function detalhes(int $pedido): ?array {
        $r=$this->executar('SELECT r.*,u.nome responsavel_criacao FROM repasses_consignado_autoflux r JOIN usuarios u ON u.id_usuario=r.id_usuario_criacao WHERE r.id_pedido=?',[$pedido])->fetch(PDO::FETCH_ASSOC);
        if(!$r)return null;
        $r['dados']=json_decode($r['snapshot'],true,512,JSON_THROW_ON_ERROR);unset($r['snapshot']);
        $r['pagamentos']=$this->executar('SELECT p.*,u.nome responsavel FROM pagamentos_repasse_autoflux p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE p.id_repasse=? ORDER BY p.id_pagamento DESC',[$r['id_repasse']])->fetchAll(PDO::FETCH_ASSOC);
        $total=0;foreach($r['pagamentos'] as $pg)$total+=Orcamento::centavos($pg['valor']);
        $r['total_pago']=Orcamento::moeda($total);$r['saldo_devido']=Orcamento::moeda(Orcamento::centavos($r['valor_devido'])-$total);
        return $r;
    }
    public function pagar(int $pedido,array $d,int $usuario): void {
        $valor=Orcamento::centavos($d['valor']??null);if($valor<=0)throw new InvalidArgumentException('Informe um valor positivo para o pagamento.');
        $data=Orcamento::texto($d['data_pagamento']??'',10);$dt=DateTimeImmutable::createFromFormat('!Y-m-d',$data);
        if(!$dt||$dt->format('Y-m-d')!==$data||$data>date('Y-m-d'))throw new InvalidArgumentException('Informe uma data válida, até hoje, para o pagamento.');
        $obs=Orcamento::texto($d['observacoes']??'',5000);
        $this->pdo->beginTransaction();
        try{
            $p=$this->executar('SELECT situacao,versao FROM pedidos_venda_autoflux WHERE id_pedido=? FOR UPDATE',[$pedido])->fetch(PDO::FETCH_ASSOC);
            if(!$p||$p['situacao']!=='Concluído')throw new DomainException('Somente vendas concluídas permitem registrar repasse.');
            if(Orcamento::id($d['versao']??null)!==(int)$p['versao'])throw new DomainException('O pedido mudou. Atualize antes de registrar o pagamento.');
            $r=$this->executar('SELECT * FROM repasses_consignado_autoflux WHERE id_pedido=? FOR UPDATE',[$pedido])->fetch(PDO::FETCH_ASSOC);
            if(!$r||in_array($r['situacao'],['Paga','Cancelada'],true))throw new DomainException('Este pedido não possui repasse pendente.');
            if($data<substr($r['data_criacao'],0,10))throw new InvalidArgumentException('A data do pagamento não pode ser anterior à conclusão da venda.');
            $pagos=$this->executar('SELECT valor FROM pagamentos_repasse_autoflux WHERE id_repasse=? FOR UPDATE',[$r['id_repasse']])->fetchAll(PDO::FETCH_COLUMN);
            $total=0;foreach($pagos as $v)$total+=Orcamento::centavos($v);
            $devido=Orcamento::centavos($r['valor_devido']);
            if($valor>$devido-$total)throw new DomainException('O pagamento ultrapassa o saldo devido ao proprietário.');
            $this->executar('INSERT INTO pagamentos_repasse_autoflux(id_repasse,id_usuario,valor,data_pagamento,observacoes) VALUES(?,?,?,?,?)',[$r['id_repasse'],$usuario,Orcamento::moeda($valor),$data,$obs?:null]);
            $this->executar('UPDATE repasses_consignado_autoflux SET situacao=? WHERE id_repasse=?',[$total+$valor===$devido?'Paga':'Parcialmente paga',$r['id_repasse']]);
            $this->executar('UPDATE pedidos_venda_autoflux SET versao=versao+1 WHERE id_pedido=?',[$pedido]);
            $this->executar("INSERT INTO eventos_pedido_autoflux(id_pedido,id_usuario,tipo,observacoes) VALUES(?,?,'Repasse registrado',?)",[$pedido,$usuario,'Pagamento de R$ '.Orcamento::moeda($valor).' ao proprietário em '.$data.($obs?' · '.$obs:'')]);
            $this->pdo->commit();
        }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
    }
}
