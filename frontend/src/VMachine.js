class VMachine {
  constructor(name, state, isFirewall, script="", isBad=0, showMenu=false) {
    this.name = name;
    this.state = state;
    this.isFirewall = isFirewall;
    this.script = script;
    this.isBad = isBad;
    this.showMenu = showMenu;

    this.updateIp(name);
  }

  updateIp(name) {
    if (name === "lan") {
      this.ip = "10.10.10.10";
    } else if (name === "dmz") {
      this.ip = "10.10.20.10";
    } else if (name === "lanB") {
      this.ip = "10.10.10.130";
    } else if (/^(lanB|lan|dmz|client)\d+$/.test(name)) {
      // For names like "lanB1", "lan1", "dmz2", "client1", etc.
      const match = name.match(/^(lanB|lan|dmz|client)(\d+)$/);
      if (match) {
      const prefix = match[1];
      const number = match[2];
      if (prefix === "lan") {
        this.ip = "10.10.10." + (10+Number(number));
      } else if (prefix === "dmz") {
        this.ip = "10.10.20." + (10+Number(number));
      } else if (prefix === "client") {
        this.ip = "10.10.10." + (2+Number(number));
      } else if (prefix === "lanB") {
        this.ip = "10.10.10." + (130+Number(number));
      }
      }
    } else if (name === "server") {
      this.ip = "10.10.10.2";
    } else {
      this.ip = "";
    }
  }

}

export default VMachine;