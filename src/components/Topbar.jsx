import { TextSelect, Smartphone, Tablet, Monitor, SquarePlay, CircleGauge, Share2, Download, BookMarked, Building2 } from 'lucide-react'

const devices = [
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Tablet',     icon: Tablet },
  { name: 'Desktop',    icon: Monitor },
]

export default function Topbar({ device, onDeviceChange }) {
  return (
    <header className="topbar">
      <div className="logo">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2h-2v4.59l-3.29-3.3-1.42 1.42L9.59 8H5v2h4.59L6.3 13.29l1.42 1.42L11 11.41V22h2V11.41l3.29 3.3 1.42-1.42L14.41 10H19V8h-4.41l3.29-3.29-1.42-1.42L13 6.59V2z" />
        </svg>
      </div>
      <span className="topbar-title">Custom Dashboard</span>

      <button className="topbar-btn">
        <TextSelect size={14} />
        All Dashboards
      </button>

      <div className="topbar-spacer" />

      <div className="device-switcher">
        {devices.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={`device-btn${device === name ? ' active' : ''}`}
            onClick={() => onDeviceChange(name)}
          >
            <Icon size={14} />
            {name}
          </button>
        ))}
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        <button className="btn-preview">
          <SquarePlay size={14} />
          Preview
        </button>
        <button className="icon-btn" title="Gauge">
          <CircleGauge size={15} />
        </button>
        <button className="icon-btn" title="Share">
          <Share2 size={15} />
        </button>
        <button className="icon-btn" title="Download">
          <Download size={15} />
        </button>
        <button className="topbar-btn" title="Viste salvate">
          <BookMarked size={14} />
          Viste salvate
        </button>
        <button className="topbar-btn" title="CentraleNome">
          <Building2 size={14} />
          CentraleNome
        </button>
      </div>
    </header>
  )
}
