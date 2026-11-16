<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';
final class PagamentoPedido {
    public function __construct(private PDO $pdo) {}
    public static function ultimoVencimento(string $primeiro,int $parcelas): string {
        $dt=DateTimeImmutable::createFromFormat('!Y-m-d',$primeiro,new DateTimeZone('America/Sao_Paulo'));
        if(!$dt||$dt->format('Y-m-d')!==$primeiro||(int)$dt->format('Y')<100||$parcelas<1||$parcelas>600)throw new InvalidArgumentException('Confira o primeiro vencimento e a quantidade de parcelas (1 a 600).');
        $meses=((int)$dt->format('Y'))*12+(int)$dt->format('n')-1+$parcelas-1;
        $ano=intdiv($meses,12);$mes=$meses%12+1;
        if($ano>9999)throw new InvalidArgumentException('A previsão do financiamento ultrapassa o limite de datas.');
        $base=$dt->setDate($ano,$mes,1);$dia=min((int)$dt->format('j'),(int)$base->format('t'));
        return $base->setDate($ano,$mes,$dia)->format('Y-m-d');
    }
    public static function validar(mixed $itens,int $saldo): array {
        if(!is_array($itens)||!array_is_list($itens)||count($itens)>20)throw new InvalidArgumentException('Informe até 20 formas de pagamento.');
        if($saldo<=0){if(count($itens))throw new InvalidArgumentException('Não há saldo positivo para distribuir em formas de pagamento.');return [];}
        if(!$itens)throw new InvalidArgumentException('Informe como será pago o saldo restante.');
        $saida=[];$total=0;
        foreach($itens as $item){
            if(!is_array($item))throw new InvalidArgumentException('Forma de pagamento inválida.');
            $forma=Orcamento::texto($item['forma']??'',30);
            if(!in_array($forma,['Dinheiro','Pix','Transferência','Cartão de débito','Cartão de crédito','Financiamento'],true))throw new InvalidArgumentException('Selecione uma forma de pagamento válida.');
            $valor=Orcamento::centavos($item['valor']??null);
            if($valor<=0)throw new InvalidArgumentException('Cada forma de pagamento deve ter valor positivo.');
            $total+=$valor;
            $r=['forma'=>$forma,'valor'=>Orcamento::moeda($valor),'banco'=>null,'parcelas'=>null,'primeiro_vencimento'=>null,'ultimo_vencimento'=>null];
            if($forma==='Financiamento'){
                $r['banco']=Orcamento::texto($item['banco']??'',100);
                if($r['banco']==='')throw new InvalidArgumentException('Informe o banco do financiamento.');
                $n=filter_var($item['parcelas']??null,FILTER_VALIDATE_INT);
                if($n===false||$n===null||$n<1||$n>600)throw new InvalidArgumentException('Informe de 1 a 600 parcelas no financiamento.');
                $r['parcelas']=$n;$r['primeiro_vencimento']=Orcamento::texto($item['primeiro_vencimento']??'',10);
                $r['ultimo_vencimento']=self::ultimoVencimento($r['primeiro_vencimento'],$n);
            }
            $saida[]=$r;
        }
        if($total!==$saldo)throw new InvalidArgumentException('A soma das formas de pagamento deve ser igual ao saldo restante de R$ '.number_format($saldo/100,2,',','.').'. Sinal e trocas já foram descontados.');
        return $saida;
    }
    public function listar(int $pedido,bool $historico=false): array {
        $q=$this->pdo->prepare('SELECT p.*,u.nome responsavel FROM pagamentos_pedido_autoflux p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE p.id_pedido=?'.($historico?'':' AND p.ativo=1').' ORDER BY p.id_pagamento');$q->execute([$pedido]);return $q->fetchAll(PDO::FETCH_ASSOC);
    }
    // Executar dentro da transação e com o pedido bloqueado. Registros anteriores são mantidos.
    public function gravar(int $pedido,array $itens,int $usuario): void {
        $q=$this->pdo->prepare('UPDATE pagamentos_pedido_autoflux SET ativo=0 WHERE id_pedido=? AND ativo=1');$q->execute([$pedido]);
        $q=$this->pdo->prepare('INSERT INTO pagamentos_pedido_autoflux(id_pedido,id_usuario,forma,valor,banco,parcelas,primeiro_vencimento,ultimo_vencimento) VALUES(?,?,?,?,?,?,?,?)');
        foreach($itens as $r)$q->execute([$pedido,$usuario,$r['forma'],$r['valor'],$r['banco'],$r['parcelas'],$r['primeiro_vencimento'],$r['ultimo_vencimento']]);
    }
}
