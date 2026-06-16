import { useState } from 'react'
import { PanelRightOpen, PanelLeftOpen } from 'lucide-react'
import Topbar from './components/Topbar'
import IconRail from './components/IconRail'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import './App.css'

export default function App() {
  const [device, setDevice]             = useState('Desktop')
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [kpiSelectedIds, setKpiSelectedIds] = useState([])
  const [showGrid, setShowGrid]         = useState(true)
  const [groupBySection, setGroupBySection] = useState(true)
  const [editingKpiId, setEditingKpiId]             = useState(null)
  const [groupReorderSignal, setGroupReorderSignal] = useState(null)
  const [canvasOrder, setCanvasOrder]               = useState(null)
  const [previewMode, setPreviewMode]               = useState(false)
  const [kpiVizTypes, setKpiVizTypes]               = useState({})

  const handleVizTypeChange = (kpiId, type) =>
    setKpiVizTypes(prev => ({ ...prev, [kpiId]: type }))

  return (
    <div className="app">
      <IconRail />
      <div className="app-main">
        <Topbar
          device={device}
          onDeviceChange={setDevice}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(v => !v)}
          previewMode={previewMode}
          onTogglePreview={() => setPreviewMode(v => !v)}
        />
        <div className="body-wrap">
          {sidebarOpen && (
            <Sidebar
              onKpisChange={setKpiSelectedIds}
              onGroupBySectionChange={setGroupBySection}
              editingKpiId={editingKpiId}
              canvasOrder={canvasOrder}
              onGroupReorder={(groupId, kpiIds) =>
                setGroupReorderSignal({ type: 'cards', groupId, kpiIds, ts: Date.now() })
              }
              onGroupsReorder={(groupIds) =>
                setGroupReorderSignal({ type: 'groups', groupIds, ts: Date.now() })
              }
              kpiVizTypes={kpiVizTypes}
              onVizTypeChange={handleVizTypeChange}
            />
          )}
          <button
            className={`sidebar-toggle-btn${sidebarOpen ? '' : ' closed'}`}
            onClick={() => setSidebarOpen(v => !v)}
            title={sidebarOpen ? 'Collapse panel' : 'Expand panel'}
          >
            {sidebarOpen ? <PanelRightOpen size={15} /> : <PanelLeftOpen size={15} />}
          </button>
          <Canvas
            device={device}
            selectedIds={kpiSelectedIds}
            showGrid={showGrid}
            groupBySection={groupBySection}
            onCardSelect={setEditingKpiId}
            groupReorderSignal={groupReorderSignal}
            onCardsOrderChange={o => setCanvasOrder({ ...o, ts: Date.now() })}
            previewMode={previewMode}
            kpiVizTypes={kpiVizTypes}
          />
        </div>
      </div>
    </div>
  )
}
