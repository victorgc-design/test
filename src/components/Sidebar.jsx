import { useState } from 'react'
import { PanelRightOpen, FileMinus, LetterText, Unplug, FilePieChart, Binoculars, ChevronDown } from 'lucide-react'

const accordionSections = [
  { id: 'periods', label: 'Periods & Campaigns', badge: '0',      icon: Unplug },
  { id: 'data',    label: 'Data & KPIs',          badge: '0 / 29', icon: FilePieChart },
  { id: 'viz',     label: 'Visualization Settings', badge: null,  icon: Binoculars },
]

export default function Sidebar() {
  const [open, setOpen] = useState({})

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Page Construction</span>
        <button><PanelRightOpen size={16} /></button>
      </div>

      <div className="template-row">
        <div className="template-input">
          <FileMinus size={13} />
          <span>Dashboard – Template Name</span>
        </div>
        <button className="template-icon-btn">
          <LetterText size={13} />
        </button>
      </div>

      {accordionSections.map(({ id, label, badge, icon: Icon }) => (
        <div key={id} className="accordion-item">
          <div className="accordion-header" onClick={() => toggle(id)}>
            <div className="accordion-left">
              <Icon size={16} />
              {label}
              {badge && <span className="badge">{badge}</span>}
            </div>
            <span className={`chevron${open[id] ? ' open' : ''}`}>
              <ChevronDown size={14} />
            </span>
          </div>
          {open[id] && (
            <div className="accordion-body">
              <p>Contenido de {label}</p>
            </div>
          )}
        </div>
      ))}
    </aside>
  )
}
