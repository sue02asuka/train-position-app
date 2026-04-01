$env:ANDROID_HOME = "C:\Users\sue02\AppData\Local\Android\Sdk"
$env:PATH = $env:ANDROID_HOME + "\platform-tools;" + $env:PATH

$apkPath = "C:\Users\sue02\sue02AI\projects\train-position-native\android\app\build\outputs\apk\debug\app-debug.apk"

Write-Host "Installing APK..."
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r $apkPath
