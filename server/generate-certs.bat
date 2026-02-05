@echo off
echo Generating self-signed SSL certificates...
set OPENSSL_PATH="C:\Program Files\Git\usr\bin\openssl.exe"

if not exist %OPENSSL_PATH% (
    echo OpenSSL not found at %OPENSSL_PATH%. Please install Git or OpenSSL.
    pause
    exit /b
)

%OPENSSL_PATH% req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

echo.
echo Certificates generated: key.pem, cert.pem
pause
