<#!
.SYNOPSIS
    Copies the compiled plugin assets from the Linux dev server onto the local Windows Obsidian plugin folder.
.DESCRIPTION
    Uses scp with the provided SSH identity to pull main.js, manifest.json, and styles.css
    from /home/dyzhang/projects/pomodoro_timer/obsidian-pomodoro-timer on the remote host.
    Existing files in the destination are overwritten.
#>

[CmdletBinding()]
param(
    [string]$Host = "ubuntu-docker-dev-env",

    [int]$Port = 2222,

    [string]$User = "dyzhang",

    [string]$IdentityFile = (Join-Path $HOME ".ssh\id_ed25519"),

    [string]$RemoteRoot = "/home/dyzhang/projects/pomodoro_timer/obsidian-pomodoro-timer",

    [string]$LocalPluginPath = "C:\RIOS学习笔记\.obsidian\plugins\pomodoro_timer",

    [string[]]$FilesToCopy = @("main.js", "manifest.json", "styles.css")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    throw "scp (OpenSSH) was not found in PATH. Install the Windows OpenSSH client first."
}

if (-not (Test-Path -LiteralPath $IdentityFile)) {
    throw "Identity file '$IdentityFile' was not found. Update the IdentityFile parameter with the correct path."
}

if (-not (Test-Path -LiteralPath $LocalPluginPath)) {
    Write-Host "Creating local plugin directory $LocalPluginPath"
    New-Item -ItemType Directory -Force -Path $LocalPluginPath | Out-Null
}

foreach ($file in $FilesToCopy) {
    $remoteFile = "$RemoteRoot/$file"
    $remoteSpec = "{0}@{1}:{2}" -f $User, $Host, $remoteFile

    Write-Host "Copying $remoteSpec -> $LocalPluginPath" -ForegroundColor Cyan

    $arguments = @(
        "-P", $Port,
        "-i", $IdentityFile,
        $remoteSpec,
        $LocalPluginPath
    )

    & scp @arguments

    if ($LASTEXITCODE -ne 0) {
        throw "scp exited with code $LASTEXITCODE while copying '$file'."
    }
}

Write-Host "All files copied successfully." -ForegroundColor Green
