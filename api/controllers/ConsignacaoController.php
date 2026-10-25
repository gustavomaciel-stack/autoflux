<?php

declare(strict_types=1);

final class ConsignacaoController
{
    private Consignacao $consignacao;

    public function __construct(
        Consignacao $consignacao
    ) {
        $this->consignacao = $consignacao;
    }

    public function historicoRepasse(int $idConsignacao): array
    {
        return ['sucesso' => true, 'dados' => $this->consignacao->listarHistoricoRepasse($idConsignacao)];
    }

    public function alterarRepasse(int $idConsignacao, array $dados): array
    {
        $motivo = trim((string) ($dados['motivo'] ?? ''));
        if (!preg_match('/^.{1,250}$/us', $motivo)) {
            throw new InvalidArgumentException('Informe o motivo da alteração (até 250 caracteres).');
        }
        $valor = $this->validarValorEdicaoRepasse($dados['valor_repasse_acordado'] ?? null);
        if ($valor === '0.00') {
            throw new InvalidArgumentException('O repasse deve ser maior que zero.');
        }
        if (!array_key_exists('valor_anterior', $dados)) {
            throw new InvalidArgumentException('Atualize os detalhes antes de alterar o repasse.');
        }
        $esperado = $dados['valor_anterior'] === null
            ? null : $this->validarValorEdicaoRepasse($dados['valor_anterior']);
        $usuario = Auth::usuario();
        return [
            'sucesso' => true,
            'mensagem' => 'Repasse atualizado e alteração registrada no histórico.',
            'dados' => $this->consignacao->alterarRepasse(
                $idConsignacao, (int) $usuario['id_usuario'], $valor, $motivo, $esperado
            ),
        ];
    }

    private function validarValorEdicaoRepasse(mixed $valor): string
    {
        if (!is_string($valor) && !is_int($valor) && !is_float($valor)) {
            throw new InvalidArgumentException('Informe um valor de repasse válido.');
        }
        $texto = str_replace(',', '.', trim((string) $valor));
        if (!preg_match('/^([0-9]{1,10})(?:\.([0-9]{1,2}))?$/', $texto, $partes)) {
            throw new InvalidArgumentException('Informe um valor sem separador de milhar e com até duas casas decimais.');
        }
        $inteiro = ltrim($partes[1], '0');
        return ($inteiro === '' ? '0' : $inteiro) . '.' . str_pad($partes[2] ?? '', 2, '0');
    }

    public function listar(): array
    {
        return [
            'sucesso' => true,
            'dados' => $this->consignacao->listar(),
        ];
    }

    public function buscarPorId(
        int $idConsignacao
    ): array {
        if ($idConsignacao <= 0) {
            throw new InvalidArgumentException(
                'O identificador da consignação é inválido.'
            );
        }

        $consignacao =
            $this->consignacao->buscarPorId(
                $idConsignacao
            );

        if ($consignacao === null) {
            throw new RuntimeException(
                'Consignação não encontrada.'
            );
        }

        return [
            'sucesso' => true,
            'dados' => $consignacao,
        ];
    }

    public function cadastrar(
        array $dadosRecebidos
    ): array {
        $dados = $this->validarCadastro(
            $dadosRecebidos
        );

        $consignacao =
            $this->consignacao->cadastrar($dados);

        return [
            'sucesso' => true,
            'mensagem' =>
                'Veículo consignado cadastrado com sucesso.',
            'dados' => $consignacao,
        ];
    }

    public function registrarDevolucao(
        int $idConsignacao,
        array $dadosRecebidos
    ): array {
        if ($idConsignacao <= 0) {
            throw new InvalidArgumentException(
                'O identificador da consignação é inválido.'
            );
        }

        $idUsuarioResponsavel = filter_var(
            $dadosRecebidos['id_usuario_responsavel'] ?? null,
            FILTER_VALIDATE_INT
        );

        $dataSaida = trim(
            (string) ($dadosRecebidos['data_saida'] ?? '')
        );

        $motivoSaida = trim(
            (string) ($dadosRecebidos['motivo_saida'] ?? '')
        );

        if (
            $idUsuarioResponsavel === false ||
            $idUsuarioResponsavel === null ||
            $idUsuarioResponsavel <= 0
        ) {
            throw new InvalidArgumentException(
                'Informe o usuário responsável pela devolução.'
            );
        }

        $this->validarData(
            $dataSaida,
            'A data de saída é inválida.'
        );

        if ($motivoSaida === '') {
            throw new InvalidArgumentException(
                'Informe o motivo da devolução.'
            );
        }

        if (strlen($motivoSaida) > 255) {
            throw new InvalidArgumentException(
                'O motivo da devolução deve possuir no máximo 255 caracteres.'
            );
        }

        $consignacao =
            $this->consignacao->registrarDevolucao(
                $idConsignacao,
                $idUsuarioResponsavel,
                $dataSaida,
                $motivoSaida
            );

        return [
            'sucesso' => true,
            'mensagem' =>
                'Devolução registrada com sucesso.',
            'dados' => $consignacao,
        ];
    }

