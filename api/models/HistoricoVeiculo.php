<?php

declare(strict_types=1);

final class HistoricoVeiculo
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
    }

    public function buscarPorVeiculo(
        int $idVeiculo
    ): ?array {
        $veiculo = $this->buscarVeiculo($idVeiculo);

        if ($veiculo === null) {
            return null;
        }

        return [
            "veiculo" => $veiculo,
            "ciclos" => $this->buscarCiclos(
                $idVeiculo
            ),
        ];
    }

    private function buscarVeiculo(
        int $idVeiculo
    ): ?array {
        $sql = "
            SELECT
                id_veiculo,
                marca,
                modelo,
                versao,
                ano_fabricacao,
                ano_modelo,
                combustivel,
                placa,
                chassi,
                observacoes,
                data_cadastro,
                data_atualizacao
            FROM veiculos
            WHERE id_veiculo = :id_veiculo
            LIMIT 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_veiculo" => $idVeiculo,
        ]);

        $veiculo = $comando->fetch(
            PDO::FETCH_ASSOC
        );

        return $veiculo !== false
            ? $veiculo
            : null;
    }

    private function buscarCiclos(
        int $idVeiculo
    ): array {
        $sql = "
            SELECT
                ciclo.id_ciclo,
                ciclo.nosso_numero,
                ciclo.origem_entrada,
                ciclo.renavam,
                ciclo.cor,
                ciclo.quilometragem_entrada,
                ciclo.horimetro_entrada,
                ciclo.situacao_atual,
                ciclo.data_entrada,
                ciclo.data_encerramento,

                aquisicao.id_aquisicao,
                aquisicao.valor_aquisicao,
                aquisicao.data_aquisicao,
                aquisicao.origem
                    AS origem_aquisicao,
                aquisicao.situacao
                    AS situacao_aquisicao,

                nota.id_nota_fiscal_entrada,
                nota.numero_nota,
                nota.serie,
                nota.data_emissao,
                nota.valor_total
                    AS valor_nota_fiscal,

                consignacao.id_consignacao,
                consignacao.situacao
                    AS situacao_consignacao,
                consignacao.data_saida,
                consignacao.motivo_saida,
                consignacao.valor_repasse_acordado,
                consignacao.responsavel_despesas,
                consignacao.data_acordo,

                COALESCE(
                    (
                        SELECT SUM(despesa.valor)
                        FROM despesas_veiculo
                            AS despesa
                        WHERE despesa.id_ciclo =
                            ciclo.id_ciclo
                          AND despesa.ativo = 1
                    ),
                    0
                ) AS despesas_realizadas,

                COALESCE(
                    (
                        SELECT SUM(
                            prevista.valor_previsto
                        )
                        FROM despesas_previstas
                            AS prevista
                        WHERE prevista.id_ciclo =
                            ciclo.id_ciclo
                          AND prevista.situacao =
                            'Pendente'
                          AND prevista.ativo = 1
                    ),
                    0
                ) AS despesas_previstas_pendentes,

                (
                    COALESCE(
                        aquisicao.valor_aquisicao,
                        0
                    )
                    +
                    COALESCE(
                        (
                            SELECT SUM(despesa.valor)
                            FROM despesas_veiculo
                                AS despesa
                            WHERE despesa.id_ciclo =
                                ciclo.id_ciclo
                              AND despesa.ativo = 1
                        ),
                        0
                    )
                ) AS custo_acumulado,

                (
                    COALESCE(
                        aquisicao.valor_aquisicao,
                        0
                    )
                    +
                    COALESCE(
                        (
                            SELECT SUM(despesa.valor)
                            FROM despesas_veiculo
                                AS despesa
                            WHERE despesa.id_ciclo =
                                ciclo.id_ciclo
                              AND despesa.ativo = 1
                        ),
                        0
                    )
                    +
                    COALESCE(
                        (
                            SELECT SUM(
                                prevista.valor_previsto
                            )
                            FROM despesas_previstas
                                AS prevista
                            WHERE prevista.id_ciclo =
                                ciclo.id_ciclo
                              AND prevista.situacao =
                                'Pendente'
                              AND prevista.ativo = 1
                        ),
                        0
                    )
                ) AS custo_projetado

            FROM ciclos_veiculo AS ciclo

            LEFT JOIN aquisicoes AS aquisicao
                ON aquisicao.id_ciclo =
                    ciclo.id_ciclo

            LEFT JOIN notas_fiscais_entrada AS nota
                ON nota.id_ciclo =
                    ciclo.id_ciclo

            LEFT JOIN consignacoes AS consignacao
                ON consignacao.id_ciclo =
                    ciclo.id_ciclo

            WHERE ciclo.id_veiculo = :id_veiculo

            ORDER BY
                ciclo.data_entrada DESC,
                ciclo.id_ciclo DESC
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_veiculo" => $idVeiculo,
        ]);

        return $comando->fetchAll(
            PDO::FETCH_ASSOC
        );
    }
}