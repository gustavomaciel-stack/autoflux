<?php

declare(strict_types=1);

final class MovimentacaoVeiculoController
{
    private MovimentacaoVeiculo $movimentacao;

    private const SITUACOES_PERMITIDAS = [
        "Disponível",
        "Em preparação",
        "Em manutenção",
        "Reservado",
        "Bloqueado",
    ];

    public function __construct(PDO $conexao)
    {
        $this->movimentacao =
            new MovimentacaoVeiculo($conexao);
    }

    public function listar(
        int $idCiclo
    ): void {
        if ($idCiclo <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "O ciclo informado é inválido.",
            ]);

            return;
        }

        try {
            $ciclo =
                $this->movimentacao
                    ->buscarCiclo($idCiclo);

            if ($ciclo === false) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Ciclo do veículo não encontrado.",
                ]);

                return;
            }

            $historico =
                $this->movimentacao
                    ->listarPorCiclo($idCiclo);

            $this->responder(200, [
                "sucesso" => true,
                "dados" => [
                    "ciclo" => $ciclo,
                    "historico" => $historico,
                ],
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível consultar o histórico do veículo.",
            ]);
        }
    }

    public function registrar(
        int $idCiclo,
        array $dados
    ): void {
        if ($idCiclo <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "O ciclo informado é inválido.",
            ]);

            return;
        }

        try {
            $situacaoNova = trim(
                (string) (
                    $dados["situacao_nova"] ?? ""
                )
            );

            if ($situacaoNova === "") {
                throw new InvalidArgumentException(
                    "Informe a nova situação do veículo."
                );
            }

            if (
                !in_array(
                    $situacaoNova,
                    self::SITUACOES_PERMITIDAS,
                    true
                )
            ) {
                throw new InvalidArgumentException(
                    "A situação informada não é permitida."
                );
            }

            $observacoes = trim(
                (string) (
                    $dados["observacoes"] ?? ""
                )
            );

            if ($observacoes === "") {
                $observacoes = null;
            }

            if (
                $observacoes !== null
                && mb_strlen($observacoes) > 1000
            ) {
                throw new InvalidArgumentException(
                    "As observações devem possuir no máximo 1000 caracteres."
                );
            }

            /*
             * Temporário no MVP1.
             * Quando houver autenticação, esse ID virá
             * do usuário conectado.
             */
            $idUsuarioResponsavel = 1;

            $idMovimentacao =
                $this->movimentacao->registrar(
                    $idCiclo,
                    $idUsuarioResponsavel,
                    $situacaoNova,
                    $observacoes
                );

            $cicloAtualizado =
                $this->movimentacao
                    ->buscarCiclo($idCiclo);

            $historicoAtualizado =
                $this->movimentacao
                    ->listarPorCiclo($idCiclo);

            $this->responder(201, [
                "sucesso" => true,
                "mensagem" =>
                    "Situação do veículo atualizada com sucesso.",
                "id_movimentacao" =>
                    $idMovimentacao,
                "dados" => [
                    "ciclo" =>
                        $cicloAtualizado,
                    "historico" =>
                        $historicoAtualizado,
                ],
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível registrar a movimentação do veículo.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível atualizar a situação do veículo.",
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
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
        );
    }
}