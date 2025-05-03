apt-get update
apt-get install -y traceroute

ip route del default via 10.0.2.2
ip route add default via 192.168.30.1
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

# Permitir ICMP (ping) en el firewall
iptables -A INPUT -p icmp -j ACCEPT
iptables -A FORWARD -p icmp -j ACCEPT

# Permitir acceso desde LAN (192.168.30.0/24) a la DMZ (192.168.20.0/24)
iptables -A FORWARD -s 192.168.10.0/24 -d 192.168.20.0/24 -j ACCEPT
iptables -A FORWARD -s 192.168.10.0/24 -d 192.168.20.0/24 -p icmp -j ACCEPT

# Bloquear tráfico desde DMZ a LAN
#iptables -A FORWARD -s 192.168.20.0/24 -d 192.168.10.0/24 -j DROP

# Permitir acceso SSH desde Internet al firewall (Opcional y peligroso, restringir si es posible)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT



# Habilitar el reenvío de paquetes (Forwarding)
echo 1 > /proc/sys/net/ipv4/ip_forward
