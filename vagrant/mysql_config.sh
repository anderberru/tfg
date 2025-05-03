#!/bin/bash
# mysql -u struts -p'password' -h 10.10.10.10
ARCHIVO="/etc/mysql/mysql.conf.d/mysqld.cnf"
BACKUP="/etc/mysql/mysql.conf.d/mysqld.cnf.bak"

# Hacer backup por si acaso
sudo cp "$ARCHIVO" "$BACKUP"

# Cambiar el bind-address a 0.0.0.0 si existe, si no, añadirlo
if grep -q "^bind-address" "$ARCHIVO"; then
    sudo sed -i 's/^bind-address.*/bind-address = 0.0.0.0/' "$ARCHIVO"
else
    echo "bind-address = 0.0.0.0" | sudo tee -a "$ARCHIVO"
fi

# Reiniciar MySQL
sudo systemctl restart mysql

echo "bind-address cambiado a 0.0.0.0 y MySQL reiniciado."
