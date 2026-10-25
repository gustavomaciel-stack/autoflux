<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/Auth.php';
try {
    Auth::proteger();
    $permissoesRota = ['GET'=>'veiculos.visualizar'];
    $metodoPermissao = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!isset($permissoesRota[$metodoPermissao])) Auth::responder(405, ['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    Auth::exigir($permissoesRota[$metodoPermissao]);
    if ($metodoPermissao === 'GET' && !Auth::permite('custos.visualizar')) {
        ob_start(static function(string $conteudo): string {
            $dados = json_decode($conteudo, true);
            return is_array($dados) ? json_encode(Auth::filtrarFinanceiro($dados), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : $conteudo;
        });
    }

} catch (Throwable $erro) {
    Auth::responder(500, ['sucesso' => false, 'mensagem' => 'Não foi possível validar a sessão.']);
}


header(
    "Content-Type: application/json; charset=UTF-8"
);

header(
    "Access-Control-Allow-Origin: http://localhost:5173"
);

header(
    "Access-Control-Allow-Methods: GET, OPTIONS"
);

header(
    "Access-Control-Allow-Headers: Content-Type, X-CSRF-Token"
);

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__
    . "/../config/Database.php";

require_once __DIR__
    . "/../models/HistoricoVeiculo.php";

require_once __DIR__
    . "/../controllers/HistoricoVeiculoController.php";

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        responderErro(
            405,
            "Método não permitido."
        );

        exit;
    }

    $idVeiculo = filter_input(
        INPUT_GET,
        "id_veiculo",
        FILTER_VALIDATE_INT
    );

    if (
        $idVeiculo === false ||
        $idVeiculo === null ||
        $idVeiculo <= 0
    ) {
        responderErro(
            400,
            "Informe um ID de veículo válido."
        );

        exit;
    }

    $conexao = Database::conectar();

    $controller =
        new HistoricoVeiculoController($conexao);

    $controller->buscar($idVeiculo);
} catch (PDOException $erro) {
    responderErro(
        500,
        "Erro ao acessar o banco de dados."
    );
} catch (Throwable $erro) {
    responderErro(
        500,
        "Erro interno da API."
    );
}

function responderErro(
    int $status,
    string $mensagem
): void {
    http_response_code($status);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" => $mensagem,
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );
}