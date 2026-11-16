<?php
declare(strict_types=1);

require_once __DIR__ . '/Orcamento.php';

final class ExpiracaoReserva
{
    public function __construct(private PDO $pdo) {}

    private function consultar(string $sql, array $parametros = []): PDOStatement
    {
        $consulta = $this->pdo->prepare($sql);
        $consulta->execute($parametros);
        return $consulta;
    }

    public function processar(int $usuario): int
    {
        if ($this->pdo->inTransaction()) {
            throw new LogicException('A expiração deve iniciar fora de uma transação.');
        }
        $this->pdo->exec("SET time_zone='-03:00'");
        $pendentes = $this->consultar(
            "SELECT r.id_reserva,r.id_orcamento FROM reservas_orcamento r
             JOIN orcamentos o ON o.id_orcamento=r.id_orcamento
             WHERE r.data_liberacao IS NULL
               AND r.data_reserva <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)
               AND o.situacao IN ('Em negociação','Aguardando aprovação','Autorizado')
               AND NOT EXISTS (SELECT 1 FROM pedidos_venda_autoflux p WHERE p.id_orcamento=o.id_orcamento)
             ORDER BY r.id_orcamento,r.id_reserva"
        )->fetchAll(PDO::FETCH_ASSOC);
        $total = 0;
        foreach ($pendentes as $pendente) {
            $this->pdo->beginTransaction();
            try {
                // Usa a mesma ordem de bloqueios da geração do pedido e do orçamento.
                $orcamento = $this->consultar(
                    'SELECT * FROM orcamentos WHERE id_orcamento=? FOR UPDATE',
                    [$pendente['id_orcamento']]
                )->fetch(PDO::FETCH_ASSOC);
                if (!$orcamento || !in_array($orcamento['situacao'], ['Em negociação','Aguardando aprovação','Autorizado'], true)) {
                    $this->pdo->commit();
                    continue;
                }
                $this->consultar('SELECT id_ciclo FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE', [$orcamento['id_ciclo']]);
                $reserva = $this->consultar(
                    'SELECT * FROM reservas_orcamento WHERE id_reserva=? AND data_liberacao IS NULL
                     AND data_reserva <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY) FOR UPDATE',
                    [$pendente['id_reserva']]
                )->fetch(PDO::FETCH_ASSOC);
                $pedido = $this->consultar('SELECT id_pedido FROM pedidos_venda_autoflux WHERE id_orcamento=?', [$orcamento['id_orcamento']])->fetchColumn();
                if (!$reserva || $pedido !== false) {
                    $this->pdo->commit();
                    continue;
                }
                $motivo = 'Prazo da reserva expirado';
                $observacoes = 'Processamento automático: reserva encerrada após 7 dias sem gerar pedido de venda.';
                $destino = null;
                if (Orcamento::centavos($reserva['valor_sinal']) > 0) {
                    $destino = 'Retido';
                    $observacoes .= ' Sinal de R$ ' . number_format((float)$reserva['valor_sinal'], 2, ',', '.') . ' retido pela revenda.';
                }
                $this->consultar(
                    'UPDATE reservas_orcamento SET data_liberacao=CURRENT_TIMESTAMP,id_usuario_liberacao=?,
                     motivo_liberacao=?,destino_sinal=?,observacoes_destino=? WHERE id_reserva=?',
                    [$usuario,$motivo,$destino,$observacoes,$reserva['id_reserva']]
                );
                $this->consultar(
                    "UPDATE orcamentos SET situacao='Desistência',data_cancelamento=CURRENT_TIMESTAMP,
                     id_usuario_cancelamento=?,motivo_cancelamento=? WHERE id_orcamento=?",
                    [$usuario,$motivo,$orcamento['id_orcamento']]
                );
                $this->consultar(
                    "INSERT INTO eventos_reserva_orcamento
                     (id_reserva,id_usuario_responsavel,tipo,valor_sinal,destino_sinal,observacoes)
                     VALUES(?,?,'Liberação',?,?,?)",
                    [$reserva['id_reserva'],$usuario,$reserva['valor_sinal'],$destino,$observacoes]
                );
                $snapshot = json_encode([
                    'base_comercial_planejada'=>$orcamento['base_comercial_planejada'],
                    'preco_sugerido'=>$orcamento['preco_sugerido'],
                    'composicao_comercial'=>$orcamento['composicao_comercial'],
                    'data_validade'=>$orcamento['data_validade'],
                    'reserva_expirada'=>$reserva['id_reserva'],
                    'destino_sinal'=>$destino,
                    'valor_sinal'=>$reserva['valor_sinal'],
                    'automatico'=>true
                ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
                $this->consultar(
                    "INSERT INTO negociacoes_orcamento
                     (id_orcamento,id_usuario_responsavel,tipo_registro,valor_proposto,resultado_previsto,margem_prevista,observacoes,composicao_comercial)
                     VALUES(?,?,'Cancelamento',?,?,?,?,?)",
                    [$orcamento['id_orcamento'],$usuario,$orcamento['valor_negociado_atual'],
                     $orcamento['resultado_previsto'],$orcamento['margem_prevista'],$observacoes,$snapshot]
                );
                $alteracao = $this->consultar(
                    "UPDATE ciclos_veiculo SET situacao_atual='Disponível'
                     WHERE id_ciclo=? AND situacao_atual='Reservado' AND data_encerramento IS NULL",
                    [$orcamento['id_ciclo']]
                );
                if ($alteracao->rowCount() > 0) {
                    $this->consultar(
                        "INSERT INTO movimentacoes_veiculo
                         (id_ciclo,id_usuario_responsavel,situacao_anterior,situacao_nova,observacoes)
                         VALUES(?,?,'Reservado','Disponível',?)",
                        [$orcamento['id_ciclo'],$usuario,$observacoes.' Orçamento '.$orcamento['numero_orcamento'].'.']
                    );
                }
                $this->pdo->commit();
                $total++;
            } catch (Throwable $erro) {
                if ($this->pdo->inTransaction()) $this->pdo->rollBack();
                throw $erro;
            }
        }
        return $total;
    }
}
