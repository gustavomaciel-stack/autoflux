<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/Auth.php';
require_once __DIR__ . '/../models/ParametroComercial.php';
require_once __DIR__ . '/../controllers/ParametroComercialController.php';

try {
    Auth::proteger();
    Auth::exigir('perfis.administrar'); // Permissão reservada à Gestão/Diretoria.
    $usuario = Auth::usuario();
    $pdo = Database::conectar();
    $pdo->exec("SET time_zone = '-03:00'");
    $controller = new ParametroComercialController(new ParametroComercial($pdo));
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($metodo === 'GET') Auth::responder(200, $controller->consultar());
    if ($metodo !== 'POST') {
        header('Allow: GET, POST, OPTIONS');
        Auth::responder(405, ['sucesso' => false, 'mensagem' => 'Método não permitido.']);
    }
    $dados = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($dados)) throw new InvalidArgumentException('Dados inválidos.');
    Auth::responder(201, $controller->salvar($dados, (int) $usuario['id_usuario']));
} catch (InvalidArgumentException $erro) {
    Auth::responder(422, ['sucesso' => false, 'mensagem' => $erro->getMessage()]);
} catch (DomainException $erro) {
    Auth::responder(409, ['sucesso' => false, 'mensagem' => $erro->getMessage()]);
} catch (Throwable $erro) {
    error_log('AutoFlux parâmetros: ' . $erro->getMessage());
    Auth::responder(500, ['sucesso' => false, 'mensagem' => 'Não foi possível acessar os parâmetros. Confira se o SQL desta etapa foi executado.']);
}
