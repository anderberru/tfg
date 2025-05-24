import { useState, useRef, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { io } from 'socket.io-client';
import VMachine from './VMachine'

function App() {
  const [pageLoaded, setPageLoaded] = useState(false)
  const [count, setCount] = useState(0)
  const [node_count_lan, setNode_count_lan] = useState(0)
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
  const [script_lanB, setScript_lanB] = useState("")
  const [script_list_client, setScript_list_client] = useState([])
  const [bad_client, setBad_client] = useState([])
  const [script_server, setScript_server] = useState("")
  const [learning, setLearning] = useState(0)


  const socket = io(); // Se conecta al mismo host

  function OutputConsole({ output_full, processComplete }) {
    const [output, setOutput] = useState('');
    const consoleRef = useRef(null);

    useEffect(() => {
      const handleOutput = (data) => {
        const el = consoleRef.current;

        // Guardamos si estaba al fondo antes de actualizar
        const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;

        setOutput(prev => prev + data);

        // Esperamos al siguiente render para hacer scroll si era necesario
        
        requestAnimationFrame(() => {
          if (isNearBottom) {
            el.scrollTop = el.scrollHeight;
          }
        });
        
      };

      socket.on('vagrant-output', handleOutput);
      return () => socket.off('vagrant-output', handleOutput);
    }, []);
     // Scroll cuando termina el proceso
      useEffect(() => {
        if (processComplete) {
          const el = consoleRef.current;
          requestAnimationFrame(() => {
            if (el) {
              el.scrollTop = el.scrollHeight;
            }
          });
        } else {
          setOutput(output_full);
        }
      }, [processComplete, output_full]);

    if (processComplete) {
      return (
        <pre className='console' ref={consoleRef}>
          {output_full}
        </pre>
      );
    } else {
      return (
        <pre className='console' ref={consoleRef}>
          {output}
        </pre>
      );
    }
    
  }

  useEffect(() => {
    // Esta función se ejecuta solo una vez al cargar la página
    console.log('Page loaded')
    read_parameters()
      .then((data) => {
        console.log('Read parameters:', data)
        setNode_count_lan(data.node_count_lan)
        setNode_count_dmz(data.node_count_dmz)
        setLan_subnet(data.lan_subnet)
        setDmz_type(data.dual_firewall)
        setScript_list_lan(data.script_list_lan)
        setScript_list_dmz(data.script_list_dmz)
        console.log('FIREWALL1:  ', data.script_firewall1)
        setScript_firewall1(data.script_firewall1)
        setScript_firewall2(data.script_firewall2)
        setScript_lanB(data.script_lanB)
        setLearning(data.learning || 0)
        setScript_server(data.script_server || "")
        setScript_list_client(data.script_list_client || [])
        setBad_client(data.bad_client || [])
        setNode_count_client(data.node_count_client || 2)
        return data;
      }).then((data) => {vm_status2(data);})
      .catch(error => console.error("Error:", error));
    
  }, []) // <-- array vacío = solo en el primer render

    // Este effect se ejecutará cada vez que cambie dmz_type
  useEffect(() => {
  if (!pageLoaded) return;

  const updateBackend = async () => {
    try {
      setPageLoaded(false);
      save_parameters()
      .then(() => vm_status())
      .catch(error => console.error("Error:", error));
    } catch (error) {
      console.error("Error actualizando parámetros:", error);
    }
  };

  updateBackend();
  }, [dmz_type, learning]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (app_state === "creating" || app_state === "initializing" || app_state === "stopping" || app_state === "destroying") {
        e.preventDefault();
        e.returnValue = ''; // Algunos navegadores lo requieren para mostrar el mensaje
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [app_state]);


  function check_app_state(vmList) {
    console.log('LSIT:', vmList)
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

  function cluster_selection() {
    return (
      <>
      <div>
      <h1>Cluster Selection</h1>
      <p>Current state: {app_state}</p>
      {render_vm_list()}
      <label>
      Cluster type:
      <select
        disabled={app_state != "not created"}
        value={learning}
        onChange={(e) => {
        setLearning(e.target.value)
        }}
      >
        <option value="0">DMZ</option>
        <option value="1">Distributed Machine Learning</option>
      </select>
      </label>
      <label>
      Number of nodes in LAN:
      <input
        disabled={app_state != "not created"}
        type="number"
        value={node_count_lan}
        onChange={(e) => {
        setNode_count_lan(e.target.value);
        
        }}
      />
      </label>
      <label>
      Number of nodes in DMZ:
      <input
        disabled={app_state != "not created"}
        type="number"
        value={node_count_dmz}
        onChange={(e) => {
        setNode_count_dmz(e.target.value);
       
        }}
      />
      </label>
      <label>
      LAN Subnet:
      <input
        disabled={app_state != "not created"}
        type="checkbox"
        checked={lan_subnet === 1}
        onChange={(e) => {
        setLan_subnet(e.target.checked ? 1 : 0);
        }}
      />
      </label>
      <label>
      DMZ Type:
      <select
        disabled={app_state != "not created"}
        value={dmz_type}
        onChange={(e) => {
        setDmz_type(e.target.value)
        }}
      >
        <option value="0">Simple</option>
        <option value="1">Dual firewall</option>
      </select>
      </label>
      <br /><br />
      {buttons()}
      <OutputConsole output_full={output} processComplete={processComplete} />
      </div>
      </>
    )
  }

  function buttons() {
    if (app_state === "not created") {
      return (
        <div id="buttons">
          <button onClick={vagrant_up}>Create</button>
          <button onClick={save_parameters}>Save config</button>
        </div>
      )
    } else if (app_state === "creating") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_up}>Creating...</button>
          <button onClick={cancel_vagrant_up}>Cancel</button>
        </div>
      )
    } else if (app_state === "created") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_up}>Running</button>
          <button onClick={vagrant_halt}>Stop All</button>
          <button onClick={vagrant_destroy}>Destroy All</button>
        </div>
      )
    } else if (app_state === "stopped") {
      return (
        <div id="buttons">
          <button onClick={vagrant_up}>Initialize</button>
          <button onClick={vagrant_destroy}>Destroy All</button>
        </div>
      )
    } else if (app_state === "initializing") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_up}>Initializing...</button>
          <button onClick={cancel_vagrant_up}>Cancel</button>
        </div>
      )
    } else if (app_state === "stopping") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_halt}>Stopping...</button>
        </div>
      )
    } else if (app_state === "destroying") {
      return (
        <div id="buttons">
          <button disabled onClick={vagrant_destroy}>Destroying...</button>
        </div>
      )
    }
  }

  function v_box(name, state, isFirewall, script, isBad) {
    return (
      <div className="v-box">
        <h2>{name}</h2>
        <p>State: {state}</p>
        <p>Is Firewall: {isFirewall ? "Yes" : "No"}</p>
        <button disabled={state != "running"} onClick={() => open_vm_console(name)}>Open Console</button>
        {delete_vm_button(name)}
        {upload_file_button(name, script)}
        {bad_client_button(name, isBad)}
      </div>
    )
  }

  function delete_vm_button(name) {
    if (name === "firewall1" || name === "firewall2" || name === "lan" || name === "dmz" || name === "lanB" || name === "server" || name === "client1" || name === "client2") {
      return;
    }
    return (
      <button disabled={app_state != "not created"} onClick={() => remove_vm(name)}>Delete</button>
    )
  }

  function upload_file_button(name, script) {
    if (script === "") {
      return (
        <>
        <p>Custom script: {script}</p>
        <button
            disabled={app_state !== "not created"}
            onClick={() => document.getElementById(`file-upload-${name}`).click()}
          >
            Upload Script
          </button>
          <input
            id={`file-upload-${name}`}
            type="file"
            style={{ display: "none" }}
            onChange={(event) => upload_file(event, name)}
          />
        </>
      ) 
    } else {
        return (
          <>
            <p>Custom script: {script}</p>
            <button
                disabled={app_state !== "not created"}
                onClick={() => document.getElementById(`file-upload-${name}`).click()}
              >
                Change Script
              </button>
              <input
                id={`file-upload-${name}`}
                type="file"
                style={{ display: "none" }}
                onChange={(event) => upload_file(event, name)}
              />
              <button
                disabled={app_state !== "not created"}
                onClick={() => remove_script(name)}
              >
                Delete Script
              </button>
            </>
        )
      }
  }

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
          return new VMachine(name, vm.state, vm.isFirewall, vm.script, isBad);
        }
        return vm;
      }
      );
      return updatedList;
    });
  }

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
      setScript_lanB("")
    } else if (/^(lan|dmz|client)\d+$/.test(name)) {
      // Para nombres como "lan1", "dmz2", "client1", etc.
      const match = name.match(/^(lan|dmz|client)(\d+)$/);
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
      }
      }
    } else if (name === "server") {
      setScript_server("")
    }
  }

  function render_vm_list() {
    if (learning != 1) {
      const firewalls = vm_list.filter(vm => vm.name.includes('firewall'));
      const lanNodes = vm_list.filter(vm => vm.name.includes('lan'));
      const dmzNodes = vm_list.filter(vm => vm.name.includes('dmz'));

      return (
        <div className="vm-list">
          <div className="firewalls-section">
            <h2>Firewalls</h2>
            {firewalls.map((vm) => (
              <div key={vm.name}>
                {v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad)}
              </div>
            ))}
          </div>
          <div className="lan-section">
            <h2>LAN Nodes</h2>
            <button disabled={app_state != "not created"} onClick={() => add_vm("lan")}>Add LAN Node</button>
            {lanNodes.map((vm) => (
              <div key={vm.name}>
                {v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad)}
              </div>
            ))}
          </div>
          <div className="dmz-section">
            <h2>DMZ Nodes</h2>
            <button disabled={app_state != "not created"} onClick={() => add_vm("dmz")}>Add DMZ Node</button>
            {dmzNodes.map((vm) => (
              <div key={vm.name}>
                {v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad)}
              </div>
            ))}
          </div>
        </div>
      )
    } else {
      const servers = vm_list.filter(vm => vm.name.includes('server'));
      const clientNodes = vm_list.filter(vm => vm.name.includes('client'));

      return (
        <div className="vm-list">
          <div className="server-section">
            <h2>Server</h2>
            {servers.map((vm) => (
              <div key={vm.name}>
                {v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad)}
              </div>
            ))}
          </div>
          <div className="client-section">
            <h2>Client Nodes</h2>
            <button disabled={app_state != "not created"} onClick={() => add_vm("client")}>Add Client Node</button>
            {clientNodes.map((vm) => (
              <div key={vm.name}>
                {v_box(vm.name, vm.state, vm.isFirewall, vm.script, vm.isBad)}
              </div>
            ))}
          </div>
        </div>
      )
    }
  }


  function set_vm_list_state(state) {
    const vmList = vm_list.map((vm) => {
          const vmName = vm.name
          const vmState = state
          const isFirewall = (vmName === "firewall1" || vmName === "firewall2")
          const script = vm.script
  
          return new VMachine(vmName, vmState, isFirewall, script, vm.isBad)
      })
    setVm_list(vmList)
  }

  function vm_status() {
    // Call the vagrant status command here
    // You can use fetch to call your backend API that runs the command
    console.log('FIREWALLALA  ', script_firewall1)
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
            fileName = script_lanB
            } else if (/^(lan|dmz|client)\d+$/.test(vm_name)) {
              // Para nombres como "lan1", "dmz2", "client1", etc.
              const match = vm_name.match(/^(lan|dmz|client)(\d+)$/);
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
    // Call the vagrant status command here
    // You can use fetch to call your backend API that runs the command

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
            fileName = data_script.script_lanB
            } else if (/^(lan|dmz|client)\d+$/.test(vm_name)) {
              // Para nombres como "lan1", "dmz2", "client1", etc.
              const match = vm_name.match(/^(lan|dmz|client)(\d+)$/);
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
        setPageLoaded(true);
        console.log('App state:', app_state);
        setVm_list(vmList)
        console.log('VM List mapped:', vmList)
      })
      .catch((error) => {
        console.error('Error status2:', error)
      })
  }


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
    }
    const newVmName = name + (count + 1).toString()
    setVm_list((prevList) => [...prevList, new VMachine(newVmName, "not created", false, "")]);
  }

  function remove_vm(name) {
    if (name.includes("lan")) {
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
          return {
          ...vm,
          name: name.slice(0, -1) + (vmNumber - 1),
          };
        }
        }
        return vm;
      });
      return updatedList;
    });
  }

  function open_vm_console(m_name) {
    // Call the vagrant ssh command here
    // You can use fetch to call your backend API that runs the command
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
        console.log('Open VM Console response:', data)
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  }

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
          lan_subnet: Number(lan_subnet),
          dual_firewall: Number(dmz_type),
          script_list_lan: script_list_lan,
          script_list_dmz: script_list_dmz,
          script_firewall1: script_firewall1,
          script_firewall2: script_firewall2,
          script_lanB: script_lanB,
          learning: Number(learning),
          script_server: script_server,
          script_list_client: script_list_client,
          bad_client: bad_client,
          node_count_client: Number(node_count_client),
        }),
      });

      const data = await response.json();
      console.log('Save parameters response:', data);

      return data; // Opcional, si querés usar la respuesta más adelante
    } catch (error) {
      console.error('Error:', error);
      throw error; // Muy importante: relanzar el error para que pueda capturarse si se usa `await`
    }
  }

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

      return data; // Opcional, si querés usar la respuesta más adelante
    } catch (error) {
      console.error('Error:', error);
      throw error; // Muy importante: relanzar el error para que pueda capturarse si se usa `await`
    }
  }

  function set_VMachine_script(name, script) {
    setVm_list((prevList) => {
      const updatedList = prevList.map((vm) => {
        if (vm.name === name) {
          return new VMachine(name, vm.state, vm.isFirewall, script);
        }
        return vm;
      });
      return updatedList;
    });
  }
  

  function upload_file(event, vm_name) {
    
    const file = event.target.files[0];
    console.log('Selected file:', file.name);
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
      setScript_lanB(file.name)
    } else if (/^(lan|dmz|client)\d*$/.test(vm_name)) {
      // Para nombres como "lan1", "dmz2", "client", "client1", etc.
      const match = vm_name.match(/^(lan|dmz|client)(\d*)$/);
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
      }
      )
      .catch((error) => {
        console.error('Error:', error);
      });
  }


  function vagrant_up() {
    // Call the vagrant up command here
    // You can use fetch to call your backend API that runs the command
    setProcessComplete(false);
    if (app_state === "not created") {
      setApp_state("creating")
    } else if (app_state === "stopped") {
      setApp_state("initializing")
    }
    fetch('/vagrantUp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        node_count_lan: Number(node_count_lan),
        node_count_dmz: Number(node_count_dmz),
        lan_subnet: Number(lan_subnet),
        dual_firewall: Number(dmz_type),
        script_list_lan: script_list_lan,
        script_list_dmz: script_list_dmz,
        script_firewall1: script_firewall1,
        script_firewall2: script_firewall2,
        script_lanB: script_lanB,
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
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  }

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

  function vagrant_halt() {
    setApp_state("stopping")
    setProcessComplete(false);
    fetch('/vagrantHalt')
      .then((response) => response.json())
      .then((data) => {
        console.log('Vagrant halt response:', data)
        //vm_status()
        set_vm_list_state('poweroff')
        setApp_state("stopped")
        setOutput((prevOutput) => prevOutput + data.message)
        setProcessComplete(true);
      })
      .catch((error) => {
        console.error('Error:', error)
      })

  }

  function vagrant_destroy() {
    // Call the vagrant destroy command here
    // You can use fetch to call your backend API that runs the command
    setApp_state("destroying")
    setProcessComplete(false);
    fetch('/vagrantDestroy')
      .then((response) => response.json())
      .then((data) => {
        console.log('Vagrant destroy response:', data)
        setApp_state("not created")
        set_vm_list_state('not created')
        setOutput((prevOutput) => prevOutput + data.message)
        setProcessComplete(true);
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  }

  function example() {
    return (
      <>
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>Vite + React</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.jsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
      </>
    )
  }


  if (!pageLoaded) {
    return (
      <>
        <div>
          <h1>Loading...</h1>
        </div>
      </>
    )
  } else {
    return (
    <>
      {cluster_selection()}
    </>
    )
  }
}

export default App
