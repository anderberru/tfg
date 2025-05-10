import { useState, useRef, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import VMachine from './VMachine'

function App() {
  const [pageLoaded, setPageLoaded] = useState(false)
  const [count, setCount] = useState(0)
  const [node_count_lan, setNode_count_lan] = useState(0)
  const [node_count_dmz, setNode_count_dmz] = useState(0)
  const [lan_subnet, setLan_subnet] = useState(0)
  const [dmz_type, setDmz_type] = useState(0)
  const [vm_list, setVm_list] = useState([])
  const [app_state, setApp_state] = useState("not created")

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
      }).then(() => {vm_status();})
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
  }, [dmz_type]);


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

  function v_box(name, state, isFirewall) {
    return (
      <div className="v-box">
        <h2>{name}</h2>
        <p>State: {state}</p>
        <p>Is Firewall: {isFirewall ? "Yes" : "No"}</p>
        <button disabled={state != "running"} onClick={() => open_vm_console(name)}>Open Console</button>
        {delete_vm_button(name)}
      </div>
    )
  }

  function delete_vm_button(name) {
    if (name === "firewall1" || name === "firewall2" || name === "lan" || name === "dmz" || name === "lanB") {
      return;
    }
    return (
      <button disabled={app_state != "not created"} onClick={() => remove_vm(name)}>Delete</button>
    )
  }

  function render_vm_list() {
    const firewalls = vm_list.filter(vm => vm.name.includes('firewall'));
    const lanNodes = vm_list.filter(vm => vm.name.includes('lan'));
    const dmzNodes = vm_list.filter(vm => vm.name.includes('dmz'));

    return (
      <div className="vm-list">
        <div className="firewalls-section">
          <h2>Firewalls</h2>
          {firewalls.map((vm) => (
            <div key={vm.name}>
              {v_box(vm.name, vm.state, vm.isFirewall)}
            </div>
          ))}
        </div>
        <div className="lan-section">
          <h2>LAN Nodes</h2>
          <button onClick={() => add_vm("lan")}>Add LAN Node</button>
          {lanNodes.map((vm) => (
            <div key={vm.name}>
              {v_box(vm.name, vm.state, vm.isFirewall)}
            </div>
          ))}
        </div>
        <div className="dmz-section">
          <h2>DMZ Nodes</h2>
          <button onClick={() => add_vm("dmz")}>Add DMZ Node</button>
          {dmzNodes.map((vm) => (
            <div key={vm.name}>
              {v_box(vm.name, vm.state, vm.isFirewall)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function set_vm_list_state(state) {
    const vmList = vm_list.map((vm) => {
          const vmName = vm.name
          const vmState = state
          const isFirewall = (vmName === "firewall1" || vmName === "firewall2")
  
          return new VMachine(vmName, vmState, isFirewall)
      })
    setVm_list(vmList)
  }

  function vm_status() {
    // Call the vagrant status command here
    // You can use fetch to call your backend API that runs the command
    fetch('/vmList')
      .then((response) => response.json())
      .then((data) => {
        console.log('VM List response:', data)
        console.log('VM List:', data.list)
        const vmList = data.list.map((vm) => {
          const vmName = vm.name
          const vmState = vm.status
          const isFirewall = (vmName === "firewall1" || vmName === "firewall2")
  
          return new VMachine(vmName, vmState, isFirewall)
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

  function add_vm(name) {
    let count = 0
    if (name === "lan") {
      count = node_count_lan
      setNode_count_lan(node_count_lan + 1)
    } else if (name === "dmz") {
      count = node_count_dmz
      setNode_count_dmz(node_count_dmz + 1)
    }
    const newVmName = name + (count + 1).toString()
    setVm_list((prevList) => [...prevList, new VMachine(newVmName, "not created", false)]);
  }

  function remove_vm(name) {
    if (name.includes("lan")) {
      setNode_count_lan(node_count_lan - 1)
    }
    if (name.includes("dmz")) {
      setNode_count_dmz(node_count_dmz - 1)
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


  function vagrant_up() {
    // Call the vagrant up command here
    // You can use fetch to call your backend API that runs the command
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
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Vagrant up response:', data)
        setApp_state("created")
        set_vm_list_state('running')
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
    fetch('/vagrantHalt')
      .then((response) => response.json())
      .then((data) => {
        console.log('Vagrant halt response:', data)
        //vm_status()
        set_vm_list_state('poweroff')
        setApp_state("stopped")
      })
      .catch((error) => {
        console.error('Error:', error)
      })

  }

  function vagrant_destroy() {
    // Call the vagrant destroy command here
    // You can use fetch to call your backend API that runs the command
    setApp_state("destroying")
    fetch('/vagrantDestroy')
      .then((response) => response.json())
      .then((data) => {
        console.log('Vagrant destroy response:', data)
        setApp_state("not created")
        set_vm_list_state('not created')
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
