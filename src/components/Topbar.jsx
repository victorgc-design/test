import { TextSelect, Smartphone, Tablet, Monitor, SquarePlay, X, CircleGauge, Share2, Download, BookMarked, Building2, LayoutGrid } from 'lucide-react'

const devices = [
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Tablet',     icon: Tablet },
  { name: 'Desktop',    icon: Monitor },
]

export default function Topbar({ device, onDeviceChange, showGrid, onToggleGrid, previewMode, onTogglePreview }) {
  return (
    <header className="topbar">
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
        <button
          className={`btn-preview${previewMode ? ' active' : ''}`}
          onClick={onTogglePreview}
        >
          {previewMode ? <X size={14} /> : <SquarePlay size={14} />}
          {previewMode ? 'Exit Preview' : 'Preview'}
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
        <button
          className={`icon-btn${showGrid ? ' active' : ''}`}
          title={showGrid ? 'Hide grid' : 'Show grid'}
          onClick={onToggleGrid}
        >
          <LayoutGrid size={15} />
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
