import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [node_count_lan, setNode_count_lan] = useState(0)
  const [node_count_dmz, setNode_count_dmz] = useState(0)
  const [lan_subnet, setLan_subnet] = useState(0)
  const [dmz_type, setDmz_type] = useState(0)

  function cluster_selection() {
    
    return (
      <>
      <div>
        <h1>Cluster Selection</h1>
        <label>
        Number of nodes in LAN:
        <input
          type="number"
          value={node_count_lan}
          onChange={(e) => setNode_count_lan(e.target.value)}
        />
        </label>
        <label>
        Number of nodes in DMZ:
        <input
          type="number"
          value={node_count_dmz}
          onChange={(e) => setNode_count_dmz(e.target.value)}
        />
        </label>
        <label>
        LAN Subnet:
        <input
          type="checkbox"
          checked={lan_subnet === 1}
          onChange={(e) => setLan_subnet(e.target.checked ? 1 : 0)}
        />
        </label>
        <label>
        DMZ Type:
        <select
          value={dmz_type}
          onChange={(e) => setDmz_type(e.target.value)}
        >
          <option value="0">Simple</option>
          <option value="1">Dual firewall</option>
        </select>
        </label>
        <br />
        <div id="buttons">
          <button onClick={vagrant_up}>Create</button>
          <button onClick={cancel_vagrant_up}>Cancel</button>
          <button onClick={vagrant_destroy}>Destroy All</button>
        </div>
        
      </div>
      </>
    )
  }

  function vm_status() {
    // Call the vagrant status command here
    // You can use fetch to call your backend API that runs the command
    fetch('/vmList')
      .then((response) => response.json())
      .then((data) => {
        console.log('VM List response:', data)
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  }

  function vagrant_up() {
    // Call the vagrant up command here
    // You can use fetch to call your backend API that runs the command
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
      })
      .catch((error) => {
        console.error('Error:', error)
      }).then(() => {
        vm_status()
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

  function vagrant_destroy() {
    // Call the vagrant destroy command here
    // You can use fetch to call your backend API that runs the command
    fetch('/vagrantDestroy')
      .then((response) => response.json())
      .then((data) => {
        console.log('Vagrant destroy response:', data)
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

  return (
    <>
      {
      cluster_selection()
      }
    </>
  )
}

export default App
