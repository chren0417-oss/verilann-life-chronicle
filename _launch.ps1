# Verilann launcher
$root = "C:\Users\102251\Documents\维尔兰人生模拟器-完整版"
$url  = "http://localhost:3018/"
$listening = netstat -ano | Select-String ":3018" | Select-String "LISTENING"
if (-not $listening) {
    Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList "$root\node_modules\vinext\dist\cli.js","dev","--port","3018" -WorkingDirectory $root
    for ($i = 0; $i -lt 40; $i++) { Start-Sleep -Seconds 1; if (netstat -ano | Select-String ":3018" | Select-String "LISTENING") { break } }
}
Start-Process $url