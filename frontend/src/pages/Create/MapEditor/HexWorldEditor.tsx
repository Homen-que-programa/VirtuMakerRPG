import React, { useMemo, useRef, useState } from 'react';

// Simple palette for hex painting
const DEFAULT_COLORS = [
  '#7ec8a5', // grass
  '#6fb4d6', // water
  '#d1c089', // sand
  '#a6a6a6', // stone
  '#8b6d4d', // dirt
];

export type HexWorldEditorProps = {
  cols?: number;
  rows?: number;
  size?: number; // hex radius in px
};

// axial coordinates helpers for pointy-top hexes
const HEX = {
  width: (size: number) => Math.sqrt(3) * size,
  height: (size: number) => 2 * size,
  horiz: (size: number) => Math.sqrt(3) * size, // horizontal distance between centers
  vert: (size: number) => (3 / 2) * size, // vertical distance between centers
};

export default function HexWorldEditor({ cols = 20, rows = 16, size = 20 }: HexWorldEditorProps) {
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [grid, setGrid] = useState<string[][]>(() => Array.from({ length: rows }, () => Array(cols).fill('')));
  const [isPanning, setIsPanning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const startPan = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const palette = useMemo(() => DEFAULT_COLORS, []);

  const view = useMemo(() => {
    const w = HEX.width(size);
    const h = HEX.height(size);
    const totalWidth = (cols + 0.5) * w;
    const totalHeight = (rows * HEX.vert(size)) + size; // include last bottom half
    return { w, h, totalWidth, totalHeight };
  }, [cols, rows, size]);

  function hexPath(cx: number, cy: number, s: number) {
    const pts = [
      [Math.cos(Math.PI / 6) * s, Math.sin(Math.PI / 6) * s],
      [0, 1 * s],
      [-Math.cos(Math.PI / 6) * s, Math.sin(Math.PI / 6) * s],
      [-Math.cos(Math.PI / 6) * s, -Math.sin(Math.PI / 6) * s],
      [0, -1 * s],
      [Math.cos(Math.PI / 6) * s, -Math.sin(Math.PI / 6) * s],
    ];
    return `M ${pts.map(([dx, dy]) => `${cx + dx},${cy + dy}`).join(' L ')} Z`;
  }

  function centerFor(col: number, row: number) {
    // pointy-top axial offset layout (odd-r)
    const w = HEX.width(size);
    const x = col * w + (row % 2 === 1 ? w / 2 : 0);
    const y = row * HEX.vert(size);
    return { x, y };
  }

  function handlePaint(col: number, row: number, erase = false) {
    setGrid((g) => {
      const copy = g.map((r) => r.slice());
      copy[row][col] = erase ? '' : color;
      return copy;
    });
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY;
    setZoom((z) => {
      const next = Math.min(3, Math.max(0.5, z + (delta > 0 ? 0.1 : -0.1)));
      return Math.round(next * 100) / 100;
    });
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      startPan.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (isPanning && startPan.current) {
      setOffset({ x: e.clientX - startPan.current.x, y: e.clientY - startPan.current.y });
    }
  }

  function onMouseUp() {
    setIsPanning(false);
    startPan.current = null;
  }

  return (
    <div className="map-editor">
      <aside className="sidebar">
        <h3>Paleta</h3>
        <div className="palette">
          {palette.map((c) => (
            <button
              key={c}
              className={`swatch ${c === color ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              aria-label={`Selecionar cor ${c}`}
            />
          ))}
        </div>
        <div className="tools">
          <label>
            Zoom: <strong>{Math.round(zoom * 100)}%</strong>
          </label>
          <p className="hint">Shift + arrastar com o mouse para mover a tela.</p>
        </div>
      </aside>

      <div className="canvas-wrapper">
        <div
          className="canvas"
          onWheel={handleWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${view.totalWidth} ${view.totalHeight}`}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            <defs>
              <pattern id="hex-grid" patternUnits="userSpaceOnUse" width={view.w} height={HEX.vert(size)}>
                <path d={`M 0 ${size} L ${view.w / 2} 0 M ${view.w / 2} 0 L ${view.w} ${size} M 0 ${size} L ${view.w / 2} ${2 * size} M ${view.w / 2} ${2 * size} L ${view.w} ${size}`}
                      stroke="#2a2a2a" strokeWidth="0.5" fill="none" />
              </pattern>
            </defs>

            <rect x="0" y="0" width={view.totalWidth} height={view.totalHeight} fill="#121212" />
            <rect x="0" y="0" width={view.totalWidth} height={view.totalHeight} fill="url(#hex-grid)" opacity="0.35" />

            {grid.map((rowArr, row) => (
              <g key={row}>
                {rowArr.map((fill, col) => {
                  const { x, y } = centerFor(col, row);
                  const path = hexPath(x + view.w / 2, y + size, size - 1);
                  const isEmpty = !fill;
                  return (
                    <path
                      key={`${col}-${row}`}
                      d={path}
                      fill={isEmpty ? 'transparent' : fill}
                      stroke="#3a3a3a"
                      strokeWidth={isEmpty ? 0.6 : 0.8}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePaint(col, row);
                      }}
                      onContextMenu={(e) => { e.preventDefault(); handlePaint(col, row, true); }}
                      style={{ cursor: 'crosshair' }}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
