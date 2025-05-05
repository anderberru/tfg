#!/bin/bash

# Movernos al directorio home de vagrant
cd /home/vagrant || exit
mkdir files

# Descargar Tomcat
echo "Instalando Apache Tomcat..."
echo "Copiando aplicaciones Struts a Tomcat..."
if [ -d "/vagrant/programs" ]; then
    cp /vagrant/programs/* ./
else
    echo "Advertencia: No se encontraron aplicaciones en /vagrant/programs"
fi

# Verificar si la descarga fue exitosa
if [ ! -f "apache-tomcat-9.0.100.tar.gz" ]; then
    echo "Error: No se pudo descargar Tomcat"
    exit 1
fi

# Extraer Tomcat
echo "Extrayendo Apache Tomcat..."
tar -xvzf apache-tomcat-9.0.100.tar.gz

# Verificar si la extracción fue exitosa
if [ ! -d "apache-tomcat-9.0.100" ]; then
    echo "Error: No se pudo extraer Tomcat"
    exit 1
fi

# Mover la carpeta a 'tomcat'
echo "Moviendo Apache Tomcat a ~/tomcat..."
mv apache-tomcat-9.0.100 tomcat

# Verificar si la carpeta fue movida
if [ ! -d "tomcat" ]; then
    echo "Error: No se pudo mover Tomcat"
    exit 1
fi

# Copiar las aplicaciones de Struts si existen
echo "Copiando aplicaciones Struts a Tomcat..."
if [ -d "/vagrant/struts" ]; then
    cp /vagrant/struts/* ~/tomcat/webapps/
else
    echo "Advertencia: No se encontraron aplicaciones en /vagrant/struts"
fi

# Iniciar Tomcat
echo "Iniciando Tomcat..."
cd ~/tomcat/bin || exit
./startup.sh
