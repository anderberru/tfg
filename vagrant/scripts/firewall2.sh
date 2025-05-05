apt-get update
apt-get install -y traceroute

#ip route del default via 10.0.2.2
ip route add 10.10.0.0/16 via 10.10.30.1
#ip route add 10.10.10.0/25 dev eth4
#ip route add 10.10.10.128/25 dev eth5
# Limpiar reglas previas
iptables -F
iptables -X
iptables -Z
iptables -t nat -F

# Política por defecto: bloquear todo
#iptables -P INPUT DROP
#iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Permitir tráfico de lo que ya está establecido o relacionado
iptables -A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT

# Permitir acceso SSH y otros servicios necesarios al firewall desde LAN
iptables -A INPUT -s 10.10.10.0/24 -p tcp --dport 22 -j ACCEPT


# Asegurar que el tráfico de la LAN A y LAN B se enrute correctamente
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.10.128/25 -j ACCEPT
iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.10.0/25 -j ACCEPT

# bloquear tráfico desde LANB A a DMZ
iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.20.0/24 -j DROP
iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.20.0/24 -p icmp -j DROP

# Permitir acceso desde LAN (10.10.10.0/24) a la DMZ (10.10.20.0/24)
#iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -j ACCEPT
#iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -p icmp -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.20.0/24 -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.20.0/24 -p icmp -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.20.0/24 -p tcp --dport 3306 -j ACCEPT
iptables -A FORWARD -s 10.10.20.0/24 -d 10.10.10.0/25 -p tcp --dport 3306 -j ACCEPT
iptables -A FORWARD -p tcp --dport 3306 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 3306 -d 10.10.10.10 -j ACCEPT
iptables -A INPUT -p tcp --dport 3306 -s 10.10.10.10 -j ACCEPT


# Bloquear tráfico desde DMZ a LAN
iptables -A FORWARD -s 10.10.20.0/24 -d 10.10.10.0/24 -j DROP

# Permitir ICMP (ping) en el firewall
iptables -A INPUT -p icmp -j ACCEPT
iptables -A FORWARD -p icmp -j ACCEPT

# Permitir acceso SSH desde Internet al firewall (Opcional y peligroso, restringir si es posible)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT



# Habilitar el reenvío de paquetes (Forwarding)
echo 1 > /proc/sys/net/ipv4/ip_forward
