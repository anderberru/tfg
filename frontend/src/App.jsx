import { useState, useRef, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { io } from 'socket.io-client';
import VMachine from './VMachine'
import { Terminal, Trash2, Upload, X, Plus, MoreHorizontal } from 'lucide-react';
import firewallImg from './assets/firewall.png';
import nodeImg from './assets/node.png';

function App() {
  const [pageLoaded, setPageLoaded] = useState(false)
  const [count, setCount] = useState(0)
  const [node_count_lan, setNode_count_lan] = useState(0)
  const [node_count_lanB, setNode_count_lanB] = useState(0)
  const [node_count_dmz, setNode_count_dmz] = useState(0)
  const [node_count_client, setNode_count_client] = useState(2)
  const [lan_subnet, setLan_subnet] = useState(0)
  const [dmz_type, setDmz_type] = useState(0)
  const [vm_list, setVm_list] = useState([])
  const [app_state, setApp_state] = useState("not created")
  const [output, setOutput] = useState('')
  const [processComplete, setProcessComplete] = useState(false)
  const [script_list_lan, setScript_list_lan] = useState([])
  const [script_list_dmz, setScript_list_dmz] = useState([])
  const [script_firewall1, setScript_firewall1] = useState("")
  const [script_firewall2, setScript_firewall2] = useState("")
  const [script_list_lanB, setScript_list_lanB] = useState([])
  const [script_list_client, setScript_list_client] = useState([])
  const [bad_client, setBad_client] = useState([])
  const [script_server, setScript_server] = useState("")
  const [learning, setLearning] = useState(0)
  const [vagrantVersion, setVagrantVersion] = useState("")
  const [virtualBoxVersion, setVirtualBoxVersion] = useState("")
  const [isVagrantInstalled, setIsVagrantInstalled] = useState(false)
  const [isVirtualBoxInstalled, setIsVirtualBoxInstalled] = useState(false)
  const [isSaved, setIsSaved] = useState(true)
  const [showLog, setShowLog] = useState(false);
  const [liveOutput, setLiveOutput] = useState('');

  const socket = io(); // Connects to the same host

  function OutputConsole({ output, setOutput, output_full, processComplete, visible }) {
    const consoleRef = useRef(null);

    useEffect(() => {
      const handleOutput = (data) => {
        const el = consoleRef.current;

        // Save if it was at the bottom before updating
        const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
         // Wait for the next render to scroll if necessary
        requestAnimationFrame(() => {
          if (isNearBottom) {
            el.scrollTop = el.scrollHeight;
          }
        });

        setOutput(prev => prev + data);

      };

      socket.on('vagrant-output', handleOutput);
      return () => socket.off('vagrant-output', handleOutput);
    }, []);
    // Scroll when the process finishes
    useEffect(() => {
      const el = consoleRef.current;
        requestAnimationFrame(() => {
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        });
    }, [processComplete]);
    

    return (
    <pre
        className="console"
        ref={consoleRef}
        style={{ display: visible ? 'block' : 'none' }}
      >
        {output}
      </pre>
    );
  }

  useEffect(() => {
    // This function runs only once when the page loads
    console.log('Page loaded')
    fetch('/checkTools')
    .then(res => res.json())
    .then(data => {
      let notInstalled = false;
      console.log('Installed tools:', data);
      setIsVagrantInstalled(data.vagrant.installed);
      setIsVirtualBoxInstalled(data.virtualbox.installed);
      if (data.vagrant.installed) {
        setVagrantVersion(data.vagrant.version);
      } else {
        setPageLoaded(true);
        notInstalled = true;
      }
      if (data.virtualbox.installed) {
        setVirtualBoxVersion(data.virtualbox.version);
      } else {
        setPageLoaded(true);
        notInstalled = true;
      }
      if (notInstalled) {
        return Promise.reject("VirtualBox is not installed");
      }
    }).then(() => {
      read_parameters()
      .then((data) => {
        console.log('Read parameters:', data)
        setNode_count_lan(data.node_count_lan)
        setNode_count_dmz(data.node_count_dmz)
        setNode_count_lanB(data.node_count_lanB || 0)
        setLan_subnet(data.lan_subnet)
        setDmz_type(data.dual_firewall)
        setScript_list_lan(data.script_list_lan)
        setScript_list_dmz(data.script_list_dmz)
        setScript_list_lanB(data.script_list_lanB || [])
        setScript_firewall1(data.script_firewall1)
        setScript_firewall2(data.script_firewall2)
        setLearning(data.learning || 0)
        setScript_server(data.script_server || "")
        setScript_list_client(data.script_list_client || [])
        setBad_client(data.bad_client || [])
        setNode_count_client(data.node_count_client || 2)
        return data;
      }).then((data) => {vm_status2(data);})
      .catch(error => console.error("Error:", error));
    })
  }, []) // <-- empty array = only on first render

  // This effect will run every time dmz_type changes
  useEffect(() => {
    if (!pageLoaded) return;

    const updateBackend = async () => {
      try {
        setPageLoaded(false);
        save_parameters()
        .then(() => vm_status())
        .catch(error => console.error("Error:", error));
      } catch (error) {
        console.error("Error updating parameters:", error);
      }
    };

    updateBackend();
  }, [dmz_type, learning, lan_subnet]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (app_state === "creating" || app_state === "initializing" || app_state === "stopping" || app_state === "destroying") {
        e.preventDefault();
        e.returnValue = ''; // Some browsers require this to show the message
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [app_state]);


  // sends request to the backend to start vagrant status
  function check_app_state(vmList) {
    console.log('LIST:', vmList)
    const hasRunning = vmList.some(vm => vm.state === 'running');
    const hasPoweroff = vmList.some(vm => vm.state === 'poweroff');

    if (hasRunning) {
      console.log('There are VMs in the "running" state.');
      return 'created';
    } else if (hasPoweroff) {
      console.log('There are VMs in the "poweroff" state.');
      return 'stopped';
    } else {
      console.log('There are no VMs in the "running" or "poweroff" state.');
      return 'not created';
    }
  }

  // renders the main component
  function cluster_selection() {
    return (
      <>
      <div>
      <h1>Cluster Manager</h1>
      <p>Current state: {app_state}</p>
      <label>
      Cluster type:
      <select
        disabled={app_state != "not created"}
        value={learning}
        onChange={(e) => {
        setLearning(e.target.value);
        setIsSaved(false);
        }}
      >
        <option value="0">DMZ</option>
        <option value="1">Federated system</option>
      </select>
      </label>
      {Number(learning) === 0 && (
      <>
        <label>
        LAN Subnet:
        <input
        disabled={app_state != "not created"}
        type="checkbox"
        checked={lan_subnet === 1}
        onChange={(e) => {
        setLan_subnet(e.target.checked ? 1 : 0);
        setIsSaved(false);
        }}
        />
        </label>
        <label>
        DMZ Type:
        <select
        disabled={app_state != "not created"}
        value={dmz_type}
        onChange={(e) => {
        setDmz_type(e.target.value);
        setIsSaved(false);
        }}
        >
        <option value="0">Simple</option>
        <option value="1">Dual firewall</option>
        </select>
        </label>
      </>
      )}
      <br /><br />
      {buttons()}
      
      <OutputConsole output={liveOutput} setOutput={setLiveOutput} output_full={output} processComplete={processComplete} visible={showLog}/>
      {render_vm_list()}
      </div>
      </>
    )
  }

  // renders the buttons based on the app state
  function buttons() {
    if (app_state === "not created") {
      return (
        <div id="buttons">
          <button onClick={vagrant_up}>Create</button>
          <button disabled={isSaved} onClick={save_parameters}>
            {isSaved ? "Config saved" : "Save config"}
          </button>
          <button onClick={() => {setShowLog(!showLog);}}>{showLog ? "Hide log" : "Show log"}</button>
        </div>
      )
    } else if (app_state === "creating") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_up}>Creating...</button>
          <button onClick={cancel_vagrant_up}>Cancel</button>
          <button onClick={() => {setShowLog(!showLog);}}>{showLog ? "Hide log" : "Show log"}</button>
        </div>
      )
    } else if (app_state === "created") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_up}>Running</button>
          <button onClick={vagrant_halt}>Stop All</button>
          <button onClick={vagrant_destroy}>Destroy All</button>
          <button onClick={() => {setShowLog(!showLog);}}>{showLog ? "Hide log" : "Show log"}</button>
        </div>
      )
    } else if (app_state === "stopped") {
      return (
        <div id="buttons">
          <button onClick={vagrant_up}>Initialize</button>
          <button onClick={vagrant_destroy}>Destroy All</button>
          <button onClick={() => {setShowLog(!showLog);}}>{showLog ? "Hide log" : "Show log"}</button>
        </div>
      )
    } else if (app_state === "initializing") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_up}>Initializing...</button>
          <button onClick={cancel_vagrant_up}>Cancel</button>
          <button onClick={() => {setShowLog(!showLog);}}>{showLog ? "Hide log" : "Show log"}</button>
        </div>
      )
    } else if (app_state === "stopping") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_halt}>Stopping...</button>
          <button onClick={() => {setShowLog(!showLog);}}>{showLog ? "Hide log" : "Show log"}</button>
        </div>
      )
    } else if (app_state === "destroying") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_destroy}>Destroying...</button>
          <button onClick={() => {setShowLog(!showLog);}}>{showLog ? "Hide log" : "Show log"}</button>
        </div>
      )
    }
  }

  // renders the buttons for uploading files
  function UploadFileButton({ name, script, app_state, upload_file, remove_script }) {
  const fileInputRef = useRef();

  return (
    <>
      <p>Custom script: {script + " "}</p>
      <div className="upload-buttons">
        <button
          title={script === "" ? "Upload Script" : "Change Script"}
          disabled={app_state !== "not created"}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <Upload size={16} />
        </button>

        {script !== "" && (
          <button
            title="Delete Script"
            disabled={app_state !== "not created"}
            onClick={() => remove_script(name)}
          >
            <div className="icon-stack">
              <Upload size={16} />
              <X size={12} className="icon-overlay" />
            </div>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        id={`file-upload-${name}`}
        type="file"
        style={{ display: "none" }}
        onChange={(event) => {
          upload_file(event, name);
          event.target.value = null;
        }}
      />
    </>
  );
}

  // renders the VM box with all the information
  function v_box(name, state, isFirewall, script, isBad, show, ip) {
    return (
      <div className="v-box">
      <h2>
        <button title="Open VM console" disabled={state != "running"} onClick={() => open_vm_console(name)}><Terminal size={16} /></button>
        {" " + name + " "}
        {delete_vm_button(name)}
      </h2>
      <p>{name == "firewall1" ? "Internet access" : ip}</p>
      {name == "firewall2" && (<p>Firewall 2</p>)}
      <p>
        {isFirewall ? (
        <img className='vm_image' src={firewallImg} alt="Firewall" />
        ) : (
        <img className='vm_image' src={nodeImg} alt="Machine" />
        )}
      </p>
      <p>{state}</p>
      <button
        title={show ? "Close options" : "More options"}
        onClick={() => enable_vm_menu(name)}
      >
        {show ? <X size={16} /> : <MoreHorizontal size={16} />}
      </button>
      {vm_more_options(name, isBad, state, script, show)}
      </div>
    )
  }

  // renders options submenu for the VM
  function vm_more_options(name, isBad, state, script, show) {
    if (show) {
      return (
        <>
        <div className={name.includes("client") ? "v-box popup2" : "v-box popup"}>
          <UploadFileButton
            name={name}
            script={script}
            app_state={app_state}
            upload_file={upload_file}
            remove_script={remove_script}
          />
          {bad_client_button(name, isBad)}
          </div>
        </>
      )
    }
  }

  // enables the VM menu for more options
  function enable_vm_menu(name) {
    setVm_list((prevList) => {
      const updatedList = prevList.map((vm) => {
        if (vm.name === name) {
          return new VMachine(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad, !vm.showMenu);
        }
        return vm;
      });
      return updatedList;
    });
  }

  // renders the button for deleting the VM
  function delete_vm_button(name) {
    if (name === "firewall1" || name === "firewall2" || name === "lan" || name === "dmz" || name === "lanB" || name === "server" || name === "client1" || name === "client2") {
      return;
    }
    return (
      <button title="Delete machine" disabled={app_state != "not created"} onClick={() => remove_vm(name)}><Trash2 size={16} /></button>
    )
  }

  // changes isBad state for the VM
  function set_isBad(name, isBad) {
    setBad_client((prevList) => {
      const updatedList = [...prevList];
      const index = parseInt(name.replace(/^\D+/g, '')) || 0;
      updatedList[index] = isBad; 
      return updatedList;
    });

    setVm_list((prevList) => {
      const updatedList = prevList.map((vm) => {
        if (vm.name === name) {
          return new VMachine(name, vm.state, vm.isFirewall, vm.script, isBad, vm.showMenu);
        }
        return vm;
      }
      );
      return updatedList;
    });
    setIsSaved(false);
  }

  // renders the button to set isBad state for the VM
  function bad_client_button(name, isBad) {
    if (name.includes("client")) {
      return (
        <div>
          <label disabled={app_state !== "not created"}>
            Bad Client:
            <input disabled={app_state !== "not created"}
              type="checkbox"
              checked={isBad === 1}
              onChange={(e) => set_isBad(name, e.target.checked ? 1 : 0)}
            />
          </label>
        </div>
      )
    }
    return null;

  }

  // removes the script from the VM
  function remove_script(name) {
    set_VMachine_script(name, "")
    if (name === "firewall1") {
      setScript_firewall1("")
    } else if (name === "firewall2") {
      setScript_firewall2("")
    } else if (name === "lan") {
      setScript_list_lan((prevList) => {
        const updatedList = [...prevList];
        updatedList[0] = "";
        return updatedList;
      });
    } else if (name === "dmz") {
      setScript_list_dmz((prevList) => {
        const updatedList = [...prevList];
        updatedList[0] = "";
        return updatedList;
      });
    } else if (name === "lanB") {
      setScript_list_lanB((prevList) => {
        const updatedList = [...prevList];
        updatedList[0] = "";
        return updatedList;
      });
    } else if (/^(lanB|lan|dmz|client)\d+$/.test(name)) {
      // For names like "lanB1", "lan1", "dmz2", "client1", etc.
      const match = name.match(/^(lanB|lan|dmz|client)(\d+)$/);
      if (match) {
      const prefix = match[1];
      const number = match[2];
      if (prefix === "lan") {
        setScript_list_lan((prevList) => {
        const updatedList = [...prevList];
        updatedList[number] = "";
        return updatedList;
        });
      } else if (prefix === "dmz") {
        setScript_list_dmz((prevList) => {
        const updatedList = [...prevList];
        updatedList[number] = "";
        return updatedList;
        });
      } else if (prefix === "client") {
        setScript_list_client((prevList) => {
        const updatedList = [...prevList];
        updatedList[number] = "";
        return updatedList;
        });
      } else if (prefix === "lanB") {
        setScript_list_lanB((prevList) => {
        const updatedList = [...prevList];
        updatedList[number] = "";
        return updatedList;
        });
      }
      }
    } else if (name === "server") {
      setScript_server("")
    }
    setIsSaved(false);
  }

  // renders the cluster diagram with all the VMs
  function render_vm_list() {
    if (learning != 1) {
      const firewalls = vm_list.filter(vm => vm.name.includes('firewall'));
      const lanNodes = vm_list.filter(vm => vm.name.includes('lan') && !vm.name.includes('lanB'));
      const lanBNodes = vm_list.filter(vm => vm.name.includes('lanB'));
      const dmzNodes = vm_list.filter(vm => vm.name.includes('dmz'));

      return (
        <div className="cluster-diagram-wrapper">
          <div className="cluster-diagram">
            <div className="lan-net">
              <div className="group_title">
                <h2>LAN Network</h2>
              </div>
              <div className="group lan-group">
                <div className="group_title">
                    <button title='Add LAN node' disabled={app_state !== "not created"} onClick={() => add_vm("lan")}> <Plus size={16} /> </button>
                </div>
                {lanNodes.map(vm => v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad, vm.showMenu, vm.ip))}
              </div>
              {render_vm_list_lanB(lanBNodes)}
            </div>

            <div className="group firewall-group">
              <div className="group_title">
                <h2>Firewalls</h2>
              </div>
              {firewalls.map(vm => v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad, vm.showMenu, vm.ip))}
            </div>

            <div className="group dmz-group">
              <h2>DMZ Network</h2>
              <button title='Add DMZ node' disabled={app_state !== "not created"} onClick={() => add_vm("dmz")}> <Plus size={16} /> </button>
              {dmzNodes.map(vm => v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad, vm.showMenu, vm.ip))}
            </div>
          </div>
        </div>
      );
    } else {
      const servers = vm_list.filter(vm => vm.name.includes('server'));
      const clientNodes = vm_list.filter(vm => vm.name.includes('client'));

      return (
        <div className="cluster-diagram-wrapper">
          <div className="cluster-diagram">
            <div className="group server-group">
              <div className="group_title">
                <h2>Server</h2>
              </div>
              {servers.map(vm => v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad, vm.showMenu, vm.ip))}
            </div>

            <div className="group client-group">
              <h2>Client Nodes</h2>
              <button title='Add Client node' disabled={app_state !== "not created"} onClick={() => add_vm("client")}> <Plus size={16} /> </button>
              {clientNodes.map(vm => v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad, vm.showMenu, vm.ip))}
            </div>
          </div>
        </div>
      );
    }
}

  // renders the LANB network list
  function render_vm_list_lanB(list) {
    if (lan_subnet != 0) {
      return (
        <div className="group lanB-group">
          <h2>LANB Network</h2>
          <button title='Add LanB node' disabled={app_state != "not created"} onClick={() => add_vm("lanB")}><Plus size={16} /></button>
          {list.map((vm) => (
            <div key={vm.name}>
              {v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad, vm.showMenu, vm.ip)}
            </div>
          ))}
        </div>
      )
    } else {
      return;
    }
  }

  // sets the state of the VM list
  function set_vm_list_state(state) {
    const vmList = vm_list.map((vm) => {
          const vmName = vm.name
          const vmState = state
          const isFirewall = (vmName === "firewall1" || vmName === "firewall2")
          const script = vm.script
  
          return new VMachine(vmName, vmState, isFirewall, script, vm.isBad);
      })
    setVm_list(vmList)
  }

  // sends request to the backend to start vagrant status
  function vm_status() {

    fetch('/vmList')
      .then((response) => response.json())
      .then((data) => {
        console.log('VM List response:', data)
        console.log('VM List:', data.list)
        const vmList = data.list.map((vm) => {
          const vm_name = vm.name
          const vmState = vm.status
          const isFirewall = (vm_name === "firewall1" || vm_name === "firewall2")
          let fileName;
          let isBad = 0;
          
          if (vm_name === "firewall1") {
            console.log('firewall1')
            fileName = script_firewall1
            console.log('File name:', script_firewall1)
          } else if (vm_name === "firewall2") {
            console.log('firewall2')
            fileName = script_firewall2
          } else if (vm_name === "lan") {
            console.log('lan')
            fileName = script_list_lan[0] || ""
          } else if (vm_name === "dmz") {
            console.log('dmz')
            fileName = script_list_dmz[0] || ""
          } else if (vm_name === "lanB") {
            fileName = script_list_lanB[0] || ""
            } else if (/^(lanB|lan|dmz|client)\d+$/.test(vm_name)) {
                // For names like "lanB1", "lan1", "dmz2", "client1", etc.
              const match = vm_name.match(/^(lanB|lan|dmz|client)(\d+)$/);
              if (match) {
              const prefix = match[1];
              const number = match[2];
              if (prefix === "lan") {
                fileName = script_list_lan[number] || "";
              } else if (prefix === "dmz") {
                fileName = script_list_dmz[number] || "";
              } else if (prefix === "client") {
                fileName = script_list_client[number] || "";
                isBad = bad_client[number] || 0;
              } else if (prefix === "lanB") {
                fileName = script_list_lanB[number] || "";
              }
              }
          } else if (vm_name === "server") {
            fileName = script_server || ""
          }
          console.log('VM name:', vm_name)
          console.log('File name:', fileName)
  
          return new VMachine(vm_name, vmState, isFirewall, fileName, isBad)
        })
        if (!pageLoaded) {
          setApp_state(check_app_state(vmList));
          //setPageLoaded(true);
        }
        setPageLoaded(true);
        console.log('App state:', app_state);
        setVm_list(vmList)
        console.log('VM List mapped:', vmList)
      })
      .catch((error) => {
        console.error('Error status:', error)
      })
  }

  function vm_status2(data_script) {

    console.log('FIREWALLALA  ', data_script.script_firewall1)
    fetch('/vmList')
      .then((response) => response.json())
      .then((data) => {
        console.log('VM List response:', data)
        console.log('VM List:', data.list)
        const vmList = data.list.map((vm) => {
          const vm_name = vm.name
          const vmState = vm.status
          const isFirewall = (vm_name === "firewall1" || vm_name === "firewall2")
          let fileName;
          let isBad = 0;
          
          if (vm_name === "firewall1") {
            console.log('firewall1')
            fileName = data_script.script_firewall1
            console.log('File name:', data_script.script_firewall1)
          } else if (vm_name === "firewall2") {
            console.log('firewall2')
            fileName = data_script.script_firewall2
          } else if (vm_name === "lan") {
            console.log('lan')
            fileName = data_script.script_list_lan[0] || ""
          } else if (vm_name === "dmz") {
            console.log('dmz')
            fileName = data_script.script_list_dmz[0] || ""
          } else if (vm_name === "lanB") {
            fileName = data_script.script_list_lanB[0] || "";
            } else if (/^(lanB|lan|dmz|client)\d+$/.test(vm_name)) {
                // For names like "lanB1", "lan1", "dmz2", "client1", etc.
              const match = vm_name.match(/^(lanB|lan|dmz|client)(\d+)$/);
              if (match) {
              const prefix = match[1];
              const number = match[2];
              if (prefix === "lan") {
                fileName = data_script.script_list_lan[number] || "";
              } else if (prefix === "dmz") {
                fileName = data_script.script_list_dmz[number] || "";
              } else if (prefix === "client") {
                fileName = data_script.script_list_client[number] || "";
                isBad = data_script.bad_client[number] || 0;
              } else if (prefix === "lanB") {
                fileName = data_script.script_list_lanB[number] || "";
              }
              }
            } else if (vm_name === "server") {
            fileName = data_script.script_server || ""
          }
          console.log('VM name:', vm_name)
          console.log('File name:', fileName)
  
          return new VMachine(vm_name, vmState, isFirewall, fileName, isBad)
        })
        if (!pageLoaded) {
          setApp_state(check_app_state(vmList));
          //setPageLoaded(true);
        }
        console.log('NOT PAGE LOADED');
        setPageLoaded(true);
        console.log('PAGE LOADED');
        console.log('App state:', app_state);
        setVm_list(vmList)
        console.log('VM List mapped:', vmList)
      })
      .catch((error) => {
        console.error('Error status2:', error)
      })
  }

  // adds a new VM to the list
  function add_vm(name) {
    let count = 0
    if (name === "lan") {
      count = node_count_lan
      setNode_count_lan(node_count_lan + 1)
    } else if (name === "dmz") {
      count = node_count_dmz
      setNode_count_dmz(node_count_dmz + 1)
    } else if (name === "client") {
      count = node_count_client
      setNode_count_client(node_count_client + 1)
    } else if (name === "lanB") {
      count = node_count_lanB
      setNode_count_lanB(node_count_lanB + 1)
    }
    const newVmName = name + (count + 1).toString()
    setVm_list((prevList) => [...prevList, new VMachine(newVmName, "not created", false, "")]);
    setIsSaved(false);
  }

  // removes a VM from the list
  function remove_vm(name) {
    if (name.includes("lanB")) {
      setNode_count_lanB(node_count_lanB - 1)
    } else if (name.includes("lan")) {
      setNode_count_lan(node_count_lan - 1)
    }
    if (name.includes("dmz")) {
      setNode_count_dmz(node_count_dmz - 1)
    }
    if (name.includes("client")) {
      setNode_count_client(node_count_client - 1)
    }
    setVm_list((prevList) => prevList.filter((vm) => vm.name !== name));
    setVm_list((prevList) => {
      const updatedList = prevList
      .filter((vm) => vm.name !== name)
      .map((vm) => {
        if (vm.name.includes(name.slice(0, -1))) {
        const vmNumber = parseInt(vm.name.replace(name.slice(0, -1), ""));
        const deletedVmNumber = parseInt(name.replace(name.slice(0, -1), ""));
        if (vmNumber > deletedVmNumber) {
          vm.name = vm.name.slice(0, -1) + (vmNumber - 1)
          vm.updateIp(vm.name);
          return vm;
        }
        }
        return vm;
      });
      return updatedList;
    });
    setIsSaved(false);
  }

  // sends request to the backend to start vagrant ssh <m_name>
  function open_vm_console(m_name) {
    // Call the vagrant ssh command here
    fetch('/vagrantSsh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vm_name: m_name, // Replace with the actual VM name
      }),
    }).then((response) => response.json())
      .then((data) => {
        console.log('Open VM Console response:', data);
        setLiveOutput(prev => prev + (data.error ? data.error : data.message) + "\n");
        if (data.error) {
          alert("Error opening VM console, you can try to open it manually with 'vagrant ssh " + m_name + "'" + "in /vagrant directory");
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        setLiveOutput(prev => prev + data.error+"\n");
        alert("Error opening VM console, you can try to open it manually with 'vagrant ssh " + m_name + "'" + "in /vagrant directory");
      })
  }

  // sends JSON data to be saved to the backend
  async function save_parameters() {
    try {
      const response = await fetch('/saveParameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_count_lan: Number(node_count_lan),
          node_count_dmz: Number(node_count_dmz),
          node_count_lanB: Number(node_count_lanB),
          lan_subnet: Number(lan_subnet),
          dual_firewall: Number(dmz_type),
          script_list_lan: script_list_lan,
          script_list_dmz: script_list_dmz,
          script_firewall1: script_firewall1,
          script_firewall2: script_firewall2,
          script_list_lanB: script_list_lanB,
          learning: Number(learning),
          script_server: script_server,
          script_list_client: script_list_client,
          bad_client: bad_client,
          node_count_client: Number(node_count_client),
        }),
      });

      const data = await response.json();
      console.log('Save parameters response:', data);
      setIsSaved(true);

      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // fetches the parameters from the backend
  async function read_parameters() {
    try {
      const response = await fetch('/readParameters', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Read parameters response:', data);

      return data; 
    } catch (error) {
      console.error('Error:', error);
      throw error; 
    }
  }

  // sets the script for the VM
  function set_VMachine_script(name, script) {
    setVm_list((prevList) => {
      const updatedList = prevList.map((vm) => {
        if (vm.name === name) {
          return new VMachine(name, vm.state, vm.isFirewall, script, vm.isBad, vm.showMenu);
        }
        return vm;
      });
      return updatedList;
    });
  }

  // uploads the file to the server and updates the VM script
  function upload_file(event, vm_name) {
    
    const file = event.target.files[0];
    console.log('Selected file:', file.name);
    if (file.name.includes('.sh') === false) {
      alert('Please upload a .sh file');
      return;
    }
    
    if (vm_name === "firewall1") {
      setScript_firewall1(file.name)
      
    } else if (vm_name === "firewall2") {
      setScript_firewall2(file.name)
      
    } else if (vm_name === "lan") {
      setScript_list_lan((prevList) => {
            const updatedList = [...prevList];
            updatedList[0] = file.name;
            return updatedList;
      });
    } else if (vm_name === "dmz") {
      setScript_list_dmz((prevList) => {
            const updatedList = [...prevList];
            updatedList[0] = file.name;
            return updatedList;
          });
    } else if (vm_name === "lanB") {
      setScript_list_lanB((prevList) => {
            const updatedList = [...prevList];
            updatedList[0] = file.name;
            return updatedList;
          });
    } else if (/^(lanB|lan|dmz|client)\d*$/.test(vm_name)) {
      // For names like "lanB1", "lan1", "dmz2", "client", "client1", etc.
      const match = vm_name.match(/^(lanB|lan|dmz|client)(\d*)$/);
      if (match) {
      const prefix = match[1];
      const number = match[2];
      if (prefix === "lan") {
        setScript_list_lan((prevList) => {
        const updatedList = [...prevList];
        updatedList[number ? Number(number) : 0] = file.name;
        return updatedList;
        });
      } else if (prefix === "dmz") {
        setScript_list_dmz((prevList) => {
        const updatedList = [...prevList];
        updatedList[number ? Number(number) : 0] = file.name;
        return updatedList;
        });
      } else if (prefix === "client") {
        setScript_list_client((prevList) => {
        const updatedList = [...prevList];
        updatedList[number ? Number(number) : 0] = file.name;
        return updatedList;
        });
      } else if (prefix === "lanB") {
        setScript_list_lanB((prevList) => {
        const updatedList = [...prevList];
        updatedList[number ? Number(number) : 0] = file.name;
        return updatedList;
        });
      }
      }
    } else if (vm_name === "server") {
      setScript_server(file.name)
    }

    set_VMachine_script(vm_name, file.name)

    const formData = new FormData();
    formData.append('file', file);
    fetch('/uploadFile', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('File upload response:', data.message);
        // Handle the response from the server
        setIsSaved(false);
      }
      )
      .catch((error) => {
        console.error('Error:', error);
      });
  }

  // sends the request to the backend start the vagrant up process
  function vagrant_up() {
    // Call the vagrant up command here
    setProcessComplete(false);
    if (app_state === "not created") {
      setApp_state("creating")
    } else if (app_state === "stopped") {
      setApp_state("initializing")
    }
    setLiveOutput(prev => prev + "VAGRANT UP PROCESS STARTED...\n");

    fetch('/vagrantUp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        node_count_lan: Number(node_count_lan),
        node_count_dmz: Number(node_count_dmz),
        node_count_lanB: Number(node_count_lanB),
        lan_subnet: Number(lan_subnet),
        dual_firewall: Number(dmz_type),
        script_list_lan: script_list_lan,
        script_list_dmz: script_list_dmz,
        script_firewall1: script_firewall1,
        script_firewall2: script_firewall2,
        script_list_lanB: script_list_lanB,
        learning: Number(learning),
        script_server: script_server,
        script_list_client: script_list_client,
        bad_client: bad_client,
        node_count_client: Number(node_count_client),
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        setApp_state("created")
        set_vm_list_state('running')
        setProcessComplete(true);
        setOutput((prevOutput) => prevOutput + data.message)
        if (data.error) {
          setLiveOutput(prev => prev + data.error + "\n");
          alert('An error occurred while starting Vagrant. Please check the console for details. You should destroy the cluster and try again.');
        }
        setLiveOutput(prev => prev + "VAGRANT UP PROCESS ENDED\n");
      })
      .catch((error) => {
        console.error('Error:', error)
        alert('An error occurred while starting Vagrant. Please check the console for details. You should destroy the cluster and try again.');
      })
  }

  // sends the request to the backend to cancel the vagrant up process
  function cancel_vagrant_up() {
    
    fetch('/cancelVagrantUp')
      .then((response) => response.json())
      .then((data) => {
        console.log('Cancel Vagrant up response:', data)
      })
      .catch((error) => {
        console.error('Error:', error)
      })

  }

  // sends the request to the backend to start the vagrant halt process
  function vagrant_halt() {
    setApp_state("stopping")
    setProcessComplete(false);
    setLiveOutput(prev => prev + "VAGRANT HALT PROCESS STARTED...\n");
    fetch('/vagrantHalt')
      .then((response) => response.json())
      .then((data) => {
        console.log('Vagrant halt response:', data)
        //vm_status()
        set_vm_list_state('poweroff')
        setApp_state("stopped")
        setOutput((prevOutput) => prevOutput + data.message)
        setProcessComplete(true);
        if (data.error) {
          setLiveOutput(prev => prev + data.error + "\n");
          alert('An error occurred while stopping Vagrant. Please check the console for details.');
        }
        setLiveOutput(prev => prev + "VAGRANT HALT PROCESS ENDED\n");
      })
      .catch((error) => {
        console.error('Error:', error)
        alert('An error occurred while stopping Vagrant. Please check the console for details.');
      })

  }

  // sends the request to the backend to start the vagrant destroy process
  function vagrant_destroy() {
    // Call the vagrant destroy command here
    setApp_state("destroying")
    setProcessComplete(false);
    setLiveOutput(prev => prev + "VAGRANT DESTROY PROCESS STARTED...\n");
    fetch('/vagrantDestroy')
      .then((response) => response.json())
      .then((data) => {
        console.log('Vagrant destroy response:', data)
        setApp_state("not created")
        set_vm_list_state('not created')
        setOutput((prevOutput) => prevOutput + data.message)
        setProcessComplete(true);
        
        if (data.error) {
          setLiveOutput(prev => prev + data.error + "\n");
          alert('An error occurred while destroying Vagrant. Please check the console for details.');
        }
        setLiveOutput(prev => prev + "VAGRANT DESTROY PROCESS ENDED\n");
      })
      .catch((error) => {
        console.error('Error:', error)
        alert('An error occurred while destroying Vagrant. Please check the console for details.');
      })
  }

  // renders the Vagrant and VirtualBox version information
  function display_vagrant_vbox_version() {
    return (
      <div className="version-info">
        <h2>Vagrant Version: {isVagrantInstalled ? vagrantVersion : "Not installed"}</h2>
        <h2>VirtualBox Version: {isVirtualBoxInstalled ? virtualBoxVersion : "Not installed"}</h2>
      </div>
    )
  }

  if (!pageLoaded) {
    return (
      <>
        {display_vagrant_vbox_version()}
        <div className="loading-container">
          <h1>Loading...</h1>
        </div>
      </>
    )
  } else if (!isVagrantInstalled && !isVirtualBoxInstalled) {
    return (
      <>
        {display_vagrant_vbox_version()}
        <div className="loading-container">
          <h1>Error: Vagrant and VirtualBox are not installed</h1>
          <p>Please install both Vagrant and VirtualBox to use this application.</p>
        </div>
      </>
    )
  } else if (!isVagrantInstalled) {
    return (
      <>
        {display_vagrant_vbox_version()}
        <div className="loading-container">
          <h1>Error: Vagrant is not installed</h1>
          <p>Please install Vagrant to use this application.</p>
        </div>
      </>
    )
  } else if (!isVirtualBoxInstalled) {
    return (
      <>
        {display_vagrant_vbox_version()}
        <div className="loading-container">
          <h1>Error: VirtualBox is not installed</h1>
          <p>Please install VirtualBox to use this application.</p>
        </div>
      </>
    )
  } else {
    // Render the main application content
    return (
    <>
      {display_vagrant_vbox_version()}
      {cluster_selection()}
    </>
    )
  }
}

export default App
