<?php

declare(strict_types=1);

final class HistoricoVeiculoController
{
    private HistoricoVeiculo $historicoVeiculo;

    public function __construct(PDO $conexao)
    {
        $this->historicoVeiculo =
            new HistoricoVeiculo($conexao);
    }

    public function buscar(
        int $idVeiculo
    ): void {
        if ($idVeiculo <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "O veículo informado é inválido.",
            ]);

            return;
        }

        try {
            $historico =
                $this->historicoVeiculo
                    ->buscarPorVeiculo($idVeiculo);

            if ($historico === null) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Veículo não encontrado.",
                ]);

                return;
            }

            $this->responder(200, [
                "sucesso" => true,
                "dados" => $historico,
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível consultar o histórico do veículo.",
            ]);
        }
    }

    private function responder(
        int $status,
        array $conteudo
    ): void {
        http_response_code($status);

        echo json_encode(
            $conteudo,
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES
        );
    }
}