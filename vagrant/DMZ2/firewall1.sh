apt-get update
apt-get install -y traceroute

ip route del default via 10.0.2.2
# Limpiar reglas previas
iptables -F
iptables -X
iptables -Z
iptables -t nat -F

# Política por defecto: bloquear todo
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Permitir tráfico de lo que ya está establecido o relacionado
iptables -A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT

# Permitir acceso SSH y otros servicios necesarios al firewall desde LAN
iptables -A INPUT -s 192.168.10.0/24 -p tcp --dport 22 -j ACCEPT
iptables -A FORWARD -p tcp -d 192.168.20.0/24 --dport 3306 -j ACCEPT

# Permitir ICMP (ping) en el firewall
sudo iptables -A INPUT -p icmp -j ACCEPT
sudo iptables -A FORWARD -p icmp -j ACCEPT

# Permitir acceso desde firewall2 (192.168.30.0/24) a la DMZ (192.168.20.0/24)
iptables -A FORWARD -s 192.168.30.0/24 -d 192.168.20.0/24 -j ACCEPT
sudo iptables -A FORWARD -s 192.168.30.0/24 -d 192.168.20.0/24 -p icmp -j ACCEPT

# Bloquear tráfico desde DMZ a LAN
#iptables -A FORWARD -s 192.168.20.0/24 -d 192.168.10.0/24 -j DROP

# Reenviar el tráfico que llega al puerto 8080 del firewall a la IP de la DMZ
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 192.168.20.10:8080

# Permitir que el tráfico hacia el puerto 8080 de la DMZ pase por el firewall
iptables -A FORWARD -p tcp -d 192.168.20.10 --dport 8080 -j ACCEPT

# Permitir acceso desde Internet a DMZ (Ejemplo: HTTP y HTTPS)
iptables -A FORWARD -p tcp -d 192.168.20.10 --dport 80 -j ACCEPT
iptables -A FORWARD -p tcp -d 192.168.20.10 --dport 443 -j ACCEPT

# Permitir acceso SSH desde Internet al firewall (Opcional y peligroso, restringir si es posible)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Permitir NAT para que la DMZ y la LAN accedan a Internet
iptables -t nat -A POSTROUTING -o eth3 -j MASQUERADE  # eth0 es la interfaz de Internet

# Habilitar el reenvío de paquetes (Forwarding)
echo 1 > /proc/sys/net/ipv4/ip_forward