    private function validarCadastro(
        array $dadosRecebidos
    ): array {
        $idProprietario = filter_var(
            $dadosRecebidos['id_proprietario'] ?? null,
            FILTER_VALIDATE_INT
        );

        $idUsuarioResponsavel = filter_var(
            $dadosRecebidos['id_usuario_responsavel'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (
            $idProprietario === false ||
            $idProprietario === null ||
            $idProprietario <= 0
        ) {
            throw new InvalidArgumentException(
                'Informe o proprietário do veículo.'
            );
        }

        if (
            $idUsuarioResponsavel === false ||
            $idUsuarioResponsavel === null ||
            $idUsuarioResponsavel <= 0
        ) {
            throw new InvalidArgumentException(
                'Informe o usuário responsável.'
            );
        }

        $marca = $this->campoObrigatorio(
            $dadosRecebidos,
            'marca',
            'A marca do veículo é obrigatória.'
        );

        $modelo = $this->campoObrigatorio(
            $dadosRecebidos,
            'modelo',
            'O modelo do veículo é obrigatório.'
        );

        $versao = $this->textoOuNulo(
            $dadosRecebidos['versao'] ?? null
        );

        $anoFabricacao = trim(
            (string) ($dadosRecebidos['ano_fabricacao'] ?? '')
        );

        $anoModelo = trim(
            (string) ($dadosRecebidos['ano_modelo'] ?? '')
        );

        $combustivel = $this->campoObrigatorio(
            $dadosRecebidos,
            'combustivel',
            'O combustível é obrigatório.'
        );

        $placa = strtoupper(
            preg_replace(
                '/[^A-Za-z0-9]/',
                '',
                (string) ($dadosRecebidos['placa'] ?? '')
            )
        );

        $chassi = strtoupper(
            preg_replace(
                '/[^A-Za-z0-9]/',
                '',
                (string) ($dadosRecebidos['chassi'] ?? '')
            )
        );

        $renavam = $this->somenteNumerosOuNulo(
            $dadosRecebidos['renavam'] ?? null
        );

        $cor = $this->campoObrigatorio(
            $dadosRecebidos,
            'cor',
            'A cor do veículo é obrigatória.'
        );

        $quilometragem = $this->inteiroOuNulo(
            $dadosRecebidos['quilometragem_entrada'] ?? null,
            'A quilometragem deve ser um número inteiro positivo.'
        );

        $horimetro = $this->inteiroOuNulo(
            $dadosRecebidos['horimetro_entrada'] ?? null,
            'O horímetro deve ser um número inteiro positivo.'
        );

        $dataEntrada = trim(
            (string) ($dadosRecebidos['data_entrada'] ?? '')
        );

        $numeroNota = $this->campoObrigatorio(
            $dadosRecebidos,
            'numero_nota',
            'O número da Nota Fiscal de Entrada é obrigatório.'
        );

        $serie = $this->campoObrigatorio(
            $dadosRecebidos,
            'serie',
            'A série da Nota Fiscal de Entrada é obrigatória.'
        );

        $chaveAcesso = $this->somenteNumerosOuNulo(
            $dadosRecebidos['chave_acesso'] ?? null
        );

        $dataEmissao = trim(
            (string) ($dadosRecebidos['data_emissao'] ?? '')
        );

        $valorTotal = $this->normalizarValor(
            $dadosRecebidos['valor_total'] ?? null
        );

        $valorRepasseAcordado =
            $this->normalizarValorRepasse(
                $dadosRecebidos['valor_repasse_acordado'] ?? null
            );

        // A responsabilidade passa a ser registrada em cada despesa.
        $responsavelDespesas = null;

        $dataAcordo = trim(
            (string) ($dadosRecebidos['data_acordo'] ?? '')
        );

        $naturezaOperacao =
            $this->textoOuNulo(
                $dadosRecebidos['natureza_operacao'] ?? null
            ) ?? 'Entrada de veículo em consignação';

        $observacoesVeiculo = $this->textoOuNulo(
            $dadosRecebidos['observacoes_veiculo'] ?? null
        );

        $observacoesNota = $this->textoOuNulo(
            $dadosRecebidos['observacoes_nota'] ?? null
        );

        $observacoesConsignacao = $this->textoOuNulo(
            $dadosRecebidos['observacoes_consignacao'] ?? null
        );

        if (strlen($marca) > 60) {
            throw new InvalidArgumentException(
                'A marca deve possuir no máximo 60 caracteres.'
            );
        }

        if (strlen($modelo) > 80) {
            throw new InvalidArgumentException(
                'O modelo deve possuir no máximo 80 caracteres.'
            );
        }

        if (
            $versao !== null &&
            strlen($versao) > 100
        ) {
            throw new InvalidArgumentException(
                'A versão deve possuir no máximo 100 caracteres.'
            );
        }

        $this->validarAno(
            $anoFabricacao,
            'O ano de fabricação é inválido.'
        );

        $this->validarAno(
            $anoModelo,
            'O ano do modelo é inválido.'
        );

        if (strlen($combustivel) > 30) {
            throw new InvalidArgumentException(
                'O combustível deve possuir no máximo 30 caracteres.'
            );
        }

        if (strlen($placa) !== 7) {
            throw new InvalidArgumentException(
                'A placa deve possuir 7 caracteres.'
            );
        }

        if (strlen($chassi) !== 17) {
            throw new InvalidArgumentException(
                'O chassi deve possuir 17 caracteres.'
            );
        }

        if (
            $renavam !== null &&
            strlen($renavam) !== 11
        ) {
            throw new InvalidArgumentException(
                'O RENAVAM deve possuir 11 números.'
            );
        }

        if (strlen($cor) > 30) {
            throw new InvalidArgumentException(
                'A cor deve possuir no máximo 30 caracteres.'
            );
        }

        $this->validarData(
            $dataEntrada,
            'A data de entrada é inválida.'
        );

        $this->validarData(
            $dataEmissao,
            'A data de emissão é inválida.'
        );

        $this->validarData(
            $dataAcordo,
            'A data do acordo é inválida.'
        );

        if (strlen($numeroNota) > 20) {
            throw new InvalidArgumentException(
                'O número da nota deve possuir no máximo 20 caracteres.'
            );
        }

        if (strlen($serie) > 10) {
            throw new InvalidArgumentException(
                'A série deve possuir no máximo 10 caracteres.'
            );
        }

        if (
            $chaveAcesso !== null &&
            strlen($chaveAcesso) !== 44
        ) {
            throw new InvalidArgumentException(
                'A chave de acesso deve possuir 44 números.'
            );
        }

        if (strlen($naturezaOperacao) > 100) {
            throw new InvalidArgumentException(
                'A natureza da operação deve possuir no máximo 100 caracteres.'
            );
        }

        $descricaoItem = $this->textoOuNulo(
            $dadosRecebidos['descricao_item'] ?? null
        );

        if ($descricaoItem === null) {
            $descricaoItem = trim(
                $marca . ' ' .
                $modelo . ' ' .
                ($versao ?? '') .
                ', ano ' .
                $anoFabricacao .
                ', modelo ' .
                $anoModelo
            );
        }

        if (strlen($descricaoItem) > 255) {
            throw new InvalidArgumentException(
                'A descrição do item deve possuir no máximo 255 caracteres.'
            );
        }

        return [
            'id_proprietario' => (int) $idProprietario,
            'id_usuario_responsavel' =>
                (int) $idUsuarioResponsavel,

            'marca' => $marca,
            'modelo' => $modelo,
            'versao' => $versao,
            'ano_fabricacao' => $anoFabricacao,
            'ano_modelo' => $anoModelo,
            'combustivel' => $combustivel,
            'placa' => $placa,
            'chassi' => $chassi,
            'renavam' => $renavam,
            'cor' => $cor,
            'quilometragem_entrada' => $quilometragem,
            'horimetro_entrada' => $horimetro,
            'data_entrada' => $dataEntrada,

            'numero_nota' => $numeroNota,
            'serie' => $serie,
            'chave_acesso' => $chaveAcesso,
            'data_emissao' => $dataEmissao,
            'valor_total' => $valorTotal,
            'descricao_item' => $descricaoItem,
            'natureza_operacao' => $naturezaOperacao,

            'valor_repasse_acordado' =>
                $valorRepasseAcordado,
            'responsavel_despesas' =>
                $responsavelDespesas,
            'data_acordo' => $dataAcordo,

            'observacoes_veiculo' =>
                $observacoesVeiculo,
            'observacoes_nota' =>
                $observacoesNota,
            'observacoes_consignacao' =>
                $observacoesConsignacao,
        ];
    }

    private function campoObrigatorio(
        array $dados,
        string $campo,
        string $mensagem
    ): string {
        $valor = trim(
            (string) ($dados[$campo] ?? '')
        );

        if ($valor === '') {
            throw new InvalidArgumentException(
                $mensagem
            );
        }

        return $valor;
    }

    private function textoOuNulo(
        mixed $valor
    ): ?string {
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

    private function inteiroOuNulo(
        mixed $valor,
        string $mensagem
    ): ?int {
        if (
            $valor === null ||
            trim((string) $valor) === ''
        ) {
            return null;
        }

        $inteiro = filter_var(
            $valor,
            FILTER_VALIDATE_INT
        );

        if ($inteiro === false || $inteiro < 0) {
            throw new InvalidArgumentException(
                $mensagem
            );
        }

        return (int) $inteiro;
    }

    private function normalizarValor(
        mixed $valor
    ): string {
        if (
            $valor === null ||
            trim((string) $valor) === ''
        ) {
            throw new InvalidArgumentException(
                'O valor da Nota Fiscal de Entrada é obrigatório.'
            );
        }

        $texto = trim((string) $valor);
        $texto = str_replace(
            ['R$', ' '],
            '',
            $texto
        );

        if (
            str_contains($texto, '.') &&
            str_contains($texto, ',')
        ) {
            $texto = str_replace('.', '', $texto);
            $texto = str_replace(',', '.', $texto);
        } elseif (str_contains($texto, ',')) {
            $texto = str_replace(',', '.', $texto);
        }

        if (!is_numeric($texto)) {
            throw new InvalidArgumentException(
                'O valor da Nota Fiscal de Entrada é inválido.'
            );
        }

        $numero = (float) $texto;

        if ($numero < 0) {
            throw new InvalidArgumentException(
                'O valor da Nota Fiscal de Entrada não pode ser negativo.'
            );
        }

        return number_format(
            $numero,
            2,
            '.',
            ''
        );
    }

    private function normalizarValorRepasse(
        mixed $valor
    ): string {
        if (
            $valor === null ||
            trim((string) $valor) === ''
        ) {
            throw new InvalidArgumentException(
                'O valor de repasse acordado é obrigatório.'
            );
        }

        $texto = trim((string) $valor);
        $texto = str_replace(
            ['R$', ' '],
            '',
            $texto
        );

        if (
            str_contains($texto, '.') &&
            str_contains($texto, ',')
        ) {
            $texto = str_replace('.', '', $texto);
            $texto = str_replace(',', '.', $texto);
        } elseif (str_contains($texto, ',')) {
            $texto = str_replace(',', '.', $texto);
        }

        if (!is_numeric($texto)) {
            throw new InvalidArgumentException(
                'O valor de repasse acordado é inválido.'
            );
        }

        $numero = (float) $texto;

        if ($numero <= 0) {
            throw new InvalidArgumentException(
                'O valor de repasse acordado deve ser maior que zero.'
            );
        }

        return number_format(
            $numero,
            2,
            '.',
            ''
        );
    }

    private function validarAno(
        string $ano,
        string $mensagem
    ): void {
        if (
            !preg_match('/^\d{4}$/', $ano) ||
            (int) $ano < 1900 ||
            (int) $ano > 2100
        ) {
            throw new InvalidArgumentException(
                $mensagem
            );
        }
    }

    private function validarData(
        string $data,
        string $mensagem
    ): void {
        $dataValidada =
            DateTimeImmutable::createFromFormat(
                '!Y-m-d',
                $data
            );

        $erros = DateTimeImmutable::getLastErrors();

        if (
            $dataValidada === false ||
            (
                is_array($erros) &&
                (
                    $erros['warning_count'] > 0 ||
                    $erros['error_count'] > 0
                )
            ) ||
            $dataValidada->format('Y-m-d') !== $data
        ) {
            throw new InvalidArgumentException(
                $mensagem
            );
        }
    }
}