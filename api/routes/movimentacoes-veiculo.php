<?php

declare(strict_types=1);

header(
    "Content-Type: application/json; charset=UTF-8"
);

header(
    "Access-Control-Allow-Origin: http://localhost:5173"
);

header(
    "Access-Control-Allow-Methods: GET, POST, OPTIONS"
);

header(
    "Access-Control-Allow-Headers: Content-Type"
);

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__
    . "/../config/Database.php";

require_once __DIR__
    . "/../models/MovimentacaoVeiculo.php";

require_once __DIR__
    . "/../controllers/MovimentacaoVeiculoController.php";

try {
    $conexao = Database::conectar();

    $controller =
        new MovimentacaoVeiculoController(
            $conexao
        );

    $metodo =
        $_SERVER["REQUEST_METHOD"];

    $idCiclo = filter_input(
        INPUT_GET,
        "id_ciclo",
        FILTER_VALIDATE_INT
    );

    if (
        $idCiclo === false
        || $idCiclo === null
        || $idCiclo <= 0
    ) {
        http_response_code(400);

        echo json_encode(
            [
                "sucesso" => false,
                "mensagem" =>
                    "Informe um ciclo válido.",
            ],
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
        );

        exit;
    }

    if ($metodo === "GET") {
        $controller->listar($idCiclo);
        exit;
    }

    if ($metodo === "POST") {
        $conteudo =
            file_get_contents("php://input");

        $dados = json_decode(
            $conteudo,
            true
        );

        if (!is_array($dados)) {
            http_response_code(400);

            echo json_encode(
                [
                    "sucesso" => false,
                    "mensagem" =>
                        "Os dados enviados são inválidos.",
                ],
                JSON_UNESCAPED_UNICODE
                | JSON_UNESCAPED_SLASHES
            );

            exit;
        }

        $controller->registrar(
            $idCiclo,
            $dados
        );

        exit;
    }

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