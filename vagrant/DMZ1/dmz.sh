# Limpiar reglas previas
iptables -F
iptables -X
iptables -Z

# Política por defecto
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Permitir tráfico de lo que ya está establecido o relacionado
iptables -A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT

# Permitir ICMP (ping) en la DMZ
iptables -A INPUT -p icmp -j ACCEPT
iptables -A OUTPUT -p icmp -j DROP

# Permitir acceso HTTP y HTTPS desde Internet
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
# Permitir acceso SSH a la DMZ (para vagrant ssh)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Bloquear intentos de conexión hacia la LAN
iptables -A OUTPUT -d 192.168.10.0/24 -j DROP

echo 1 > /proc/sys/net/ipv4/ip_forward

