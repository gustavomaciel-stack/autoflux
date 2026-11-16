<?php
declare(strict_types=1);
final class NotaDevolucao {
    public static function preparar(array $dados, array $arquivo): array {
        $numero = trim((string)($dados['numero'] ?? ''));
        $serie = trim((string)($dados['serie'] ?? ''));
        $data = trim((string)($dados['data_emissao'] ?? ''));
        $chave = preg_replace('/\s+/', '', (string)($dados['chave_acesso'] ?? ''));
        if (!preg_match('/^[0-9]{1,9}$/D', $numero) || !preg_match('/^[0-9]{1,3}$/D', $serie))
            throw new InvalidArgumentException('Informe número e série da nota fiscal de saída.');
        $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $data);
        if (!$dt || $dt->format('Y-m-d') !== $data) throw new InvalidArgumentException('Data de emissão inválida.');
        if ($chave !== '' && !preg_match('/^[0-9]{44}$/D', $chave)) throw new InvalidArgumentException('A chave deve conter 44 dígitos.');
        if (($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return ['numero'=>$numero,'serie'=>$serie,'data'=>$data,'chave'=>$chave ?: null,'caminho'=>'','nome'=>''];
        }
        $config = require __DIR__.'/../config/ArquivosNota.php';
        $tmp = $arquivo['tmp_name'] ?? '';
        if (($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($tmp)) throw new InvalidArgumentException('Anexe o PDF da nota fiscal de saída para devolver o veículo.');
        if (filesize($tmp) > $config['limite'] || filesize($tmp) === 0) throw new InvalidArgumentException('O PDF deve ter até 5 MB.');
        if ((new finfo(FILEINFO_MIME_TYPE))->file($tmp) !== 'application/pdf' || file_get_contents($tmp, false, null, 0, 5) !== '%PDF-') throw new InvalidArgumentException('O arquivo deve ser um PDF válido.');
        $dir = rtrim((string)$config['diretorio'], '/\\');
        if ($dir === '') throw new RuntimeException('Configure o diretório de arquivos das notas fiscais.');
        $dir .= '/devolucoes';
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException('Não foi possível preparar o diretório de notas.');
        $caminho = $dir.'/'.bin2hex(random_bytes(24)).'.pdf';
        if (!move_uploaded_file($tmp, $caminho)) throw new RuntimeException('Não foi possível salvar o PDF.');
        return ['numero'=>$numero,'serie'=>$serie,'data'=>$data,'chave'=>$chave ?: null,'caminho'=>$caminho,'nome'=>basename(str_replace('\\','/',(string)($arquivo['name'] ?? 'nota-devolucao.pdf')))];
    }
    public static function anexar(PDO $pdo, int $id): void {
        $novo = null;
        try {
            $pdo->beginTransaction();
            $q = $pdo->prepare('SELECT * FROM notas_fiscais_devolucao WHERE id_consignacao=? FOR UPDATE');
            $q->execute([$id]); $nota = $q->fetch(PDO::FETCH_ASSOC);
            if (!$nota) throw new InvalidArgumentException('Nota de devolução não encontrada.');
            if ($nota['caminho'] !== '') throw new InvalidArgumentException('Esta nota já possui PDF.');
            $novo = self::preparar(['numero'=>$nota['numero_nota'],'serie'=>$nota['serie'],'data_emissao'=>$nota['data_emissao'],'chave_acesso'=>$nota['chave_acesso']], $_FILES['arquivo'] ?? []);
            if ($novo['caminho'] === '') throw new InvalidArgumentException('Selecione o PDF para anexar.');
            $q = $pdo->prepare('UPDATE notas_fiscais_devolucao SET caminho=?,nome_original=? WHERE id_consignacao=?');
            $q->execute([$novo['caminho'],$novo['nome'],$id]);
            $pdo->commit();
        } catch (Throwable $erro) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($novo && $novo['caminho'] !== '' && is_file($novo['caminho'])) unlink($novo['caminho']);
            throw $erro;
        }
    }
    public static function baixar(PDO $pdo, int $id): never {
        $q = $pdo->prepare('SELECT caminho, nome_original FROM notas_fiscais_devolucao WHERE id_consignacao=?');
        $q->execute([$id]); $nota = $q->fetch(PDO::FETCH_ASSOC);
        if (!$nota || !is_file($nota['caminho'])) { Auth::responder(404,['sucesso'=>false,'mensagem'=>'Arquivo não encontrado.']); }
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="nota-devolucao.pdf"');
        header('X-Content-Type-Options: nosniff');
        header('Content-Length: '.filesize($nota['caminho']));
        readfile($nota['caminho']); exit;
    }
}
