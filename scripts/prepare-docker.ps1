[CmdletBinding()]
param(
    [string]$OpenCartSource = 'C:\xampp\htdocs\opencart\upload'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot '.env'
$instanceRoot = Join-Path $repoRoot 'docker\opencart\instance'
$stagingRoot = Join-Path $repoRoot ("docker\opencart\.prepare-" + [guid]::NewGuid().ToString('N'))
$sitePath = Join-Path $stagingRoot 'site'
$storagePath = Join-Path $stagingRoot 'storage'
$dumpPath = Join-Path $stagingRoot 'database.sql'
$optionsPath = Join-Path $stagingRoot 'source-db.cnf'
$createdStaging = $false

function Get-PhpConstant {
    param(
        [string]$Content,
        [string]$Name
    )

    $pattern = "define\s*\(\s*['""]$([regex]::Escape($Name))['""]\s*,\s*['""](?<value>[^'""]*)['""]\s*\)"
    $match = [regex]::Match($Content, $pattern)
    if (-not $match.Success) {
        throw "OpenCart configuration is missing the $Name setting."
    }

    return $match.Groups['value'].Value
}

function Set-PhpConstant {
    param(
        [string]$Content,
        [string]$Name,
        [string]$Value
    )

    $pattern = "(?<prefix>define\s*\(\s*['""]$([regex]::Escape($Name))['""]\s*,\s*)['""][^'""]*['""](?<suffix>\s*\))"
    $match = [regex]::Match($Content, $pattern)
    if (-not $match.Success) {
        throw "OpenCart configuration is missing the $Name setting."
    }

    $escapedValue = $Value.Replace('\', '\\').Replace("'", "\'")
    $replacement = "`${prefix}'$escapedValue'`${suffix}"
    return [regex]::Replace($Content, $pattern, $replacement, 1)
}

function New-RandomSecret {
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }

    return ([System.BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}

function New-OpenCartPasswordHash {
    param([string]$Password)

    $phpCandidates = @(
        'C:\xampp\php\php.exe',
        (Get-Command php -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1)
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) }
    if (-not $phpCandidates) {
        throw "PHP CLI was not found. Install XAMPP or add php.exe to PATH to prepare the Docker Admin account."
    }

    $encodedPassword = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Password))
    $hash = & $phpCandidates[0] -r "echo password_hash(base64_decode('$encodedPassword'), PASSWORD_DEFAULT);"
    if ($LASTEXITCODE -ne 0 -or ($hash -join '').Trim() -notmatch '^\$(2y|argon2)') {
        throw "Could not generate a secure password hash for the Docker Admin account."
    }

    return ($hash -join '').Trim()
}

function ConvertTo-DotEnvValue {
    param([string]$Value)

    $escaped = $Value.Replace('\', '\\').Replace([string][char]39, ([string][char]92 + [string][char]39))
    return ([string][char]39) + $escaped + ([string][char]39)
}

function Read-LocalEnvironment {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "A local .env file is required. Copy .env.example to .env and set the OpenCart admin credentials."
    }

    $scriptText = @'
const fs = require('node:fs');
const dotenv = require('dotenv');
const parsed = dotenv.parse(fs.readFileSync(process.argv.at(-1)));
const keys = [
  'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'APP_EMAIL', 'APP_PASSWORD',
  'API_USERNAME', 'API_PASSWORD', 'USERNAME', 'PASSWORD',
  'PRODUCT_NAME', 'PRODUCT_QUANTITY', 'TOTAL_PRICE'
];
process.stdout.write(JSON.stringify(Object.fromEntries(keys.map(key => [key, parsed[key] || '']))));
'@
    $json = $scriptText | & node - $Path
    if ($LASTEXITCODE -ne 0) {
        throw "Could not read the local .env file using the project's dotenv parser."
    }

    return ($json -join "`n") | ConvertFrom-Json
}

