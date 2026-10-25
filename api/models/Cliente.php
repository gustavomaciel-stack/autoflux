<?php

declare(strict_types=1);

final class Cliente
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
    }

    public function listar(): array
    {
        $sql = "
            SELECT
                id_cliente,
                tipo_pessoa,
                nome_razao_social,
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
                observacoes,
                data_cadastro,
                data_atualizacao,
                ativo
            FROM clientes
            ORDER BY nome_razao_social ASC
        ";

        $consulta = $this->conexao->query($sql);

        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }

    public function buscarPorId(int $idCliente): ?array
    {
        $sql = "
            SELECT
                id_cliente,
                tipo_pessoa,
                nome_razao_social,
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
                observacoes,
                data_cadastro,
                data_atualizacao,
                ativo
            FROM clientes
            WHERE id_cliente = :id_cliente
            LIMIT 1
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':id_cliente' => $idCliente,
        ]);

        $cliente = $consulta->fetch(PDO::FETCH_ASSOC);

        return $cliente !== false ? $cliente : null;
    }

    public function buscarPorDocumento(
        ?string $cpf,
        ?string $cnpj
    ): ?array {
        if ($cpf !== null && $cpf !== '') {
            $sql = "
                SELECT *
                FROM clientes
                WHERE cpf = :documento
                LIMIT 1
            ";

            $consulta = $this->conexao->prepare($sql);

            $consulta->execute([
                ':documento' => $cpf,
            ]);

            $cliente = $consulta->fetch(PDO::FETCH_ASSOC);

            return $cliente !== false ? $cliente : null;
        }

        if ($cnpj !== null && $cnpj !== '') {
            $sql = "
                SELECT *
                FROM clientes
                WHERE cnpj = :documento
                LIMIT 1
            ";

            $consulta = $this->conexao->prepare($sql);

            $consulta->execute([
                ':documento' => $cnpj,
            ]);

            $cliente = $consulta->fetch(PDO::FETCH_ASSOC);

            return $cliente !== false ? $cliente : null;
        }

        return null;
    }

    public function cadastrar(array $dados): int
    {
        $sql = "
            INSERT INTO clientes (
                tipo_pessoa,
                nome_razao_social,
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
                observacoes,
                ativo
            ) VALUES (
                :tipo_pessoa,
                :nome_razao_social,
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
                :observacoes,
                :ativo
            )
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':tipo_pessoa' => $dados['tipo_pessoa'],
            ':nome_razao_social' => $dados['nome_razao_social'],
            ':nome_fantasia' => $dados['nome_fantasia'] ?? null,
            ':cpf' => $dados['cpf'] ?? null,
            ':cnpj' => $dados['cnpj'] ?? null,
            ':telefone' => $dados['telefone'],
            ':email' => $dados['email'] ?? null,
            ':cep' => $dados['cep'] ?? null,
            ':logradouro' => $dados['logradouro'] ?? null,
            ':numero' => $dados['numero'] ?? null,
            ':complemento' => $dados['complemento'] ?? null,
            ':bairro' => $dados['bairro'] ?? null,
            ':cidade' => $dados['cidade'] ?? null,
            ':estado' => $dados['estado'] ?? null,
            ':observacoes' => $dados['observacoes'] ?? null,
            ':ativo' => $dados['ativo'] ?? 1,
        ]);

        return (int) $this->conexao->lastInsertId();
    }

    public function atualizar(
        int $idCliente,
        array $dados
    ): bool {
        $sql = "
            UPDATE clientes
            SET
                tipo_pessoa = :tipo_pessoa,
                nome_razao_social = :nome_razao_social,
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
                observacoes = :observacoes,
                ativo = :ativo
            WHERE id_cliente = :id_cliente
        ";

        $consulta = $this->conexao->prepare($sql);

        return $consulta->execute([
            ':id_cliente' => $idCliente,
            ':tipo_pessoa' => $dados['tipo_pessoa'],
            ':nome_razao_social' => $dados['nome_razao_social'],
            ':nome_fantasia' => $dados['nome_fantasia'] ?? null,
            ':cpf' => $dados['cpf'] ?? null,
            ':cnpj' => $dados['cnpj'] ?? null,
            ':telefone' => $dados['telefone'],
            ':email' => $dados['email'] ?? null,
            ':cep' => $dados['cep'] ?? null,
            ':logradouro' => $dados['logradouro'] ?? null,
            ':numero' => $dados['numero'] ?? null,
            ':complemento' => $dados['complemento'] ?? null,
            ':bairro' => $dados['bairro'] ?? null,
            ':cidade' => $dados['cidade'] ?? null,
            ':estado' => $dados['estado'] ?? null,
            ':observacoes' => $dados['observacoes'] ?? null,
            ':ativo' => $dados['ativo'] ?? 1,
        ]);
    }

    public function alterarSituacao(int $idCliente, int $ativo): void
    {
        $consulta = $this->conexao->prepare('UPDATE clientes SET ativo = :ativo WHERE id_cliente = :id');
        $consulta->execute(['ativo' => $ativo, 'id' => $idCliente]);
    }

    public function documentoJaCadastrado(
        string $documento,
        ?int $ignorarIdCliente = null
    ): bool {
        $sql = "
            SELECT id_cliente
            FROM clientes
            WHERE (cpf = :cpf OR cnpj = :cnpj)
        ";

        $parametros = [
            ':cpf' => $documento,
            ':cnpj' => $documento,
        ];

        if ($ignorarIdCliente !== null) {
            $sql .= " AND id_cliente <> :id_cliente";

            $parametros[':id_cliente'] = $ignorarIdCliente;
        }

        $sql .= " LIMIT 1";

        $consulta = $this->conexao->prepare($sql);
        $consulta->execute($parametros);

        return $consulta->fetch(PDO::FETCH_ASSOC) !== false;
    }
}