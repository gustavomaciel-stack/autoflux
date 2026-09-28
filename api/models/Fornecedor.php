<?php

declare(strict_types=1);

final class Fornecedor
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
    }

    public function listarTodos(): array
    {
        $sql = "
            SELECT
                id_fornecedor,
                tipo_pessoa,
                razao_social_nome,
                nome_fantasia,
                cpf,
                cnpj,
                telefone,
                email,
                cep,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                tipo_servico,
                observacoes,
                ativo,
                data_cadastro,
                data_atualizacao
            FROM fornecedores
            ORDER BY razao_social_nome
        ";

        $comando = $this->conexao->prepare($sql);
        $comando->execute();

        return $comando->fetchAll();
    }

    public function buscarPorId(int $idFornecedor): array|false
    {
        $sql = "
            SELECT *
            FROM fornecedores
            WHERE id_fornecedor = :id_fornecedor
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_fornecedor" => $idFornecedor
        ]);

        return $comando->fetch();
    }

    public function cadastrar(array $dados): int
    {
        $sql = "
            INSERT INTO fornecedores (
                tipo_pessoa,
                razao_social_nome,
                nome_fantasia,
                cpf,
                cnpj,
                telefone,
                email,
                cep,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                tipo_servico,
                observacoes
            ) VALUES (
                :tipo_pessoa,
                :razao_social_nome,
                :nome_fantasia,
                :cpf,
                :cnpj,
                :telefone,
                :email,
                :cep,
                :logradouro,
                :numero,
                :complemento,
                :bairro,
                :cidade,
                :estado,
                :tipo_servico,
                :observacoes
            )
        ";

        $comando = $this->conexao->prepare($sql);
        $comando->execute($dados);

        return (int) $this->conexao->lastInsertId();
    }

    public function atualizar(
        int $idFornecedor,
        array $dados
    ): bool {
        $sql = "
            UPDATE fornecedores
            SET
                tipo_pessoa = :tipo_pessoa,
                razao_social_nome = :razao_social_nome,
                nome_fantasia = :nome_fantasia,
                cpf = :cpf,
                cnpj = :cnpj,
                telefone = :telefone,
                email = :email,
                cep = :cep,
                logradouro = :logradouro,
                numero = :numero,
                complemento = :complemento,
                bairro = :bairro,
                cidade = :cidade,
                estado = :estado,
                tipo_servico = :tipo_servico,
                observacoes = :observacoes
            WHERE id_fornecedor = :id_fornecedor
        ";

        $dados["id_fornecedor"] = $idFornecedor;

        $comando = $this->conexao->prepare($sql);

        return $comando->execute($dados);
    }

    public function alterarSituacao(
        int $idFornecedor,
        bool $ativo
    ): bool {
        $sql = "
            UPDATE fornecedores
            SET ativo = :ativo
            WHERE id_fornecedor = :id_fornecedor
        ";

        $comando = $this->conexao->prepare($sql);

        return $comando->execute([
            "ativo" => $ativo ? 1 : 0,
            "id_fornecedor" => $idFornecedor
        ]);
    }
}