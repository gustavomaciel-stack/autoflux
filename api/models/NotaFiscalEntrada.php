<?php

declare(strict_types=1);

final class NotaFiscalEntrada
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
    }

    public function listarTodos(): array
    {
        $sql = $this->sqlConsultaCompleta() . "
            ORDER BY
                nf.data_entrada DESC,
                nf.id_nota_fiscal_entrada DESC
        ";

        $comando = $this->conexao->query($sql);

        return $comando->fetchAll(PDO::FETCH_ASSOC);
    }

    public function buscarPorId(
        int $idNotaFiscalEntrada
    ): array|false {
        $sql = $this->sqlConsultaCompleta() . "
            WHERE nf.id_nota_fiscal_entrada =
                :id_nota_fiscal_entrada
            LIMIT 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_nota_fiscal_entrada" =>
                $idNotaFiscalEntrada,
        ]);

        return $comando->fetch(PDO::FETCH_ASSOC);
    }

    private function sqlConsultaCompleta(): string
    {
        return "
            SELECT
                nf.id_nota_fiscal_entrada,
                nf.id_aquisicao,
                nf.id_fornecedor_origem,
                nf.nome_fornecedor_avulso,
                nf.id_cliente_origem,
                nf.id_ciclo,
                nf.id_veiculo,
                nf.descricao_item,
                nf.id_usuario_responsavel,
                nf.numero_nota,
                nf.serie,
                nf.chave_acesso,
                nf.data_emissao,
                nf.valor_total,
                nf.natureza_operacao,
                nf.observacoes,
                nf.data_entrada,
                nf.data_cadastro,
                nf.data_atualizacao,

                v.marca,
                v.modelo,
                v.versao,
                v.placa,
                v.chassi,
                v.ano_fabricacao,
                v.ano_modelo,

                c.nosso_numero,
                c.situacao_atual,

                a.valor_aquisicao,
                a.data_aquisicao,
                a.origem AS origem_aquisicao,

                u.nome AS usuario_responsavel,

                CASE
                    WHEN nf.id_fornecedor_origem
                        IS NOT NULL
                        THEN 'Fornecedor cadastrado'

                    WHEN nf.id_cliente_origem
                        IS NOT NULL
                        THEN 'Cliente cadastrado'

                    ELSE 'Pessoa particular'
                END AS tipo_origem,

                COALESCE(
                    f.razao_social_nome,
                    nf.nome_fornecedor_avulso,
                    cli.nome_razao_social
                ) AS nome_origem,

                CASE
                    WHEN f.cnpj IS NOT NULL
                        THEN f.cnpj

                    WHEN f.cpf IS NOT NULL
                        THEN f.cpf

                    WHEN cli.cnpj IS NOT NULL
                        THEN cli.cnpj

                    WHEN cli.cpf IS NOT NULL
                        THEN cli.cpf

                    ELSE NULL
                END AS documento_origem

            FROM notas_fiscais_entrada nf

            INNER JOIN veiculos v
                ON v.id_veiculo = nf.id_veiculo

            INNER JOIN ciclos_veiculo c
                ON c.id_ciclo = nf.id_ciclo

            LEFT JOIN aquisicoes a
                ON a.id_aquisicao = nf.id_aquisicao

            LEFT JOIN usuarios u
                ON u.id_usuario =
                    nf.id_usuario_responsavel

            LEFT JOIN fornecedores f
                ON f.id_fornecedor =
                    nf.id_fornecedor_origem

            LEFT JOIN clientes cli
                ON cli.id_cliente =
                    nf.id_cliente_origem
        ";
    }
}