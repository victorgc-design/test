import { useState, useEffect, useRef } from 'react'
import { Info, X, Heading1 } from 'lucide-react'
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

// ─── Contenido visual de la card ──────────────────────────────────────────────
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
function KpiCardShell({ cardRef, kpi, card, isSelected, isDragging, colSpan, gridRow, gridCol, style, dragProps, onSelect, onResize, onResizeV, onRemove }) {
  const stats   = mockStats(card.kpiId)
  const vHeight = V_HEIGHTS[card.sizeV ?? 'S'] ?? 130
  const gridStyle = {
    gridRow,
    gridColumn: `${gridCol} / span ${colSpan}`,
    minHeight: vHeight,
  }
  return (
    <div
      ref={cardRef}
      className={`canvas-kpi-card${isSelected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
      style={{ ...gridStyle, ...style }}
      onClick={() => onSelect(card.id)}
      onMouseDown={e => e.stopPropagation()}
      {...dragProps}
    >
      <KpiCardContent kpi={kpi} size={card.size} stats={stats} isEditing={isSelected} />
      {isSelected && <EditHandles card={card} onResize={onResize} onResizeV={onResizeV} onRemove={onRemove} />}
    </div>
  )
}

// ─── Card KPI draggable ───────────────────────────────────────────────────────
function SortableKpiCard({ card, isSelected, onSelect, onResize, onResizeV, onRemove, colSpan, gridRow, gridCol }) {
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
    />
  )
}

// ─── Title card draggable ─────────────────────────────────────────────────────
function SortableTitleCard({ card, isSelected, onSelect, onRemove, onEdit, onResizeTitle, titleWidthPct, gridRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const stop = e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.() }
  const size = card.size ?? 'Full'

  return (
    <div
      ref={setNodeRef}
      className={`canvas-title-card${isSelected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
      style={{ gridRow, gridColumn: '1 / -1', transform: CSS.Translate.toString(transform), transition }}
      onClick={() => onSelect(card.id)}
      onMouseDown={e => e.stopPropagation()}
      {...attributes} {...listeners}
    >
      {/* Caja de contenido visual (anchura variable) */}
      <div className="title-content-box" style={{ width: titleWidthPct }}>
        <span className="title-grip-dot" />
        <input
          className="canvas-title-input"
          value={card.text}
          onChange={e => onEdit(card.id, e.target.value)}
          placeholder="Section title..."
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        />
        {isSelected && (
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
      {isSelected && (
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
      <KpiCardContent kpi={kpi} size={card.size} stats={mockStats(card.kpiId)} />
    </div>
  )
}

// ─── Modo agrupado: header de sección auto ────────────────────────────────────
function AutoSectionHeader({ group, gridRow }) {
  const GIcon = group.icon
  return (
    <div className="canvas-auto-section-hdr" style={{ gridRow, gridColumn: '1 / -1' }}>
      <div className="auto-hdr-icon"><GIcon size={12} /></div>
      <span className="auto-hdr-label">{group.label}</span>
    </div>
  )
}

// ─── Card KPI estática (modo agrupado, sin drag) ──────────────────────────────
function StaticKpiCard({ card, isSelected, onSelect, onResize, onResizeV, onRemove, colSpan }) {
  const kpi = KPI_BY_ID[card.kpiId]
  if (!kpi) return null
  return (
    <KpiCardShell
      kpi={kpi}
      card={card}
      isSelected={isSelected}
      isDragging={false}
      colSpan={colSpan}
      style={{}}
      dragProps={{}}
      onSelect={onSelect}
      onResize={onResize}
      onResizeV={onResizeV}
      onRemove={onRemove}
    />
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

// ─── Build display agrupado (preserva el orden de drag del usuario) ───────────
function buildGrouped(cards, selectedIds) {
  const result = []
  let lastGroupId = null
  let headerCount = 0

  cards.forEach(card => {
    if (card.type === 'title') {
      lastGroupId = null  // un título manual resetea el tracking de grupo
      result.push(card)
      return
    }
    if (card.type !== 'kpi' || !selectedIds.includes(card.kpiId)) return

    const group   = KPI_GROUPS.find(g => g.items.some(i => i.id === card.kpiId))
    const groupId = group?.id ?? null

    if (groupId !== lastGroupId) {
      if (group) result.push({ id: `auto-hdr-${groupId}-${headerCount++}`, type: 'auto-header', group })
      lastGroupId = groupId
    }

    result.push(card)
  })

  return result
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

// ─── Canvas ───────────────────────────────────────────────────────────────────
export default function Canvas({ device, selectedIds = [], showGrid = true, groupBySection = true, onCardSelect, groupReorderSignal }) {
  const [cards, setCards]    = useState([])
  const [selectedId, setSel] = useState(null)
  const [activeId, setAct]   = useState(null)

  const cols     = DEVICE_COLS[device] ?? 12
  const sizeCols = SIZE_SPANS[device]  ?? SIZE_SPANS.Desktop

  // Ref para leer groupBySection sin añadirlo a los deps del effect de selectedIds
  const groupBySectionRef = useRef(groupBySection)

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

  // Responde a reordenaciones de grupo iniciadas desde la sidebar
  useEffect(() => {
    if (!groupReorderSignal) return
    setCards(prev => reorderGroupCards(prev, groupReorderSignal.kpiIds))
  }, [groupReorderSignal])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragStart  = ({ active }) => { setAct(active.id); setSel(null); onCardSelect?.(null) }
  const handleDragCancel = () => setAct(null)
  const handleDragEnd    = ({ active, over }) => {
    setAct(null)
    if (over && active.id !== over.id)
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

  const activeCard   = cards.find(c => c.id === activeId)
  const hasKpis      = cards.some(c => c.type === 'kpi')
  const displayCards = groupBySection && hasKpis ? buildGrouped(cards, selectedIds) : cards
  const colSpanFor   = (card) => Math.min(sizeCols[card.size] ?? 3, cols)

  const layoutItems  = hasKpis ? computeLayout(displayCards, cols, colSpanFor) : []
  const bgCells      = showGrid ? bgCellsFrom(layoutItems, cols) : []

  return (
    <main className="canvas" onMouseDown={deselect}>

      {/* Barra superior */}
      <div className="canvas-top-bar" onMouseDown={e => e.stopPropagation()}>
        <button className="canvas-top-btn" onClick={addTitle} title="Add section title">
          <Heading1 size={13} /><span>Add title</span>
        </button>
      </div>

      <div
        className="canvas-inner"
        style={{ maxWidth: DEVICE_WIDTH[device] }}
        onMouseDown={deselect}
      >
        {/* Overlay de dim (visual; pointer-events: none → los clicks pasan a canvas-inner) */}
        {selectedId && <div className="canvas-dim-overlay" />}

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
            {/* SortableContext solo contiene cards reales (no auto-headers) */}
            <SortableContext items={cards.map(c => c.id)} strategy={rectSortingStrategy}>
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
                    return <AutoSectionHeader key={card.id} group={card.group} gridRow={row} />
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
                    />
                  )
                })}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
              {activeCard ? <GhostCard card={activeCard} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </main>
  )
}
