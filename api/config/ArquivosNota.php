<?php
declare(strict_types=1);
// Em outro computador/servidor, defina AUTOFLUX_NF_DIR no ambiente do PHP.
return ['diretorio' => getenv('AUTOFLUX_NF_DIR') ?: (PHP_OS_FAMILY === 'Windows' ? 'C:/AutoFluxArquivos/notas-fiscais' : ''), 'limite' => 5 * 1024 * 1024];
