apt-get update
apt-get install -y traceroute

# ip route del default via 10.0.2.2
ip route add default via 192.168.1.1 dev eth3

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
iptables -A FORWARD -p tcp -d 10.10.20.0/24 --dport 3306 -j ACCEPT

# Allow DMZ network to access the Internet
iptables -A FORWARD -s 10.10.20.0/24 -o eth3 -j ACCEPT
iptables -A FORWARD -d 10.10.20.0/24 -m state --state ESTABLISHED,RELATED -i eth3 -j ACCEPT
iptables -t nat -A POSTROUTING -o eth3 -s 10.10.20.0/24 -j MASQUERADE

# Allow ICMP (ping) on the firewall
iptables -A INPUT -p icmp -j ACCEPT
iptables -A FORWARD -p icmp -j ACCEPT

# Allow access from firewall2 (10.10.30.0/24) to the DMZ (10.10.20.0/24)
iptables -A FORWARD -s 10.10.30.0/24 -d 10.10.20.0/24 -j ACCEPT
iptables -A FORWARD -s 10.10.30.0/24 -d 10.10.20.0/24 -p icmp -j ACCEPT

# Block traffic from DMZ to LAN
#iptables -A FORWARD -s 10.10.20.0/24 -d 10.10.10.0/24 -j DROP

# Allow traffic to port 8080 of the DMZ through the firewall
iptables -A FORWARD -p tcp -d 10.10.20.0/24 --dport 8080 -j ACCEPT

# Allow access from Internet to DMZ (Example: HTTP and HTTPS)
iptables -A FORWARD -p tcp -d 10.10.20.0/24 --dport 80 -j ACCEPT
iptables -A FORWARD -p tcp -d 10.10.20.0/24 --dport 443 -j ACCEPT

# Redirect traffic from port 8080 of eth3 (host) to Tomcat in DMZ
iptables -t nat -A PREROUTING -i eth3 -p tcp --dport 8080 -j DNAT --to-destination 10.10.20.10:8080

# Ensure responses return correctly to the host
iptables -t nat -A POSTROUTING -o eth2 -j MASQUERADE

# Accept FORWARD traffic to allow Tomcat access
iptables -A FORWARD -i eth3 -o eth2 -p tcp --dport 8080 -d 10.10.20.10 -j ACCEPT

# Allow NAT so DMZ and LAN can access the Internet
iptables -t nat -A POSTROUTING -o eth3 -j MASQUERADE  # eth0 is the Internet interface

# Forward traffic arriving at port 8080 of the firewall to the DMZ IP
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 10.10.20.10:8080

# Allow traffic to port 8080 of the DMZ through the firewall
iptables -A FORWARD -p tcp -d 10.10.20.10 --dport 8080 -j ACCEPT

# Allow access from Internet to DMZ (Example: HTTP and HTTPS)
iptables -A FORWARD -p tcp -d 10.10.20.10 --dport 80 -j ACCEPT
iptables -A FORWARD -p tcp -d 10.10.20.10 --dport 443 -j ACCEPT

# Allow SSH access from Internet to the firewall (Optional and dangerous, restrict if possible)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow NAT so DMZ can access the Internet
iptables -t nat -A POSTROUTING -o eth3 -j MASQUERADE  # eth3 is the Internet interface

# Enable packet forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward
