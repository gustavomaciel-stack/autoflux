<?php
declare(strict_types=1);
final class AnexoNotaFiscal {
 public function __construct(private PDO $db, private array $config) {}
 public static function validar(string $arquivo, string $nome, int $limite): array {
  $tamanho=filesize($arquivo);
  if (!$tamanho || $tamanho>$limite) throw new InvalidArgumentException('O arquivo deve ter conteúdo e no máximo 5 MB.');
  $tipo=strtolower(pathinfo($nome, PATHINFO_EXTENSION));
  if (!in_array($tipo,['pdf','xml'],true)) throw new InvalidArgumentException('Selecione um arquivo PDF ou XML.');
  $conteudo=file_get_contents($arquivo);
  if ($tipo==='pdf') {
   if (!str_starts_with($conteudo,'%PDF-') || !str_contains(substr($conteudo,-2048),'%%EOF')) throw new InvalidArgumentException('O conteúdo do arquivo não corresponde a um PDF válido.');
  } else {
   if (preg_match('/<!DOCTYPE|<!ENTITY/i',$conteudo)) throw new InvalidArgumentException('XML com entidades externas não é permitido.');
   if (!function_exists('simplexml_load_string')) throw new RuntimeException('Ative a extensão SimpleXML do PHP para anexar XML.');
   $anterior=libxml_use_internal_errors(true);
   try { $xml=simplexml_load_string($conteudo, 'SimpleXMLElement', LIBXML_NONET); if ($xml===false) throw new InvalidArgumentException('O arquivo XML está malformado.'); }
   finally { libxml_clear_errors();libxml_use_internal_errors($anterior); }
  }
  $nome=preg_replace('/[\x00-\x1f\x7f]/u','',basename(str_replace('\\','/',$nome)));
  if (!$nome || strlen($nome)>180) throw new InvalidArgumentException('Use um nome de arquivo de até 180 bytes.');
  return ['tipo'=>$tipo,'tamanho'=>$tamanho,'nome_original'=>$nome,'sha256'=>hash_file('sha256',$arquivo)];
 }
 private function raiz(): string {
  $p=rtrim((string)$this->config['diretorio'],'/\\');
  if ($p==='') throw new RuntimeException('Configure a pasta protegida de anexos em api/config/ArquivosNota.php.');
  if (!is_dir($p) && !@mkdir($p,0700,true) && !is_dir($p)) throw new RuntimeException('Não foi possível criar a pasta de anexos. Confira a permissão do Apache.');
  $real=realpath($p); $publico=realpath($_SERVER['DOCUMENT_ROOT']??'');
  if ($real===false) throw new RuntimeException('Pasta de anexos indisponível.');
  if ($publico && (strtolower($real)===strtolower($publico) || str_starts_with(strtolower($real.DIRECTORY_SEPARATOR),strtolower($publico.DIRECTORY_SEPARATOR)))) throw new RuntimeException('A pasta de anexos deve ficar fora da pasta pública do servidor.');
  return $real;
 }
 public function listar(int $nota): array {
  $q=$this->db->prepare('SELECT a.id_anexo,a.nome_original,a.tipo,a.tamanho,a.data_envio,u.nome AS responsavel FROM anexos_notas_fiscais a LEFT JOIN usuarios u ON u.id_usuario=a.id_usuario WHERE a.id_nota_fiscal_entrada=? ORDER BY a.id_anexo DESC');$q->execute([$nota]);return $q->fetchAll(PDO::FETCH_ASSOC);
 }
 public function enviar(int $nota, int $usuario, array $f, ?array $saida=null): void {
  if ($saida!==null) {
   $numero=trim((string)($saida['numero']??''));
   $serie=trim((string)($saida['serie']??''));
   $chave=trim((string)($saida['chave_acesso']??''));
   if (!preg_match('/^[0-9]{1,3}$/D',$serie)) throw new InvalidArgumentException('Informe a série da nota (até 3 dígitos).');
   if ($chave!=='' && !preg_match('/^[0-9]{44}$/D',$chave)) throw new InvalidArgumentException('A chave de acesso deve ter 44 dígitos.');
   $data=(string)($saida['data_emissao']??'');
   $emissao=DateTimeImmutable::createFromFormat('!Y-m-d',$data);
   if (!preg_match('/^[0-9]{1,9}$/D',$numero) || (int)$numero===0) throw new InvalidArgumentException('Informe o número da nota (até 9 dígitos).');
   if (!$emissao || $emissao->format('Y-m-d')!==$data || $data<'1000-01-01') throw new InvalidArgumentException('Informe uma data de emissão válida.');
  }
  $erro=$f['error']??UPLOAD_ERR_NO_FILE;
  if ($erro!==UPLOAD_ERR_OK) throw new InvalidArgumentException(in_array($erro,[UPLOAD_ERR_INI_SIZE,UPLOAD_ERR_FORM_SIZE],true)?'O arquivo ultrapassa o limite de upload do PHP.':'Não foi possível receber o arquivo. Selecione-o novamente.');
  if (!isset($f['tmp_name']) || !is_uploaded_file($f['tmp_name'])) throw new InvalidArgumentException('Envio de arquivo inválido.');
  $dados=self::validar($f['tmp_name'],(string)$f['name'],(int)$this->config['limite']);
  if ($saida!==null && $dados['tipo']!=='pdf') throw new InvalidArgumentException('Selecione o PDF da nota de saída.');
  $raiz=$this->raiz();$rel=(new DateTimeImmutable('now',new DateTimeZone('America/Sao_Paulo')))->format('Y/m').'/'.bin2hex(random_bytes(24)).'.'.$dados['tipo'];$destino=$raiz.'/'.$rel;$movido=false;
  try {
   $this->db->beginTransaction();
   if ($saida===null) {
    $q=$this->db->prepare('SELECT id_nota_fiscal_entrada FROM notas_fiscais_entrada WHERE id_nota_fiscal_entrada=? FOR UPDATE');$q->execute([$nota]);if (!$q->fetchColumn()) throw new InvalidArgumentException('Nota fiscal não encontrada.');
    $q=$this->db->prepare('SELECT id_anexo FROM anexos_notas_fiscais WHERE id_nota_fiscal_entrada=? AND sha256=?');$q->execute([$nota,$dados['sha256']]);if ($q->fetchColumn()) throw new InvalidArgumentException('Este arquivo já está anexado a esta nota fiscal.');
   } else {
    $q=$this->db->prepare('SELECT situacao FROM pedidos_venda_autoflux WHERE id_pedido=? FOR UPDATE');
    $q->execute([$nota]);
    if ($q->fetchColumn()!=='Concluído') throw new DomainException('A nota de saída só pode ser registrada para uma venda concluída.');
    $q=$this->db->prepare('SELECT id_pedido FROM notas_fiscais_saida WHERE id_pedido=?');
    $q->execute([$nota]);
    if ($q->fetchColumn()) throw new DomainException('A nota de saída deste pedido já foi registrada.');
   }
   if (!is_dir(dirname($destino)) && !@mkdir(dirname($destino),0700,true) && !is_dir(dirname($destino))) throw new RuntimeException('Não foi possível criar a pasta do mês.');
   if (!@move_uploaded_file($f['tmp_name'],$destino)) throw new RuntimeException('Não foi possível salvar o arquivo. Confira a permissão da pasta.');$movido=true;@chmod($destino,0600);
   $arquivo=[$dados['nome_original'],$rel,$dados['tipo'],$dados['tamanho'],$dados['sha256'],$usuario];
   if ($saida===null) {
    $q=$this->db->prepare('INSERT INTO anexos_notas_fiscais (id_nota_fiscal_entrada,nome_original,caminho_relativo,tipo,tamanho,sha256,id_usuario) VALUES (?,?,?,?,?,?,?)');
    $q->execute([$nota,...$arquivo]);
   } else {
    $q=$this->db->prepare('INSERT INTO notas_fiscais_saida (id_pedido,numero_nota,serie,chave_acesso,data_emissao,nome_original,caminho_relativo,tipo,tamanho,sha256,id_usuario) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $q->execute([$nota,$numero,$serie,$chave===''?null:$chave,$data,...$arquivo]);
   }
   $this->db->commit();
  } catch (Throwable $e) {if($this->db->inTransaction())$this->db->rollBack();if($movido)is_file($destino)&&unlink($destino);throw $e;}
 }
 public function baixar(int $id, bool $saida=false): void {
  $sql=$saida?'SELECT * FROM notas_fiscais_saida WHERE id_pedido=?':'SELECT * FROM anexos_notas_fiscais WHERE id_anexo=?';
  $q=$this->db->prepare($sql);$q->execute([$id]);$a=$q->fetch(PDO::FETCH_ASSOC);
  if (!$a) throw new InvalidArgumentException('Anexo não encontrado.');
  $raiz=$this->raiz();$p=realpath($raiz.'/'.$a['caminho_relativo']);
  if (!$p || !str_starts_with($p,$raiz.DIRECTORY_SEPARATOR) || !is_file($p)) throw new RuntimeException('Arquivo indisponível. Confira a pasta de anexos ou restaure o backup.');
  $h=@fopen($p,'rb');if(!$h)throw new RuntimeException('Não foi possível abrir o anexo.');
  header('Content-Type: application/octet-stream');header('X-Content-Type-Options: nosniff');header('Cache-Control: private, no-store');
  header("Content-Disposition: attachment; filename=\"nota-fiscal.".$a['tipo']."\"; filename*=UTF-8''".rawurlencode($a['nome_original']));header('Content-Length: '.filesize($p));
  fpassthru($h);fclose($h);
 }
}
