sudo iptables -A OUTPUT -p icmp -j ACCEPT
sudo iptables -A INPUT -p icmp -j ACCEPT

sudo iptables -A INPUT -s 192.168.10.0/24 -d 192.168.10.4 -j ACCEPT

sudo iptables -A FORWARD -s 192.168.10.0/24 -d 192.168.20.0/24 -j ACCEPT

iptables -A OUTPUT -p icmp -j ACCEPT
iptables -A OUTPUT -d 192.168.10.4 -j ACCEPT


# Permitir acceso SSH a la DMZ (para vagrant ssh)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

echo 1 > /proc/sys/net/ipv4/ip_forward
