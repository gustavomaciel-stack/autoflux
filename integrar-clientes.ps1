$ErrorActionPreference = 'Stop'
$raiz = $PSScriptRoot
$appPath = Join-Path $raiz 'frontend/src/App.tsx'
$layoutPath = Join-Path $raiz 'frontend/src/components/Layout.tsx'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Substituir-Uma([string]$texto, [string]$padrao, [string]$novo, [string]$nome) {
    $regex = New-Object System.Text.RegularExpressions.Regex($padrao)
    if ($regex.Matches($texto).Count -ne 1) { throw "Nao encontrei um ponto unico para integrar $nome. Nenhum arquivo de navegacao foi alterado. Envie App.tsx e Layout.tsx para ajustar a integracao." }
    return $regex.Replace($texto, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $novo }, 1)
}

if (!(Test-Path $appPath) -or !(Test-Path $layoutPath)) { throw 'Coloque o conteudo do ZIP na raiz do projeto, junto das pastas api e frontend.' }
$app = [System.IO.File]::ReadAllText($appPath)
$layout = [System.IO.File]::ReadAllText($layoutPath)
$appOriginal = $app
$layoutOriginal = $layout

if ($app -notmatch 'import\s*\{\s*ClientesPage\s*\}') {
    $app = 'import { ClientesPage } from "./pages/ClientesPage";' + "`r`n" + $app
}
if ($app -notmatch '\|\s*"clientes"') {
    $app = Substituir-Uma $app '\|\s*"usuarios"\s*;' '| "usuarios" | "clientes";' 'tipo da pagina'
}
if ($app -notmatch 'case "clientes":\s*return "clientes"') {
    $app = Substituir-Uma $app 'case "usuarios":\s*return "usuarios";' "case `"clientes`": return `"clientes`";`r`n    case `"usuarios`": return `"usuarios`";" 'rota de clientes'
}
if ($app -notmatch 'case "clientes":\s*return <ClientesPage') {
    $app = Substituir-Uma $app 'case "usuarios":\s*return <UsuariosPage\s*/>;' "case `"clientes`": return <ClientesPage />;`r`n    case `"usuarios`": return <UsuariosPage />;" 'tela de clientes'
}

if ($layout -notmatch 'from "../services/clientesAcesso"') {
    $layout = 'import { podeGerenciarClientes } from "../services/clientesAcesso";' + "`r`n" + $layout
}
if ($layout -notmatch 'paginaClientes\s*=') {
    $layout = Substituir-Uma $layout 'const paginaUsuarios\s*=' "const paginaClientes = window.location.hash === `"#clientes`";`r`n  const paginaUsuarios =" 'identificacao da pagina'
}
if ($layout -notmatch 'paginaClientes\s*\|\|') {
    $layout = Substituir-Uma $layout 'const paginaCadastros\s*=' 'const paginaCadastros = paginaClientes ||' 'menu ativo'
}
if ($layout -notmatch 'data-autoflux-clientes') {
    $botao = @'
<div className="nav-dropdown-menu">
                {podeGerenciarClientes(usuario) && (
                  <button data-autoflux-clientes type="button" className={paginaClientes ? "selected" : undefined} onClick={() => { fecharMenus(); window.location.hash = "#clientes"; }}>Clientes</button>
                )}
'@
    $regex = New-Object System.Text.RegularExpressions.Regex('(menuCadastrosAberto\s*&&\s*\(\s*)<div className="nav-dropdown-menu">')
    if ($regex.Matches($layout).Count -ne 1) { throw 'Nao encontrei o menu Cadastros. Nenhum arquivo de navegacao foi alterado. Envie App.tsx e Layout.tsx.' }
    $layout = $regex.Replace($layout, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $m.Groups[1].Value + $botao }, 1)
}

# Calcula todas as alteracoes antes de escrever; mantem copias para restauracao.
$sufixo = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
if ($app -ne $appOriginal) {
    Copy-Item $appPath "$appPath.antes-clientes-$sufixo.bak"
    [System.IO.File]::WriteAllText($appPath, $app, $utf8)
}
if ($layout -ne $layoutOriginal) {
    Copy-Item $layoutPath "$layoutPath.antes-clientes-$sufixo.bak"
    [System.IO.File]::WriteAllText($layoutPath, $layout, $utf8)
}
Write-Host 'Clientes integrado. Execute o SQL-clientes.sql no banco local e abra Cadastros > Clientes.' -ForegroundColor Green
