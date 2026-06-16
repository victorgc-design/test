import { useState, useEffect, useRef } from 'react'
import { Info, X, Heading1, GripVertical } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { KPI_GROUPS, KPI_BY_ID } from '../kpiData.js'

const DEVICE_COLS  = { Desktop: 12, Tablet: 6, Smartphone: 2 }
const DEVICE_WIDTH = { Smartphone: '375px', Tablet: '768px', Desktop: '100%' }
const SIZE_SPANS   = {
  Desktop:    { S: 3, M: 4, L: 6, XL: 9 },
  Tablet:     { S: 3, M: 3, L: 6, XL: 6 },
  Smartphone: { S: 2, M: 2, L: 2, XL: 2 },
}
const SIZES       = ['S', 'M', 'L', 'XL']
const TITLE_SIZES = ['S', 'M', 'L', 'XL', 'Full']

// Alturas para el eje vertical (independiente del span de columnas)
const V_HEIGHTS = { S: 130, M: 180, L: 240, XL: 310 }

// Spans de ancho para el contenido visual del título (la card siempre ocupa 1/-1)
const TITLE_SPANS = {
  Desktop:    { S: 3, M: 4, L: 6, XL: 9, Full: 12 },
  Tablet:     { S: 3, M: 3, L: 6, XL: 6, Full: 6 },
  Smartphone: { S: 2, M: 2, L: 2, XL: 2, Full: 2 },
}

// ─── Mock data deterministico ─────────────────────────────────────────────────
function mockStats(kpiId) {
  let h = 0
  for (let i = 0; i < kpiId.length; i++) h = ((h << 5) - h + kpiId.charCodeAt(i)) & 0xffff
  const factors = [100, 1_000, 10_000, 100_000, 1_000_000]
  const raw     = ((h % 900) + 100) * factors[(h >> 4) % 5]
  const value   = raw >= 1_000_000 ? `${(raw / 1_000_000).toFixed(1)}M`
                : raw >= 1_000     ? `${(raw / 1_000).toFixed(1)}K`
                : raw.toString()
  const trendAbs = ((h * 7 + 13) % 300) / 10
  const trendUp  = (h % 3) !== 0
  return {
    value,
    trend: `${trendUp ? '+' : '−'}${trendAbs.toFixed(1)}%`,
    trendUp,
    pct: (h * 13 + 5) % 94 + 5,
  }
}

// ─── Helpers de mock data deterministicos por índice ─────────────────────────
function mockHash(seed, i = 0) {
  let h = 0; const s = seed + i
  for (let j = 0; j < s.length; j++) h = ((h << 5) - h + s.charCodeAt(j)) & 0xffff
  return h
}

// ─── Bar chart horizontal ─────────────────────────────────────────────────────
function BarChartWireframe({ kpi }) {
  const KpiIcon = kpi.icon
  return (
    <>
      <div className="kw-header">
        <div className="kw-icon"><KpiIcon size={11} strokeWidth={1.5} /></div>
        <span className="kw-name">{kpi.label}</span>
      </div>
      <div className="kw-hbars">
        {[75, 48, 88, 38, 62].map((w, i) => (
          <div key={i} className="kw-hbar-row">
            <div className="kw-hbar-label" />
            <div className="kw-hbar-track"><div className="kw-hbar-fill" style={{ width: `${w}%` }} /></div>
          </div>
        ))}
      </div>
    </>
  )
}

