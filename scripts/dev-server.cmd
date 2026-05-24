@echo off
cd /d "%~dp0.."
"E:\learn-react\node.exe" scripts\next-command.mjs dev --hostname 127.0.0.1 --port 3000 >> dev-server.log 2>> dev-server.err.log