try {
    if (Test-Path -LiteralPath $instanceRoot) {
        throw "Docker data already exists at docker\opencart\instance. It was left untouched; back it up before replacing it."
    }

    $sourceConfigPath = Join-Path $OpenCartSource 'config.php'
    if (-not (Test-Path -LiteralPath $sourceConfigPath -PathType Leaf)) {
        throw "OpenCart config.php was not found under the supplied source folder."
    }

    $sourceConfig = Get-Content -LiteralPath $sourceConfigPath -Raw
    $databaseName = Get-PhpConstant -Content $sourceConfig -Name 'DB_DATABASE'
    $sourceHost = Get-PhpConstant -Content $sourceConfig -Name 'DB_HOSTNAME'
    $sourceUser = Get-PhpConstant -Content $sourceConfig -Name 'DB_USERNAME'
    $sourcePassword = Get-PhpConstant -Content $sourceConfig -Name 'DB_PASSWORD'
    $sourcePort = Get-PhpConstant -Content $sourceConfig -Name 'DB_PORT'
    $databasePrefix = Get-PhpConstant -Content $sourceConfig -Name 'DB_PREFIX'
    $sourceStorage = Get-PhpConstant -Content $sourceConfig -Name 'DIR_STORAGE'

    if ($databaseName -notmatch '^[A-Za-z0-9_]+$') {
        throw "The configured OpenCart database name cannot be safely used by this Docker setup."
    }
    if ($databasePrefix -notmatch '^[A-Za-z0-9_]+$') {
        throw "The configured OpenCart database prefix cannot be safely used by this Docker setup."
    }

    $adminConfigs = @(Get-ChildItem -LiteralPath $OpenCartSource -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'config.php') })
    if ($adminConfigs.Count -ne 1) {
        throw "Could not identify exactly one renamed OpenCart admin directory in the source folder."
    }

    $adminDirectory = $adminConfigs[0].Name
    $adminConfigPath = Join-Path $adminConfigs[0].FullName 'config.php'
    $adminConfig = Get-Content -LiteralPath $adminConfigPath -Raw
    if ((Get-PhpConstant -Content $adminConfig -Name 'DB_DATABASE') -ne $databaseName) {
        throw "The storefront and admin configs point at different databases."
    }

    $resolvedStorage = [System.IO.Path]::GetFullPath($sourceStorage.Replace('/', '\'))
    if (-not (Test-Path -LiteralPath $resolvedStorage -PathType Container)) {
        throw "OpenCart storage folder was not found; the source install was not changed."
    }

    $localEnv = Read-LocalEnvironment -Path $envFile
    if ([string]::IsNullOrWhiteSpace($localEnv.ADMIN_USERNAME) -or
        [string]::IsNullOrWhiteSpace($localEnv.ADMIN_PASSWORD)) {
        throw "ADMIN_USERNAME and ADMIN_PASSWORD must be configured in the local .env file."
    }

    $newDatabaseUser = 'opencart_app'
    $newDatabasePassword = New-RandomSecret
    $newRootPassword = New-RandomSecret
    $adminPasswordHash = New-OpenCartPasswordHash -Password ([string]$localEnv.ADMIN_PASSWORD)

    New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null
    $createdStaging = $true
    New-Item -ItemType Directory -Path $sitePath -Force | Out-Null
    Get-ChildItem -LiteralPath $OpenCartSource -Force |
        Copy-Item -Destination $sitePath -Recurse -Force
    New-Item -ItemType Directory -Path $storagePath -Force | Out-Null
    Get-ChildItem -LiteralPath $resolvedStorage -Force |
        Copy-Item -Destination $storagePath -Recurse -Force

    $containerSite = '/var/www/html/'
    $containerStorage = '/var/www/storage/'
    $storefrontUrl = 'http://opencart/'
    $adminUrl = "http://opencart/$adminDirectory/"

    foreach ($configPath in @(
        (Join-Path $sitePath 'config.php'),
        (Join-Path $sitePath "$adminDirectory\config.php")
    )) {
        $content = Get-Content -LiteralPath $configPath -Encoding UTF8 -Raw
        $content = Set-PhpConstant -Content $content -Name 'DB_HOSTNAME' -Value 'database'
        $content = Set-PhpConstant -Content $content -Name 'DB_USERNAME' -Value $newDatabaseUser
        $content = Set-PhpConstant -Content $content -Name 'DB_PASSWORD' -Value $newDatabasePassword
        $content = Set-PhpConstant -Content $content -Name 'DB_DATABASE' -Value $databaseName
        $content = Set-PhpConstant -Content $content -Name 'DB_PORT' -Value '3306'
        $content = Set-PhpConstant -Content $content -Name 'DIR_OPENCART' -Value $containerSite
        $content = Set-PhpConstant -Content $content -Name 'DIR_STORAGE' -Value $containerStorage

        if ($configPath.EndsWith("$adminDirectory\config.php")) {
            $content = Set-PhpConstant -Content $content -Name 'HTTP_SERVER' -Value $adminUrl
            $content = Set-PhpConstant -Content $content -Name 'HTTP_CATALOG' -Value $storefrontUrl
            foreach ($name in @('HTTPS_SERVER', 'HTTPS_CATALOG')) {
                if ($content -match "define\s*\(\s*['""]$name['""]") {
                    $value = if ($name -eq 'HTTPS_SERVER') { $adminUrl } else { $storefrontUrl }
                    $content = Set-PhpConstant -Content $content -Name $name -Value $value
                }
            }
        }
        else {
            $content = Set-PhpConstant -Content $content -Name 'HTTP_SERVER' -Value $storefrontUrl
            if ($content -match "define\s*\(\s*['""]HTTPS_SERVER['""]") {
                $content = Set-PhpConstant -Content $content -Name 'HTTPS_SERVER' -Value $storefrontUrl
            }
        }

        [System.IO.File]::WriteAllText(
            $configPath,
            $content,
            (New-Object System.Text.UTF8Encoding($false))
        )
    }

    $dumpCandidates = @(
        'C:\xampp\mysql\bin\mysqldump.exe',
        (Get-Command mysqldump -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1)
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) }
    if (-not $dumpCandidates) {
        throw "mysqldump was not found. Install XAMPP or add mysqldump to PATH."
    }

    $escapedSourcePassword = $sourcePassword.Replace('\', '\\').Replace('"', '\"')
    $options = @(
        '[client]'
        "host=$sourceHost"
        "port=$sourcePort"
        'protocol=tcp'
        "user=$sourceUser"
        "password=`"$escapedSourcePassword`""
    )
    [System.IO.File]::WriteAllLines(
        $optionsPath,
        $options,
        (New-Object System.Text.UTF8Encoding($false))
    )

    $acl = Get-Acl -LiteralPath $optionsPath
    $acl.SetAccessRuleProtection($true, $false)
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $currentUser,
        [System.Security.AccessControl.FileSystemRights]::FullControl,
        [System.Security.AccessControl.AccessControlType]::Allow
    )
    $acl.SetAccessRule($accessRule)
    Set-Acl -LiteralPath $optionsPath -AclObject $acl

    & $dumpCandidates[0] "--defaults-extra-file=$optionsPath" `
        --single-transaction --routines --events --triggers --hex-blob `
        --default-character-set=utf8mb4 --skip-lock-tables `
        "--result-file=$dumpPath" $databaseName
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $dumpPath -PathType Leaf)) {
        throw "The OpenCart database export failed. Check that the XAMPP MariaDB service is running."
    }

    $localApiUsername = if ($localEnv.API_USERNAME) { $localEnv.API_USERNAME } else { $localEnv.USERNAME }
    $localApiPassword = if ($localEnv.API_PASSWORD) { $localEnv.API_PASSWORD } else { $localEnv.PASSWORD }
    $dockerValues = [ordered]@{
        OPENCART_DB_NAME = $databaseName
        OPENCART_DB_USER = $newDatabaseUser
        OPENCART_DB_PASSWORD = $newDatabasePassword
        OPENCART_DB_ROOT_PASSWORD = $newRootPassword
        OPENCART_ADMIN_DIR = $adminDirectory
        DB_HOST = 'database'
        DB_PORT = '3306'
        DB_NAME = $databaseName
        DB_USER = $newDatabaseUser
        DB_PASSWORD = $newDatabasePassword
        ADMIN_URL = "http://opencart/$adminDirectory/index.php?route=common/login"
        ADMIN_USERNAME = [string]$localEnv.ADMIN_USERNAME
        ADMIN_PASSWORD = [string]$localEnv.ADMIN_PASSWORD
        WEB_APP_URL = $storefrontUrl
        WEB_APP_URL_TUTORIALSNINJA = 'https://tutorialsninja.com/demo/'
        WEB_APP_URL_AWESOMEQA = 'https://awesomeqa.com/ui/'
        APP_EMAIL = [string]$localEnv.APP_EMAIL
        APP_PASSWORD = [string]$localEnv.APP_PASSWORD
        API_USERNAME = [string]$localApiUsername
        API_PASSWORD = [string]$localApiPassword
        USERNAME = [string]$localApiUsername
        PASSWORD = [string]$localApiPassword
        PRODUCT_NAME = if ($localEnv.PRODUCT_NAME) { [string]$localEnv.PRODUCT_NAME } else { 'MacBook' }
        PRODUCT_QUANTITY = if ($localEnv.PRODUCT_QUANTITY) { [string]$localEnv.PRODUCT_QUANTITY } else { '1' }
        TOTAL_PRICE = [string]$localEnv.TOTAL_PRICE
    }
    $dockerEnvPath = Join-Path $stagingRoot 'docker.env'
    $dockerEnvLines = foreach ($entry in $dockerValues.GetEnumerator()) {
        "$($entry.Key)=$(ConvertTo-DotEnvValue -Value ([string]$entry.Value))"
    }
    [System.IO.File]::WriteAllLines(
        $dockerEnvPath,
        $dockerEnvLines,
        (New-Object System.Text.UTF8Encoding($false))
    )

    $escapedAdminUsername = ([string]$localEnv.ADMIN_USERNAME).Replace("'", "''")
    $adminResetSql = @"
UPDATE ``${databasePrefix}user``
SET ``password`` = '$adminPasswordHash'
WHERE ``username`` = '$escapedAdminUsername' AND ``status`` = 1
LIMIT 1;
"@
    [System.IO.File]::WriteAllText(
        (Join-Path $stagingRoot '20-opencart-admin-reset.sql'),
        $adminResetSql,
        (New-Object System.Text.UTF8Encoding($false))
    )

    Remove-Item -LiteralPath $optionsPath -Force
    Move-Item -LiteralPath $stagingRoot -Destination $instanceRoot
    $createdStaging = $false

    Write-Output 'Docker data prepared in the gitignored docker/opencart/instance folder.'
    Write-Output 'The original XAMPP OpenCart source and database were not modified.'
    Write-Output 'The local database copy contains your existing store data; do not force-add it to Git.'
}
catch {
    if ($createdStaging -and (Test-Path -LiteralPath $stagingRoot)) {
        Remove-Item -LiteralPath $stagingRoot -Recurse -Force
    }
    throw
}
finally {
    if (Test-Path -LiteralPath $optionsPath) {
        Remove-Item -LiteralPath $optionsPath -Force
    }
}