function BarChartContent({ kpi }) {
  const KpiIcon = kpi.icon
  const cats = ['18–24', '25–34', '35–44', '45–54', '55+']
  const bars = cats.map((cat, i) => ({ label: cat, pct: 20 + (mockHash(kpi.id, i) % 60) }))
  const max = Math.max(...bars.map(b => b.pct))
  return (
    <>
      <div className="cc-header">
        <div className="cc-icon"><KpiIcon size={13} strokeWidth={2} /></div>
        <span className="cc-name">{kpi.label}</span>
      </div>
      <div className="bc-list">
        {bars.map(({ label, pct }) => (
          <div key={label} className="bc-row">
            <span className="bc-cat">{label}</span>
            <div className="bc-track"><div className="bc-fill" style={{ width: `${(pct / max) * 100}%` }} /></div>
            <span className="bc-val">{pct}%</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Line / area chart ────────────────────────────────────────────────────────
function LineChartWireframe({ kpi }) {
  const KpiIcon = kpi.icon
  return (
    <>
      <div className="kw-header">
        <div className="kw-icon"><KpiIcon size={11} strokeWidth={1.5} /></div>
        <span className="kw-name">{kpi.label}</span>
      </div>
      <div className="kw-line-area">
        <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="kw-lc-svg">
          <path d="M0,50 C20,40 35,18 55,24 S88,8 110,14 S145,4 165,10 L200,7"
                fill="none" stroke="#ddd8cf" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M0,50 C20,40 35,18 55,24 S88,8 110,14 S145,4 165,10 L200,7 L200,60 L0,60 Z"
                fill="#f0ece5" />
        </svg>
      </div>
    </>
  )
}

function LineChartContent({ kpi }) {
  const KpiIcon = kpi.icon
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul']
  const vals = months.map((_, i) => 15 + (mockHash(kpi.id, i) % 70))
  const max = Math.max(...vals); const min = Math.min(...vals); const range = max - min || 1
  const pts = vals.map((v, i) => `${(i / 6) * 200},${58 - ((v - min) / range) * 50}`).join(' ')
  const area = `0,60 ${pts} 200,60`
  return (
    <>
      <div className="cc-header">
        <div className="cc-icon"><KpiIcon size={13} strokeWidth={2} /></div>
        <span className="cc-name">{kpi.label}</span>
      </div>
      <div className="lc-wrap">
        <svg viewBox="0 0 200 65" preserveAspectRatio="none" className="lc-svg">
          <polygon points={area} fill="rgba(149,25,255,0.08)" />
          <polyline points={pts} fill="none" stroke="#9519ff" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="lc-labels">
          {months.filter((_, i) => i % 2 === 0).map(m => <span key={m} className="lc-label">{m}</span>)}
        </div>
      </div>
    </>
  )
}

// ─── Donut / pie chart ────────────────────────────────────────────────────────
function DonutWireframe({ kpi }) {
  const KpiIcon = kpi.icon
  return (
    <>
      <div className="kw-header">
        <div className="kw-icon"><KpiIcon size={11} strokeWidth={1.5} /></div>
        <span className="kw-name">{kpi.label}</span>
      </div>
      <div className="kw-donut-row">
        <div className="kw-donut-ring" />
        <div className="kw-donut-legend">
          {[72, 52, 38].map((w, i) => (
            <div key={i} className="kw-dl-row">
              <div className="kw-dl-dot" style={{ opacity: 1 - i * 0.25 }} />
              <div className="kw-dl-line" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function DonutContent({ kpi }) {
  const KpiIcon = kpi.icon
  const h0 = mockHash(kpi.id, 0) % 40 + 30  // 30–70
  const h1 = mockHash(kpi.id, 1) % 30 + 15  // 15–45
  const h2 = 100 - h0 - h1
  const segs = [
    { label: 'Segment A', pct: h0, color: '#9519ff' },
    { label: 'Segment B', pct: h1, color: '#0b88be' },
    { label: 'Segment C', pct: h2, color: '#e2d9f5' },
  ]
  const grad = `conic-gradient(${segs[0].color} 0% ${segs[0].pct}%, ${segs[1].color} ${segs[0].pct}% ${segs[0].pct + segs[1].pct}%, ${segs[2].color} ${segs[0].pct + segs[1].pct}% 100%)`
  return (
    <>
      <div className="cc-header">
        <div className="cc-icon"><KpiIcon size={13} strokeWidth={2} /></div>
        <span className="cc-name">{kpi.label}</span>
      </div>
      <div className="dc-wrap">
        <div className="dc-chart" style={{ background: grad }}><div className="dc-hole" /></div>
        <div className="dc-legend">
          {segs.map(s => (
            <div key={s.label} className="dc-row">
              <div className="dc-dot" style={{ background: s.color }} />
              <span className="dc-label">{s.label}</span>
              <span className="dc-pct">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Tabla ────────────────────────────────────────────────────────────────────
function TableWireframe({ kpi }) {
  const KpiIcon = kpi.icon
  return (
    <>
      <div className="kw-header">
        <div className="kw-icon"><KpiIcon size={11} strokeWidth={1.5} /></div>
        <span className="kw-name">{kpi.label}</span>
      </div>
      <div className="kw-tbl">
        <div className="kw-tbl-head">
          {[42, 30, 28].map((w, i) => <div key={i} className="kw-tbl-hcell" style={{ width: `${w}%` }} />)}
        </div>
        {[1, 2, 3, 4].map(r => (
          <div key={r} className="kw-tbl-row">
            {[42, 30, 28].map((w, i) => <div key={i} className="kw-tbl-cell" style={{ width: `${w}%`, opacity: 1 - r * 0.07 }} />)}
          </div>
        ))}
      </div>
    </>
  )
}

function TableContent({ kpi }) {
  const KpiIcon = kpi.icon
  const names = ['Item A', 'Item B', 'Item C', 'Item D', 'Item E']
  const rows = names.map((name, r) => {
    const val = 100 + (mockHash(kpi.id, r * 3 + 1) % 900)
    const chg = (mockHash(kpi.id, r * 3 + 2) % 3) !== 0
    const pct = ((mockHash(kpi.id, r * 3 + 3) * 7 + 13) % 300) / 10
    return { name, val: val.toLocaleString(), chg, pct: `${chg ? '+' : '−'}${pct.toFixed(1)}%` }
  })
  return (
    <>
      <div className="cc-header">
        <div className="cc-icon"><KpiIcon size={13} strokeWidth={2} /></div>
        <span className="cc-name">{kpi.label}</span>
      </div>
      <div className="tbl-wrap">
        <table className="kpi-table">
          <thead><tr><th>Name</th><th>Value</th><th>Chg.</th></tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.val}</td>
                <td className={row.chg ? 'up' : 'down'}>{row.pct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Wireframe (modo builder) ─────────────────────────────────────────────────
function KpiCardWireframe({ kpi, size }) {
  const KpiIcon = kpi.icon
  const isLarge = size === 'L' || size === 'XL'
  return (
    <>
      <div className="kw-header">
        <div className="kw-icon"><KpiIcon size={11} strokeWidth={1.5} /></div>
        <span className="kw-name">{kpi.label}</span>
      </div>
      <div className={`kw-body${isLarge ? ' large' : ''}`}>
        <div className="kw-left">
          <div className="kw-value-block" />
          <div className="kw-trend-block" />
        </div>
        {isLarge && <div className="kw-chart-block" />}
      </div>
      {isLarge && (
        <div className="kw-footer">
          <div className="kw-bar-block" />
        </div>
      )}
    </>
  )
}

// ─── Contenido visual real (modo preview) ─────────────────────────────────────
function KpiCardContent({ kpi, size, stats, isEditing }) {
  const KpiIcon = kpi.icon
  const isLarge = size === 'L' || size === 'XL'
  return (
    <>
      <div className="cc-header">
        <div className="cc-icon"><KpiIcon size={13} strokeWidth={2} /></div>
        <span className="cc-name">{kpi.label}</span>
        <button
          className={`cc-info-btn${isEditing ? ' editing' : ''}`}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <Info size={11} />
        </button>
      </div>
      <div className={`cc-body${isLarge ? ' large' : ''}`}>
        <div className="cc-left">
          <div className="cc-value">{stats.value}</div>
          <span className={`cc-trend${stats.trendUp ? ' up' : ' down'}`}>
            {stats.trendUp ? '↑' : '↓'} {stats.trend}
          </span>
        </div>
        {isLarge && <div className="cc-right"><span className="cc-vs">vs prev. period</span></div>}
      </div>
      {isLarge && (
        <div className="cc-footer">
          <div className="cc-bar-wrap">
            <div className="cc-bar-fill" style={{ width: `${stats.pct}%` }} />
          </div>
          <span className="cc-bar-pct">{stats.pct}%</span>
        </div>
      )}
    </>
  )
}

// ─── Manejadores de redimensión + selectores flotantes ────────────────────────
function EditHandles({ card, onResize, onResizeV, onRemove }) {
  const stop = e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.() }
  return (
    <>
      {/* Manejador derecho: eje X (columnas) → picker vertical fuera de la card */}
      <div className="card-handle-right" onPointerDown={stop} onMouseDown={stop} onClick={stop}>
        <div className="card-handle-pill" />
        <div className="size-picker-v">
          {SIZES.map(s => (
            <button
              key={s}
              className={`spv-btn${card.size === s ? ' active' : ''}`}
              onPointerDown={stop}
              onClick={e => { stop(e); onResize(card.id, s) }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Manejador inferior: eje Y (altura) → picker horizontal fuera de la card */}
      <div className="card-handle-bottom" onPointerDown={stop} onMouseDown={stop} onClick={stop}>
        <div className="card-handle-pill card-handle-pill-h" />
        <div className="size-picker-h">
          {SIZES.map(s => (
            <button
              key={s}
              className={`sph-btn${(card.sizeV ?? 'S') === s ? ' active' : ''}`}
              onPointerDown={stop}
              onClick={e => { stop(e); onResizeV(card.id, s) }}
            >{s}</button>
          ))}
          <div className="sph-sep" />
          <button
            className="sph-del"
            onPointerDown={stop}
            onClick={e => { stop(e); onRemove(card.id) }}
            title="Remove widget"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Shell compartida para cards KPI (sortable y estática) ───────────────────
function KpiCardShell({ cardRef, kpi, card, isSelected, isDragging, colSpan, gridRow, gridCol, style, dragProps, onSelect, onResize, onResizeV, onRemove, previewMode, kpiVizTypes }) {
  const stats   = previewMode ? mockStats(card.kpiId) : null
  const vHeight = V_HEIGHTS[card.sizeV ?? 'S'] ?? 130
  const vizType = kpiVizTypes?.[card.kpiId] ?? card.vizType ?? 'kpi'

  const renderWireframe = () => {
    switch (vizType) {
      case 'bar':   return <BarChartWireframe kpi={kpi} />
      case 'line':  return <LineChartWireframe kpi={kpi} />
      case 'donut': return <DonutWireframe kpi={kpi} />
      case 'table': return <TableWireframe kpi={kpi} />
      default:      return <KpiCardWireframe kpi={kpi} size={card.size} />
    }
  }

  const renderPreview = () => {
    switch (vizType) {
      case 'bar':   return <BarChartContent kpi={kpi} />
      case 'line':  return <LineChartContent kpi={kpi} />
      case 'donut': return <DonutContent kpi={kpi} />
      case 'table': return <TableContent kpi={kpi} />
      default:      return <KpiCardContent kpi={kpi} size={card.size} stats={stats} isEditing={false} />
    }
  }

  return (
    <div
      ref={cardRef}
      className={`canvas-kpi-card${previewMode ? ' preview' : ''}${isSelected && !previewMode ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
      style={{ gridRow, gridColumn: `${gridCol} / span ${colSpan}`, minHeight: vHeight, ...style }}
      onClick={previewMode ? undefined : () => onSelect(card.id)}
      onMouseDown={previewMode ? undefined : e => e.stopPropagation()}
      {...(previewMode ? {} : dragProps)}
    >
      {previewMode ? renderPreview() : renderWireframe()}
      {isSelected && !previewMode && (
        <EditHandles card={card} onResize={onResize} onResizeV={onResizeV} onRemove={onRemove} />
      )}
    </div>
  )
}

// ─── Card KPI draggable ───────────────────────────────────────────────────────
function SortableKpiCard({ card, isSelected, onSelect, onResize, onResizeV, onRemove, colSpan, gridRow, gridCol, previewMode, kpiVizTypes }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const kpi = KPI_BY_ID[card.kpiId]
  if (!kpi) return null
  return (
    <KpiCardShell
      cardRef={setNodeRef}
      kpi={kpi}
      card={card}
      isSelected={isSelected}
      isDragging={isDragging}
      colSpan={colSpan}
      gridRow={gridRow}
      gridCol={gridCol}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragProps={{ ...attributes, ...listeners }}
      onSelect={onSelect}
      onResize={onResize}
      onResizeV={onResizeV}
      onRemove={onRemove}
      previewMode={previewMode}
      kpiVizTypes={kpiVizTypes}
    />
  )
}

// ─── Title card draggable ─────────────────────────────────────────────────────
function SortableTitleCard({ card, isSelected, onSelect, onRemove, onEdit, onResizeTitle, titleWidthPct, gridRow, previewMode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const stop = e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.() }
  const size = card.size ?? 'Full'

  return (
    <div
      ref={setNodeRef}
      className={`canvas-title-card${isSelected && !previewMode ? ' selected' : ''}${isDragging ? ' dragging' : ''}${previewMode ? ' preview' : ''}`}
      style={{ gridRow, gridColumn: '1 / -1', transform: CSS.Translate.toString(transform), transition }}
      onClick={previewMode ? undefined : () => onSelect(card.id)}
      onMouseDown={previewMode ? undefined : e => e.stopPropagation()}
      {...(previewMode ? {} : { ...attributes, ...listeners })}
    >
      {/* Caja de contenido visual (anchura variable) */}
      <div className="title-content-box" style={{ width: titleWidthPct }}>
        {!previewMode && <span className="title-grip-dot" />}
        <input
          className="canvas-title-input"
          value={card.text}
          readOnly={previewMode}
          onChange={previewMode ? undefined : e => onEdit(card.id, e.target.value)}
          placeholder="Section title..."
          onClick={e => e.stopPropagation()}
          onPointerDown={previewMode ? undefined : e => e.stopPropagation()}
        />
        {isSelected && !previewMode && (
          <button
            className="canvas-tb-del canvas-tb-del--title"
            onPointerDown={stop}
            onClick={e => { stop(e); onRemove(card.id) }}
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Manejador de anchura: en el borde derecho del content-box, picker fuera */}
      {isSelected && !previewMode && (
        <div
          className="card-handle-right"
          style={{ left: `calc(${titleWidthPct} - 3px)` }}
          onPointerDown={stop} onMouseDown={stop} onClick={stop}
        >
          <div className="card-handle-pill" />
          <div className="size-picker-v">
            {TITLE_SIZES.map(s => (
              <button
                key={s}
                className={`spv-btn${size === s ? ' active' : ''}`}
                onPointerDown={stop}
                onClick={e => { stop(e); onResizeTitle(card.id, s) }}
              >{s === 'Full' ? '↔' : s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Ghost para DragOverlay ───────────────────────────────────────────────────
function GhostCard({ card }) {
  if (card.type === 'title') {
    return (
      <div className="canvas-title-card ghost">
        <div className="title-content-box">
          <span>{card.text || 'Section title...'}</span>
        </div>
      </div>
    )
  }
  const kpi = KPI_BY_ID[card.kpiId]
  if (!kpi) return null
  return (
    <div className="canvas-kpi-card ghost">
      <KpiCardWireframe kpi={kpi} size={card.size} />
    </div>
  )
}

// ─── Header de sección sortable (arrastrable como bloque de grupo) ────────────
function SortableGroupHeader({ card, gridRow, gridCol, colSpan, previewMode }) {
  const { group, groupId } = card
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'group-header', groupId },
  })
  const GIcon = group.icon
  return (
    <div
      ref={setNodeRef}
      className={`canvas-auto-section-hdr${isDragging ? ' dragging' : ''}`}
      style={{
        gridRow,
        gridColumn: `${gridCol} / span ${colSpan}`,
        transform: CSS.Translate.toString(transform),
        transition,
        cursor: previewMode ? 'default' : undefined,
      }}
      {...(previewMode ? {} : { ...attributes, ...listeners })}
    >
      {!previewMode && <GripVertical size={12} className="auto-hdr-grip" />}
      <div className="auto-hdr-icon"><GIcon size={12} /></div>
      <span className="auto-hdr-label">{group.label}</span>
    </div>
  )
}

// ─── Inserta una card en posición de grupo (evita headers duplicados) ─────────
function insertCardInGroupOrder(cards, newCard) {
  const newGroup    = KPI_GROUPS.find(g => g.items.some(i => i.id === newCard.kpiId))
  if (!newGroup) return [...cards, newCard]
  const newGroupIdx = KPI_GROUPS.findIndex(g => g.id === newGroup.id)
  const result      = [...cards]

  // Insertar después del último card del mismo grupo
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].type === 'kpi') {
      const g = KPI_GROUPS.find(g => g.items.some(it => it.id === result[i].kpiId))
      if (g?.id === newGroup.id) { result.splice(i + 1, 0, newCard); return result }
    }
  }
  // Sin mismo grupo: insertar antes del primer card de un grupo posterior
  for (let i = 0; i < result.length; i++) {
    if (result[i].type === 'kpi') {
      const g = KPI_GROUPS.find(g => g.items.some(it => it.id === result[i].kpiId))
      if (g && KPI_GROUPS.findIndex(gg => gg.id === g.id) > newGroupIdx) {
        result.splice(i, 0, newCard); return result
      }
    }
  }
  return [...result, newCard]
}

// ─── Construye bloques de grupo a partir del array de cards ──────────────────
function buildGroupBlocks(cards, selectedIds) {
  const blocks = []
  let current = null
  for (const card of cards) {
    if (card.type === 'title') {
      current = null
      blocks.push({ type: 'title', card })
      continue
    }
    if (card.type !== 'kpi' || !selectedIds.includes(card.kpiId)) continue
    const group   = KPI_GROUPS.find(g => g.items.some(i => i.id === card.kpiId))
    const groupId = group?.id ?? null
    if (!current || current.groupId !== groupId) {
      current = { type: 'group', groupId, group, headerId: `grp::${groupId}`, cards: [] }
      blocks.push(current)
    }
    current.cards.push(card)
  }
  return blocks
}

// ─── Ancho natural de un grupo: suma de spans capped al grid ─────────────────
function groupNaturalWidth(groupCards, cols, colSpanFor) {
  if (!groupCards.length) return 0
  return Math.min(groupCards.reduce((s, c) => s + colSpanFor(c), 0), cols)
}

// ─── Empaqueta bloques en bandas horizontales (greedy first-fit) ──────────────
function packBands(blocks, cols, colSpanFor) {
  const bands = []
  let band = null
  const flush = () => { if (band) { bands.push(band); band = null } }

  for (const block of blocks) {
    if (block.type === 'title') {
      flush()
      bands.push({ type: 'title', card: block.card })
      continue
    }
    const w = groupNaturalWidth(block.cards, cols, colSpanFor)
    if (!w) continue
    if (!band) band = { type: 'groups', groups: [], usedCols: 0 }
    if (band.usedCols + w <= cols) {
      band.groups.push({ ...block, startCol: band.usedCols + 1, width: w })
      band.usedCols += w
    } else {
      flush()
      band = { type: 'groups', groups: [{ ...block, startCol: 1, width: w }], usedCols: w }
    }
  }
  flush()
  return bands
}

// ─── Layout completo con empaquetado horizontal de grupos ─────────────────────
function computeBandedLayout(blocks, cols, colSpanFor) {
  const bands = packBands(blocks, cols, colSpanFor)
  const items = []
  let globalRow = 1

  for (const band of bands) {
    if (band.type === 'title') {
      items.push({ card: band.card, row: globalRow, col: 1, span: cols })
      globalRow++
      continue
    }

    // Fila de headers (uno por grupo en la banda)
    for (const { group, groupId, headerId, startCol, width } of band.groups) {
      items.push({
        card: { id: headerId, type: 'auto-header', group, groupId },
        row: globalRow, col: startCol, span: width,
      })
    }
    globalRow++

    // Filas de cards (cada grupo dentro de su slice de columnas)
    let maxCardRows = 0
    for (const { cards: gCards, startCol, width } of band.groups) {
      let col = startCol, rowOff = 0
      for (const card of gCards) {
        const span = Math.min(colSpanFor(card), width)
        if (col + span - 1 > startCol + width - 1) { rowOff++; col = startCol }
        items.push({ card, row: globalRow + rowOff, col, span })
        col += span
        if (col > startCol + width - 1) { rowOff++; col = startCol }
      }
      maxCardRows = Math.max(maxCardRows, col > startCol ? rowOff + 1 : rowOff)
    }
    globalRow += maxCardRows
  }

  return items
}

// ─── Calcula posiciones explícitas de grid para cada elemento ─────────────────
function computeLayout(displayCards, cols, colSpanFor) {
  let row = 1, col = 1
  const items = []

  for (const card of displayCards) {
    const isFullWidth = card.type === 'auto-header' || card.type === 'title'
    if (isFullWidth) {
      if (col > 1) { row++; col = 1 }
      items.push({ card, row, col: 1, span: cols })
      row++; col = 1
    } else {
      const span = Math.min(colSpanFor(card), cols)
      if (col + span - 1 > cols) { row++; col = 1 }
      items.push({ card, row, col, span })
      col += span
      if (col > cols) { row++; col = 1 }
    }
  }

  return items
}

// Genera celdas de fondo: filas con KPI cards (alineadas) + filas vacías extra debajo
function bgCellsFrom(layoutItems, cols) {
  const cardRows = new Set(
    layoutItems.filter(i => i.card.type === 'kpi').map(i => i.row)
  )
  const maxRow = cardRows.size > 0 ? Math.max(...cardRows) : 0
  // 4 filas extra por debajo del último contenido para indicar espacio disponible
  for (let r = maxRow + 1; r <= maxRow + 4; r++) cardRows.add(r)

  const cells = []
  cardRows.forEach(row => {
    for (let c = 1; c <= cols; c++) cells.push({ row, col: c })
  })
  return cells
}

// ─── Reordena grupos completos usando arrayMove sobre el orden de bloques ──────
function moveGroupBlock(cards, activeGroupId, targetGroupId) {
  const getGid = c => KPI_GROUPS.find(g => g.items.some(i => i.id === c.kpiId))?.id ?? null

  // Orden de grupos (primera aparición)
  const groupOrder = []
  const seen = new Set()
  for (const card of cards) {
    if (card.type !== 'kpi') continue
    const gId = getGid(card)
    if (gId && !seen.has(gId)) { groupOrder.push(gId); seen.add(gId) }
  }

  const oldIdx = groupOrder.indexOf(activeGroupId)
  const newIdx = groupOrder.indexOf(targetGroupId)
  if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return cards

  const newOrder = arrayMove(groupOrder, oldIdx, newIdx)

  // Reconstruir cards en el nuevo orden de grupos, preservando títulos
  const kpisByGroup = {}
  for (const gId of groupOrder) kpisByGroup[gId] = cards.filter(c => c.type === 'kpi' && getGid(c) === gId)
  const newKpis = newOrder.flatMap(gId => kpisByGroup[gId])

  let kpiI = 0
  return cards.map(card => card.type === 'kpi' ? newKpis[kpiI++] : card)
}

// ─── Reordena todos los grupos según una lista de IDs de grupo ───────────────
function reorderAllGroups(cards, newGroupIds) {
  const getGid = c => KPI_GROUPS.find(g => g.items.some(i => i.id === c.kpiId))?.id ?? null
  const kpisByGroup = {}
  for (const gId of newGroupIds) kpisByGroup[gId] = []
  for (const card of cards) {
    if (card.type !== 'kpi') continue
    const gId = getGid(card)
    if (gId && kpisByGroup[gId]) kpisByGroup[gId].push(card)
  }
  const newKpis = newGroupIds.flatMap(gId => kpisByGroup[gId] ?? [])
  let i = 0
  return cards.map(card => card.type === 'kpi' ? newKpis[i++] : card)
}

// Reordena las cards de un grupo según el nuevo orden dictado por la sidebar
function reorderGroupCards(prev, kpiIds) {
  const cardMap = Object.fromEntries(
    prev.filter(c => c.type === 'kpi').map(c => [c.kpiId, c])
  )
  let inserted = false
  return prev.reduce((res, c) => {
    if (c.type === 'kpi' && kpiIds.includes(c.kpiId)) {
      if (!inserted) {
        kpiIds.forEach(id => { if (cardMap[id]) res.push(cardMap[id]) })
        inserted = true
      }
    } else {
      res.push(c)
    }
    return res
  }, [])
}

// ─── Extrae el orden actual de grupos y cards del estado del canvas ───────────
function extractCanvasOrder(cards) {
  const groupIds   = []
  const cardOrders = {}
  const seen       = new Set()
  for (const card of cards) {
    if (card.type !== 'kpi') continue
    const gId = KPI_GROUPS.find(g => g.items.some(i => i.id === card.kpiId))?.id
    if (!gId) continue
    if (!seen.has(gId)) { groupIds.push(gId); seen.add(gId); cardOrders[gId] = [] }
    cardOrders[gId].push(card.kpiId)
  }
  return { groupIds, cardOrders }
}

// ─── Canvas ───────────────────────────────────────────────────────────────────
export default function Canvas({ device, selectedIds = [], showGrid = true, groupBySection = true, onCardSelect, groupReorderSignal, onCardsOrderChange, previewMode = false, kpiVizTypes = {} }) {
  const [cards, setCards]    = useState([])
  const [selectedId, setSel] = useState(null)
  const [activeId, setAct]   = useState(null)

  const cols     = DEVICE_COLS[device] ?? 12
  const sizeCols = SIZE_SPANS[device]  ?? SIZE_SPANS.Desktop

  // Ref para leer groupBySection sin añadirlo a los deps del effect de selectedIds
  const groupBySectionRef = useRef(groupBySection)
  // Marca que el último cambio de cards vino de un drag del usuario
  const dragSourceRef = useRef(false)

  // Sincroniza cards KPI con selectedIds insertando en posición de grupo si procede
  useEffect(() => {
    setCards(prev => {
      const kept     = prev.filter(c => c.type === 'title' || selectedIds.includes(c.kpiId))
      const newIds   = selectedIds.filter(id => !prev.some(c => c.type === 'kpi' && c.kpiId === id))
      const newCards = newIds.map(id => ({ id: `card-${id}`, type: 'kpi', kpiId: id, size: 'S', sizeV: 'S' }))
      if (!newCards.length) return kept.length === prev.length ? prev : kept
      if (!groupBySectionRef.current) return [...kept, ...newCards]
      let result = kept
      for (const nc of newCards) result = insertCardInGroupOrder(result, nc)
      return result
    })
  }, [selectedIds])

  // Al activar el modo agrupado: re-ordena las cards por grupo (elimina headers duplicados)
  useEffect(() => {
    const prev = groupBySectionRef.current
    groupBySectionRef.current = groupBySection
    if (!groupBySection || prev) return  // solo al pasar de libre → agrupado
    setCards(curr => {
      const kpi = curr.filter(c => c.type === 'kpi')
      if (!kpi.length) return curr
      return KPI_GROUPS
        .flatMap(g => kpi.filter(c => g.items.some(i => i.id === c.kpiId)))
        .concat(kpi.filter(c => !KPI_GROUPS.some(g => g.items.some(i => i.id === c.kpiId))))
    })
  }, [groupBySection])

  // Si la card seleccionada fue eliminada, limpiar selección
  useEffect(() => {
    if (selectedId && !cards.some(c => c.id === selectedId)) {
      setSel(null)
      onCardSelect?.(null)
    }
  }, [cards])

  // Responde a reordenaciones iniciadas desde la sidebar (cards dentro de grupo o grupos entre sí)
  useEffect(() => {
    if (!groupReorderSignal) return
    if (groupReorderSignal.type === 'groups')
      setCards(prev => reorderAllGroups(prev, groupReorderSignal.groupIds))
    else
      setCards(prev => reorderGroupCards(prev, groupReorderSignal.kpiIds))
  }, [groupReorderSignal])

  // Emite el nuevo orden al padre cuando el usuario arrastra en el canvas
  useEffect(() => {
    if (!dragSourceRef.current) return
    dragSourceRef.current = false
    onCardsOrderChange?.(extractCanvasOrder(cards))
  }, [cards])  // eslint-disable-line

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragStart  = ({ active }) => { setAct(active.id); setSel(null); onCardSelect?.(null) }
  const handleDragCancel = () => setAct(null)
  const handleDragEnd    = ({ active, over }) => {
    setAct(null)
    if (!over || active.id === over.id) return

    const activeIsHeader = active.data.current?.type === 'group-header'
    const overIsHeader   = over.data.current?.type   === 'group-header'

    // Caso 1: arrastrar un grupo completo
    if (activeIsHeader) {
      const activeGroupId = active.data.current.groupId
      const targetGroupId = overIsHeader
        ? over.data.current.groupId
        : KPI_GROUPS.find(g => g.items.some(i => i.id === cards.find(c => c.id === over.id)?.kpiId))?.id
      if (targetGroupId && activeGroupId !== targetGroupId) {
        dragSourceRef.current = true
        setCards(prev => moveGroupBlock(prev, activeGroupId, targetGroupId))
      }
      return
    }

    // Caso 2: arrastrar una card sobre un header → ignorar
    if (overIsHeader) return

    // Caso 3: arrastrar card → solo dentro del mismo grupo en modo agrupado
    if (groupBySection) {
      const aCard = cards.find(c => c.id === active.id)
      const oCard = cards.find(c => c.id === over.id)
      if (aCard?.type === 'kpi' && oCard?.type === 'kpi') {
        const aGroup = KPI_GROUPS.find(g => g.items.some(i => i.id === aCard.kpiId))
        const oGroup = KPI_GROUPS.find(g => g.items.some(i => i.id === oCard.kpiId))
        if (aGroup?.id !== oGroup?.id) return
      }
    }

    dragSourceRef.current = true
    setCards(prev => arrayMove(
      prev,
      prev.findIndex(c => c.id === active.id),
      prev.findIndex(c => c.id === over.id)
    ))
  }

  const resizeCard      = (id, size)  => setCards(prev => prev.map(c => c.id === id ? { ...c, size }  : c))
  const resizeVCard     = (id, sizeV) => setCards(prev => prev.map(c => c.id === id ? { ...c, sizeV } : c))
  const resizeTitleCard = (id, size)  => setCards(prev => prev.map(c => c.id === id ? { ...c, size }  : c))
  const removeCard = (id) => {
    if (selectedId === id) { setSel(null); onCardSelect?.(null) }
    setCards(prev => prev.filter(c => c.id !== id))
  }
  const editTitle  = (id, text) => setCards(prev => prev.map(c => c.id === id ? { ...c, text } : c))
  const selectCard = (id) => {
    const newId = selectedId === id ? null : id
    setSel(newId)
    const card = cards.find(c => c.id === newId)
    onCardSelect?.(card?.kpiId ?? null)
  }
  const deselect = () => { setSel(null); onCardSelect?.(null) }
  const addTitle  = () => setCards(prev => [...prev, { id: `title-${Date.now()}`, type: 'title', text: '', size: 'S' }])

  // Calcula el % de anchura del contenido de un título según su size y el device actual
  const titleWidthFor = (card) => {
    const spans = TITLE_SPANS[device] ?? TITLE_SPANS.Desktop
    const span  = spans[card.size ?? 'S'] ?? cols
    return `${Math.min((span / cols) * 100, 100)}%`
  }

  const hasKpis    = cards.some(c => c.type === 'kpi')
  const colSpanFor = (card) => Math.min(sizeCols[card.size] ?? 3, cols)

  const layoutItems = hasKpis
    ? (groupBySection
        ? computeBandedLayout(buildGroupBlocks(cards, selectedIds), cols, colSpanFor)
        : computeLayout(cards, cols, colSpanFor))
    : []
  const bgCells = showGrid ? bgCellsFrom(layoutItems, cols) : []

  // IDs para SortableContext: cards reales + headers de grupo (en modo agrupado)
  const headerIds    = layoutItems.filter(i => i.card.type === 'auto-header').map(i => i.card.id)
  const sortableIds  = [...headerIds, ...cards.map(c => c.id)]
  const activeItem   = layoutItems.find(i => i.card.id === activeId)
  const activeCard   = activeItem?.card ?? cards.find(c => c.id === activeId)

  return (
    <main className={`canvas${previewMode ? ' preview-mode' : ''}`} onMouseDown={previewMode ? undefined : deselect}>

      {/* Barra superior (oculta en preview) */}
      {!previewMode && (
        <div className="canvas-top-bar" onMouseDown={e => e.stopPropagation()}>
          <button className="canvas-top-btn" onClick={addTitle} title="Add section title">
            <Heading1 size={13} /><span>Add title</span>
          </button>
        </div>
      )}

      <div
        className="canvas-inner"
        style={{ maxWidth: DEVICE_WIDTH[device] }}
        onMouseDown={previewMode ? undefined : deselect}
      >
        {/* Overlay de dim (solo en modo builder) */}
        {selectedId && !previewMode && <div className="canvas-dim-overlay" />}

        {/* Estado vacío */}
        {!hasKpis ? (
          <div className="grid-wrapper" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: 4 * cols }).map((_, i) => <div key={i} className="grid-cell" />)}
          </div>

        /* Grid unificado: bg-cells y cards comparten el mismo CSS grid → alineación perfecta */
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
              <div className="canvas-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>

                {/* Celdas de fondo: solo en filas con KPI cards, mismo grid → alineación exacta */}
                {bgCells.map(({ row, col }) => (
                  <div
                    key={`bg-${row}-${col}`}
                    className="canvas-bg-cell"
                    style={{ gridRow: row, gridColumn: col }}
                  />
                ))}

                {/* Cards y headers con posición explícita */}
                {layoutItems.map(({ card, row, col, span }) => {
                  if (card.type === 'auto-header')
                    return <SortableGroupHeader key={card.id} card={card} gridRow={row} gridCol={col} colSpan={span} previewMode={previewMode} />
                  if (card.type === 'title')
                    return (
                      <SortableTitleCard
                        key={card.id}
                        card={card}
                        isSelected={selectedId === card.id}
                        onSelect={selectCard}
                        onRemove={removeCard}
                        onEdit={editTitle}
                        onResizeTitle={resizeTitleCard}
                        titleWidthPct={titleWidthFor(card)}
                        gridRow={row}
                        previewMode={previewMode}
                      />
                    )
                  return (
                    <SortableKpiCard
                      key={card.id}
                      card={card}
                      isSelected={selectedId === card.id}
                      colSpan={span}
                      gridRow={row}
                      gridCol={col}
                      onSelect={selectCard}
                      onResize={resizeCard}
                      onResizeV={resizeVCard}
                      onRemove={removeCard}
                      previewMode={previewMode}
                      kpiVizTypes={kpiVizTypes}
                    />
                  )
                })}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
              {activeCard?.type === 'auto-header'
                ? (
                  <div className="canvas-auto-section-hdr ghost">
                    <GripVertical size={12} className="auto-hdr-grip" />
                    <div className="auto-hdr-icon">
                      {(() => { const G = activeCard.group.icon; return <G size={12} /> })()}
                    </div>
                    <span className="auto-hdr-label">{activeCard.group.label}</span>
                  </div>
                )
                : activeCard ? <GhostCard card={activeCard} /> : null
              }
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </main>
  )
}
