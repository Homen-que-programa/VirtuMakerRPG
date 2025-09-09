import React, { useEffect, useRef, useState, useCallback } from 'react';
import './SpriteEditor.css';

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker' | 'line' | 'rect' | 'move';

type Point = { x: number; y: number };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const defaultPalette = [
  '#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff',
  '#7f7f7f','#c0c0c0','#804000','#008040','#400080','#ff7f00','#7f00ff','#00ff7f'
];

interface Layer {
  id: string;
  name: string;
  pixels: string[];
  visible: boolean;
  opacity: number;
}

interface FrameSnapshot {
  layers: { id: string; name: string; pixels: string[]; visible: boolean; opacity: number }[];
  activeLayer: number;
}

interface Frame {
  layers: Layer[];
  activeLayer: number;
  history: FrameSnapshot[];
  redo: FrameSnapshot[];
  id: string;
}

// Painel de camadas
const LayerPanel: React.FC<{ frame: Frame; onChange: React.Dispatch<React.SetStateAction<Frame[]>>; width:number; height:number; currentFrameIndex:number; frames: Frame[] }> = ({ frame, onChange }) => {
  const setFrameLayers = (updater: (fr: Frame) => Frame) => {
    onChange(f => f.map(fr => fr.id === frame.id ? updater(fr) : fr));
  };

  const addLayer = () => {
    setFrameLayers(fr => ({
      ...fr,
      layers: [...fr.layers, { id: crypto.randomUUID(), name: `Layer ${fr.layers.length+1}`, pixels: fr.layers[0].pixels.map(()=> '#00000000'), visible: true, opacity: 1 }],
      activeLayer: fr.layers.length
    }));
  };
  const duplicateLayer = (idx: number) => {
    setFrameLayers(fr => ({
      ...fr,
      layers: fr.layers.flatMap((l,i)=> i===idx ? [l, { ...l, id: crypto.randomUUID(), name: l.name + ' copy', pixels: l.pixels.slice() }] : [l]),
      activeLayer: idx+1
    }));
  };
  const deleteLayer = (idx: number) => {
    setFrameLayers(fr => {
      if (fr.layers.length === 1) return fr; // keep at least one
      const nl = fr.layers.filter((_,i)=>i!==idx);
      return { ...fr, layers: nl, activeLayer: Math.min(fr.activeLayer, nl.length-1) };
    });
  };
  const selectLayer = (idx: number) => setFrameLayers(fr => ({ ...fr, activeLayer: idx }));
  const toggleVisibility = (idx: number) => setFrameLayers(fr => ({ ...fr, layers: fr.layers.map((l,i)=> i===idx? { ...l, visible: !l.visible }: l) }));
  const setOpacity = (idx: number, value: number) => setFrameLayers(fr => ({ ...fr, layers: fr.layers.map((l,i)=> i===idx? { ...l, opacity: value }: l) }));
  const renameLayer = (idx: number, name: string) => setFrameLayers(fr => ({ ...fr, layers: fr.layers.map((l,i)=> i===idx? { ...l, name }: l) }));
  const moveLayer = (from: number, to: number) => {
    if (to<0 || to>= frame.layers.length) return;
    setFrameLayers(fr => {
      const arr = fr.layers.slice();
      const [sp] = arr.splice(from,1);
      arr.splice(to,0,sp);
      return { ...fr, layers: arr, activeLayer: to };
    });
  };
  return (
    <div className="panel-section layers-panel">
      <div className="panel-title">Camadas</div>
      <div className="layers-list">
        {frame.layers.map((l, idx) => (
          <div key={l.id} className={"layer-row" + (idx===frame.activeLayer? ' active':'')}>
            <button className="vis-btn" onClick={()=>toggleVisibility(idx)} title={l.visible? 'Ocultar':'Mostrar'}>{l.visible? '👁':'🚫'}</button>
            <input className="name" value={l.name} onChange={e=>renameLayer(idx,e.target.value)} />
            <input className="op" type="range" min={0} max={100} value={Math.round(l.opacity*100)} onChange={e=>setOpacity(idx, parseInt(e.target.value)/100)} title={"Opacidade: " + Math.round(l.opacity*100)+"%"} />
            <div className="layer-actions">
              <button onClick={()=>moveLayer(idx, idx-1)} title="Mover para cima">↑</button>
              <button onClick={()=>moveLayer(idx, idx+1)} title="Mover para baixo">↓</button>
              <button onClick={()=>duplicateLayer(idx)} title="Duplicar">🗐</button>
              <button onClick={()=>deleteLayer(idx)} disabled={frame.layers.length===1} title="Excluir">🗑</button>
              <button onClick={()=>selectLayer(idx)} title="Editar" className="select">🎯</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addLayer} className="wide" style={{marginTop:'.5rem'}}>+ Nova camada</button>
    </div>
  );
};

const SpriteEditor: React.FC = () => {
  const [width, setWidth] = useState(64);
  const [height, setHeight] = useState(64);
  const FIXED_CANVAS_SIZE = 512; // área fixa de visualização (tipo piskel)
  const zoom = Math.floor(FIXED_CANVAS_SIZE / width);

  const [grid, setGrid] = useState(true);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#00000000');
  const [palette] = useState<string[]>(defaultPalette);

  // Frames (animação)
  const initialPixels = React.useMemo(() => Array(width * height).fill('#00000000'), []); // only first mount
  const [frames, setFrames] = useState<Frame[]>([{
    layers: [{ id: crypto.randomUUID(), name: 'Layer 1', pixels: initialPixels.slice(), visible: true, opacity: 1 }],
    activeLayer: 0,
    history: [],
    redo: [],
    id: crypto.randomUUID()
  }]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(8);
  const [showOnion, setShowOnion] = useState(true);

  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<Point | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper accessors
  const current = frames[currentFrame];
  const activeLayer = current.layers[current.activeLayer];
  const pixels = activeLayer.pixels;

  const updateActiveLayerPixels = (updater: (prev: string[]) => string[]) => {
    setFrames(f => f.map((fr, idx) => {
      if (idx !== currentFrame) return fr;
      return {
        ...fr,
        layers: fr.layers.map((l, li) => li === fr.activeLayer ? { ...l, pixels: updater(l.pixels) } : l)
      };
    }));
  };

  // snapshot helpers
  const cloneFrameSnapshot = (fr: Frame): FrameSnapshot => ({
    layers: fr.layers.map(l => ({ id: l.id, name: l.name, pixels: l.pixels.slice(), visible: l.visible, opacity: l.opacity })),
    activeLayer: fr.activeLayer
  });
  const applySnapshot = (fr: Frame, snap: FrameSnapshot): Frame => ({
    ...fr,
    layers: snap.layers.map(l => ({ ...l, pixels: l.pixels.slice() })),
    activeLayer: Math.min(snap.activeLayer, snap.layers.length - 1)
  });

  // Desenho principal do frame atual (com onion skin opcional)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = FIXED_CANVAS_SIZE;
    canvas.height = FIXED_CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // fundo xadrez
    ctx.fillStyle = '#999999';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const even = ((x + y) & 1) === 0;
        ctx.fillStyle = even ? '#eeeeee' : '#cccccc';
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    // Onion skin (frame anterior composto)
    if (showOnion && currentFrame > 0) {
      const prev = frames[currentFrame - 1];
      ctx.save();
      ctx.globalAlpha = 0.35;
      prev.layers.forEach(l => {
        if (!l.visible) return;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const c = l.pixels[y * width + x] || '#00000000';
            if (c.length === 9 && c.endsWith('00')) continue;
            ctx.fillStyle = c;
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      });
      ctx.restore();
    }
    // Camadas atuais
    current.layers.forEach(l => {
      if (!l.visible) return;
      ctx.save(); ctx.globalAlpha = l.opacity;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const c = l.pixels[y * width + x] || '#00000000';
          if (c.length === 9 && c.endsWith('00')) continue;
          ctx.fillStyle = c;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
      ctx.restore();
    });
    // grid
    if (grid) {
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        ctx.moveTo(x * zoom + .5, 0);
        ctx.lineTo(x * zoom + .5, height * zoom);
      }
      for (let y = 0; y <= height; y++) {
        ctx.moveTo(0, y * zoom + .5);
        ctx.lineTo(width * zoom, y * zoom + .5);
      }
      ctx.stroke();
    }
  }, [width, height, zoom, pixels, grid, currentFrame, frames, showOnion, FIXED_CANVAS_SIZE]);

  const undo = useCallback(() => {
    const fr = frames[currentFrame];
    if (!fr.history.length) return;
    setFrames(f => f.map((fr, idx) => {
      if (idx !== currentFrame) return fr;
      if (!fr.history.length) return fr;
      const lastSnap = fr.history[fr.history.length - 1];
      const redoSnap = cloneFrameSnapshot(fr);
      const restored = applySnapshot(fr, lastSnap);
      return { ...restored, history: fr.history.slice(0, -1), redo: [redoSnap, ...fr.redo] };
    }));
  }, [currentFrame]);

  const redo = useCallback(() => {
    const fr = frames[currentFrame];
    if (!fr.redo.length) return;
    setFrames(f => f.map((fr, idx) => {
      if (idx !== currentFrame) return fr;
      if (!fr.redo.length) return fr;
      const [nextSnap, ...rest] = fr.redo;
      const historySnap = cloneFrameSnapshot(fr);
      const restored = applySnapshot(fr, nextSnap);
      return { ...restored, history: [...fr.history, historySnap], redo: rest };
    }));
  }, [currentFrame]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    const interval = 1000 / Math.max(1, fps);
    const id = setInterval(() => {
      setCurrentFrame(f => (f + 1) % frames.length);
    }, interval);
    return () => clearInterval(id);
  }, [playing, fps, frames.length]);

  // Atalhos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.key === 'ArrowRight') {
        setCurrentFrame(f => (f + 1) % frames.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentFrame(f => (f - 1 + frames.length) % frames.length);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [frames.length, undo, redo]);

  const pushHistory = (newPixels: string[]) => {
    setFrames(f => f.map((fr, idx) => {
      if (idx !== currentFrame) return fr;
      const snap = cloneFrameSnapshot(fr);
      return {
        ...fr,
        layers: fr.layers.map((l, li) => li === fr.activeLayer ? { ...l, pixels: newPixels } : l),
        history: [...fr.history, snap],
        redo: []
      };
    }));
  };

  const coordsFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    return { x: clamp(x, 0, width - 1), y: clamp(y, 0, height - 1) };
  };

  const setPixel = (x: number, y: number, c: string, target = pixels) => {
    const next = target.slice();
    next[y * width + x] = c;
    return next;
  };

  const drawLine = (a: Point, b: Point, c: string, target = pixels) => {
    // Bresenham
    const next = target.slice();
    let x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      next[y0 * width + x0] = c;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return next;
  };

  const floodFill = (sx: number, sy: number, to: string) => {
    const idx = sy * width + sx;
    const from = pixels[idx];
    if (from === to) return;
    const next = pixels.slice();
    const q: Point[] = [{ x: sx, y: sy }];
    while (q.length) {
      const { x, y } = q.pop()!;
      const i = y * width + x;
      if (next[i] !== from) continue;
      next[i] = to;
      if (x > 0) q.push({ x: x - 1, y });
      if (x < width - 1) q.push({ x: x + 1, y });
      if (y > 0) q.push({ x, y: y - 1 });
      if (y < height - 1) q.push({ x, y: y + 1 });
    }
    pushHistory(next);
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = coordsFromEvent(e);
    setIsDrawing(true);
    lastPos.current = p;
    if (tool === 'fill') return floodFill(p.x, p.y, color);
    if (tool === 'picker') {
      const picked = pixels[p.y * width + p.x];
      setColor(picked || '#000000');
      return;
    }
    if (tool === 'pencil' || tool === 'eraser' || tool === 'line' || tool === 'rect') {
      const c = tool === 'eraser' ? '#00000000' : color;
      const next = setPixel(p.x, p.y, c);
      pushHistory(next);
    }
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const p = coordsFromEvent(e);
    const last = lastPos.current;
    if (!last) return;
    if (tool === 'pencil' || tool === 'eraser' || tool === 'line') {
      const c = tool === 'eraser' ? '#00000000' : color;
      const next = drawLine(last, p, c);
      // durante o arraste não queremos empilhar histórico ainda
  updateActiveLayerPixels(() => next);
      lastPos.current = p;
    }
  };

  const onUp = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };


  const clear = () => {
    pushHistory(Array(width * height).fill('#00000000'));
  };

  const exportPNG = () => {
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    const comp = ctx.createImageData(width, height);
    const blend = (r:number,g:number,b:number,a:number, idx:number) => {
      const pr=comp.data[idx], pg=comp.data[idx+1], pb=comp.data[idx+2], pa=comp.data[idx+3];
      const na=a/255, paF=pa/255, outA=na+paF*(1-na);
      const outR=(r*na+pr*paF*(1-na))/(outA||1);
      const outG=(g*na+pg*paF*(1-na))/(outA||1);
      const outB=(b*na+pb*paF*(1-na))/(outA||1);
      comp.data[idx]=outR; comp.data[idx+1]=outG; comp.data[idx+2]=outB; comp.data[idx+3]=outA*255;
    };
    current.layers.forEach(l => { if(!l.visible) return; for(let i=0;i<l.pixels.length;i++){ const [r,g,b,a]=hexToRgba(l.pixels[i]); if(a===0) continue; const idx=i*4; const oa=Math.round(a*l.opacity); blend(r,g,b,oa,idx);} });
    ctx.putImageData(comp,0,0);
    const url = off.toDataURL('image/png');
    downloadURI(url, 'sprite.png');
  };

  const exportSpriteSheet = () => {
    const count = frames.length;
    const off = document.createElement('canvas');
    off.width = width * count;
    off.height = height;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    frames.forEach((fr, idx) => {
      const comp = ctx.createImageData(width, height);
      const blend = (r:number,g:number,b:number,a:number,p:number)=>{ const pr=comp.data[p],pg=comp.data[p+1],pb=comp.data[p+2],pa=comp.data[p+3]; const na=a/255,paF=pa/255,outA=na+paF*(1-na); const outR=(r*na+pr*paF*(1-na))/(outA||1); const outG=(g*na+pg*paF*(1-na))/(outA||1); const outB=(b*na+pb*paF*(1-na))/(outA||1); comp.data[p]=outR; comp.data[p+1]=outG; comp.data[p+2]=outB; comp.data[p+3]=outA*255; };
      fr.layers.forEach(l => { if(!l.visible) return; for(let i=0;i<l.pixels.length;i++){ const [r,g,b,a]=hexToRgba(l.pixels[i]); if(a===0) continue; const p=i*4; const oa=Math.round(a*l.opacity); blend(r,g,b,oa,p);} });
      const tmp=document.createElement('canvas'); tmp.width=width; tmp.height=height; const tctx=tmp.getContext('2d'); if(tctx){ tctx.putImageData(comp,0,0); ctx.drawImage(tmp, idx*width,0);} });
    const url = off.toDataURL('image/png');
    downloadURI(url, 'spritesheet.png');
    const meta = {
      frameWidth: width,
      frameHeight: height,
      frames: frames.map((_, i) => ({ x: i * width, y: 0, w: width, h: height }))
    };
    const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    downloadURI(URL.createObjectURL(blob), 'spritesheet.json');
  };

  const importImage = (file: File) => {
    const img = new Image();
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      const next: string[] = new Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          next[y * width + x] = rgbaToHex([
            data[i], data[i + 1], data[i + 2], data[i + 3]
          ]);
        }
      }
      pushHistory(next);
    };
    img.src = URL.createObjectURL(file);
  };

  const resizeAllFrames = (newSize: number) => {
    setFrames(fArr => fArr.map(fr => ({
      ...fr,
      layers: fr.layers.map(l => {
        const oldW = width; const oldH = height; const newW=newSize; const newH=newSize;
        const next = Array(newW*newH).fill('#00000000');
        for (let y=0;y<Math.min(oldH,newH);y++) {
          for (let x=0;x<Math.min(oldW,newW);x++){
            next[y*newW + x] = l.pixels[y*oldW + x] || '#00000000';
          }
        }
        return { ...l, pixels: next };
      }),
      history: [],
      redo: []
    })));
  };

  // Frame operations
  const addFrame = () => {
    setFrames(f => {
      const base = frames[currentFrame];
      const clonedLayers = base.layers.map(l => ({ ...l, id: crypto.randomUUID(), pixels: l.pixels.slice() }));
      const newFrame: Frame = { layers: clonedLayers, activeLayer: base.activeLayer, history: [], redo: [], id: crypto.randomUUID() };
      const nf=[...f.slice(0,currentFrame+1), newFrame, ...f.slice(currentFrame+1)];
      setCurrentFrame(currentFrame+1);
      return nf;
    });
  };
  const duplicateFrame = () => addFrame();
  const deleteFrame = () => {
    if (frames.length === 1) return; // sempre manter 1
    setFrames(f => {
      const nf = f.filter((_, i) => i !== currentFrame);
      setCurrentFrame(i => clamp(i > 0 ? Math.min(i - 1, nf.length - 1) : 0, 0, nf.length - 1));
      return nf;
    });
  };
  const selectFrame = (i: number) => {
    setCurrentFrame(i);
  };

  // Thumbnail render helper
  const renderThumbnail = (canvas: HTMLCanvasElement, frame: Frame) => {
    const size = 64; // fixed preview size
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = size; canvas.height = size;
    ctx.clearRect(0,0,size,size);
    // background chess
    const cell = Math.max(1, Math.floor(size / width));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const even = ((x + y) & 1) === 0;
        ctx.fillStyle = even ? '#eee' : '#ccc';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  frame.layers.forEach(l => { if(!l.visible) return; ctx.save(); ctx.globalAlpha = l.opacity; for(let y=0;y<height;y++){ for(let x=0;x<width;x++){ const c=l.pixels[y*width + x]; if(!c || (c.length===9 && c.endsWith('00'))) continue; ctx.fillStyle=c; ctx.fillRect(x*cell,y*cell,cell,cell); } } ctx.restore(); });
  };

  // Auto-save local
  useEffect(() => {
    const data = { width, height, frames };
    localStorage.setItem('spriteEditorData', JSON.stringify(data));
  }, [frames, width, height]);

  useEffect(() => {
    // load once
    try {
      const raw = localStorage.getItem('spriteEditorData');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.frames && Array.isArray(parsed.frames) && parsed.width === parsed.height) {
          setWidth(parsed.width);
          setHeight(parsed.height);
          setFrames(parsed.frames.map((fr: any) => {
            if (fr.layers) {
              return { ...fr, id: fr.id || crypto.randomUUID(), layers: fr.layers.map((l: any) => ({ ...l, id: l.id || crypto.randomUUID(), pixels: l.pixels })) };
            }
            return {
              id: fr.id || crypto.randomUUID(),
              activeLayer: 0,
              layers: [{ id: crypto.randomUUID(), name: 'Layer 1', pixels: fr.pixels, visible: true, opacity: 1 }],
              history: [],
              redo: []
            } as Frame;
          }));
          setCurrentFrame(0);
        }
      }
    } catch { /* ignore */ }
  }, []);


  return (
    <div className="sprite-editor layout-root">
      {/* Painel esquerdo - ferramentas */}
      <aside className="panel panel-left">
        <div className="panel-title">Ferramentas</div>
        <div className="tool-column">
          <button className={tool==='pencil'? 'active': ''} onClick={() => setTool('pencil')} title="Lápis (B)">✏️</button>
          <button className={tool==='eraser'? 'active': ''} onClick={() => setTool('eraser')} title="Borracha (E)">🧽</button>
          <button className={tool==='fill'? 'active': ''} onClick={() => setTool('fill')} title="Balde (G)">🪣</button>
          <button className={tool==='picker'? 'active': ''} onClick={() => setTool('picker')} title="Conta-gotas (I)">🎯</button>
          <div className="separator" />
          <button onClick={undo} disabled={!current.history.length} title="Desfazer Ctrl+Z">↶</button>
            <button onClick={redo} disabled={!current.redo.length} title="Refazer Ctrl+Y">↷</button>
          <button onClick={clear} title="Limpar frame">🗑️</button>
        </div>
      </aside>
      {/* Centro - Canvas + Timeline */}
      <main className="panel panel-center">
        <div className="canvas-zone">
          <div className="canvas-wrap" style={{ background: bgColor }}>
            <canvas
              ref={canvasRef}
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              onMouseLeave={onUp}
              style={{
                cursor: tool === 'pencil' ? 'crosshair' : tool === 'eraser' ? 'not-allowed' : 'pointer'
              }}
            />
          </div>
        </div>
        <div className="timeline-bar">
          <div className="timeline-scroll">
            {frames.map((fr, i) => (
              <div key={fr.id} className={"frame-thumb" + (i===currentFrame? ' current':'')} onClick={() => selectFrame(i)}>
                <canvas ref={el => { if (el) renderThumbnail(el, fr); }} />
                <div className="frame-index">{i+1}</div>
              </div>
            ))}
            <div className="frame-actions inline">
              <button onClick={addFrame} title="Novo frame">➕</button>
              <button onClick={duplicateFrame} title="Duplicar frame">🗐</button>
              <button onClick={deleteFrame} disabled={frames.length===1} title="Remover frame">🗑</button>
            </div>
          </div>
        </div>
      </main>
      {/* Painel direito - cores, animação, export */}
      <aside className="panel panel-right">
        <div className="panel-section">
          <div className="panel-title">Cores</div>
          <label className="stacked" title="Cor do pixel">
            <span>Cor</span>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          </label>
          <label className="stacked" title="Fundo">
            <span>Fundo</span>
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
          </label>
          <div className="palette-box">
            {palette.map((p, i) => (
              <button key={i} className={"pal-color" + (color===p? ' sel':'')} style={{ background: p }} onClick={() => setColor(p)} title={p} />
            ))}
          </div>
        </div>
  <LayerPanel frame={current} onChange={setFrames} width={width} height={height} currentFrameIndex={currentFrame} frames={frames} />
        <div className="panel-section">
          <div className="panel-title">Canvas</div>
          <label className="row" title="Mostrar grade">
            <input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} /> <span>Grid</span>
          </label>
          <label className="row" title="Onion skin anterior">
            <input type="checkbox" checked={showOnion} onChange={e => setShowOnion(e.target.checked)} /> <span>Onion</span>
          </label>
          <label className="stacked" title="Tamanho quadrado">
            <span>Tamanho</span>
            <input type="number" min={1} max={256} value={width} onChange={e => {
              const v = clamp(parseInt(e.target.value||'1'),1,256); if (v!==width){ setWidth(v); setHeight(v); resizeAllFrames(v);} }} />
          </label>
        </div>
        <div className="panel-section">
          <div className="panel-title">Animação</div>
          <div className="anim-inline">
            <button onClick={() => setPlaying(p => !p)} title="Play/Pause (Espaço)">{playing? '⏸':'▶️'}</button>
            <label className="stacked small" title="Frames por segundo">
              <span>FPS</span>
              <input type="number" min={1} max={60} value={fps} onChange={e => setFps(clamp(parseInt(e.target.value||'1'),1,60))} />
            </label>
          </div>
          <div className="preview-group" title="Pré-visualização animada">
            <FramePreview frames={frames} width={width} height={height} fps={fps} playing={playing} />
          </div>
        </div>
        <div className="panel-section">
          <div className="panel-title">Exportar</div>
          <button className="wide" onClick={exportPNG}>PNG atual</button>
          <button className="wide" onClick={exportSpriteSheet}>Spritesheet</button>
          <label className="import-btn wide" title="Importar PNG">
            <span>Importar</span>
            <input type="file" accept="image/*" onChange={e => e.target.files && importImage(e.target.files[0])} />
          </label>
        </div>
      </aside>
    </div>
  );
};

