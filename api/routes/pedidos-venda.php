<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
require_once __DIR__.'/../models/PedidoVenda.php';
try {
    Auth::proteger();date_default_timezone_set('America/Sao_Paulo');
    $usuario=Auth::usuario();$metodo=$_SERVER['REQUEST_METHOD']??'GET';
    $pdo=Database::conectar();$pdo->exec("SET time_zone='-03:00'");$m=new PedidoVenda($pdo);
    if($metodo==='GET'){
        Auth::exigir('pedidos.visualizar');
        if(($_GET['acao']??'')==='previa'){Auth::exigir('pedidos.gerenciar');$dados=$m->previa(Orcamento::id($_GET['id_orcamento']??null));}
        elseif(isset($_GET['id_orcamento']))$dados=$m->doOrcamento(Orcamento::id($_GET['id_orcamento']));
        elseif(isset($_GET['id']))$dados=$m->detalhes(Orcamento::id($_GET['id']));
        else $dados=$m->listar($_GET);
        Auth::responder(200,['sucesso'=>true,'dados'=>$dados]);
    }
    if(!in_array($metodo,['POST','PUT'],true))Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    $d=json_decode(file_get_contents('php://input')?:'',true,512,JSON_THROW_ON_ERROR);if(!is_array($d))throw new InvalidArgumentException('Dados inválidos.');
    if($metodo==='PUT'&&in_array($d['acao']??'',['cancelar_venda','retorno_venda','destino_troca'],true)){
        Auth::exigir('pedidos.visualizar');Auth::exigir('vendas.cancelar_concluida');
        $id=Orcamento::id($_GET['id']??null);$cancelamento=new CancelamentoVenda($pdo);
        if($d['acao']==='cancelar_venda')$cancelamento->cancelar($id,$d,(int)$usuario['id_usuario']);
        elseif($d['acao']==='retorno_venda')$cancelamento->retornar($id,$d,(int)$usuario['id_usuario']);
        else (new DestinoTrocaCancelada($pdo))->registrar($id,$d,(int)$usuario['id_usuario']);
        Auth::responder(200,['sucesso'=>true,'dados'=>$m->detalhes($id)]);
    }
    if($metodo==='PUT'&&($d['acao']??'')==='garantia'){
        Auth::exigir('pedidos.visualizar');Auth::exigir('garantias.gerenciar');
        $id=Orcamento::id($_GET['id']??null);(new GarantiaVenda($pdo))->alterar($id,$d,(int)$usuario['id_usuario']);
        Auth::responder(200,['sucesso'=>true,'dados'=>$m->detalhes($id)]);
    }
    if($metodo==='PUT'&&($d['acao']??'')==='repasse'){
        Auth::exigir('pedidos.visualizar');Auth::exigir('repasses.gerenciar');
        $id=Orcamento::id($_GET['id']??null);(new RepasseConsignado($pdo))->pagar($id,$d,(int)$usuario['id_usuario']);
        Auth::responder(200,['sucesso'=>true,'dados'=>$m->detalhes($id)]);
    }
    Auth::exigir('pedidos.gerenciar');
    if($metodo==='POST')$id=$m->gerar(Orcamento::id($d['id_orcamento']??null),$d,(int)$usuario['id_usuario']);
    else {$id=Orcamento::id($_GET['id']??null);if(($d['acao']??'')==='cancelar')$m->cancelar($id,$d,(int)$usuario['id_usuario']);elseif(($d['acao']??'')==='concluir')$m->concluir($id,$d,(int)$usuario['id_usuario']);elseif(($d['acao']??'')==='pagamento')$m->salvarPagamentos($id,$d,(int)$usuario['id_usuario']);else throw new InvalidArgumentException('Ação inválida.');}
    Auth::responder($metodo==='POST'?201:200,['sucesso'=>true,'dados'=>$m->detalhes($id)]);
}catch(InvalidArgumentException|JsonException $e){Auth::responder(422,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(DomainException $e){Auth::responder(409,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(PDOException $e){error_log('AutoFlux pedidos: '.$e->getMessage());Auth::responder($e->getCode()==='23000'?409:500,['sucesso'=>false,'mensagem'=>$e->getCode()==='23000'?(in_array($d['acao']??'',['cancelar_venda','retorno_venda','destino_troca'],true)?'Este cancelamento, retorno ou documento já foi registrado. Atualize o pedido e confira a NF.':'Já existe um pedido para esta negociação. Atualize a consulta.'):'Não foi possível acessar os pedidos. Confira a execução do SQL desta etapa.']);}
catch(Throwable $e){error_log('AutoFlux pedidos: '.$e->getMessage());Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível processar o pedido de venda.']);}
