#!/bin/bash
# mysql -u struts -p'password' -h 10.10.10.10
ARCHIVO="/etc/mysql/mysql.conf.d/mysqld.cnf"
BACKUP="/etc/mysql/mysql.conf.d/mysqld.cnf.bak"

# Make a backup just in case
sudo cp "$ARCHIVO" "$BACKUP"

# Change bind-address to 0.0.0.0 if it exists, otherwise add it
if grep -q "^bind-address" "$ARCHIVO"; then
    sudo sed -i 's/^bind-address.*/bind-address = 0.0.0.0/' "$ARCHIVO"
else
    echo "bind-address = 0.0.0.0" | sudo tee -a "$ARCHIVO"
fi

# Restart MySQL
sudo systemctl restart mysql

echo "bind-address changed to 0.0.0.0 and MySQL restarted."
