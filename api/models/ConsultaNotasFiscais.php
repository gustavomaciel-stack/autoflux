<?php
declare(strict_types=1);

final class ConsultaNotasFiscais
{
    public array $condicoes = [];
    public array $valores = [];

    public function __construct(private array $filtros) {}

    public function adicionar(string $condicao, array $valores = []): void
    {
        $this->condicoes[] = $condicao;
        array_push($this->valores, ...$valores);
    }

    public function texto(string $campo): string
    {
        $valor = $this->filtros[$campo] ?? '';
        if (!is_string($valor) || strlen($valor) > 600) {
            throw new InvalidArgumentException('Filtro inválido.');
        }
        return trim($valor);
    }

    public function busca(string $campo, string $expressao): void
    {
        $valor = $this->texto($campo);
        if ($valor !== '') {
            $this->adicionar("$expressao LIKE ? ESCAPE '!'", ['%'.strtr($valor, ['!'=>'!!', '%'=>'!%', '_'=>'!_']).'%']);
        }
    }

    public static function textoSql(string $expressao): string
    {
        return "CONVERT($expressao USING utf8mb4) COLLATE utf8mb4_unicode_ci";
    }

    public function aplicarComuns(string $ciclo, string $emissao, string $numero, array $camposBusca): void
    {
        if (($id = $this->texto('ciclo')) !== '') {
            $id = filter_var($id, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
            if ($id === false) throw new InvalidArgumentException('Ciclo inválido.');
            $this->adicionar("$ciclo = ?", [$id]);
        }
        // As tabelas fiscais e os cadastros antigos podem usar collations diferentes.
        $campos = array_map([self::class, 'textoSql'], $camposBusca);
        $this->busca('busca', "CONCAT_WS(' ', ".implode(', ', $campos).")");
        $this->busca('numero', $numero);
        $this->busca('placa', 'v.placa');

        $inicio = $this->texto('inicio');
        $fim = $this->texto('fim');
        foreach ([$inicio, $fim] as $data) {
            if ($data === '') continue;
            $dia = DateTimeImmutable::createFromFormat('!Y-m-d', $data);
            if (!$dia || $dia->format('Y-m-d') !== $data) throw new InvalidArgumentException('Informe uma data de emissão válida.');
        }
        if ($inicio !== '' && $fim !== '' && $inicio > $fim) throw new InvalidArgumentException('A data inicial deve ser anterior ou igual à final.');
        if ($inicio !== '') $this->adicionar("$emissao >= ?", [$inicio]);
        if ($fim !== '') $this->adicionar("$emissao <= ?", [$fim]);
    }

    public function paginar(PDO $pdo, string $select, string $de, string $ordem): array
    {
        $pagina = filter_var($this->texto('pagina') ?: '1', FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
        if ($pagina === false) throw new InvalidArgumentException('Página inválida.');

        $base = $de.($this->condicoes ? ' WHERE '.implode(' AND ', $this->condicoes) : '');
        $contagem = $pdo->prepare('SELECT COUNT(*) '.$base);
        $contagem->execute($this->valores);
        $total = (int)$contagem->fetchColumn();
        $paginas = max(1, (int)ceil($total / 20));
        $pagina = min($pagina, $paginas);
        $offset = ($pagina - 1) * 20;
        $consulta = $pdo->prepare("$select $base ORDER BY $ordem LIMIT 20 OFFSET $offset");
        $consulta->execute($this->valores);
        return ['itens'=>$consulta->fetchAll(PDO::FETCH_ASSOC), 'total'=>$total, 'pagina'=>$pagina, 'paginas'=>$paginas];
    }
}
