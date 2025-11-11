@echo off
:: Changer le chemin ci-dessous selon l'endroit où tu as installé le JDK 17
set JAVA_HOME=C:\Program Files\Java\jdk-17
::set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-11.0.25.9-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

cd /d "%~dp0"
gradlew.bat assembleRelease