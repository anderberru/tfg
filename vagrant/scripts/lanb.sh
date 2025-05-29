apt-get update
apt-get install -y traceroute
#ip route del default via 10.0.2.2
#ip route del default via 192.168.1.1
ip route add 10.10.0.0/16 via 10.10.10.4

sudo iptables -A OUTPUT -p icmp -j ACCEPT
sudo iptables -A INPUT -p icmp -j ACCEPT

sudo iptables -A INPUT -s 10.10.10.0/24 -d 10.10.10.4 -j ACCEPT

#sudo iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.20.0/24 -j DROP

iptables -A OUTPUT -p icmp -j ACCEPT
iptables -A OUTPUT -d 10.10.10.4 -j ACCEPT


# Allow SSH access to the DMZ (for vagrant ssh)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

echo 1 > /proc/sys/net/ipv4/ip_forward
