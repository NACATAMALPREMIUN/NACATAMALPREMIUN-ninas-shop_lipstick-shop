
@echo off
:: 1. Extractor Universal de Fecha y Hora (Formato de 24 horas limpio)
for /f "tokens=1-5 delims=-" %%A in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd-HH-mm'"') do (
    set FECHA=%%A-%%B-%%C
    set HORA=%%D:%%E
    set FECHA_HORA=%%A-%%B-%%C_%%D-%%E
)

:: 2. Configurar tus datos de MySQL
set USUARIO=root
set PASSWORD=arroz234
set BASE_DATOS=ninas_shop
set CARPETA_DESTINO=C:\MisRespaldosMySQL

:: 3. Configurar tus datos de GMAIL (Nota: Node.js ahora gestionará estas credenciales internamente)
set CORREO_EMISOR=eliasalejandrotellezparrales@gmail.com
set GMAIL_APP_PASSWORD=leidubgdzngulfng
set CORREO_RECEPTOR=tellezparraleseliasalejandro@gmail.com

:: 4. Crear la carpeta si no existe
if not exist "%CARPETA_DESTINO%" mkdir "%CARPETA_DESTINO%"

:: 5. Ejecutar el respaldo usando la variable de tiempo corregida
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u %USUARIO% -p%PASSWORD% %BASE_DATOS% > "%CARPETA_DESTINO%\respaldo_%BASE_DATOS%_%FECHA_HORA%.sql" 2> "%CARPETA_DESTINO%\tmp_error.txt"

:: 6. LA ALERTA POR GMAIL: Verificar si el comando falló
if %ERRORLEVEL% NEQ 0 (
    echo [ALERTA] Ocurrio un error en el respaldo. Enviando correo con Node.js...
    
    :: Guardamos el error detallado del archivo de texto en una variable
    set /p DETALLE_ERROR=<"%CARPETA_DESTINO%\tmp_error.txt"
    
    :: Invocamos el script de Node.js pasando el nombre de la BD y el error como argumentos seguros
    node "C:\Users\elias\OneDrive\Documentos\pagina2\alerta.js" "%BASE_DATOS%" "%DETALLE_ERROR%"
    
    :: Limpiar el archivo temporal de error
    del "%CARPETA_DESTINO%\tmp_error.txt"
    exit /b %ERRORLEVEL%
)

:: Si todo sale bien, limpiar temporales vacíos
if exist "%CARPETA_DESTINO%\tmp_error.txt" del "%CARPETA_DESTINO%\tmp_error.txt"
echo Respaldado exitosamente el %FECHA% a las %HORA%
=======
@echo off
:: 1. Extractor Universal de Fecha y Hora (Formato de 24 horas limpio)
for /f "tokens=1-5 delims=-" %%A in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd-HH-mm'"') do (
    set FECHA=%%A-%%B-%%C
    set HORA=%%D:%%E
    set FECHA_HORA=%%A-%%B-%%C_%%D-%%E
)

:: 2. Configurar tus datos de MySQL
set USUARIO=root
set PASSWORD=NacatamalxD2006
set BASE_DATOS=ninas_shop
set CARPETA_DESTINO=C:\MisRespaldosMySQL

:: 3. Configurar tus datos de GMAIL (Nota: Node.js ahora gestionará estas credenciales internamente)
set CORREO_EMISOR=eliasalejandrotellezparrales@gmail.com
set GMAIL_APP_PASSWORD=leidubgdzngulfng
set CORREO_RECEPTOR=tellezparraleseliasalejandro@gmail.com

:: 4. Crear la carpeta si no existe
if not exist "%CARPETA_DESTINO%" mkdir "%CARPETA_DESTINO%"

:: 5. Ejecutar el respaldo usando la variable de tiempo corregida
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u %USUARIO% -p%PASSWORD% %BASE_DATOS% > "%CARPETA_DESTINO%\respaldo_%BASE_DATOS%_%FECHA_HORA%.sql" 2> "%CARPETA_DESTINO%\tmp_error.txt"

:: 6. LA ALERTA POR GMAIL: Verificar si el comando falló
if %ERRORLEVEL% NEQ 0 (
    echo [ALERTA] Ocurrio un error en el respaldo. Enviando correo con Node.js...
    
    :: Guardamos el error detallado del archivo de texto en una variable
    set /p DETALLE_ERROR=<"%CARPETA_DESTINO%\tmp_error.txt"
    
    :: Invocamos el script de Node.js pasando el nombre de la BD y el error como argumentos seguros
    node "C:\Users\elias\OneDrive\Documentos\pagina2\alerta.js" "%BASE_DATOS%" "%DETALLE_ERROR%"
    
    :: Limpiar el archivo temporal de error
    del "%CARPETA_DESTINO%\tmp_error.txt"
    exit /b %ERRORLEVEL%
)

:: Si todo sale bien, limpiar temporales vacíos
if exist "%CARPETA_DESTINO%\tmp_error.txt" del "%CARPETA_DESTINO%\tmp_error.txt"
echo Respaldado exitosamente el %FECHA% a las %HORA%