// Componente de preview animado simples
interface PreviewFrame { layers: { pixels: string[]; visible: boolean; opacity: number }[] }
const FramePreview: React.FC<{frames: PreviewFrame[]; width:number; height:number; fps:number; playing:boolean;}> = ({frames,width,height,fps,playing}) => {
  const smallRef = useRef<HTMLCanvasElement|null>(null);
  const bigRef = useRef<HTMLCanvasElement|null>(null);
  const [frameIdx,setFrameIdx] = useState(0);

  useEffect(()=>{ setFrameIdx(0); },[frames.length,width,height]);

  useEffect(()=>{
    if(!playing) return; const id = setInterval(()=> setFrameIdx(f => (f+1)%frames.length), 1000/Math.max(1,fps));
    return ()=> clearInterval(id);
  },[playing,fps,frames.length]);

  useEffect(()=>{
    const draw = (canvas: HTMLCanvasElement|null, scale=1) => {
      if(!canvas) return; const ctx = canvas.getContext('2d'); if(!ctx) return;
      canvas.width = width * scale; canvas.height = height * scale;
      ctx.imageSmoothingEnabled = false;
      // fundo xadrez
      const cell = 4 * scale;
      for(let y=0;y<canvas.height;y+=cell){
        for(let x=0;x<canvas.width;x+=cell){
          const even = ((x/cell + y/cell) & 1) === 0; ctx.fillStyle = even? '#2c2c2c':'#242424'; ctx.fillRect(x,y,cell,cell);
        }
      }
  frames[frameIdx].layers.forEach(l => { if(!l.visible) return; ctx.save(); ctx.globalAlpha = l.opacity; for(let y=0;y<height;y++){ for(let x=0;x<width;x++){ const c = l.pixels[y*width + x]; if(!c || (c.length===9 && c.endsWith('00'))) continue; ctx.fillStyle=c; ctx.fillRect(x*scale,y*scale,scale,scale); } } ctx.restore(); });
    };
    draw(smallRef.current,1);
    draw(bigRef.current,4);
  },[frameIdx,frames,width,height]);

  return (
    <div className="preview-wrapper">
      <canvas ref={smallRef} className="pv pv-1" />
      <canvas ref={bigRef} className="pv pv-4" />
    </div>
  );
};

function downloadURI(uri: string, name: string) {
  const link = document.createElement('a');
  link.href = uri;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function hexToRgba(hex: string): [number, number, number, number] {
  if (hex.startsWith('#') && hex.length === 9) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = parseInt(hex.slice(7, 9), 16);
    return [r, g, b, a];
  }
  if (hex.startsWith('#') && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  }
  // fallback transparent
  return [0, 0, 0, 0];
}

function rgbaToHex([r, g, b, a]: [number, number, number, number]) {
  const to2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}${to2(a)}`;
}

export default SpriteEditor;
