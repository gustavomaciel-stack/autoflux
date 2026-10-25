<?php

declare(strict_types=1);

require_once __DIR__ . "/../config/Cnpj.php";

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

        $dadosRecebidos['ativo'] ??= $clienteExistente['ativo'];
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

    public function alterarSituacao(int $idCliente, mixed $ativo): array
    {
        if ($this->cliente->buscarPorId($idCliente) === null) {
            throw new RuntimeException('Cliente não encontrado.');
        }
        if (!in_array($ativo, [0, 1, '0', '1', false, true], true)) {
            throw new InvalidArgumentException('Situação do cliente inválida.');
        }
        $this->cliente->alterarSituacao($idCliente, (int) $ativo);
        return ['sucesso' => true, 'mensagem' => (int) $ativo === 1 ? 'Cliente reativado.' : 'Cliente inativado.',
            'dados' => $this->cliente->buscarPorId($idCliente)];
    }

    private function documentoValido(string $documento, string $tipo): bool
    {
        if ($tipo === 'PJ') return Cnpj::valido($documento);
        if (!preg_match('/^[0-9]{11}$/D', $documento) || preg_match('/^([0-9])\1{10}$/D', $documento)) return false;
        for ($n = 9; $n < 11; $n++) {
            $soma = 0;
            for ($i = 0; $i < $n; $i++) $soma += (int) $documento[$i] * ($n + 1 - $i);
            $digito = ($soma * 10) % 11;
            if ($digito === 10) $digito = 0;
            if ($digito !== (int) $documento[$n]) return false;
        }
        return true;
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

        foreach (['cpf'] as $campoDocumento) {
            if (preg_match('/[^0-9.\/\-\s]/', (string) ($dadosRecebidos[$campoDocumento] ?? ''))) {
                throw new InvalidArgumentException('Informe o CPF com números e pontuação válida.');
            }
        }

        $cpf = $this->somenteNumerosOuNulo(
            $dadosRecebidos['cpf'] ?? null
        );

        $cnpjNormalizado = Cnpj::normalizar((string) ($dadosRecebidos['cnpj'] ?? ''));
        $cnpj = $cnpjNormalizado !== '' ? $cnpjNormalizado : null;

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

        if (mb_strlen($nomeRazaoSocial, 'UTF-8') > 150) {
            throw new InvalidArgumentException(
                'O nome ou razão social deve possuir no máximo 150 caracteres.'
            );
        }

        if (
            $nomeFantasia !== null
            && mb_strlen($nomeFantasia, 'UTF-8') > 150
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
            if ($cpf === null || !$this->documentoValido($cpf, 'PF')) {
                throw new InvalidArgumentException(
                    'Para pessoa física, informe um CPF válido.'
                );
            }

            $cnpj = null;
            $nomeFantasia = null;
        }

        if ($tipoPessoa === 'PJ') {
            if ($cnpj === null || !$this->documentoValido($cnpj, 'PJ')) {
                throw new InvalidArgumentException(
                    'CNPJ inválido. Informe 12 letras/números e 2 dígitos verificadores corretos (ex.: 12.ABC.345/01DE-35).'
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

        foreach (['email' => 150, 'logradouro' => 150, 'complemento' => 100, 'bairro' => 80, 'cidade' => 80] as $campo => $limite) {
            $valor = $$campo;
            if ($valor !== null && mb_strlen($valor, 'UTF-8') > $limite) {
                throw new InvalidArgumentException('O campo ' . $campo . ' excede o tamanho permitido.');
            }
        }

        if ($estado !== null && !in_array($estado, ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'], true)) {
            throw new InvalidArgumentException(
                'O estado deve ser informado com a sigla de duas letras.'
            );
        }

        if ($numero !== null && strlen($numero) > 10) {
            throw new InvalidArgumentException(
                'O número do endereço deve possuir no máximo 10 caracteres.'
            );
        }

        $ativo = $dadosRecebidos['ativo'] ?? 1;
        if (!in_array($ativo, [0, 1, '0', '1', false, true], true)) {
            throw new InvalidArgumentException('Situação do cliente inválida.');
        }
        return [
            'ativo' => (int) $ativo,
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