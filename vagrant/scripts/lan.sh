#ip route del default via 10.0.2.2
#ip route del default via 192.168.1.1
ip route add 10.10.0.0/16 via 10.10.10.4

iptables -A OUTPUT -p icmp -j ACCEPT
iptables -A INPUT -p icmp -j ACCEPT

iptables -A INPUT -s 10.10.10.0/24 -d 10.10.10.4 -j ACCEPT

iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -j ACCEPT

iptables -A OUTPUT -p icmp -j ACCEPT
iptables -A OUTPUT -d 10.10.10.4 -j ACCEPT

iptables -A OUTPUT -p tcp --dport 3306 -j ACCEPT
iptables -A INPUT -p tcp --dport 3306 -j ACCEPT

# Permitir acceso SSH a la DMZ (para vagrant ssh)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

echo 1 > /proc/sys/net/ipv4/ip_forward
