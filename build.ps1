$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\sue02\AppData\Local\Android\Sdk"
$env:PATH = $env:JAVA_HOME + "\bin;" + "C:\Users\sue02\AppData\Local\nvm\v20.20.2;" + $env:ANDROID_HOME + "\platform-tools;" + $env:PATH

# Supabase 環境変数（.envから読み込み）
$envFile = "C:\Users\sue02\sue02AI\projects\train-position-native\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
        }
    }
}

Set-Location "C:\Users\sue02\sue02AI\projects\train-position-native\android"
& .\gradlew.bat assembleDebug
