<?php

declare(strict_types=1);

final class ClienteController
{
    private Cliente $cliente;

    public function __construct(Cliente $cliente)
    {
        $this->cliente = $cliente;
    }

    public function listar(): array
    {
        return [
            'sucesso' => true,
            'dados' => $this->cliente->listar(),
        ];
    }

    public function buscarPorId(int $idCliente): array
    {
        if ($idCliente <= 0) {
            throw new InvalidArgumentException(
                'O identificador do cliente é inválido.'
            );
        }

        $cliente = $this->cliente->buscarPorId($idCliente);

        if ($cliente === null) {
            throw new RuntimeException(
                'Cliente não encontrado.'
            );
        }

        return [
            'sucesso' => true,
            'dados' => $cliente,
        ];
    }

    public function cadastrar(array $dadosRecebidos): array
    {
        $dados = $this->validarEPrepararDados($dadosRecebidos);

        $documento = $dados['tipo_pessoa'] === 'PF'
            ? $dados['cpf']
            : $dados['cnpj'];

        if (
            $documento !== null
            && $this->cliente->documentoJaCadastrado($documento)
        ) {
            throw new InvalidArgumentException(
                'Já existe um cliente cadastrado com este documento.'
            );
        }

        try {
            $idCliente = $this->cliente->cadastrar($dados);
        } catch (PDOException $erro) {
            if ($erro->getCode() === '23000') {
                throw new InvalidArgumentException(
                    'Já existe um cliente cadastrado com este CPF ou CNPJ.'
                );
            }

            throw $erro;
        }

        $clienteCadastrado = $this->cliente->buscarPorId($idCliente);

        return [
            'sucesso' => true,
            'mensagem' => 'Cliente cadastrado com sucesso.',
            'dados' => $clienteCadastrado,
        ];
    }

    public function atualizar(
        int $idCliente,
        array $dadosRecebidos
    ): array {
        if ($idCliente <= 0) {
            throw new InvalidArgumentException(
                'O identificador do cliente é inválido.'
            );
        }

        $clienteExistente = $this->cliente->buscarPorId($idCliente);

        if ($clienteExistente === null) {
            throw new RuntimeException(
                'Cliente não encontrado.'
            );
        }

        $dados = $this->validarEPrepararDados($dadosRecebidos);

        $documento = $dados['tipo_pessoa'] === 'PF'
            ? $dados['cpf']
            : $dados['cnpj'];

        if (
            $documento !== null
            && $this->cliente->documentoJaCadastrado(
                $documento,
                $idCliente
            )
        ) {
            throw new InvalidArgumentException(
                'Já existe outro cliente cadastrado com este documento.'
            );
        }

        try {
            $this->cliente->atualizar($idCliente, $dados);
        } catch (PDOException $erro) {
            if ($erro->getCode() === '23000') {
                throw new InvalidArgumentException(
                    'Já existe outro cliente cadastrado com este CPF ou CNPJ.'
                );
            }

            throw $erro;
        }

        return [
            'sucesso' => true,
            'mensagem' => 'Cliente atualizado com sucesso.',
            'dados' => $this->cliente->buscarPorId($idCliente),
        ];
    }

