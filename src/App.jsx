import { useState } from 'react'
import Topbar from './components/Topbar'
import IconRail from './components/IconRail'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import './App.css'

export default function App() {
  const [device, setDevice] = useState('Desktop')

  return (
    <div className="app">
      <Topbar device={device} onDeviceChange={setDevice} />
      <div className="body-wrap">
        <IconRail />
        <Sidebar />
        <Canvas device={device} />
      </div>
    </div>
  )
}
