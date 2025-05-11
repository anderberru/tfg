def configure_cluster(config)
    config.vm.define "server" do |ser|
        ser.vm.box = $BOX_IMAGE
        ser.vm.hostname = "server"
        ser.vm.network "private_network", type: "static", ip: "10.10.10.2"

        ser.vm.provision "shell", path: "scripts/learning/flower_setup.sh", privileged: false
    end

    config.vm.define "client1" do |cl1|
        cl1.vm.box = $BOX_IMAGE
        cl1.vm.hostname = "client1"
        cl1.vm.network "private_network", type: "static", ip: "10.10.10.3"

        cl1.vm.provision "shell", path: "scripts/learning/flower_setup.sh", privileged: false
    end

    config.vm.define "client2" do |cl2|
        cl2.vm.box = $BOX_IMAGE
        cl2.vm.hostname = "client2"
        cl2.vm.network "private_network", type: "static", ip: "10.10.10.4"

        cl2.vm.provision "shell", path: "scripts/learning/flower_setup.sh", privileged: false
    end

end