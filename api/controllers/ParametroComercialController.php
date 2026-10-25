<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/Percentual.php';

final class ParametroComercialController
{
    public function __construct(private ParametroComercial $modelo) {}

    public function consultar(): array
    {
        return ['sucesso' => true, 'dados' => $this->modelo->consultar()];
    }

    public function salvar(array $dados, int $idUsuario): array
    {
        $padrao = Percentual::validar($dados['percentual_padrao'] ?? null, 'Markup padrão');
        $minimo = Percentual::validar($dados['percentual_minimo'] ?? null, 'Margem mínima');
        if (!array_key_exists('id_parametro_anterior', $dados)) throw new InvalidArgumentException('Atualize a tela antes de salvar os parâmetros.');
        $impostos = $dados['impostos'] ?? null;
        if (!is_array($impostos)) throw new InvalidArgumentException('Informe os impostos individualmente. Atualize a tela.');
        $anterior = $dados['id_parametro_anterior'];
        if ($anterior !== null) {
            $anterior = filter_var($anterior, FILTER_VALIDATE_INT);
            if ($anterior === false || $anterior < 1) throw new InvalidArgumentException('Versão anterior inválida.');
        }
        $this->modelo->salvar($padrao, $minimo, $idUsuario, $anterior, $impostos);
        return ['sucesso' => true, 'mensagem' => 'Nova versão dos parâmetros salva.', 'dados' => $this->modelo->consultar()];
    }
}
