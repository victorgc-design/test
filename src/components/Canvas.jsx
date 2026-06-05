const ROWS = 4
const COLS = 12

export default function Canvas({ device }) {
  const widthMap = {
    Smartphone: '375px',
    Tablet: '768px',
    Desktop: '100%',
  }

  return (
    <main className="canvas">
      <div className="canvas-inner" style={{ maxWidth: widthMap[device] }}>
        <div className="grid-wrapper">
          {Array.from({ length: ROWS * COLS }).map((_, i) => (
            <div key={i} className="grid-cell" />
          ))}
        </div>
      </div>
    </main>
  )
}
