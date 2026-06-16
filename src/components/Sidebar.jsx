import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  FileMinus, LetterText,
  Unplug, FilePieChart, Binoculars,
  ChevronDown, ChevronUp, ChevronRight,
  Eye, EyeOff,
  Sparkles, Info, Camera, RotateCcw, Trash2,
  Megaphone, CalendarRange, SquarePen, Check,
  GripVertical,
} from 'lucide-react'
import { KPI_GROUPS, KPI_TOTAL, KPI_BY_ID, DEFAULT_WIDGET } from '../kpiData.js'

// ── PERIODS & CAMPAIGNS CONSTANTS ──────────────────────────────────────────────

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026]
const QUARTERS = ['Q1','Q2','Q3','Q4']
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const ROLLING_PERIODS = [
  { id: 'today',    label: 'Today' },
  { id: 'yesterday',label: 'Yesterday' },
  { id: 'past7d',   label: 'Past Week (7D)' },
  { id: 'past30d',  label: 'Past Month (30D)' },
  { id: 'past60d',  label: 'Past 2Mo (60D)' },
  { id: 'past90d',  label: 'Past 3Mo (90D)' },
  { id: 'past120d', label: 'Past 4Mo (120D)' },
  { id: 'past150d', label: 'Past 5Mo (150D)' },
  { id: 'past180d', label: 'Past 6Mo (180D)' },
  { id: 'mtd',      label: 'Month to Date' },
  { id: 'ytd',      label: 'Year to Date' },
]

// KPI_GROUPS, KPI_TOTAL, KPI_BY_ID, DEFAULT_WIDGET → imported from ../kpiData.js

// ── DATE LABEL HELPER ─────────────────────────────────────────────────────────

function getDateLabel(ds) {
  if (ds.mode === 'rolling') {
    return ROLLING_PERIODS.find(p => p.id === ds.rollingPeriod)?.label ?? '—'
  }
  if (ds.customDates && ds.startDate && ds.endDate) return `${ds.startDate}–${ds.endDate}`
  if (!ds.years?.length) return '—'
  const yearStr = ds.years.length === 1
    ? String(ds.years[0])
    : `${Math.min(...ds.years)}–${Math.max(...ds.years)}`
  if (ds.granularity === 'quarterly' && ds.quarters?.length > 0) {
    const qS = { Q1:'Jan', Q2:'Apr', Q3:'Jul', Q4:'Oct' }
    const qE = { Q1:'Mar', Q2:'Jun', Q3:'Sep', Q4:'Dec' }
    const s = [...ds.quarters].sort()
    return `${qS[s[0]]}–${qE[s[s.length-1]]} ${yearStr}`
  }
  if (ds.granularity === 'monthly' && ds.months?.length > 0) {
    const idxs = ds.months.map(m => MONTH_ABBR.indexOf(m)).filter(i => i >= 0).sort((a,b) => a-b)
    if (!idxs.length) return yearStr
    return idxs.length === 1
      ? `${MONTH_ABBR[idxs[0]]} ${yearStr}`
      : `${MONTH_ABBR[idxs[0]]}–${MONTH_ABBR[idxs[idxs.length-1]]} ${yearStr}`
  }
  return yearStr
}

// ── EXAMPLE DATASETS ──────────────────────────────────────────────────────────

const EXAMPLE_DATASETS = [
  {
    id: 1, name: "New Campaigns '26",
    mode: 'snapshot', granularity: 'yearly',
    years: [2026], quarters: [], months: [],
    customDates: false, startDate: '', endDate: '',
    rollingPeriod: null,
    campaigns: { count: 3, total: 3 }, visible: true, checked: true,
  },
  {
    id: 2, name: "Spring & Summer Sale '25",
    mode: 'snapshot', granularity: 'quarterly',
    years: [2025], quarters: ['Q2','Q3'], months: [],
    customDates: false, startDate: '', endDate: '',
    rollingPeriod: null,
    campaigns: { count: 15, total: 19 }, visible: false, checked: false,
  },
  {
    id: 3, name: "Halloween Campaigns '24",
    mode: 'snapshot', granularity: 'monthly',
    years: [2024], quarters: [], months: ['Aug','Sep','Oct'],
    customDates: false, startDate: '', endDate: '',
    rollingPeriod: null,
    campaigns: { count: 6, total: 8 }, visible: true, checked: true,
  },
  {
    id: 4, name: "St Valentine's Specials '24",
    mode: 'snapshot', granularity: 'yearly',
    years: [2025], quarters: [], months: [],
    customDates: true, startDate: '01/13/25', endDate: '02/14/25',
    rollingPeriod: null,
    campaigns: { count: 2, total: 2 }, visible: true, checked: true,
  },
  {
    id: 5, name: "Last 6 months – Mid '25>'26",
    mode: 'rolling', granularity: 'yearly',
    years: [], quarters: [], months: [],
    customDates: false, startDate: '', endDate: '',
    rollingPeriod: 'past180d',
    campaigns: { count: 15, total: 26 }, visible: false, checked: false,
  },
]

