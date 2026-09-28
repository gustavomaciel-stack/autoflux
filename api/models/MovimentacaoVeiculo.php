<?php

declare(strict_types=1);

final class MovimentacaoVeiculo
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
    }

    public function listarPorCiclo(
        int $idCiclo
    ): array {
        $sql = "
            SELECT
                movimentacao.id_movimentacao,
                movimentacao.id_ciclo,
                movimentacao.id_usuario_responsavel,
                movimentacao.situacao_anterior,
                movimentacao.situacao_nova,
                movimentacao.data_movimentacao,
                movimentacao.observacoes,

                usuario.nome
                    AS usuario_responsavel

            FROM movimentacoes_veiculo
                AS movimentacao

            INNER JOIN usuarios AS usuario
                ON usuario.id_usuario =
                    movimentacao.id_usuario_responsavel

            WHERE movimentacao.id_ciclo =
                :id_ciclo

            ORDER BY
                movimentacao.data_movimentacao DESC,
                movimentacao.id_movimentacao DESC
        ";

        $comando =
            $this->conexao->prepare($sql);

        $comando->execute([
            "id_ciclo" => $idCiclo,
        ]);

        return $comando->fetchAll(
            PDO::FETCH_ASSOC
        );
    }

    public function buscarCiclo(
        int $idCiclo
    ): array|false {
        $sql = "
            SELECT
                ciclo.id_ciclo,
                ciclo.id_veiculo,
                ciclo.nosso_numero,
                ciclo.situacao_atual,
                ciclo.data_entrada,
                ciclo.data_encerramento,

                veiculo.marca,
                veiculo.modelo,
                veiculo.versao,
                veiculo.placa

            FROM ciclos_veiculo AS ciclo

            INNER JOIN veiculos AS veiculo
                ON veiculo.id_veiculo =
                    ciclo.id_veiculo

            WHERE ciclo.id_ciclo = :id_ciclo
            LIMIT 1
        ";

        $comando =
            $this->conexao->prepare($sql);

        $comando->execute([
            "id_ciclo" => $idCiclo,
        ]);

        return $comando->fetch(
            PDO::FETCH_ASSOC
        );
    }

    public function registrar(
        int $idCiclo,
        int $idUsuarioResponsavel,
        string $situacaoNova,
        ?string $observacoes
    ): int {
        $this->conexao->beginTransaction();

        try {
            $sqlCiclo = "
                SELECT
                    situacao_atual,
                    data_encerramento
                FROM ciclos_veiculo
                WHERE id_ciclo = :id_ciclo
                LIMIT 1
                FOR UPDATE
            ";

            $comandoCiclo =
                $this->conexao->prepare($sqlCiclo);

            $comandoCiclo->execute([
                "id_ciclo" => $idCiclo,
            ]);

            $ciclo = $comandoCiclo->fetch(
                PDO::FETCH_ASSOC
            );

            if ($ciclo === false) {
                throw new InvalidArgumentException(
                    "Ciclo do veículo não encontrado."
                );
            }

            if (
                $ciclo["data_encerramento"] !== null
            ) {
                throw new InvalidArgumentException(
                    "Não é possível movimentar um ciclo encerrado."
                );
            }

            $situacaoAnterior =
                (string) $ciclo["situacao_atual"];

            if ($situacaoAnterior === $situacaoNova) {
                throw new InvalidArgumentException(
                    "O veículo já está nesta situação."
                );
            }

            $sqlAtualizacao = "
                UPDATE ciclos_veiculo
                SET situacao_atual =
                    :situacao_atual
                WHERE id_ciclo = :id_ciclo
            ";

            $comandoAtualizacao =
                $this->conexao->prepare(
                    $sqlAtualizacao
                );

            $comandoAtualizacao->execute([
                "situacao_atual" => $situacaoNova,
                "id_ciclo" => $idCiclo,
            ]);

            $sqlMovimentacao = "
                INSERT INTO movimentacoes_veiculo (
                    id_ciclo,
                    id_usuario_responsavel,
                    situacao_anterior,
                    situacao_nova,
                    data_movimentacao,
                    observacoes
                ) VALUES (
                    :id_ciclo,
                    :id_usuario_responsavel,
                    :situacao_anterior,
                    :situacao_nova,
                    CURRENT_TIMESTAMP,
                    :observacoes
                )
            ";

            $comandoMovimentacao =
                $this->conexao->prepare(
                    $sqlMovimentacao
                );

            $comandoMovimentacao->execute([
                "id_ciclo" => $idCiclo,
                "id_usuario_responsavel" =>
                    $idUsuarioResponsavel,
                "situacao_anterior" =>
                    $situacaoAnterior,
                "situacao_nova" =>
                    $situacaoNova,
                "observacoes" => $observacoes,
            ]);

            $idMovimentacao =
                (int) $this->conexao
                    ->lastInsertId();

            $this->conexao->commit();

            return $idMovimentacao;
        } catch (Throwable $erro) {
            if (
                $this->conexao->inTransaction()
            ) {
                $this->conexao->rollBack();
            }

            throw $erro;
        }
    }
}