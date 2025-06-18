ip route add default via 192.168.1.1 dev eth3

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

iptables -A FORWARD -p tcp --dport 8080 -d 10.10.20.10 -j ACCEPT
iptables -t nat -A POSTROUTING -o eth3 -j MASQUERADE

# Ensure that traffic between LAN A and LAN B is routed correctly
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.10.128/25 -j ACCEPT
iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.10.0/25 -j ACCEPT

# Allow access from LAN (10.10.10.0/24) to DMZ (10.10.20.0/24)
#iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -j ACCEPT
#iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -p icmp -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.20.0/24 -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.20.0/24 -p icmp -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/25 -d 10.10.20.0/24 -p tcp --dport 3306 -j ACCEPT
iptables -A FORWARD -s 10.10.20.0/24 -d 10.10.10.0/25 -p tcp --dport 3306 -j ACCEPT

iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -p icmp -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -p tcp --dport 3306 -j ACCEPT
iptables -A FORWARD -s 10.10.20.0/24 -d 10.10.10.0/24 -p tcp --dport 3306 -j ACCEPT

iptables -A FORWARD -p tcp --dport 3306 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 3306 -d 10.10.10.10 -j ACCEPT
iptables -A INPUT -p tcp --dport 3306 -s 10.10.10.10 -j ACCEPT

# Allow ICMP (ping) on the firewall
iptables -A INPUT -p icmp -j ACCEPT
# Block ICMP (ping) from DMZ (10.10.20.0/24) to LAN (10.10.10.0/24)
iptables -A FORWARD -s 10.10.20.0/24 -d 10.10.10.0/24 -p icmp -j DROP
iptables -A FORWARD -p icmp -j ACCEPT

# Allow SSH access from the Internet to the firewall (Optional and dangerous, restrict if possible)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Block traffic from LANB A to DMZ
iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.20.0/24 -j DROP
iptables -A FORWARD -s 10.10.10.128/25 -d 10.10.20.0/24 -p icmp -j DROP

# Allow access from LAN (10.10.10.0/24) to DMZ (10.10.20.0/24)
iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -j ACCEPT
iptables -A FORWARD -s 10.10.10.0/24 -d 10.10.20.0/24 -p tcp --dport 8080 -j ACCEPT

# Forward traffic arriving at port 8080 of the firewall to the DMZ IP
iptables -t nat -A PREROUTING -o eth2 -p tcp --dport 8080 -j DNAT --to-destination 10.10.20.10:8080
iptables -t nat -A OUTPUT -o eth2 -p tcp --dport 8080 -j DNAT --to-destination 10.10.20.10:8080

# Allow traffic to port 8080 of the DMZ to pass through the firewall
iptables -A FORWARD -p tcp -d 10.10.20.10 --dport 8080 -j ACCEPT

# Allow access from Internet to DMZ (Example: HTTP and HTTPS)
iptables -A FORWARD -p tcp -d 10.10.20.10 --dport 80 -j ACCEPT
iptables -A FORWARD -p tcp -d 10.10.20.10 --dport 443 -j ACCEPT

# Allow traffic to port 8080 of the DMZ to pass through the firewall
iptables -A FORWARD -p tcp -d 10.10.20.0/24 --dport 8080 -j ACCEPT

# Allow access from Internet to DMZ (Example: HTTP and HTTPS)
iptables -A FORWARD -p tcp -d 10.10.20.0/24 --dport 80 -j ACCEPT
iptables -A FORWARD -p tcp -d 10.10.20.0/24 --dport 443 -j ACCEPT

# Redirect traffic from port 8080 of eth3 (host) to Tomcat in DMZ
iptables -t nat -A PREROUTING -i eth3 -p tcp --dport 8080 -j DNAT --to-destination 10.10.20.10:8080

# Ensure responses return correctly to the host
iptables -t nat -A POSTROUTING -o eth2 -j MASQUERADE

# Accept FORWARD traffic to allow access to Tomcat
iptables -A FORWARD -i eth3 -o eth2 -p tcp --dport 8080 -d 10.10.20.10 -j ACCEPT

# Allow NAT so that DMZ and LAN can access the Internet
iptables -t nat -A POSTROUTING -o eth3 -j MASQUERADE  # eth0 is the Internet interface

# Block traffic from DMZ to LAN
iptables -A FORWARD -s 10.10.20.0/24 -d 10.10.10.0/24 -j DROP

# Enable packet forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward
