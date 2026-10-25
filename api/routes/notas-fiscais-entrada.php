<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/Auth.php';
try {
    Auth::proteger();
    $permissoesRota = ['GET'=>'notas.visualizar'];
    $metodoPermissao = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!isset($permissoesRota[$metodoPermissao])) Auth::responder(405, ['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    Auth::exigir($permissoesRota[$metodoPermissao]);
    if ($metodoPermissao === 'GET' && !Auth::permite('custos.visualizar')) {
        ob_start(static function(string $conteudo): string {
            $dados=json_decode($conteudo,true);
            return is_array($dados) ? json_encode(Auth::filtrarFinanceiro($dados),JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : $conteudo;
        });
    }


} catch (Throwable $erro) {
    Auth::responder(500, ['sucesso' => false, 'mensagem' => 'Não foi possível validar a sessão.']);
}


header("Content-Type: application/json; charset=UTF-8");

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
    . "/../models/NotaFiscalEntrada.php";

require_once __DIR__
    . "/../controllers/NotaFiscalEntradaController.php";

try {
    $conexao = Database::conectar();

    $controller =
        new NotaFiscalEntradaController($conexao);

    $metodo = $_SERVER["REQUEST_METHOD"];

    if ($metodo !== "GET") {
        http_response_code(405);

        echo json_encode(
            [
                "sucesso" => false,
                "mensagem" =>
                    "Método não permitido.",
            ],
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
        );

        exit;
    }

    if (isset($_GET["id"])) {
        $idNotaFiscalEntrada = filter_input(
            INPUT_GET,
            "id",
            FILTER_VALIDATE_INT
        );

        if (
            $idNotaFiscalEntrada === false
            || $idNotaFiscalEntrada === null
            || $idNotaFiscalEntrada <= 0
        ) {
            http_response_code(400);

            echo json_encode(
                [
                    "sucesso" => false,
                    "mensagem" =>
                        "ID da nota fiscal inválido.",
                ],
                JSON_UNESCAPED_UNICODE
                | JSON_UNESCAPED_SLASHES
            );

            exit;
        }

        $controller->buscar(
            $idNotaFiscalEntrada
        );

        exit;
    }

    $controller->listar();
} catch (PDOException $erro) {
    http_response_code(500);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" =>
                "Erro ao acessar o banco de dados.",
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );
} catch (Throwable $erro) {
    http_response_code(500);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" =>
                "Erro interno da API.",
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );
}