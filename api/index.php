<?php

declare(strict_types=1);

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/config/Database.php";

try {
    $conexao = Database::conectar();
    $conexao->query("SELECT 1");

    echo json_encode(
        [
            "sucesso" => true,
            "mensagem" => "API do AutoFlux conectada ao banco."
        ],
        JSON_UNESCAPED_UNICODE
    );
} catch (Throwable $erro) {
    http_response_code(500);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" => "Não foi possível conectar ao banco."
        ],
        JSON_UNESCAPED_UNICODE
    );
}