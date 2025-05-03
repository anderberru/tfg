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
              type="text"
              value={lan_subnet}
              onChange={(e) => setLan_subnet(e.target.value)}
            />
          </label>
          <label>
            DMZ Type:
            <select
              value={dmz_type}
              onChange={(e) => setDmz_type(e.target.value)}
            >
              <option value="simple">Simple</option>
              <option value="dual">Dual firewall</option>
            </select>
          </label>
          <button onClick={vagrant_up}>Create</button>
        </div>
      </>
    )
  }

  function vagrant_up() {
    // Call the vagrant up command here
    // You can use fetch to call your backend API that runs the command
    fetch('/vagrantUp')
      .then((response) => response.json())
      .then((data) => {
        console.log('Vagrant up response:', data)
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