// ── CHIP ──────────────────────────────────────────────────────────────────────

function Chip({ label, selected, onClick }) {
  return (
    <button className={`year-chip${selected ? ' selected' : ''}`} onClick={onClick}>
      {label}
      {selected && <span className="year-chip-x">×</span>}
    </button>
  )
}

// ── DATASET FORM ──────────────────────────────────────────────────────────────

function DataSetForm({ onSave, onCancel, initialData = null }) {
  const init = initialData || {}
  const [name, setName]         = useState(init.name         ?? "New Campaigns '26")
  const [mode, setMode]         = useState(init.mode         ?? 'snapshot')
  const [gran, setGran]         = useState(init.granularity  ?? 'yearly')
  const [selYears, setSelYears] = useState(new Set(init.years    ?? [2026]))
  const [selQs, setSelQs]       = useState(new Set(init.quarters ?? []))
  const [selMs, setSelMs]       = useState(new Set(init.months   ?? []))
  const [custom, setCustom]     = useState(init.customDates  ?? false)
  const [start, setStart]       = useState(init.startDate    ?? '')
  const [end, setEnd]           = useState(init.endDate      ?? '')
  const [rolling, setRolling]   = useState(init.rollingPeriod ?? null)

  const tog = (setter) => (val) => setter(prev => {
    const next = new Set(prev)
    next.has(val) ? next.delete(val) : next.add(val)
    return next
  })

  const handleSave = () => onSave({
    name, mode, granularity: gran,
    years:    [...selYears].sort((a,b) => a-b),
    quarters: [...selQs].sort(),
    months:   [...selMs].sort((a,b) => MONTH_ABBR.indexOf(a) - MONTH_ABBR.indexOf(b)),
    customDates: custom, startDate: start, endDate: end,
    rollingPeriod: rolling,
    campaigns: init.campaigns ?? { count: 0, total: 0 },
    visible: init.visible ?? true,
    checked: init.checked ?? true,
  })

  return (
    <div className="dataset-form">
      <div className="dataset-form-header">
        <div className="dataset-form-title">
          <Sparkles size={14} style={{ color: '#9519ff' }} />
          <span>Create New Data Set</span>
        </div>
        <button className="dataset-info-btn"><Info size={13} /></button>
      </div>

      <div className="form-field">
        <label className="form-label">Data Set Name</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <span className="form-section-title">Timeframe Data Mode</span>
          <button className="dataset-info-btn"><Info size={12} /></button>
        </div>
        <p className="form-hint">
          Choose a locked historical snapshot [Static] or a dynamic rolling window [Dynamic].
        </p>
        <div className="granularity-tabs tertiary">
          <button className={`gran-tab${mode === 'snapshot' ? ' active' : ''}`} onClick={() => setMode('snapshot')}>
            <Camera size={12} />Snapshot
          </button>
          <button className={`gran-tab${mode === 'rolling' ? ' active' : ''}`} onClick={() => setMode('rolling')}>
            <RotateCcw size={12} />Rolling
          </button>
        </div>
      </div>

      {mode === 'rolling' && (
        <>
          <div className="year-select-label">Select Period</div>
          <div className="year-grid">
            {ROLLING_PERIODS.map(p => (
              <Chip
                key={p.id}
                label={p.label}
                selected={rolling === p.id}
                onClick={() => setRolling(prev => prev === p.id ? null : p.id)}
              />
            ))}
          </div>
        </>
      )}

      {mode === 'snapshot' && (
        <>
          <div className="form-toggle-row">
            <span>Custom Dates</span>
            <button className={`viz-toggle${custom ? ' on' : ''}`} onClick={() => setCustom(v => !v)} />
          </div>

          {custom ? (
            <div className="custom-dates-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label className="form-label">Start Date</label>
                <div className="date-input-wrap">
                  <CalendarRange size={12} style={{ color: '#797fa4', flexShrink: 0 }} />
                  <input className="form-input-bare" placeholder="MM/DD/YY" value={start} onChange={e => setStart(e.target.value)} />
                </div>
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label className="form-label">End Date</label>
                <div className="date-input-wrap">
                  <CalendarRange size={12} style={{ color: '#797fa4', flexShrink: 0 }} />
                  <input className="form-input-bare" placeholder="MM/DD/YY" value={end} onChange={e => setEnd(e.target.value)} />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="granularity-tabs">
                {['yearly','quarterly','monthly'].map(g => (
                  <button key={g} className={`gran-tab${gran === g ? ' active' : ''}`} onClick={() => setGran(g)}>
                    {g[0].toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>

              <div className="year-select-label">Select Year</div>
              <div className="year-grid">
                {YEARS.map(y => (
                  <Chip key={y} label={y} selected={selYears.has(y)} onClick={() => tog(setSelYears)(y)} />
                ))}
              </div>

              {gran === 'quarterly' && (
                <>
                  <div className="year-select-label">Select Quarters</div>
                  <div className="year-grid">
                    {QUARTERS.map(q => (
                      <Chip key={q} label={q} selected={selQs.has(q)} onClick={() => tog(setSelQs)(q)} />
                    ))}
                  </div>
                </>
              )}

              {gran === 'monthly' && (
                <>
                  <div className="year-select-label">Select Months</div>
                  <div className="month-grid">
                    {MONTH_ABBR.map(m => (
                      <Chip key={m} label={m} selected={selMs.has(m)} onClick={() => tog(setSelMs)(m)} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      <div className="dataset-campaigns-row">
        <Megaphone size={13} />
        <span>Campaigns</span>
        <span className="badge-tertiary">
          {init.campaigns ? `${init.campaigns.count} / ${init.campaigns.total}` : '0 / 0'}
        </span>
        <ChevronRight size={13} style={{ marginLeft: 'auto', color: '#797fa4' }} />
      </div>

      <div className="dataset-form-actions">
        <button className="btn-ds-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-ds-save" onClick={handleSave}>Save</button>
      </div>
    </div>
  )
}

// ── DATASET CARD ──────────────────────────────────────────────────────────────

function DataSetCard({ dataset, onEdit, onChange }) {
  const dateLabel = getDateLabel(dataset)
  const ModeIcon = dataset.mode === 'rolling' ? RotateCcw : Sparkles

  return (
    <div className="dataset-card">
      <div className="dataset-card-left">
        <div className="dataset-card-title">
          <ModeIcon size={15} style={{ color: '#9519ff', flexShrink: 0 }} />
          <span>{dataset.name}</span>
        </div>
        <div className="dataset-card-meta">
          <button
            className={`meta-eye${dataset.visible ? '' : ' meta-eye--off'}`}
            onClick={() => onChange({ ...dataset, visible: !dataset.visible })}
            title={dataset.visible ? 'Hide' : 'Show'}
          >
            {dataset.visible
              ? <Eye size={11} style={{ color: '#40a02b' }} />
              : <EyeOff size={11} style={{ color: '#797fa4' }} />
            }
          </button>
          <div className="meta-item">
            <Megaphone size={11} />
            <span className="badge-tertiary-xs">{dataset.campaigns.count} / {dataset.campaigns.total}</span>
          </div>
          {dateLabel && (
            <div className="meta-item">
              <CalendarRange size={11} />
              <span className="badge-tertiary-xs">{dateLabel}</span>
            </div>
          )}
        </div>
      </div>
      <div className="dataset-card-right">
        <button className="dataset-card-edit" onClick={onEdit}><SquarePen size={13} /></button>
        <button
          className={`dataset-checkbox${dataset.checked ? ' checked' : ''}`}
          onClick={() => onChange({ ...dataset, checked: !dataset.checked })}
        >
          {dataset.checked && <Check size={9} strokeWidth={3} />}
        </button>
      </div>
    </div>
  )
}

// ── VIZ TYPE GALLERY ─────────────────────────────────────────────────────────

const VIZ_TYPES = [
  {
    id: 'kpi', label: 'KPI',
    Thumb: () => (
      <svg viewBox="0 0 80 55" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="6" width="22" height="7" rx="2" fill="#ede9e1"/>
        <rect x="4" y="17" width="52" height="13" rx="3" fill="#ddd8cf"/>
        <rect x="4" y="35" width="30" height="7" rx="3.5" fill="#ede9e1"/>
      </svg>
    ),
  },
  {
    id: 'bar', label: 'Bar',
    Thumb: () => (
      <svg viewBox="0 0 80 55" fill="none" xmlns="http://www.w3.org/2000/svg">
        {[{y:7,w:52},{y:18,w:38},{y:29,w:62},{y:40,w:30}].map(({y,w},i) => (
          <g key={i}>
            <rect x="4" y={y} width="14" height="7" rx="2" fill="#e8e4dc"/>
            <rect x="22" y={y} width={w} height="7" rx="2" fill="#ddd8cf"/>
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: 'line', label: 'Line',
    Thumb: () => (
      <svg viewBox="0 0 80 55" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4,44 C14,36 22,18 30,23 S44,10 54,15 S66,4 76,8" stroke="#ddd8cf" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M4,44 C14,36 22,18 30,23 S44,10 54,15 S66,4 76,8 L76,50 L4,50 Z" fill="#f0ece5"/>
      </svg>
    ),
  },
  {
    id: 'donut', label: 'Donut',
    Thumb: () => (
      <svg viewBox="0 0 80 55" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="19" stroke="#ede9e1" strokeWidth="9"/>
        <circle cx="28" cy="28" r="19" stroke="#c9c4bb" strokeWidth="9" strokeDasharray="34 90" strokeLinecap="round"/>
        <rect x="56" y="16" width="18" height="5" rx="2" fill="#ede9e1"/>
        <rect x="56" y="26" width="14" height="5" rx="2" fill="#ede9e1"/>
        <rect x="56" y="36" width="16" height="5" rx="2" fill="#ede9e1"/>
      </svg>
    ),
  },
  {
    id: 'table', label: 'Table',
    Thumb: () => (
      <svg viewBox="0 0 80 55" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="72" height="8" rx="2" fill="#d5d0c7"/>
        {[17,28,39].map((y,i) => (
          <g key={i}>
            <rect x="4"  y={y} width="28" height="6" rx="1.5" fill="#ede9e1" opacity={1-i*0.1}/>
            <rect x="36" y={y} width="18" height="6" rx="1.5" fill="#ede9e1" opacity={1-i*0.1}/>
            <rect x="58" y={y} width="18" height="6" rx="1.5" fill="#ede9e1" opacity={1-i*0.1}/>
          </g>
        ))}
      </svg>
    ),
  },
]

function VizTypeGallery({ current, onSelect }) {
  return (
    <div className="vtz-gallery">
      {VIZ_TYPES.map(({ id, label, Thumb }) => (
        <button
          key={id}
          className={`vtz-thumb${current === id ? ' active' : ''}`}
          onClick={() => onSelect(id)}
          title={label}
        >
          <div className="vtz-preview"><Thumb /></div>
          <span className="vtz-label">{label}</span>
        </button>
      ))}
    </div>
  )
}

// ── KPI WIDGET CARD ───────────────────────────────────────────────────────────

function KpiWidgetCard({ kpi, config, onChange, onRemove, onReset, dragHandleProps = {}, isDraggingCard = false, dragStyle = {}, vizType = 'kpi', onVizTypeChange, externalExpanded = false }) {
  const [expanded, setExpanded] = useState(false)
  const [subOpen, setSubOpen]   = useState({ format: true, info: false, sizing: false })

  useEffect(() => {
    if (externalExpanded) setExpanded(true)
  }, [externalExpanded])
  const [kpiSize, setKpiSize]   = useState('S')

  const togSub = (k) => setSubOpen(p => ({ ...p, [k]: !p[k] }))
  const set = (k) => (v) => onChange({ ...config, [k]: v })
  const KpiIcon = kpi.icon

  return (
    <div className={`kpi-viz-item${expanded ? ' open' : ''}${isDraggingCard ? ' dragging' : ''}`} style={dragStyle}>
      {/* Header */}
      <div className="kpi-widget-header" onClick={() => setExpanded(v => !v)}>
        <div
          className="kpi-widget-grip"
          onPointerDown={e => e.stopPropagation()}
          {...dragHandleProps}
        >
          <GripVertical size={13} style={{ color: '#c4c9e0', flexShrink: 0, cursor: 'grab' }} />
        </div>
        <div className="kpi-widget-icon-circle">
          <KpiIcon size={16} color="white" />
        </div>
        <span className="kpi-widget-name">{kpi.label}</span>
        <span className="kpi-info-badge-blue">i</span>
        {expanded
          ? <ChevronUp size={13} style={{ color: '#797fa4', flexShrink: 0 }} />
          : <ChevronDown size={13} style={{ color: '#797fa4', flexShrink: 0 }} />
        }
      </div>

      {expanded && (
        <>
          {/* Widget Content Format */}
          <div className="kpi-sub-accordion">
            <div className="kpi-sub-header" onClick={() => togSub('format')}>
              <span>Widget Content Format</span>
              {subOpen.format ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </div>
            {subOpen.format && (
              <div className="kpi-sub-body">
                <div className="kpi-sub-field">
                  <span className="kpi-sub-field-label">Display Mode</span>
                  <VizTypeGallery
                    current={vizType}
                    onSelect={type => onVizTypeChange?.(kpi.id, type)}
                  />
                </div>
                <div className="kpi-sub-field">
                  <span className="kpi-sub-field-label">Detail View</span>
                  <div className="granularity-tabs tertiary">
                    {['Fixed','Expandable','Overlay'].map(m => (
                      <button
                        key={m}
                        className={`gran-tab${config.detailView === m.toLowerCase() ? ' active' : ''}`}
                        onClick={() => set('detailView')(m.toLowerCase())}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="kpi-sub-accordion">
            <div className="kpi-sub-header" onClick={() => togSub('info')}>
              <span>Additional Information</span>
              {subOpen.info ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </div>
            {subOpen.info && (
              <div className="kpi-sub-body">
                <div className="kpi-sub-field">
                  <label className="kpi-sub-field-label">Tooltip</label>
                  <textarea
                    className="kpi-tooltip-input"
                    placeholder="Here's a quick tip! Hover over the info icon next to this KPI to see what it means."
                    value={config.tooltip}
                    onChange={e => set('tooltip')(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="form-toggle-row">
                  <span>Show KPI Icon</span>
                  <button className={`viz-toggle${config.showKpiIcon ? ' on' : ''}`} onClick={() => set('showKpiIcon')(!config.showKpiIcon)} />
                </div>
                <div className="form-toggle-row">
                  <span>
                    Visual Progress Bar
                    <br /><small className="kpi-sub-hint">(out of 100%)</small>
                  </span>
                  <button className={`viz-toggle${config.visualProgressBar ? ' on' : ''}`} onClick={() => set('visualProgressBar')(!config.visualProgressBar)} />
                </div>
                <div className="form-toggle-row">
                  <span>
                    'From Which' Split
                    <br /><small className="kpi-sub-hint">(Up to 3 KPIs)</small>
                  </span>
                  <button className={`viz-toggle${config.fromWhichSplit ? ' on' : ''}`} onClick={() => set('fromWhichSplit')(!config.fromWhichSplit)} />
                </div>
                <div className="form-toggle-row">
                  <span>Vs. previous Period</span>
                  <button className={`viz-toggle${config.vsPreviousPeriod ? ' on' : ''}`} onClick={() => set('vsPreviousPeriod')(!config.vsPreviousPeriod)} />
                </div>
                {config.vsPreviousPeriod && (
                  <>
                    <div className="granularity-tabs tertiary">
                      <button
                        className={`gran-tab${config.vsTimeMode === 'set-time-frame' ? ' active' : ''}`}
                        onClick={() => set('vsTimeMode')('set-time-frame')}
                      >
                        Set Time Frame
                      </button>
                      <button
                        className={`gran-tab${config.vsTimeMode === 'custom-dates' ? ' active' : ''}`}
                        onClick={() => set('vsTimeMode')('custom-dates')}
                      >
                        Custom Dates
                      </button>
                    </div>
                    {config.vsTimeMode === 'custom-dates' && (
                      <div className="custom-dates-row">
                        <div className="form-field" style={{ flex: 1 }}>
                          <label className="form-label">Start Date</label>
                          <div className="date-input-wrap">
                            <CalendarRange size={12} style={{ color: '#797fa4', flexShrink: 0 }} />
                            <input className="form-input-bare" placeholder="Pick a date" value={config.vsStartDate} onChange={e => set('vsStartDate')(e.target.value)} />
                          </div>
                        </div>
                        <div className="form-field" style={{ flex: 1 }}>
                          <label className="form-label">End Date</label>
                          <div className="date-input-wrap">
                            <CalendarRange size={12} style={{ color: '#797fa4', flexShrink: 0 }} />
                            <input className="form-input-bare" placeholder="Pick a date" value={config.vsEndDate} onChange={e => set('vsEndDate')(e.target.value)} />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Widget Sizing */}
          <div className="kpi-sub-accordion">
            <div className="kpi-sub-header" onClick={() => togSub('sizing')}>
              <span>Widget Sizing</span>
              {subOpen.sizing ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </div>
            {subOpen.sizing && (
              <div className="kpi-sub-body">
                <div className="kpi-sub-field">
                  <span className="kpi-sub-field-label">Widget Size</span>
                  <div className="viz-size-row" style={{ paddingBottom: 0 }}>
                    {SIZE_OPTIONS.map(s => (
                      <button
                        key={s}
                        className={`viz-size-btn${kpiSize === s ? ' active' : ''}`}
                        onClick={() => setKpiSize(s)}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                <div className="form-toggle-row" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#363f76' }}>Stretch to Fill Width</div>
                    <div className="kpi-sub-hint">Just stretch this widget to take up the whole row</div>
                  </div>
                  <button className={`viz-toggle${config.stretchWidth ? ' on' : ''}`} style={{ marginTop: 2, flexShrink: 0 }} onClick={() => set('stretchWidth')(!config.stretchWidth)} />
                </div>
                <div className="form-toggle-row" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#363f76' }}>Stretch to Fill Height</div>
                    <div className="kpi-sub-hint">Just pull this widget to fill the entire column</div>
                  </div>
                  <button className={`viz-toggle${config.stretchHeight ? ' on' : ''}`} style={{ marginTop: 2, flexShrink: 0 }} onClick={() => set('stretchHeight')(!config.stretchHeight)} />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="widget-actions">
            <button className="widget-action-trash" onClick={onRemove} title="Remove KPI">
              <Trash2 size={13} />
            </button>
            <button className="widget-action-reset" onClick={onReset}>
              <RotateCcw size={11} />Reset
            </button>
            <button className="widget-action-save">
              <Check size={11} />Save Widget
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── DATA & KPIs CONTENT ───────────────────────────────────────────────────────

function DataKpisContent({ selectedIds, onToggle, editingId }) {
  const [groupOpen, setGroupOpen] = useState(
    Object.fromEntries(KPI_GROUPS.map(g => [g.id, true]))
  )

  const isSelected = (id) => selectedIds.includes(id)

  return (
    <div className="kpi-content">
      {KPI_GROUPS.map(group => {
        const GIcon = group.icon
        const selInGroup = group.items.filter(item => isSelected(item.id)).length
        return (
          <div key={group.id} className="kpi-group">
            <div
              className="kpi-group-header"
              onClick={() => setGroupOpen(p => ({ ...p, [group.id]: !p[group.id] }))}
            >
              <GIcon size={11} style={{ color: '#797fa4', flexShrink: 0 }} />
              <span className="kpi-group-label">{group.label}</span>
              <span className="kpi-group-count">{selInGroup} / {group.items.length}</span>
              {groupOpen[group.id]
                ? <ChevronUp   size={11} style={{ color: '#797fa4', flexShrink: 0 }} />
                : <ChevronDown size={11} style={{ color: '#797fa4', flexShrink: 0 }} />
              }
            </div>
            {groupOpen[group.id] && (
              <div className="kpi-grid">
                {group.items.map(kpi => {
                  const KIcon = kpi.icon
                  return (
                    <button
                      key={kpi.id}
                      className={`kpi-card${kpi.id === editingId ? ' editing' : isSelected(kpi.id) ? ' selected' : ''}`}
                      onClick={() => onToggle(kpi)}
                    >
                      <div className="kpi-card-icon">
                        <KIcon size={16} color="white" />
                      </div>
                      <span className="kpi-card-label">{kpi.label}</span>
                      <span
                        className="kpi-card-info-dot"
                        onClick={e => e.stopPropagation()}
                        role="button"
                        tabIndex={0}
                      >i</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}

// ── Wrapper sortable para KpiWidgetCard (con tipo 'kpi' en data) ──────────────
function SortableKpiWidgetCard({ kpi, config, onChange, onRemove, onReset, groupId, vizType, onVizTypeChange, externalExpanded }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: kpi.id,
    data: { type: 'kpi', groupId },
  })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}>
      <KpiWidgetCard
        kpi={kpi}
        config={config}
        onChange={onChange}
        onRemove={onRemove}
        onReset={onReset}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDraggingCard={isDragging}
        vizType={vizType}
        onVizTypeChange={onVizTypeChange}
        externalExpanded={externalExpanded}
      />
    </div>
  )
}

// ── Grupo sortable con grip de grupo ─────────────────────────────────────────
function SortableGroupCard({ group, open, onToggle, kpiCount, children }) {
  const {
    attributes, listeners,
    setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: group.id, data: { type: 'group', groupId: group.id } })
  const GIcon = group.icon
  return (
    <div
      ref={setNodeRef}
      className={`viz-group-card${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className="kpi-group-header" onClick={onToggle}>
        <div
          ref={setActivatorNodeRef}
          className="kpi-group-grip"
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={13} style={{ color: '#c4c9e0', cursor: 'grab' }} />
        </div>
        <GIcon size={11} style={{ color: '#797fa4', flexShrink: 0 }} />
        <span className="kpi-group-label">{group.label}</span>
        <span className="kpi-group-count">{kpiCount} / {group.items.length}</span>
        {open
          ? <ChevronUp   size={11} style={{ color: '#797fa4', flexShrink: 0 }} />
          : <ChevronDown size={11} style={{ color: '#797fa4', flexShrink: 0 }} />
        }
      </div>
      {children}
    </div>
  )
}

// ── VISUALIZATION SETTINGS ────────────────────────────────────────────────────

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL']

function VizSettingsContent({ selectedIds, configs, onConfigChange, onRemove, onReset, groupBySection, onGroupBySectionToggle, onReorderGroup, onGroupsReorder, canvasOrder, editingKpiId, kpiVizTypes, onVizTypeChange }) {
  const [groupExpanded, setGroupExpanded]         = useState({})
  const [groupOrders, setGroupOrders]             = useState({})
  const [groupDisplayOrder, setGroupDisplayOrder] = useState([])

  const [expandedKpiId, setExpandedKpiId] = useState(null)

  useEffect(() => {
    if (editingKpiId) setExpandedKpiId(editingKpiId)
  }, [editingKpiId])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const activeGroups = KPI_GROUPS.filter(g =>
    g.items.some(item => selectedIds.includes(item.id))
  )
  const activeGroupIds = activeGroups.map(g => g.id).join(',')

  // Sincroniza el orden local de KPIs cuando cambian los selectedIds
  useEffect(() => {
    setGroupOrders(prev => {
      const next = {}
      activeGroups.forEach(g => {
        const groupKpis = g.items.filter(k => selectedIds.includes(k.id)).map(k => k.id)
        const prev_g    = prev[g.id] ?? []
        const kept   = prev_g.filter(id => groupKpis.includes(id))
        const added  = groupKpis.filter(id => !kept.includes(id))
        next[g.id] = [...kept, ...added]
      })
      return next
    })
  }, [selectedIds])  // eslint-disable-line

  // Sincroniza el orden de grupos cuando se añaden/eliminan grupos
  useEffect(() => {
    const ids = activeGroupIds ? activeGroupIds.split(',') : []
    setGroupDisplayOrder(prev => {
      const kept  = prev.filter(id => ids.includes(id))
      const added = ids.filter(id => !kept.includes(id))
      return [...kept, ...added]
    })
  }, [activeGroupIds])

  // Sincroniza desde el canvas cuando el usuario arrastra allí (sin llamar onGroupsReorder de vuelta)
  useEffect(() => {
    if (!canvasOrder) return
    const { groupIds, cardOrders } = canvasOrder
    if (groupIds?.length) {
      setGroupDisplayOrder(prev => {
        const active = activeGroupIds ? activeGroupIds.split(',') : []
        const ordered = groupIds.filter(id => active.includes(id))
        const extra   = active.filter(id => !ordered.includes(id))
        return [...ordered, ...extra]
      })
    }
    if (cardOrders) {
      setGroupOrders(prev => {
        const next = { ...prev }
        Object.entries(cardOrders).forEach(([gId, kpiIds]) => {
          if (!next[gId]) return
          const reordered = kpiIds.filter(id => next[gId].includes(id))
          const extra     = next[gId].filter(id => !reordered.includes(id))
          next[gId] = [...reordered, ...extra]
        })
        return next
      })
    }
  }, [canvasOrder])  // eslint-disable-line

  if (selectedIds.length === 0) {
    return (
      <p style={{ fontSize: 12, color: '#797fa4', padding: '4px 0 8px' }}>
        Select KPIs from Data &amp; KPIs to configure them here.
      </p>
    )
  }

  const togGroup    = (id) => setGroupExpanded(p => ({ ...p, [id]: p[id] === false }))
  const isGroupOpen = (id) => groupExpanded[id] !== false

  const orderedGroups = groupDisplayOrder
    .map(id => activeGroups.find(g => g.id === id))
    .filter(Boolean)

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const activeType = active.data.current?.type

    if (activeType === 'group') {
      // Reordenar grupos
      const targetId = over.data.current?.type === 'group'
        ? over.id
        : over.data.current?.groupId  // over es un KPI → usar su grupo como destino
      if (!targetId) return
      const oldIdx = groupDisplayOrder.indexOf(active.id)
      const newIdx = groupDisplayOrder.indexOf(targetId)
      if (oldIdx === -1 || newIdx === -1) return
      const newOrder = arrayMove(groupDisplayOrder, oldIdx, newIdx)
      setGroupDisplayOrder(newOrder)
      onGroupsReorder?.(newOrder)
    } else {
      // Reordenar KPIs dentro del grupo
      const groupId = active.data.current?.groupId
      if (!groupId) return
      const order  = groupOrders[groupId] ?? []
      const oldIdx = order.indexOf(active.id)
      const newIdx = order.indexOf(over.id)
      if (oldIdx === -1 || newIdx === -1) return
      const newOrder = arrayMove(order, oldIdx, newIdx)
      setGroupOrders(prev => ({ ...prev, [groupId]: newOrder }))
      onReorderGroup?.(groupId, newOrder)
    }
  }

  return (
    <div className="viz-kpi-settings">
      {/* Widgets grouped by Section */}
      <label className="viz-group-by-row">
        <button
          className={`viz-section-checkbox${groupBySection ? ' checked' : ''}`}
          onClick={onGroupBySectionToggle}
        >
          {groupBySection && <Check size={9} strokeWidth={3} />}
        </button>
        <span className="viz-group-by-label">Widgets grouped by Section</span>
      </label>

      {/* Un único DndContext maneja tanto drag de grupos como drag de KPIs */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groupDisplayOrder} strategy={verticalListSortingStrategy}>
          {orderedGroups.map(group => {
            const order       = groupOrders[group.id] ?? []
            const orderedKpis = order.map(id => group.items.find(k => k.id === id)).filter(Boolean)
            const open        = isGroupOpen(group.id)

            return (
              <SortableGroupCard
                key={group.id}
                group={group}
                open={open}
                onToggle={() => togGroup(group.id)}
                kpiCount={orderedKpis.length}
              >
                {open && (
                  <SortableContext items={order} strategy={verticalListSortingStrategy}>
                    <div className="viz-group-items">
                      {orderedKpis.map(kpi => (
                        <SortableKpiWidgetCard
                          key={kpi.id}
                          kpi={kpi}
                          config={configs[kpi.id] || DEFAULT_WIDGET}
                          onChange={cfg => onConfigChange(kpi.id, cfg)}
                          onRemove={() => onRemove(kpi.id)}
                          onReset={() => onReset(kpi.id)}
                          groupId={group.id}
                          vizType={kpiVizTypes?.[kpi.id] ?? 'kpi'}
                          onVizTypeChange={onVizTypeChange}
                          externalExpanded={expandedKpiId === kpi.id}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </SortableGroupCard>
            )
          })}
        </SortableContext>
      </DndContext>
    </div>
  )
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────

export default function Sidebar({ onKpisChange, onGroupBySectionChange, editingKpiId, onGroupReorder, onGroupsReorder, canvasOrder, kpiVizTypes, onVizTypeChange }) {
  const [open, setOpen]           = useState({})
  const [datasets, setDatasets]   = useState(EXAMPLE_DATASETS)
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedIds, setSelectedIds]   = useState([])
  const [configs, setConfigs]           = useState({})
  const [groupBySection, setGroupBySection] = useState(true)

  useEffect(() => { onKpisChange?.(selectedIds) }, [selectedIds])
  useEffect(() => { onGroupBySectionChange?.(groupBySection) }, [groupBySection])

  // Auto-abre el acordeón "viz" cuando se selecciona una card en el canvas
  useEffect(() => {
    if (editingKpiId) setOpen(prev => ({ ...prev, viz: true }))
  }, [editingKpiId])

  const toggleAccordion = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }))
  const saveDataset     = (data) => { setDatasets(prev => [...prev, { ...data, id: Date.now() }]); setShowForm(false) }
  const updateDataset   = (id, data) => { setDatasets(prev => prev.map(ds => ds.id === id ? { ...ds, ...data } : ds)); setEditingId(null) }
  const changeDataset   = (id, data) => setDatasets(prev => prev.map(ds => ds.id === id ? data : ds))

  const toggleKpi = (kpi) => {
    setSelectedIds(prev => {
      if (prev.includes(kpi.id)) return prev.filter(id => id !== kpi.id)
      if (!configs[kpi.id]) setConfigs(c => ({ ...c, [kpi.id]: { ...DEFAULT_WIDGET } }))
      return [...prev, kpi.id]
    })
  }
  const removeKpi    = (id)      => setSelectedIds(prev => prev.filter(x => x !== id))
  const updateCfg    = (id, cfg) => setConfigs(p => ({ ...p, [id]: cfg }))
  const resetCfg     = (id)      => setConfigs(p => ({ ...p, [id]: { ...DEFAULT_WIDGET } }))

  const accordionSections = [
    { id: 'periods', label: 'Periods & Campaigns', badge: String(datasets.length),                   icon: Unplug },
    { id: 'data',    label: 'Data & KPIs',          badge: `${selectedIds.length} / ${KPI_TOTAL}`,   icon: FilePieChart },
    { id: 'viz',     label: 'Visualization Settings', badge: null,                                    icon: Binoculars },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Page Construction</span>
      </div>

      <div className="template-row">
        <div className="template-input">
          <FileMinus size={13} /><span>Dashboard – Template Name</span>
        </div>
        <button className="template-icon-btn"><LetterText size={13} /></button>
      </div>

      {accordionSections.map(({ id, label, badge, icon: Icon }) => (
        <div key={id} className="accordion-item">
          <div className="accordion-header" onClick={() => toggleAccordion(id)}>
            <div className="accordion-left">
              <div style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={16} color="#797fa4" />
              </div>
              {label}
              {badge !== null && <span className="badge">{badge}</span>}
            </div>
            <span className="chevron-btn">
              {open[id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>

          {open[id] && (
            <div className="accordion-body">
              {id === 'periods' && (
                <>
                  {datasets.map(ds =>
                    editingId === ds.id ? (
                      <DataSetForm
                        key={ds.id}
                        initialData={ds}
                        onSave={(data) => updateDataset(ds.id, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <DataSetCard
                        key={ds.id}
                        dataset={ds}
                        onEdit={() => { setShowForm(false); setEditingId(ds.id) }}
                        onChange={(updated) => changeDataset(ds.id, updated)}
                      />
                    )
                  )}
                  {showForm && (
                    <DataSetForm onSave={saveDataset} onCancel={() => setShowForm(false)} />
                  )}
                  <button
                    className="btn-add-dataset"
                    onClick={() => { if (!showForm && !editingId) setShowForm(true) }}
                  >
                    Add New Data Set
                  </button>
                </>
              )}
              {id === 'data' && <DataKpisContent selectedIds={selectedIds} onToggle={toggleKpi} editingId={editingKpiId} />}
              {id === 'viz'  && (
                <VizSettingsContent
                  selectedIds={selectedIds}
                  configs={configs}
                  onConfigChange={updateCfg}
                  onRemove={removeKpi}
                  onReset={resetCfg}
                  groupBySection={groupBySection}
                  onGroupBySectionToggle={() => setGroupBySection(v => !v)}
                  onReorderGroup={onGroupReorder}
                  onGroupsReorder={onGroupsReorder}
                  canvasOrder={canvasOrder}
                  editingKpiId={editingKpiId}
                  kpiVizTypes={kpiVizTypes}
                  onVizTypeChange={onVizTypeChange}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </aside>
  )
}
