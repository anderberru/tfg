class VMachine {
  constructor(name, state, isFirewall, script="", isBad=0) {
    this.name = name;
    this.state = state;
    this.isFirewall = isFirewall;
    this.script = script;
    this.isBad = isBad;
  }

}

export default VMachine;