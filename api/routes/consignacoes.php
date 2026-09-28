<?php

declare(strict_types=1);

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../models/Consignacao.php";
require_once __DIR__ . "/../controllers/ConsignacaoController.php";

function responderConsignacao(
    array $conteudo,
    int $status = 200
): never {
    http_response_code($status);

    echo json_encode(
        $conteudo,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}

function lerDadosConsignacao(): array
{
    $conteudo = file_get_contents("php://input");

    if ($conteudo === false || trim($conteudo) === "") {
        throw new InvalidArgumentException(
            "Nenhum dado foi enviado."
        );
    }

    $dados = json_decode($conteudo, true);

    if (!is_array($dados)) {
        throw new InvalidArgumentException(
            "Os dados enviados são inválidos."
        );
    }

    return $dados;
}

/**
 * Converte detalhes internos de restrições do banco em mensagens apropriadas
 * para o usuário. A mensagem técnica nunca deve ser enviada ao frontend.
 */
function mensagemIntegridadeConsignacao(
    Throwable $erro
): string {
    $mensagemTecnica = strtolower(
        $erro->getMessage()
    );

    if (
        str_contains($mensagemTecnica, "uq_nf_chave_acesso") ||
        str_contains($mensagemTecnica, "chave_acesso")
    ) {
        return "Já existe uma Nota Fiscal cadastrada com esta chave de acesso.";
    }

    if (
        str_contains($mensagemTecnica, "numero_nota") ||
        str_contains($mensagemTecnica, "numero_serie") ||
        str_contains($mensagemTecnica, "uq_nf_numero")
    ) {
        return "Já existe uma Nota Fiscal de Entrada com este número e série.";
    }

    if (
        str_contains($mensagemTecnica, "uq_veiculo_chassi") ||
        str_contains($mensagemTecnica, "for key 'chassi'") ||
        str_contains($mensagemTecnica, "for key `chassi`")
    ) {
        return "Já existe um veículo cadastrado com este chassi.";
    }

    if (
        str_contains($mensagemTecnica, "uq_veiculo_placa") ||
        str_contains($mensagemTecnica, "for key 'placa'") ||
        str_contains($mensagemTecnica, "for key `placa`")
    ) {
        return "Já existe um veículo cadastrado com esta placa.";
    }

    if (
        str_contains($mensagemTecnica, "ciclo") &&
        (
            str_contains($mensagemTecnica, "duplicate") ||
            str_contains($mensagemTecnica, "duplicada")
        )
    ) {
        return "Este veículo já possui um ciclo ativo no pátio.";
    }

    if (
        str_contains($mensagemTecnica, "foreign key") ||
        str_contains($mensagemTecnica, "constraint fails")
    ) {
        return "Não foi possível concluir o cadastro porque um dos registros relacionados não é válido.";
    }

    return "Não foi possível registrar a consignação porque já existe um registro com os mesmos dados.";
}

try {
    $conexao = Database::conectar();

    $model = new Consignacao($conexao);

    $controller = new ConsignacaoController(
        $model
    );

    $metodo = $_SERVER["REQUEST_METHOD"];

    $idConsignacao = filter_input(
        INPUT_GET,
        "id",
        FILTER_VALIDATE_INT
    );

    if ($metodo === "GET") {
        if (isset($_GET["id"])) {
            if (
                $idConsignacao === false ||
                $idConsignacao === null ||
                $idConsignacao <= 0
            ) {
                responderConsignacao(
                    [
                        "sucesso" => false,
                        "mensagem" =>
                            "ID da consignação inválido.",
                    ],
                    400
                );
            }

            responderConsignacao(
                $controller->buscarPorId(
                    $idConsignacao
                )
            );
        }

        responderConsignacao(
            $controller->listar()
        );
    }

    if ($metodo === "POST") {
        $dados = lerDadosConsignacao();

        responderConsignacao(
            $controller->cadastrar($dados),
            201
        );
    }

    if ($metodo === "PATCH") {
        if (
            $idConsignacao === false ||
            $idConsignacao === null ||
            $idConsignacao <= 0
        ) {
            responderConsignacao(
                [
                    "sucesso" => false,
                    "mensagem" =>
                        "Informe um ID de consignação válido.",
                ],
                400
            );
        }

        $dados = lerDadosConsignacao();

        $acao = trim(
            (string) ($dados["acao"] ?? "")
        );

        if ($acao !== "devolver") {
            responderConsignacao(
                [
                    "sucesso" => false,
                    "mensagem" =>
                        "A ação informada não é válida.",
                ],
                400
            );
        }

        responderConsignacao(
            $controller->registrarDevolucao(
                $idConsignacao,
                $dados
            )
        );
    }

    responderConsignacao(
        [
            "sucesso" => false,
            "mensagem" => "Método não permitido.",
        ],
        405
    );
} catch (InvalidArgumentException $erro) {
    responderConsignacao(
        [
            "sucesso" => false,
            "mensagem" => $erro->getMessage(),
        ],
        400
    );
} catch (PDOException $erro) {
    if ((string) $erro->getCode() === "23000") {
        responderConsignacao(
            [
                "sucesso" => false,
                "mensagem" =>
                    mensagemIntegridadeConsignacao($erro),
            ],
            409
        );
    }

    responderConsignacao(
        [
            "sucesso" => false,
            "mensagem" =>
                "Erro ao acessar o banco de dados.",
        ],
        500
    );
} catch (RuntimeException $erro) {
    /*
     * Também protege contra camadas que encapsulem uma PDOException em
     * RuntimeException mantendo o texto SQLSTATE na mensagem.
     */
    if (str_contains($erro->getMessage(), "SQLSTATE[23000]")) {
        responderConsignacao(
            [
                "sucesso" => false,
                "mensagem" =>
                    mensagemIntegridadeConsignacao($erro),
            ],
            409
        );
    }

    responderConsignacao(
        [
            "sucesso" => false,
            "mensagem" => $erro->getMessage(),
        ],
        404
    );
} catch (Throwable $erro) {
    responderConsignacao(
        [
            "sucesso" => false,
            "mensagem" => "Erro interno da API.",
        ],
        500
    );
}
