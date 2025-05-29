ip route add 10.10.0.0/16 via 10.10.20.5

# Specific routes for the LAN (firewall2)
#ip route add 192.168.10.0/24 via 192.168.20.5

#ip route del default via 10.0.2.2
#ip route del default via 192.168.1.1
#ip route add default via 192.168.20.5

# Clear previous rules
iptables -F
iptables -X
iptables -Z

# Default policy
#iptables -P INPUT DROP
#iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow traffic that is already established or related
iptables -A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT

# Allow ICMP (ping) in the DMZ
iptables -A INPUT -p icmp -j ACCEPT
iptables -A OUTPUT -p icmp -j ACCEPT

iptables -A INPUT -s 10.10.20.5 -p tcp --dport 8080 -j ACCEPT

# Allow HTTP and HTTPS access from the Internet
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
# Allow SSH access to the DMZ (for vagrant ssh)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 3306 -j ACCEPT
iptables -A FORWARD -p tcp --dport 3306 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 3306 -d 10.10.10.0/24 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 3306 -d 10.10.10.10 -j ACCEPT

# Block connection attempts to the LAN
iptables -A OUTPUT -d 10.10.30.0/24 -j ACCEPT
iptables -A INPUT -d 10.10.30.0/24 -j ACCEPT

iptables -A OUTPUT -d 10.10.20.0/24 -j ACCEPT
iptables -A INPUT -d 10.10.20.0/24 -j ACCEPT

iptables -A OUTPUT -d 10.10.20.5 -j ACCEPT
iptables -A INPUT -d 10.10.20.5 -j ACCEPT

# Block connection attempts to the LAN
#iptables -A OUTPUT -d 10.10.10.0/24 -j DROP
#iptables -A OUTPUT -p icmp -d 10.10.10.0/24 -j DROP

echo 1 > /proc/sys/net/ipv4/ip_forward
