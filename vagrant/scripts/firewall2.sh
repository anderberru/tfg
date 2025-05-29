apt-get update
apt-get install -y traceroute

#ip route del default via 10.0.2.2
ip route add 10.10.0.0/16 via 10.10.30.1
#ip route add 10.10.10.0/25 dev eth4
#ip route add 10.10.10.128/25 dev eth5
# Clear previous rules
iptables -F
iptables -X
iptables -Z
iptables -t nat -F

# Default policy: block everything
#iptables -P INPUT DROP
#iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow traffic that is already established or related
iptables -A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT

# Allow SSH access and other necessary services to the firewall from LAN
iptables -A INPUT -s 10.10.10.0/24 -p tcp --dport 22 -j ACCEPT

# Ensure that traffic between LAN A and LAN B is routed correctly
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.10.128/25 -j ACCEPT
iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.10.0/25 -j ACCEPT

# Block traffic from LAN B to DMZ
iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.20.0/24 -j DROP
iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.20.0/24 -p icmp -j DROP

# Allow access from LAN (10.10.10.0/24) to DMZ (10.10.20.0/24)
#iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -j ACCEPT
#iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -p icmp -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.20.0/24 -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.20.0/24 -p icmp -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.20.0/24 -p tcp --dport 3306 -j ACCEPT
iptables -A FORWARD -s 10.10.20.0/24 -d 10.10.10.0/25 -p tcp --dport 3306 -j ACCEPT
iptables -A FORWARD -p tcp --dport 3306 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 3306 -d 10.10.10.10 -j ACCEPT
iptables -A INPUT -p tcp --dport 3306 -s 10.10.10.10 -j ACCEPT

# Block traffic from DMZ to LAN
iptables -A FORWARD -s 10.10.20.0/24 -d 10.10.10.0/24 -j DROP

# Allow ICMP (ping) on the firewall
iptables -A INPUT -p icmp -j ACCEPT
iptables -A FORWARD -p icmp -j ACCEPT

# Allow SSH access from the Internet to the firewall (Optional and dangerous, restrict if possible)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Enable packet forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward
