<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/ExpiracaoReserva.php';
$usuario = filter_var($argv[1] ?? '', FILTER_VALIDATE_INT);
if (!$usuario || $usuario < 1) {
    fwrite(STDERR, "Informe o ID do usuário responsável pela execução automática.\n");
    exit(1);
}
try {
    $pdo = Database::conectar();
    $consulta = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE id_usuario=? AND ativo=1');
    $consulta->execute([$usuario]);
    if (!$consulta->fetchColumn()) throw new RuntimeException('Usuário executor inválido ou inativo.');
    echo (new ExpiracaoReserva($pdo))->processar($usuario) . " reserva(s) expirada(s).\n";
} catch (Throwable $erro) {
    fwrite(STDERR, $erro->getMessage() . "\n");
    exit(1);
}