    private function validarEPrepararDados(
        array $dadosRecebidos
    ): array {
        $tipoPessoa = strtoupper(
            trim((string) ($dadosRecebidos['tipo_pessoa'] ?? ''))
        );

        $nomeRazaoSocial = trim(
            (string) ($dadosRecebidos['nome_razao_social'] ?? '')
        );

        $nomeFantasia = $this->textoOuNulo(
            $dadosRecebidos['nome_fantasia'] ?? null
        );

        $cpf = $this->somenteNumerosOuNulo(
            $dadosRecebidos['cpf'] ?? null
        );

        $cnpj = $this->somenteNumerosOuNulo(
            $dadosRecebidos['cnpj'] ?? null
        );

        $telefone = preg_replace(
            '/\D+/',
            '',
            (string) ($dadosRecebidos['telefone'] ?? '')
        );

        $email = $this->textoOuNulo(
            $dadosRecebidos['email'] ?? null
        );

        $cep = $this->somenteNumerosOuNulo(
            $dadosRecebidos['cep'] ?? null
        );

        $logradouro = $this->textoOuNulo(
            $dadosRecebidos['logradouro'] ?? null
        );

        $numero = $this->textoOuNulo(
            $dadosRecebidos['numero'] ?? null
        );

        $complemento = $this->textoOuNulo(
            $dadosRecebidos['complemento'] ?? null
        );

        $bairro = $this->textoOuNulo(
            $dadosRecebidos['bairro'] ?? null
        );

        $cidade = $this->textoOuNulo(
            $dadosRecebidos['cidade'] ?? null
        );

        $estadoRecebido = $this->textoOuNulo(
            $dadosRecebidos['estado'] ?? null
        );

        $estado = $estadoRecebido !== null
            ? strtoupper($estadoRecebido)
            : null;

        $observacoes = $this->textoOuNulo(
            $dadosRecebidos['observacoes'] ?? null
        );

        if (!in_array($tipoPessoa, ['PF', 'PJ'], true)) {
            throw new InvalidArgumentException(
                'O tipo de pessoa deve ser PF ou PJ.'
            );
        }

        if ($nomeRazaoSocial === '') {
            throw new InvalidArgumentException(
                'O nome ou razão social é obrigatório.'
            );
        }

        if (strlen($nomeRazaoSocial) > 150) {
            throw new InvalidArgumentException(
                'O nome ou razão social deve possuir no máximo 150 caracteres.'
            );
        }

        if (
            $nomeFantasia !== null
            && strlen($nomeFantasia) > 150
        ) {
            throw new InvalidArgumentException(
                'O nome fantasia deve possuir no máximo 150 caracteres.'
            );
        }

        if ($telefone === null || $telefone === '') {
            throw new InvalidArgumentException(
                'O telefone é obrigatório.'
            );
        }

        if (
            strlen($telefone) < 10
            || strlen($telefone) > 20
        ) {
            throw new InvalidArgumentException(
                'Informe um telefone válido com DDD.'
            );
        }

        if ($tipoPessoa === 'PF') {
            if ($cpf === null || strlen($cpf) !== 11) {
                throw new InvalidArgumentException(
                    'Para pessoa física, informe um CPF com 11 números.'
                );
            }

            $cnpj = null;
        }

        if ($tipoPessoa === 'PJ') {
            if ($cnpj === null || strlen($cnpj) !== 14) {
                throw new InvalidArgumentException(
                    'Para pessoa jurídica, informe um CNPJ com 14 números.'
                );
            }

            $cpf = null;
        }

        if (
            $email !== null
            && !filter_var($email, FILTER_VALIDATE_EMAIL)
        ) {
            throw new InvalidArgumentException(
                'Informe um endereço de e-mail válido.'
            );
        }

        if ($cep !== null && strlen($cep) !== 8) {
            throw new InvalidArgumentException(
                'O CEP deve possuir 8 números.'
            );
        }

        if ($estado !== null && strlen($estado) !== 2) {
            throw new InvalidArgumentException(
                'O estado deve ser informado com a sigla de duas letras.'
            );
        }

        if ($numero !== null && strlen($numero) > 10) {
            throw new InvalidArgumentException(
                'O número do endereço deve possuir no máximo 10 caracteres.'
            );
        }

        return [
            'tipo_pessoa' => $tipoPessoa,
            'nome_razao_social' => $nomeRazaoSocial,
            'nome_fantasia' => $nomeFantasia,
            'cpf' => $cpf,
            'cnpj' => $cnpj,
            'telefone' => $telefone,
            'email' => $email,
            'cep' => $cep,
            'logradouro' => $logradouro,
            'numero' => $numero,
            'complemento' => $complemento,
            'bairro' => $bairro,
            'cidade' => $cidade,
            'estado' => $estado,
            'observacoes' => $observacoes,
        ];
    }

    private function textoOuNulo(mixed $valor): ?string
    {
        if ($valor === null) {
            return null;
        }

        $texto = trim((string) $valor);

        return $texto !== '' ? $texto : null;
    }

    private function somenteNumerosOuNulo(
        mixed $valor
    ): ?string {
        if ($valor === null) {
            return null;
        }

        $numeros = preg_replace(
            '/\D+/',
            '',
            (string) $valor
        );

        return $numeros !== '' ? $numeros : null;
    }
}