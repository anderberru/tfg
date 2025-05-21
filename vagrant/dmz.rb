def configure_cluster(config)

  # Detectar sistema operativo y obtener interfaz con salida a Internet solo una vez
if RUBY_PLATFORM =~ /linux/
  $default_iface = `ip route | grep default | awk '{print $5}'`.strip
  raise "No se pudo detectar la interfaz de red en Linux" if $default_iface.empty?

elsif RUBY_PLATFORM =~ /mswin|mingw|cygwin/
  require 'win32ole'
  nic_names = []
  wmi = WIN32OLE.connect("winmgmts://")
  wmi.ExecQuery("select * from Win32_NetworkAdapter where NetConnectionStatus = 2").each do |nic|
    nic_names << nic.NetConnectionID
  end
  $default_iface = nic_names.find { |n| n&.downcase&.include?("wi-fi") } || nic_names.first
  raise "No se pudo detectar interfaz de red conectada" if $default_iface.nil?

else
  raise "Sistema operativo no soportado para detección automática de interfaz"
end


    # Firewall/Gateway (conecta LAN, DMZ e Internet)
    config.vm.define "firewall1" do |fw1|
      fw1.vm.box = $BOX_IMAGE
      fw1.vm.hostname = "firewall1"
      if $DUAL_FIREWALL == 1
        fw1.vm.network "private_network", type: "static", ip: "10.10.30.1" # firewall2
      else
        fw1.vm.network "private_network", type: "static", ip: "10.10.10.5" # Red LAN
      end
      fw1.vm.network "private_network", type: "static", ip: "10.10.20.5" # Red DMZ
      
      

      # Usar la interfaz detectada en public_network
      fw1.vm.network "public_network", bridge: $default_iface

      if $SCRIPT_FIREWALL1 != ""
        fw1.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_FIREWALL1, privileged: false
      end
      
      if $DUAL_FIREWALL == 1
        fw1.vm.provision "shell", path: "scripts/firewall1.sh"
      else
        fw1.vm.provision "shell", path: "DMZ1/firewall_simple.sh"
      end
    end

    if $DUAL_FIREWALL == 1
      config.vm.define "firewall2" do |fw2|
        fw2.vm.box = $BOX_IMAGE
        fw2.vm.hostname = "firewall2"
        fw2.vm.network "private_network", type: "static", ip: "10.10.10.4" # Red LAN
        fw2.vm.network "private_network", type: "static", ip: "10.10.20.4" # Red DMZ
        fw2.vm.network "private_network", type: "static", ip: "10.10.30.2" # firewall1

        if $SCRIPT_FIREWALL2 != ""
          fw2.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_FIREWALL2, privileged: false
        end
  
        fw2.vm.provision "shell", path: "scripts/firewall2.sh"
      end
    end
    

    # Servidor en la DMZ (accesible desde el exterior y la LAN)
    config.vm.define "dmz" do |dmz|
      dmz.vm.box = $BOX_IMAGE
      dmz.vm.hostname = "dmz"
      dmz.vm.network "private_network", type: "static", ip: "10.10.20.10" # DMZ network
      
      dmz.vm.provision "shell", inline: <<-SHELL
        apt-get update
        apt-get install -y avahi-daemon libnss-mdns
        apt-get install -y openjdk-21-jdk
        apt-get install -y traceroute
        apt-get install -y mysql-server
        echo "debconf debconf/frontend select Noninteractive" | debconf-set-selections
        echo "wireshark-common wireshark-common/install-setuid boolean true" | debconf-set-selections
        DEBIAN_FRONTEND=noninteractive apt-get install -y tshark
        apt-get install -y unzip
        # Wait for MySQL to be ready
        until mysqladmin ping --silent; do
          sleep 1
        done
      SHELL

      dmz.vm.provision "shell", path: "scripts/lucid_install.sh", privileged: false
      dmz.vm.provision "shell", path: "scripts/mysql_config.sh"
      dmz.vm.provision "shell", path: "scripts/tomcat.sh", privileged: false

      if !$SCRIPT_LIST_DMZ[0].to_s.strip.empty?
        dmz.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_LIST_DMZ[0], privileged: false
      end

      if $DUAL_FIREWALL == 1
        dmz.vm.provision "shell", path: "scripts/dmz.sh"
      else
        dmz.vm.provision "shell", path: "DMZ1/dmz_simple.sh"
      end
      
    end

    # Servidor en la LAN (solo acceso interno)
    config.vm.define "lan" do |lan|
      lan.vm.box = $BOX_IMAGE
      lan.vm.hostname = "lan"
      lan.vm.network "private_network", type: "static", ip: "10.10.10.10" # Red interna (LAN)
      
      lan.vm.provision "shell", inline: <<-SHELL
        apt-get update
        apt-get install -y traceroute
        apt-get install -y mysql-server
        # Esperar a que MySQL esté listo
        until mysqladmin ping --silent; do
          sleep 1
        done
        cp /vagrant/scripts/mysql.sql /tmp/mysql.sql
        mysql < /tmp/mysql.sql
        #mysql -u struts -p'password' -e "CREATE DATABASE struts;"
      SHELL

      lan.vm.provision "shell", path: "scripts/mysql_config.sh"

      if !$SCRIPT_LIST_LAN[0].to_s.strip.empty?
        lan.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_LIST_LAN[0], privileged: false
      end

      if $DUAL_FIREWALL == 1
        lan.vm.provision "shell", path: "scripts/lan.sh"
      else
        lan.vm.provision "shell", path: "DMZ1/lan_simple.sh"
      end

    end


    (1..$NODE_COUNT_LAN).each do |i|
      # Servidor en la LAN (solo acceso interno)
      config.vm.define "lan#{i}" do |lan|
        lan.vm.box = $BOX_IMAGE
        lan.vm.hostname = "lan#{i}"
        lan.vm.network "private_network", type: "static", ip: "10.10.10.#{i + 10}" # Red interna (LAN)
        
        lan.vm.provision "shell", inline: <<-SHELL
          apt-get update
          apt-get install -y traceroute
          apt-get install -y mysql-server
          # Esperar a que MySQL esté listo
          until mysqladmin ping --silent; do
            sleep 1
          done
          cp /vagrant/scripts/mysql.sql /tmp/mysql.sql
          mysql < /tmp/mysql.sql
          #mysql -u struts -p'password' -e "CREATE DATABASE struts;"
        SHELL

        lan.vm.provision "shell", path: "scripts/mysql_config.sh"

        if !$SCRIPT_LIST_LAN[i].to_s.strip.empty?
          lan.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_LIST_LAN[i], privileged: false
        end

        if $DUAL_FIREWALL == 1
          lan.vm.provision "shell", path: "scripts/lan.sh"
        else
          lan.vm.provision "shell", path: "DMZ1/lan_simple.sh"
        end

      end

    end

    if $LAN_SUBNET == 1
      config.vm.define "lanB" do |lanB|
        lanB.vm.box = $BOX_IMAGE
        lanB.vm.hostname = "lanB"
        lanB.vm.network "private_network", type: "static", ip: "10.10.10.130" # LAN B

        if $SCRIPT_LANB != ""
          lanB.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_LANB, privileged: false
        end

        if $DUAL_FIREWALL == 1
          lanB.vm.provision "shell", path: "scripts/lan.sh"
        else
          lanB.vm.provision "shell", path: "DMZ1/lan_simple.sh"
        end
      end
    end

end
