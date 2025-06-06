def configure_cluster(config)

if RUBY_PLATFORM =~ /linux/
  $default_iface = `ip route | grep default | awk '{print $5}'`.strip
  raise "Could not detect network interface on Linux" if $default_iface.empty?

elsif RUBY_PLATFORM =~ /mswin|mingw|cygwin/
  require 'win32ole'
  nic_names = []
  wmi = WIN32OLE.connect("winmgmts://")
  wmi.ExecQuery("select * from Win32_NetworkAdapterConfiguration where IPEnabled = true").each do |nic|
    nic_names << nic.Description
  end

  # Look for an interface containing something like 'wi-fi'
  $default_iface = nic_names.find { |n| n.downcase.include?("wi-fi") || n.downcase.include?("wireless") }

  # If there is no Wi-Fi, use the first available with IP
  $default_iface ||= nic_names.first

  if $default_iface.nil?
    puts "Could not automatically detect the interface. Vagrant will ask for it."
  #else
    #puts "Detected interface: #{$default_iface}"
  end

else
  raise "Operating system not supported for automatic interface detection"
end


    # Firewall/Gateway (connects LAN, DMZ, and Internet)
    config.vm.define "firewall1" do |fw1|
      fw1.vm.box = $BOX_IMAGE
      fw1.vm.hostname = "firewall1"
      if $DUAL_FIREWALL == 1
        fw1.vm.network "private_network", type: "static", ip: "10.10.30.1" # firewall2
      else
        fw1.vm.network "private_network", type: "static", ip: "10.10.10.5" # LAN network
      end
      fw1.vm.network "private_network", type: "static", ip: "10.10.20.5" # DMZ network
      

      # Use the detected interface in public_network
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
        fw2.vm.network "private_network", type: "static", ip: "10.10.10.4" # LAN network
        fw2.vm.network "private_network", type: "static", ip: "10.10.20.4" # DMZ network
        fw2.vm.network "private_network", type: "static", ip: "10.10.30.2" # firewall1

        if $SCRIPT_FIREWALL2 != ""
          fw2.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_FIREWALL2, privileged: false
        end
  
        fw2.vm.provision "shell", path: "scripts/firewall2.sh"
      end
    end
    

    # Server in the DMZ (accessible from outside and the LAN)
    config.vm.define "dmz" do |dmz|
      dmz.vm.box = $BOX_IMAGE
      dmz.vm.hostname = "dmz"
      dmz.vm.network "private_network", type: "static", ip: "10.10.20.10" # DMZ network
      
      # Provisioning for the DMZ node
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

      # Provisioning scripts for the DMZ node
      dmz.vm.provision "shell", path: "scripts/lucid_install.sh", privileged: false
      dmz.vm.provision "shell", path: "scripts/mysql_config.sh"
      dmz.vm.provision "shell", path: "scripts/tomcat.sh", privileged: false

      # Custom script for the DMZ node
      if !$SCRIPT_LIST_DMZ[0].to_s.strip.empty?
        dmz.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_LIST_DMZ[0], privileged: false
      end

      # Provisioning for the firewall
      if $DUAL_FIREWALL == 1
        dmz.vm.provision "shell", path: "scripts/dmz.sh"
      else
        dmz.vm.provision "shell", path: "DMZ1/dmz_simple.sh"
      end
      
    end

    (1..$NODE_COUNT_DMZ).each do |i|
        config.vm.define "dmz#{i}" do |dmz|
        dmz.vm.box = $BOX_IMAGE
        dmz.vm.hostname = "dmz"
        dmz.vm.network "private_network", type: "static", ip: "10.10.20.#{10 + i}" # DMZ network
        
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

        if !$SCRIPT_LIST_DMZ[i].to_s.strip.empty?
          dmz.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_LIST_DMZ[i], privileged: false
        end

        if $DUAL_FIREWALL == 1
          dmz.vm.provision "shell", path: "scripts/dmz.sh"
        else
          dmz.vm.provision "shell", path: "DMZ1/dmz_simple.sh"
        end
        
      end
    end

    # Server in the LAN (internal access only)
    config.vm.define "lan" do |lan|
      lan.vm.box = $BOX_IMAGE
      lan.vm.hostname = "lan"
      lan.vm.network "private_network", type: "static", ip: "10.10.10.10" # Internal network (LAN)
      
      lan.vm.provision "shell", inline: <<-SHELL
        apt-get update
        apt-get install -y traceroute
        apt-get install -y mysql-server
        # Wait for MySQL to be ready
        until mysqladmin ping --silent; do
          sleep 1
        done
        cp /vagrant/scripts/mysql.sql /tmp/mysql.sql
        mysql < /tmp/mysql.sql
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
      # Server in the LAN (internal access only)
      config.vm.define "lan#{i}" do |lan|
        lan.vm.box = $BOX_IMAGE
        lan.vm.hostname = "lan#{i}"
        lan.vm.network "private_network", type: "static", ip: "10.10.10.#{i + 10}" # Internal network (LAN)
        
        lan.vm.provision "shell", inline: <<-SHELL
          apt-get update
          apt-get install -y traceroute
          apt-get install -y mysql-server
          # Wait for MySQL to be ready
          until mysqladmin ping --silent; do
            sleep 1
          done
          cp /vagrant/scripts/mysql.sql /tmp/mysql.sql
          mysql < /tmp/mysql.sql
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

        if !$SCRIPT_LIST_LANB[0].to_s.strip.empty?
          lanB.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_LIST_LANB[0], privileged: false
        end

        if $DUAL_FIREWALL == 1
          lanB.vm.provision "shell", path: "scripts/lan.sh"
        else
          lanB.vm.provision "shell", path: "DMZ1/lan_simple.sh"
        end
      end

      (1..$NODE_COUNT_LANB).each do |i|
        config.vm.define "lanB#{i}" do |lanB|
          lanB.vm.box = $BOX_IMAGE
          lanB.vm.hostname = "lanB#{i}"
          lanB.vm.network "private_network", type: "static", ip: "10.10.10.#{130 + i}" # LAN B

            if !$SCRIPT_LIST_LANB[i].to_s.strip.empty?
              lanB.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_LIST_LANB[i], privileged: false
            end

            if $DUAL_FIREWALL == 1
              lanB.vm.provision "shell", path: "scripts/lan.sh"
            else
              lanB.vm.provision "shell", path: "DMZ1/lan_simple.sh"
            end
          
        end
      end

    end

end
