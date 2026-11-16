<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
require_once __DIR__.'/../models/AnexoNotaFiscal.php';
require_once __DIR__.'/../models/ConsultaNotasFiscais.php';
require_once __DIR__.'/../models/NotaDevolucao.php';

try {
    Auth::proteger();
    Auth::exigir('notas.saida.visualizar');
    $metodo=$_SERVER['REQUEST_METHOD']??'GET';
    if (!in_array($metodo,['GET','POST'],true)) Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    $pdo=Database::conectar();
    $id=null;
    if (isset($_GET['pedido'])) {
        $id=filter_var($_GET['pedido'],FILTER_VALIDATE_INT);
        if ($id < 0 && $metodo === 'GET' && isset($_GET['baixar'])) NotaDevolucao::baixar($pdo, -$id);
        if (!$id) throw new InvalidArgumentException('Pedido inválido.');
    }
    if ($metodo === 'POST' && $id < 0) {
        NotaDevolucao::anexar($pdo, -$id);
        Auth::responder(200, ['sucesso'=>true, 'dados'=>[], 'mensagem'=>'PDF anexado com sucesso.']);
    }
    if ($metodo==='POST' || isset($_GET['baixar'])) {
        if (!$id) throw new InvalidArgumentException('Informe o pedido de venda.');
        $arquivos=new AnexoNotaFiscal($pdo,require __DIR__.'/../config/ArquivosNota.php');
        if ($metodo==='POST') {
            Auth::exigir('notas.visualizar');
            Auth::exigir('pedidos.visualizar');
            Auth::exigir('pedidos.gerenciar');
            $arquivos->enviar($id,(int)Auth::usuario()['id_usuario'],$_FILES['arquivo']??[],$_POST);
        } else {
            $arquivos->baixar($id,true);
            exit;
        }
    }

    $origem = "SELECT p.id_pedido AS id_pedido,
        CONVERT(p.numero_pedido USING utf8mb4) COLLATE utf8mb4_unicode_ci AS numero_pedido,
        p.id_ciclo AS id_ciclo,
        CONVERT(p.situacao USING utf8mb4) COLLATE utf8mb4_unicode_ci AS situacao,
        CONVERT(c.nosso_numero USING utf8mb4) COLLATE utf8mb4_unicode_ci AS nosso_numero,
        CONVERT(v.marca USING utf8mb4) COLLATE utf8mb4_unicode_ci AS marca,
        CONVERT(v.modelo USING utf8mb4) COLLATE utf8mb4_unicode_ci AS modelo,
        CONVERT(v.placa USING utf8mb4) COLLATE utf8mb4_unicode_ci AS placa,
        CONVERT(n.numero_nota USING utf8mb4) COLLATE utf8mb4_unicode_ci AS numero_nota,
        CONVERT(n.serie USING utf8mb4) COLLATE utf8mb4_unicode_ci AS serie,
        CONVERT(n.chave_acesso USING utf8mb4) COLLATE utf8mb4_unicode_ci AS chave_acesso,
        n.data_emissao AS data_emissao,
        CONVERT(n.nome_original USING utf8mb4) COLLATE utf8mb4_unicode_ci AS nome_original,
        COALESCE(n.data_envio,f.data_venda) AS ordenacao
        FROM vendas_fechamento_autoflux f JOIN pedidos_venda_autoflux p ON p.id_pedido=f.id_pedido
        JOIN ciclos_veiculo c ON c.id_ciclo=p.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo
        LEFT JOIN notas_fiscais_saida n ON n.id_pedido=p.id_pedido
        WHERE p.situacao='Concluído' OR n.id_pedido IS NOT NULL
        UNION ALL
        SELECT -CAST(co.id_consignacao AS SIGNED) AS id_pedido,
        CONVERT(CONCAT('Devolução ',c.nosso_numero) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS numero_pedido,
        co.id_ciclo AS id_ciclo,
        CONVERT('Devolvida' USING utf8mb4) COLLATE utf8mb4_unicode_ci AS situacao,
        CONVERT(c.nosso_numero USING utf8mb4) COLLATE utf8mb4_unicode_ci AS nosso_numero,
        CONVERT(v.marca USING utf8mb4) COLLATE utf8mb4_unicode_ci AS marca,
        CONVERT(v.modelo USING utf8mb4) COLLATE utf8mb4_unicode_ci AS modelo,
        CONVERT(v.placa USING utf8mb4) COLLATE utf8mb4_unicode_ci AS placa,
        CONVERT(d.numero_nota USING utf8mb4) COLLATE utf8mb4_unicode_ci AS numero_nota,
        CONVERT(d.serie USING utf8mb4) COLLATE utf8mb4_unicode_ci AS serie,
        CONVERT(d.chave_acesso USING utf8mb4) COLLATE utf8mb4_unicode_ci AS chave_acesso,
        d.data_emissao AS data_emissao,
        CONVERT(d.nome_original USING utf8mb4) COLLATE utf8mb4_unicode_ci AS nome_original,
        d.data_envio AS ordenacao
        FROM notas_fiscais_devolucao d JOIN consignacoes co ON co.id_consignacao=d.id_consignacao
        JOIN ciclos_veiculo c ON c.id_ciclo=co.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo";
    $campos = 'SELECT n.*';
    $de = 'FROM (' . $origem . ') n';
    $visiveis = '1=1';
    if ($metodo === 'GET' && !$id && isset($_GET['pagina'])) {
        $consulta = new ConsultaNotasFiscais($_GET);
        $consulta->adicionar($visiveis);
        $consulta->aplicarComuns('n.id_ciclo','n.data_emissao','n.numero_nota',
            ['n.numero_nota', 'n.numero_pedido', 'n.nosso_numero', 'n.marca', 'n.modelo', 'n.placa']);
        $consulta->busca('pedido_numero','n.numero_pedido');
        $situacao = $consulta->texto('situacao');
        if ($situacao === 'Devolução') $consulta->adicionar("n.situacao = 'Devolvida'");
        if ($situacao === 'Pendente') $consulta->adicionar('n.numero_nota IS NULL');
        if ($situacao === 'Registrada') $consulta->adicionar("n.numero_nota IS NOT NULL AND n.situacao <> 'Cancelado'");
        if ($situacao === 'Venda cancelada') $consulta->adicionar("n.situacao = 'Cancelado'");
        Auth::responder(200,['sucesso'=>true,'dados'=>$consulta->paginar(
            $pdo,$campos,$de,'n.ordenacao DESC, n.id_pedido DESC'
        )]);
    }
    $sql = "$campos $de WHERE $visiveis";
    $q=$pdo->prepare($sql.($id ? ' AND n.id_pedido=?' : '').' ORDER BY n.ordenacao DESC, n.id_pedido DESC');
    $q->execute($id ? [$id] : []);
    Auth::responder($metodo==='POST'?201:200,['sucesso'=>true,'dados'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
} catch (InvalidArgumentException $e) {
    Auth::responder(422,['sucesso'=>false,'mensagem'=>$e->getMessage()]);
} catch (DomainException $e) {
    Auth::responder(409,['sucesso'=>false,'mensagem'=>$e->getMessage()]);
} catch (Throwable $e) {
    error_log('AutoFlux notas de saída: '.$e->getMessage());
    Auth::responder(500,['sucesso'=>false,'mensagem'=>$e instanceof PDOException
        ? 'Não foi possível acessar as notas de saída. Confira se o SQL da atualização foi aplicado.'
        : ($e instanceof RuntimeException ? $e->getMessage() : 'Não foi possível processar a nota de saída.')]);
}
