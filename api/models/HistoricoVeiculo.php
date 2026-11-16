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
        int $idVeiculo,
        bool $incluirVendas = true
    ): ?array {
        $veiculo = $this->buscarVeiculo($idVeiculo);

        if ($veiculo === null) {
            return null;
        }

        $ciclos = $this->buscarCiclos($idVeiculo);
        if ($incluirVendas) {
            $comando = $this->conexao->prepare(
                "SELECT f.id_venda, f.id_ciclo, f.valor_final, f.data_venda,
                        p.id_pedido, p.numero_pedido, p.situacao AS situacao_pedido
                 FROM vendas_fechamento_autoflux f
                 INNER JOIN pedidos_venda_autoflux p ON p.id_pedido = f.id_pedido
                 INNER JOIN ciclos_veiculo c ON c.id_ciclo = f.id_ciclo
                 WHERE c.id_veiculo = ?
                 ORDER BY f.data_venda DESC, f.id_venda DESC"
            );
            $comando->execute([$idVeiculo]);
            $porCiclo = [];
            foreach ($comando->fetchAll(PDO::FETCH_ASSOC) as $venda) {
                $porCiclo[$venda['id_ciclo']][] = $venda;
            }
            foreach ($ciclos as &$ciclo) {
                $ciclo['vendas'] = $porCiclo[$ciclo['id_ciclo']] ?? [];
            }
            unset($ciclo);
        }

        return [
            "veiculo" => $veiculo,
            "ciclos" => $ciclos,
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
            WITH RECURSIVE ciclos_da_operacao AS (
                SELECT id_ciclo AS destino, id_ciclo AS origem
                FROM ciclos_veiculo
                WHERE id_veiculo = :id_veiculo_custos
                UNION DISTINCT
                SELECT anterior.destino, retorno.id_ciclo_origem
                FROM cancelamentos_venda_autoflux retorno
                JOIN ciclos_da_operacao anterior ON anterior.origem = retorno.id_ciclo_retorno
                WHERE retorno.id_ciclo_origem < retorno.id_ciclo_retorno
            )
            SELECT
                ciclo.id_ciclo,
                ciclo.nosso_numero,
                ciclo.origem_entrada,
                ciclo.origem_movimento,
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
                        WHERE despesa.ativo = 1
                              AND (
                                  despesa.id_ciclo = ciclo.id_ciclo
                                  OR (
                                      despesa.id_ciclo IN (
                                          SELECT origem FROM ciclos_da_operacao
                                          WHERE destino = ciclo.id_ciclo AND origem <> destino
                                      )
                                      AND (
                                          despesa.responsavel_despesa = 'Revenda'
                                          OR (
                                              despesa.responsavel_despesa IS NULL
                                              AND EXISTS (
                                                  SELECT 1 FROM ciclos_veiculo origem_despesa
                                                  WHERE origem_despesa.id_ciclo = despesa.id_ciclo
                                                    AND origem_despesa.origem_entrada <> 'Consignação'
                                              )
                                          )
                                      )
                                  )
                              )
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
                            WHERE despesa.ativo = 1
                              AND (
                                  despesa.id_ciclo = ciclo.id_ciclo
                                  OR (
                                      despesa.id_ciclo IN (
                                          SELECT origem FROM ciclos_da_operacao
                                          WHERE destino = ciclo.id_ciclo AND origem <> destino
                                      )
                                      AND (
                                          despesa.responsavel_despesa = 'Revenda'
                                          OR (
                                              despesa.responsavel_despesa IS NULL
                                              AND EXISTS (
                                                  SELECT 1 FROM ciclos_veiculo origem_despesa
                                                  WHERE origem_despesa.id_ciclo = despesa.id_ciclo
                                                    AND origem_despesa.origem_entrada <> 'Consignação'
                                              )
                                          )
                                      )
                                  )
                              )
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
                            WHERE despesa.ativo = 1
                              AND (
                                  despesa.id_ciclo = ciclo.id_ciclo
                                  OR (
                                      despesa.id_ciclo IN (
                                          SELECT origem FROM ciclos_da_operacao
                                          WHERE destino = ciclo.id_ciclo AND origem <> destino
                                      )
                                      AND (
                                          despesa.responsavel_despesa = 'Revenda'
                                          OR (
                                              despesa.responsavel_despesa IS NULL
                                              AND EXISTS (
                                                  SELECT 1 FROM ciclos_veiculo origem_despesa
                                                  WHERE origem_despesa.id_ciclo = despesa.id_ciclo
                                                    AND origem_despesa.origem_entrada <> 'Consignação'
                                              )
                                          )
                                      )
                                  )
                              )
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
            "id_veiculo_custos" => $idVeiculo,
        ]);

        return $comando->fetchAll(
            PDO::FETCH_ASSOC
        );
    }
}