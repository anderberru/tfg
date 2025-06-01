class VMachine {
  constructor(name, state, isFirewall, script="", isBad=0, showMenu=false) {
    this.name = name;
    this.state = state;
    this.isFirewall = isFirewall;
    this.script = script;
    this.isBad = isBad;
    this.showMenu = showMenu;
  }

}

export default VMachine;