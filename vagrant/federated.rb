def configure_cluster(config)
    config.vm.define "server" do |ser|
        ser.vm.box = $BOX_IMAGE
        ser.vm.hostname = "server"
        ser.vm.network "private_network", type: "static", ip: "10.10.10.2"

        ser.vm.provision "shell", path: "scripts/flower_setup.sh", args: [0], privileged: false
        if $SCRIPT_SERVER != ""
            ser.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_SERVER, privileged: false
        end
    end

    (1..$NODE_COUNT_CLIENT).each do |i|
        config.vm.define "client#{i}" do |cl|
            cl.vm.box = $BOX_IMAGE
            cl.vm.hostname = "client#{i}"
            cl.vm.network "private_network", type: "static", ip: "10.10.10.#{i + 2}"

            cl.vm.provision "shell", path: "scripts/flower_setup.sh", args: [$BAD_CLIENT[i]], privileged: false
            if !$SCRIPT_LIST_CLIENT[i].to_s.strip.empty?
                cl.vm.provision "shell", path: $CUSTOM_SCRIPT_DIR+$SCRIPT_LIST_CLIENT[i], privileged: false
            end
        end
    end
    
end


