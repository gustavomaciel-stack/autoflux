<?php
declare(strict_types=1);

require_once __DIR__.'/ImpostosEstimados.php';

final class ParametroComercial
{
    public function __construct(private PDO $pdo) {}

    public function consultar(): array
    {
        $historico = $this->pdo->query('SELECT p.*, u.nome AS usuario_responsavel
            FROM parametros_comerciais p INNER JOIN usuarios u ON u.id_usuario = p.id_usuario_responsavel
            ORDER BY p.id_parametro DESC')->fetchAll(PDO::FETCH_ASSOC);
        $vigente = null;
        foreach ($historico as &$p) {
            $p['id_parametro'] = (int) $p['id_parametro'];
            $p['ativo'] = (int) $p['ativo'];
            $p['impostos'] = $p['impostos_config'] ? json_decode($p['impostos_config'],true,512,JSON_THROW_ON_ERROR) : null;
            if ($p['ativo'] === 1 && $vigente === null) $vigente = $p;
        }
        unset($p);
        return ['vigente' => $vigente, 'historico' => $historico];
    }

    public function salvar(string $padrao, string $minimo, int $idUsuario, ?int $versaoEsperada, array $impostos): void
    {
        $validado = ImpostosEstimados::validar($impostos);
        $imposto = $validado['total'];
        $config = json_encode($validado['itens'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        $this->pdo->beginTransaction();
        try {
            // Mesma linha para toda a Gestão: serializa inclusive o primeiro cadastro.
            $this->pdo->query('SELECT id_usuario FROM usuarios ORDER BY id_usuario LIMIT 1 FOR UPDATE')->fetchColumn();
            $atual = $this->pdo->query('SELECT id_parametro FROM parametros_comerciais WHERE ativo = 1 ORDER BY id_parametro DESC LIMIT 1 FOR UPDATE')->fetchColumn();
            $idAtual = $atual === false ? null : (int) $atual;
            if ($idAtual !== $versaoEsperada) {
                throw new DomainException('Os parâmetros foram alterados por outro usuário. Atualize a tela antes de salvar.');
            }
            // CURRENT_TIMESTAMP é obtido uma única vez para manter as vigências contíguas.
            $agora = $this->pdo->query('SELECT CURRENT_TIMESTAMP')->fetchColumn();
            $q = $this->pdo->prepare('UPDATE parametros_comerciais SET ativo = 0, fim_vigencia = ? WHERE ativo = 1');
            $q->execute([$agora]);
            $q = $this->pdo->prepare('INSERT INTO parametros_comerciais
                (id_usuario_responsavel, percentual_padrao, percentual_minimo, percentual_imposto_estimado, impostos_config, inicio_vigencia, ativo, data_cadastro)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)');
            $q->execute([$idUsuario, $padrao, $minimo, $imposto, $config, $agora, $agora]);
            $this->pdo->commit();
        } catch (Throwable $erro) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $erro;
        }
    }
}
