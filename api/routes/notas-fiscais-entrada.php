<?php

declare(strict_types=1);

header("Content-Type: application/json; charset=UTF-8");

header(
    "Access-Control-Allow-Origin: http://localhost:5173"
);

header(
    "Access-Control-Allow-Methods: GET, OPTIONS"
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