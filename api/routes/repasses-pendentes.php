<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
try {
    Auth::proteger();
    Auth::exigir('pedidos.visualizar');
    Auth::exigir('repasses.gerenciar');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') Auth::responder(405, ['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    $pdo=Database::conectar();
    $sql="SELECT r.id_repasse,r.id_pedido,p.numero_pedido,p.snapshot,r.valor_devido-COALESCE(pg.total_pago,0) saldo_devido
        FROM repasses_consignado_autoflux r
        JOIN pedidos_venda_autoflux p ON p.id_pedido=r.id_pedido
        LEFT JOIN (SELECT id_repasse,SUM(valor) total_pago FROM pagamentos_repasse_autoflux GROUP BY id_repasse) pg ON pg.id_repasse=r.id_repasse
        WHERE p.situacao='Concluído' AND r.situacao IN ('Pendente','Parcialmente paga')
        AND r.valor_devido>COALESCE(pg.total_pago,0) ORDER BY r.id_repasse";
    $itens=[];
    foreach($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) as $r){
        $dados=json_decode($r['snapshot'],true,512,JSON_THROW_ON_ERROR);
        unset($r['snapshot']);
        $r['marca']=$dados['marca']??'';$r['modelo']=$dados['modelo']??'';$r['placa']=$dados['placa']??'';
        $itens[]=$r;
    }
    Auth::responder(200,['sucesso'=>true,'dados'=>$itens]);
} catch(Throwable $e) {
    Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível consultar os repasses pendentes.']);
}
