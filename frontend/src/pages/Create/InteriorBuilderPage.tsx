import React, { CSSProperties, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InteriorBuilderPage.css';

type Tool = 'pan' | 'erase' | 'select' | 'area' | 'door' | 'wall' | 'free-select';
type PaletteTab = 'ambience' | 'images' | 'shapes';
type AxisOrientation = 'horizontal' | 'vertical';
type DoorOrientation = AxisOrientation | 'diagonal';

type Point = {
  x: number;
  y: number;
};

type ViewTransform = {
  scale: number;
  x: number;
  y: number;
};

type Door = {
  id: string;
  start: Point;
  end: Point;
};

type InteriorWall = {
  id: string;
  start: Point;
  end: Point;
};

type CanvasTheme = {
  surfaceBackground: string;
  gridBackground: string;
  gridStroke: string;
  subgridStroke: string;
  axisColor: string;
  hoverFill: string;
  hoverStroke: string;
  roomFill: string;
  roomFillSelected: string;
  outlineFill: string;
  wallFill: string;
  wallFillSelected: string;
  doorStroke: string;
  doorStrokeSelected: string;
  draftWallStroke: string;
  draftRectFill: string;
  draftRectStroke: string;
  draftLabel: string;
};

type PaletteTile = {
  id: string;
  tab: PaletteTab;
  label: string;
  description: string;
  background: string;
  border?: string;
  canvasTheme?: CanvasTheme;
};

type OutlineSegment = {
  orientation: AxisOrientation;
  x: number;
  y: number;
  length: number;
};

type SelectionBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

type AreaSelection = {
  kind: 'area';
  cells: string[];
  walls: InteriorWall[];
  doors: Door[];
  bounds: SelectionBounds;
  offset: Point;
  unit: number;
};

type FreeSelection = {
  kind: 'free';
  cells: string[];
  bounds: SelectionBounds;
  offset: Point;
  unit: number;
};

type SelectionWall = {
  kind: 'wall';
  wallId: string;
};

type SelectionDoor = {
  kind: 'door';
  doorId: string;
};

type SelectionState =
  | { kind: 'none' }
  | AreaSelection
  | FreeSelection
  | SelectionWall
  | SelectionDoor;

type SelectionClipboard = {
  width: number;
  height: number;
  cells: Array<{ x: number; y: number }>;
  walls: Array<{ start: Point; end: Point }>;
  doors: Array<{ start: Point; end: Point }>;
};

type HistoryEntry = {
  cellUnit: number;
  snapDenominator: number;
  cells: string[];
  cellTextures: Record<string, string>;
  doors: Door[];
  walls: InteriorWall[];
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CellRenderDescriptor = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  texture?: string;
};

const GRID_SIZE = 48;
const GRID_EXTENT = 120;
const OFFSET_EPSILON = 1e-6;
const WALL_STROKE = GRID_SIZE * 0.18;
const DOOR_THICKNESS = 0.12;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4;
const gridSnapOptions: number[] = [0, 1, 2, 4, 8];
const CELL_UNIT_OPTIONS = [1, 0.5, 0.25, 0.125] as const;
const CELL_RENDER_UNIT_OPTIONS = [8, 4, 2, 1, 0.5, 0.25, 0.125] as const;
const paletteTabs: { id: PaletteTab; label: string }[] = [
  { id: 'ambience', label: 'Ambiente' },
  { id: 'images', label: 'Images' },
  { id: 'shapes', label: 'Shapes' },
];

const paletteTiles: PaletteTile[] = [
  {
    id: 'stone-corner',
    tab: 'ambience',
    label: 'Esquina pedra',
    description: 'Parede com textura de pedra.',
    background: 'linear-gradient(135deg, #24262d 0%, #3b3f48 60%, #8b8f9a 100%)',
    canvasTheme: {
      surfaceBackground: 'radial-gradient(circle at 50% 45%, #2f3038 0%, #1f2128 65%, #15161b 100%)',
      gridBackground: '#23252d',
      gridStroke: 'rgba(196, 190, 180, 0.25)',
      subgridStroke: 'rgba(196, 190, 180, 0.12)',
      axisColor: 'rgba(236, 218, 189, 0.45)',
      hoverFill: 'rgba(244, 208, 132, 0.16)',
      hoverStroke: 'rgba(247, 215, 140, 0.55)',
      roomFill: 'rgba(140, 160, 206, 0.58)',
      roomFillSelected: 'rgba(193, 214, 255, 0.8)',
      outlineFill: 'rgba(230, 214, 180, 0.85)',
      wallFill: 'rgba(240, 225, 185, 0.9)',
      wallFillSelected: 'rgba(255, 244, 200, 0.95)',
      doorStroke: 'rgba(238, 198, 128, 0.92)',
      doorStrokeSelected: 'rgba(255, 218, 160, 0.98)',
      draftWallStroke: 'rgba(238, 198, 128, 0.9)',
      draftRectFill: 'rgba(255, 220, 155, 0.28)',
      draftRectStroke: 'rgba(225, 190, 120, 0.75)',
      draftLabel: '#f3e2bb',
    },
  },
  {
    id: 'blue-floor',
    tab: 'ambience',
    label: 'Piso frio',
    description: 'Azulejos azul claro.',
    background: 'linear-gradient(135deg, #5a7bb5 0%, #93b4ec 100%)',
    canvasTheme: {
      surfaceBackground: 'linear-gradient(180deg, #cfdaf3 0%, #a4bbef 45%, #7e9ad9 100%)',
      gridBackground: 'rgba(199, 216, 247, 0.82)',
      gridStroke: 'rgba(78, 110, 174, 0.35)',
      subgridStroke: 'rgba(78, 110, 174, 0.18)',
      axisColor: 'rgba(255, 255, 255, 0.6)',
      hoverFill: 'rgba(255, 255, 255, 0.22)',
      hoverStroke: 'rgba(255, 255, 255, 0.7)',
      roomFill: 'rgba(109, 149, 234, 0.55)',
      roomFillSelected: 'rgba(142, 184, 255, 0.75)',
      outlineFill: 'rgba(39, 70, 142, 0.65)',
      wallFill: 'rgba(36, 64, 126, 0.85)',
      wallFillSelected: 'rgba(59, 91, 157, 0.95)',
      doorStroke: 'rgba(255, 255, 255, 0.85)',
      doorStrokeSelected: 'rgba(230, 240, 255, 0.95)',
      draftWallStroke: 'rgba(62, 102, 186, 0.85)',
      draftRectFill: 'rgba(168, 201, 255, 0.35)',
      draftRectStroke: 'rgba(83, 133, 226, 0.82)',
      draftLabel: '#1e2d58',
    },
  },
  {
    id: 'grid-highlight',
    tab: 'ambience',
    label: 'Grid alto contraste',
    description: 'Grade clara para interiores.',
    background: 'linear-gradient(135deg, #fefefe 0%, #dfe0e6 100%)',
    border: '#bfc3d1',
    canvasTheme: {
      surfaceBackground: 'linear-gradient(180deg, #ffffff 0%, #f5f6f8 60%, #e5e7ec 100%)',
      gridBackground: '#ffffff',
      gridStroke: 'rgba(80, 80, 90, 0.2)',
      subgridStroke: 'rgba(120, 120, 140, 0.12)',
      axisColor: 'rgba(120, 130, 150, 0.55)',
      hoverFill: 'rgba(190, 220, 255, 0.2)',
      hoverStroke: 'rgba(120, 140, 200, 0.5)',
      roomFill: 'rgba(96, 128, 200, 0.45)',
      roomFillSelected: 'rgba(70, 110, 220, 0.6)',
      outlineFill: 'rgba(85, 110, 160, 0.5)',
      wallFill: 'rgba(50, 80, 140, 0.7)',
      wallFillSelected: 'rgba(45, 72, 128, 0.85)',
      doorStroke: 'rgba(180, 130, 80, 0.8)',
      doorStrokeSelected: 'rgba(210, 150, 90, 0.9)',
      draftWallStroke: 'rgba(98, 120, 180, 0.85)',
      draftRectFill: 'rgba(180, 210, 255, 0.3)',
      draftRectStroke: 'rgba(120, 150, 210, 0.8)',
      draftLabel: '#425070',
    },
  },
  {

    id: 'tones-parchment',
    tab: 'ambience',
    label: 'Pergaminho',
    description: 'Base bege com leve ruído.',
    background: 'linear-gradient(135deg, #f3e4d3 0%, #d8c2a9 100%)',
    border: '#c3aa8a',
    canvasTheme: {
      surfaceBackground: 'linear-gradient(180deg, #f8eedc 0%, #f1e0c5 55%, #e5cda6 100%)',
      gridBackground: 'rgba(248, 237, 218, 0.92)',
      gridStroke: 'rgba(156, 120, 82, 0.4)',
      subgridStroke: 'rgba(156, 120, 82, 0.2)',
      axisColor: 'rgba(108, 76, 42, 0.6)',
      hoverFill: 'rgba(255, 236, 196, 0.28)',
      hoverStroke: 'rgba(195, 142, 78, 0.8)',
      roomFill: 'rgba(180, 152, 112, 0.5)',
      roomFillSelected: 'rgba(204, 174, 128, 0.7)',
      outlineFill: 'rgba(140, 100, 60, 0.7)',
      wallFill: 'rgba(108, 76, 42, 0.75)',
      wallFillSelected: 'rgba(128, 90, 50, 0.9)',
      doorStroke: 'rgba(176, 118, 60, 0.85)',
      doorStrokeSelected: 'rgba(206, 138, 76, 0.95)',
      draftWallStroke: 'rgba(200, 150, 90, 0.9)',
      draftRectFill: 'rgba(240, 204, 150, 0.35)',
      draftRectStroke: 'rgba(198, 150, 94, 0.85)',
      draftLabel: '#6b4a2f',
    },
  },
  {
    id: 'dark-brick',
    tab: 'ambience',
    label: 'Tijolo escuro',
    description: 'Parede grossa para masmorras.',
    background: 'linear-gradient(135deg, #2e2a2a 0%, #4c3f3f 100%)',
    canvasTheme: {
      surfaceBackground: 'linear-gradient(160deg, #1c1818 0%, #2b2222 50%, #3a2d2d 100%)',
      gridBackground: '#231a1a',
      gridStroke: 'rgba(206, 96, 82, 0.3)',
      subgridStroke: 'rgba(206, 96, 82, 0.18)',
      axisColor: 'rgba(255, 195, 160, 0.5)',
      hoverFill: 'rgba(255, 144, 120, 0.2)',
      hoverStroke: 'rgba(255, 188, 153, 0.6)',
      roomFill: 'rgba(170, 94, 84, 0.55)',
      roomFillSelected: 'rgba(220, 130, 110, 0.75)',
      outlineFill: 'rgba(255, 172, 148, 0.65)',
      wallFill: 'rgba(255, 144, 120, 0.9)',
      wallFillSelected: 'rgba(255, 178, 150, 0.95)',
      doorStroke: 'rgba(255, 208, 160, 0.9)',
      doorStrokeSelected: 'rgba(255, 228, 190, 0.95)',
      draftWallStroke: 'rgba(240, 162, 128, 0.9)',
      draftRectFill: 'rgba(255, 188, 153, 0.32)',
      draftRectStroke: 'rgba(255, 164, 130, 0.86)',
      draftLabel: '#ffdcc4',
    },
  },
  {
    id: 'grey-floor',
    tab: 'ambience',
    label: 'Cimento',
    description: 'Base neutra para oficinas.',
    background: 'linear-gradient(135deg, #a7a9af 0%, #c1c3c9 100%)',
    border: '#9c9fa8',
    canvasTheme: {
      surfaceBackground: 'linear-gradient(180deg, #d5d6da 0%, #b9bcc3 50%, #a0a3aa 100%)',
      gridBackground: 'rgba(216, 218, 224, 0.9)',
      gridStroke: 'rgba(90, 96, 112, 0.28)',
      subgridStroke: 'rgba(90, 96, 112, 0.16)',
      axisColor: 'rgba(70, 76, 96, 0.55)',
      hoverFill: 'rgba(255, 255, 255, 0.2)',
      hoverStroke: 'rgba(140, 146, 156, 0.6)',
      roomFill: 'rgba(110, 136, 176, 0.48)',
      roomFillSelected: 'rgba(138, 166, 214, 0.68)',
      outlineFill: 'rgba(88, 104, 146, 0.62)',
      wallFill: 'rgba(72, 86, 122, 0.82)',
      wallFillSelected: 'rgba(92, 112, 150, 0.92)',
      doorStroke: 'rgba(214, 188, 140, 0.88)',
      doorStrokeSelected: 'rgba(234, 208, 160, 0.94)',
      draftWallStroke: 'rgba(120, 140, 180, 0.85)',
      draftRectFill: 'rgba(176, 198, 236, 0.32)',
      draftRectStroke: 'rgba(132, 152, 194, 0.82)',
      draftLabel: '#39425c',
    },
  },
  {
    id: 'decor-pillars',
    tab: 'images',
    label: 'Pilares',
    description: 'Pilares em perspectiva superior.',
    background: 'linear-gradient(135deg, #dcd8d2 0%, #bbb5ad 100%)',
    border: '#aea9a1',
  },
  {
    id: 'decor-foliage',
    tab: 'images',
    label: 'Follhagem',
    description: 'Detalhes organicos.',
    background: 'linear-gradient(135deg, #445b3f 0%, #6f8c54 100%)',
  },
  {
    id: 'shape-octagon',
    tab: 'shapes',
    label: 'Octogono',
    description: 'Sala octogonal pronta.',
    background: 'linear-gradient(135deg, #ffffff 0%, #eceff5 100%)',
    border: '#cdd4e4',
  },
  {
    id: 'shape-curve',
    tab: 'shapes',
    label: 'Curva suave',
    description: 'Curvar paredes rapidamente.',
    background: 'linear-gradient(135deg, #ede6ff 0%, #d4cbff 100%)',
    border: '#bcb2ff',
  },
];

const firstAmbienceTile = paletteTiles.find((tile) => tile.tab === 'ambience' && tile.canvasTheme);

const defaultCanvasTheme: CanvasTheme = firstAmbienceTile?.canvasTheme ?? {
  surfaceBackground: 'repeat top left / 32px 32px radial-gradient(circle at center, rgba(0, 0, 0, 0.08) 1px, transparent 1px), #f2e8da',
  gridBackground: '#f2e8da',
  gridStroke: 'rgba(90, 76, 62, 0.38)',
  subgridStroke: 'rgba(120, 110, 90, 0.22)',
  axisColor: 'rgba(84, 70, 55, 0.35)',
  hoverFill: 'rgba(255, 245, 228, 0.28)',
  hoverStroke: 'rgba(98, 80, 60, 0.45)',
  roomFill: 'rgba(186, 198, 230, 0.6)',
  roomFillSelected: 'rgba(152, 170, 216, 0.85)',
  outlineFill: 'rgba(60, 66, 94, 0.85)',
  wallFill: 'rgba(60, 66, 94, 0.85)',
  wallFillSelected: 'rgba(43, 45, 70, 0.95)',
  doorStroke: 'rgba(60, 66, 94, 0.85)',
  doorStrokeSelected: '#ffe6a8',
  draftWallStroke: 'rgba(215, 160, 90, 0.9)',
  draftRectFill: 'rgba(255, 228, 173, 0.35)',
  draftRectStroke: 'rgba(215, 180, 120, 0.8)',
  draftLabel: '#4f4538',
};

const defaultAmbienceTileId = firstAmbienceTile?.id ?? '';

const toolOptions: { id: Tool; label: string; hint: string }[] = [
  {
    id: 'pan',
    label: 'Movimentação',
    hint: 'Clique e arraste para movimentar a câmera.',
  },
  {
    id: 'erase',
    label: 'Apagar',
    hint: 'Clique e arraste para remover blocos preenchidos.',
  },
  {
    id: 'select',
    label: 'Selecionar',
    hint: 'Clique para selecionar áreas, portas ou paredes. Arraste para mover a seleção.',
  },
  {
    id: 'free-select',
    label: 'Seleção livre',
    hint: 'Pinte os blocos que deseja selecionar individualmente.',
  },
  {
    id: 'area',
    label: 'Área retangular',
    hint: 'Clique e arraste para adicionar blocos retangulares que se mesclam.',
  },
  {
    id: 'door',
    label: 'Porta',
    hint: 'Clique próximo a uma borda externa para inserir uma porta.',
  },
  {
    id: 'wall',
    label: 'Paredes',
    hint: 'Clique e arraste para traçar paredes internas alinhadas à grade.',
  },
];

const hotbarTools: { id: Tool; label: string; glyph: string }[] = [
  { id: 'pan', label: 'Movimentação', glyph: '⤧' },
  { id: 'erase', label: 'Apagar', glyph: '⌫' },
  { id: 'select', label: 'Selecionar', glyph: '⌖' },
  { id: 'free-select', label: 'Livre', glyph: '✱' },
  { id: 'area', label: 'Área', glyph: '▭' },
  { id: 'door', label: 'Porta', glyph: '═' },
  { id: 'wall', label: 'Paredes', glyph: '╬' },
];

const idFactory = (() => {
  let counter = 0;
  return (prefix: string) => {
    counter += 1;
    return `${prefix}-${Date.now()}-${counter}`;
  };
})();
const PRECISION_DIGITS = 6;
const normalizeCoord = (value: number) => Number(value.toFixed(PRECISION_DIGITS));
const coordToString = (value: number) => normalizeCoord(value).toString();

const toCellKey = (x: number, y: number) => `${coordToString(x)},${coordToString(y)}`;

const fromCellKey = (key: string): { x: number; y: number } => {
  const [rawX, rawY] = key.split(',');
  return { x: Number(rawX), y: Number(rawY) };
};

const cloneDoors = (source: Door[]): Door[] =>
  source.map((door) => ({
    id: door.id,
    start: { ...door.start },
    end: { ...door.end },
  }));

const cloneWalls = (source: InteriorWall[]): InteriorWall[] =>
  source.map((wall) => ({
    id: wall.id,
    start: { ...wall.start },
    end: { ...wall.end },
  }));

const isMultipleOfUnit = (value: number, unit: number) => Math.abs(value / unit - Math.round(value / unit)) <= OFFSET_EPSILON;

const pointAlignedToUnit = (point: Point, unit: number) => isMultipleOfUnit(point.x, unit) && isMultipleOfUnit(point.y, unit);

const segmentsAlignedToUnit = (items: Array<{ start: Point; end: Point }>, unit: number) =>
  items.every(({ start, end }) => pointAlignedToUnit(start, unit) && pointAlignedToUnit(end, unit));

const filterTexturesForCells = (textures: Record<string, string>, cellsSet: Set<string>) => {
  const filtered: Record<string, string> = {};
  cellsSet.forEach((key) => {
    const texture = textures[key];
    if (texture) {
      filtered[key] = texture;
    }
  });
  return filtered;
};

const tryCoarsenCells = (
  cellsSet: Set<string>,
  textures: Record<string, string>,
  currentUnit: number,
  targetUnit: number,
): { cells: string[]; textures: Record<string, string> } | null => {
  if (cellsSet.size === 0) {
    return { cells: [], textures: {} };
  }

  const rawFactor = targetUnit / currentUnit;
  const factor = Math.round(rawFactor);
  if (!Number.isFinite(factor) || factor <= 1 || Math.abs(rawFactor - factor) > OFFSET_EPSILON) {
    return null;
  }

  const expectedCount = factor * factor;
  const visitedGroups = new Set<string>();
  const nextCells: string[] = [];
  const nextTextures: Record<string, string> = {};

  for (const key of cellsSet) {
    const { x, y } = fromCellKey(key);
    const baseX = normalizeCoord(Math.floor((x + OFFSET_EPSILON) / targetUnit) * targetUnit);
    const baseY = normalizeCoord(Math.floor((y + OFFSET_EPSILON) / targetUnit) * targetUnit);
    const groupKey = toCellKey(baseX, baseY);
    if (visitedGroups.has(groupKey)) {
      continue;
    }

    let count = 0;
    let groupTexture: string | undefined;
    for (let ix = 0; ix < factor; ix += 1) {
      const childX = normalizeCoord(baseX + ix * currentUnit);
      for (let iy = 0; iy < factor; iy += 1) {
        const childY = normalizeCoord(baseY + iy * currentUnit);
        const childKey = toCellKey(childX, childY);
        if (!cellsSet.has(childKey)) {
          return null;
        }
        count += 1;
        const childTexture = textures[childKey];
        if (childTexture) {
          if (groupTexture && groupTexture !== childTexture) {
            return null;
          }
          groupTexture = childTexture;
        }
      }
    }

    if (count !== expectedCount) {
      return null;
    }

    visitedGroups.add(groupKey);
    nextCells.push(groupKey);
    if (groupTexture) {
      nextTextures[groupKey] = groupTexture;
    }
  }

  if (nextCells.length * expectedCount !== cellsSet.size) {
    return null;
  }

  nextCells.sort();
  return { cells: nextCells, textures: nextTextures };
};

const optimizeCellGrid = (
  cellsSet: Set<string>,
  textures: Record<string, string>,
  currentUnit: number,
  walls: InteriorWall[],
  doors: Door[],
): { unit: number; cells: string[]; textures: Record<string, string>; unitChanged: boolean } => {
  const defaultCells = Array.from(cellsSet).sort();
  const defaultTextures = filterTexturesForCells(textures, cellsSet);
  const combinedSegments: Array<{ start: Point; end: Point }> = [...walls, ...doors];

  for (const candidate of CELL_UNIT_OPTIONS) {
    if (candidate <= currentUnit + OFFSET_EPSILON) {
      continue;
    }

    const rawFactor = candidate / currentUnit;
    const factor = Math.round(rawFactor);
    if (!Number.isFinite(factor) || factor <= 1 || Math.abs(rawFactor - factor) > OFFSET_EPSILON) {
      continue;
    }

    if (!segmentsAlignedToUnit(combinedSegments, candidate)) {
      continue;
    }

    const coarsened = tryCoarsenCells(cellsSet, textures, currentUnit, candidate);
    if (coarsened) {
      return { unit: candidate, cells: coarsened.cells, textures: coarsened.textures, unitChanged: true };
    }
  }

  if (cellsSet.size === 0) {
    for (const candidate of CELL_UNIT_OPTIONS) {
      if (candidate <= currentUnit + OFFSET_EPSILON) {
        continue;
      }
      if (!segmentsAlignedToUnit(combinedSegments, candidate)) {
        continue;
      }
      return { unit: candidate, cells: [], textures: {}, unitChanged: true };
    }
  }

  return { unit: currentUnit, cells: defaultCells, textures: defaultTextures, unitChanged: false };
};

const formatUnitLabel = (unit: number) => {
  if (unit >= 1 - OFFSET_EPSILON) {
    return '1';
  }
  const denominator = Math.round(1 / unit);
  return `1/${denominator}`;
};

const expandCellsToUnit = (
  cellsSource: string[],
  texturesSource: Record<string, string>,
  sourceUnit: number,
  targetUnit: number,
): { cells: string[]; textures: Record<string, string> } => {
  if (cellsSource.length === 0) {
    return { cells: [], textures: {} };
  }

  if (Math.abs(sourceUnit - targetUnit) <= OFFSET_EPSILON) {
    return {
      cells: [...cellsSource].sort(),
      textures: { ...texturesSource },
    };
  }

  const ratio = sourceUnit / targetUnit;
  const factor = Math.round(ratio);
  if (!Number.isFinite(factor) || factor <= 1 || Math.abs(ratio - factor) > OFFSET_EPSILON) {
    return {
      cells: [...cellsSource].sort(),
      textures: { ...texturesSource },
    };
  }

  const nextCells: string[] = [];
  const seen = new Set<string>();
  const nextTextures: Record<string, string> = {};

  cellsSource.forEach((key) => {
    const { x, y } = fromCellKey(key);
    const texture = texturesSource[key];
    for (let ix = 0; ix < factor; ix += 1) {
      const childX = normalizeCoord(x + ix * targetUnit);
      for (let iy = 0; iy < factor; iy += 1) {
        const childY = normalizeCoord(y + iy * targetUnit);
        const childKey = toCellKey(childX, childY);
        if (!seen.has(childKey)) {
          seen.add(childKey);
          nextCells.push(childKey);
        }
        if (texture) {
          nextTextures[childKey] = texture;
        }
      }
    }
  });

  nextCells.sort();
  return { cells: nextCells, textures: nextTextures };
};

const aggregateCellsForDisplay = (
  cellsSource: Set<string>,
  cellUnit: number,
  textures: Record<string, string>,
  selectionSet: Set<string> | null,
): CellRenderDescriptor[] => {
  if (cellsSource.size === 0 || cellUnit <= 0) {
    return [];
  }

  const candidateUnits = CELL_RENDER_UNIT_OPTIONS.filter((unit) => {
    if (unit < cellUnit - OFFSET_EPSILON) {
      return false;
    }
    const ratio = unit / cellUnit;
    return Math.abs(ratio - Math.round(ratio)) <= OFFSET_EPSILON;
  }).sort((a, b) => b - a);

  const remaining = new Set(cellsSource);
  const descriptors: CellRenderDescriptor[] = [];

  while (remaining.size > 0) {
    const iterator = remaining.values();
    const firstKey = iterator.next().value as string;
    let descriptor: CellRenderDescriptor | null = null;

    for (const unit of candidateUnits) {
      const ratio = unit / cellUnit;
      const factor = Math.max(1, Math.round(ratio));
      const { x, y } = fromCellKey(firstKey);
      const baseX = normalizeCoord(Math.floor((x + OFFSET_EPSILON) / unit) * unit);
      const baseY = normalizeCoord(Math.floor((y + OFFSET_EPSILON) / unit) * unit);
      const collectedKeys: string[] = [];
      let selected = selectionSet ? selectionSet.has(firstKey) : false;
      let consistent = true;
      let texture: string | undefined;

      for (let ix = 0; ix < factor && consistent; ix += 1) {
        const childX = normalizeCoord(baseX + ix * cellUnit);
        for (let iy = 0; iy < factor && consistent; iy += 1) {
          const childY = normalizeCoord(baseY + iy * cellUnit);
          const childKey = toCellKey(childX, childY);
          if (!remaining.has(childKey)) {
            consistent = false;
            break;
          }
          collectedKeys.push(childKey);
          const childTexture = textures[childKey];
          if (childTexture) {
            if (factor > 1) {
              consistent = false;
              break;
            }
            if (!texture) {
              texture = childTexture;
            } else if (texture !== childTexture) {
              consistent = false;
              break;
            }
          }
          if (selectionSet) {
            const childSelected = selectionSet.has(childKey);
            if (ix === 0 && iy === 0) {
              selected = childSelected;
            } else if (childSelected !== selected) {
              consistent = false;
              break;
            }
          }
        }
      }

      if (!consistent) {
        continue;
      }

      descriptor = {
        key: `${coordToString(baseX)}:${coordToString(baseY)}:${coordToString(unit)}`,
        x: baseX,
        y: baseY,
        width: unit,
        height: unit,
        selected: selectionSet ? selected : false,
        texture,
      };

      collectedKeys.forEach((key) => {
        remaining.delete(key);
      });
      break;
    }

    if (!descriptor) {
      const fallbackTexture = textures[firstKey];
      const { x, y } = fromCellKey(firstKey);
      const fallbackSelected = selectionSet ? selectionSet.has(firstKey) : false;
      descriptor = {
        key: `${firstKey}:${coordToString(cellUnit)}`,
        x,
        y,
        width: cellUnit,
        height: cellUnit,
        selected: fallbackSelected,
        texture: fallbackTexture,
      };
      remaining.delete(firstKey);
    }

    descriptors.push(descriptor);
  }

  descriptors.sort((a, b) => {
    if (Math.abs(a.y - b.y) > OFFSET_EPSILON) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  return descriptors;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const MERGE_EPSILON = 1e-6;

const mergeSegments = (segments: OutlineSegment[]): OutlineSegment[] => {
  const merged: OutlineSegment[] = [];

  const horizontal = segments
    .filter((segment) => segment.orientation === 'horizontal')
    .map((segment) => ({
      ...segment,
      x: normalizeCoord(segment.x),
      y: normalizeCoord(segment.y),
      length: normalizeCoord(segment.length),
    }))
    .sort((a, b) => {
      const dy = a.y - b.y;
      if (Math.abs(dy) > MERGE_EPSILON) {
        return dy;
      }
      return a.x - b.x;
    });

  let current: OutlineSegment | null = null;
  horizontal.forEach((segment) => {
    if (!current) {
      current = { ...segment };
      return;
    }
    if (Math.abs(segment.y - current.y) <= MERGE_EPSILON && segment.x <= current.x + current.length + MERGE_EPSILON) {
      const newEnd = Math.max(current.x + current.length, segment.x + segment.length);
      current.length = normalizeCoord(newEnd - current.x);
    } else {
      merged.push(current);
      current = { ...segment };
    }
  });
  if (current) {
    merged.push(current);
  }

  const vertical = segments
    .filter((segment) => segment.orientation === 'vertical')
    .map((segment) => ({
      ...segment,
      x: normalizeCoord(segment.x),
      y: normalizeCoord(segment.y),
      length: normalizeCoord(segment.length),
    }))
    .sort((a, b) => {
      const dx = a.x - b.x;
      if (Math.abs(dx) > MERGE_EPSILON) {
        return dx;
      }
      return a.y - b.y;
    });

  current = null;
  vertical.forEach((segment) => {
    if (!current) {
      current = { ...segment };
      return;
    }
    if (Math.abs(segment.x - current.x) <= MERGE_EPSILON && segment.y <= current.y + current.length + MERGE_EPSILON) {
      const newEnd = Math.max(current.y + current.length, segment.y + segment.length);
      current.length = normalizeCoord(newEnd - current.y);
    } else {
      merged.push(current);
      current = { ...segment };
    }
  });
  if (current) {
    merged.push(current);
  }

  return merged;
};

const computeBoundsFromCells = (cells: string[], unit: number): SelectionBounds => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  cells.forEach((key) => {
    const { x, y } = fromCellKey(key);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  const width = normalizeCoord(maxX - minX + unit);
  const height = normalizeCoord(maxY - minY + unit);

  return { minX, minY, maxX, maxY, width, height };
};

const collectConnectedCells = (startKey: string, cellsSource: Set<string>, unit: number): string[] => {
  const visited = new Set<string>();
  const queue: string[] = [];

  if (!cellsSource.has(startKey)) {
    return [];
  }

  queue.push(startKey);
  visited.add(startKey);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { x, y } = fromCellKey(current);
    const neighbors = [
      toCellKey(x + unit, y),
      toCellKey(x - unit, y),
      toCellKey(x, y + unit),
      toCellKey(x, y - unit),
    ];

    neighbors.forEach((neighbor) => {
      if (cellsSource.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    });
  }

  return Array.from(visited).sort();
};

const isWallWithinBounds = (wall: InteriorWall, bounds: SelectionBounds) => {
  const contains = (point: Point) =>
    point.x >= bounds.minX &&
    point.x <= bounds.minX + bounds.width &&
    point.y >= bounds.minY &&
    point.y <= bounds.minY + bounds.height;

  return contains(wall.start) && contains(wall.end);
};

const isDoorWithinBounds = (door: Door, bounds: SelectionBounds) => {
  const contains = (point: Point) =>
    point.x >= bounds.minX &&
    point.x <= bounds.minX + bounds.width &&
    point.y >= bounds.minY &&
    point.y <= bounds.minY + bounds.height;

  return contains(door.start) && contains(door.end);
};

const buildAreaSelectionFromSources = (
  startKey: string,
  cellsSource: Set<string>,
  doorsSource: Door[],
  wallsSource: InteriorWall[],
  unit: number,
): AreaSelection | null => {
  if (!cellsSource.has(startKey)) {
    return null;
  }

  const cellKeys = collectConnectedCells(startKey, cellsSource, unit);
  if (cellKeys.length === 0) {
    return null;
  }

  const bounds = computeBoundsFromCells(cellKeys, unit);
  const includedWalls = wallsSource.filter((wall) => isWallWithinBounds(wall, bounds));
  const includedDoors = doorsSource.filter((door) => isDoorWithinBounds(door, bounds));

  return {
    kind: 'area',
    cells: cellKeys,
    walls: cloneWalls(includedWalls),
    doors: cloneDoors(includedDoors),
    bounds,
    offset: { x: 0, y: 0 },
    unit,
  };
};

const createFreeSelectionFromSet = (cellsSet: Set<string>, unit: number): FreeSelection | null => {
  if (cellsSet.size === 0) {
    return null;
  }
  const cellKeys = Array.from(cellsSet).sort();
  const bounds = computeBoundsFromCells(cellKeys, unit);
  return {
    kind: 'free',
    cells: cellKeys,
    bounds,
    offset: { x: 0, y: 0 },
    unit,
  };
};

const computeOutlineSegments = (cellSet: Set<string>, unit: number): OutlineSegment[] => {
  if (cellSet.size === 0) {
    return [];
  }

  const rawSegments: OutlineSegment[] = [];

  cellSet.forEach((key) => {
    const { x, y } = fromCellKey(key);
    const topKey = toCellKey(x, y + unit);
    const bottomKey = toCellKey(x, y - unit);
    const leftKey = toCellKey(x - unit, y);
    const rightKey = toCellKey(x + unit, y);

    if (!cellSet.has(topKey)) {
      rawSegments.push({ orientation: 'horizontal', x, y: y + unit, length: unit });
    }
    if (!cellSet.has(bottomKey)) {
      rawSegments.push({ orientation: 'horizontal', x, y, length: unit });
    }
    if (!cellSet.has(leftKey)) {
      rawSegments.push({ orientation: 'vertical', x, y, length: unit });
    }
    if (!cellSet.has(rightKey)) {
      rawSegments.push({ orientation: 'vertical', x: x + unit, y, length: unit });
    }
  });

  return mergeSegments(rawSegments);
};

const WALL_EPSILON = 1e-4;

const segmentLengthFromPoints = (start: Point, end: Point) => {
  return Math.hypot(end.x - start.x, end.y - start.y);
};

const doorLength = (door: Door) => segmentLengthFromPoints(door.start, door.end);

const doorOrientation = (door: Door): DoorOrientation => {
  const dx = door.end.x - door.start.x;
  const dy = door.end.y - door.start.y;
  if (Math.abs(dy) <= WALL_EPSILON) {
    return 'horizontal';
  }
  if (Math.abs(dx) <= WALL_EPSILON) {
    return 'vertical';
  }
  return 'diagonal';
};

const doorMidpoint = (door: Door): Point => ({
  x: (door.start.x + door.end.x) / 2,
  y: (door.start.y + door.end.y) / 2,
});

const doorOrientationLabel = (door: Door) => {
  const orientation = doorOrientation(door);
  if (orientation === 'horizontal') {
    return 'Horizontal';
  }
  if (orientation === 'vertical') {
    return 'Vertical';
  }
  return 'Livre';
};

const isDoorPlacementValid = (door: Door): boolean => {
  return doorLength(door) > WALL_EPSILON;
};

const doorKey = (door: Door) => {
  const ordered = [door.start, door.end].sort((a, b) => {
    if (a.x === b.x) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });
  return `${ordered[0].x.toFixed(4)},${ordered[0].y.toFixed(4)}|${ordered[1].x.toFixed(4)},${ordered[1].y.toFixed(4)}`;
};

const doorExists = (doors: Door[], candidate: Door) => {
  const key = doorKey(candidate);
  return doors.some((door) => doorKey(door) === key);
};

const segmentLength = (wall: InteriorWall) => {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.hypot(dx, dy);
};

const isWallValid = (wall: InteriorWall): boolean => {
  return segmentLength(wall) > WALL_EPSILON;
};

const wallKey = (wall: InteriorWall) => {
  const ordered = [wall.start, wall.end].sort((a, b) => {
    if (a.x === b.x) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });
  return `${ordered[0].x.toFixed(4)},${ordered[0].y.toFixed(4)}|${ordered[1].x.toFixed(4)},${ordered[1].y.toFixed(4)}`;
};

const sanitizeWalls = (walls: InteriorWall[]): InteriorWall[] => {
  const seen = new Set<string>();
  return walls.filter((wall) => {
    if (!isWallValid(wall)) {
      return false;
    }
    const key = wallKey(wall);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const wallExists = (walls: InteriorWall[], candidate: InteriorWall) => {
  const key = wallKey(candidate);
  return walls.some((wall) => wallKey(wall) === key);
};

const distancePointToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= WALL_EPSILON * WALL_EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;
  const clamped = Math.max(0, Math.min(1, t));
  const projX = start.x + clamped * dx;
  const projY = start.y + clamped * dy;
  return Math.hypot(point.x - projX, point.y - projY);
};

const InteriorBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [cells, setCells] = useState<string[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [walls, setWalls] = useState<InteriorWall[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('area');
  const [status, setStatus] = useState<string>('Escolha uma ferramenta na hotbar para começar.');
  const [view, setView] = useState<ViewTransform>({ scale: 0.85, x: 0, y: 0 });
  const [draftRect, setDraftRect] = useState<{ start: Point; current: Point } | null>(null);
  const [wallDraft, setWallDraft] = useState<{ start: Point; current: Point } | null>(null);
  const [doorDraft, setDoorDraft] = useState<{ start: Point; current: Point } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [paletteTab, setPaletteTab] = useState<PaletteTab>('ambience');
  const [activeAmbienceId, setActiveAmbienceId] = useState<string>(defaultAmbienceTileId || 'stone-corner');
  const [selection, setSelection] = useState<SelectionState>({ kind: 'none' });
  const [clipboard, setClipboard] = useState<SelectionClipboard | null>(null);
  const [hoverCell, setHoverCell] = useState<Point | null>(null);
  const [cellTextures, setCellTextures] = useState<Record<string, string>>({});
  const [cellUnit, setCellUnit] = useState<number>(1);
  const [snapDenominator, setSnapDenominator] = useState<number>(1);
  const [projectName, setProjectName] = useState('Map');
  const [projectAuthor, setProjectAuthor] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const snapStep = useMemo(() => (snapDenominator === 0 ? 0 : 1 / snapDenominator), [snapDenominator]);
  const subgridPatternId = useMemo(() => (snapDenominator > 1 ? `subgrid-${snapDenominator}` : null), [snapDenominator]);
  const subgridStep = useMemo(() => (snapDenominator > 1 ? GRID_SIZE / snapDenominator : null), [snapDenominator]);
  const hoverUnit = useMemo(() => {
    if (snapStep > 0) {
      return snapStep;
    }
    return cellUnit;
  }, [snapStep, cellUnit]);

  const alignToCellUnit = useCallback((value: number) => {
    if (cellUnit <= OFFSET_EPSILON) {
      return value;
    }
    return normalizeCoord(Math.round(value / cellUnit) * cellUnit);
  }, [cellUnit]);

  const snapValue = useCallback((value: number) => {
    if (snapStep === 0) {
      return alignToCellUnit(value);
    }
    return Math.round(value / snapStep) * snapStep;
  }, [snapStep, alignToCellUnit]);

  const snapValueDown = useCallback((value: number) => {
    const step = snapStep > 0 ? snapStep : cellUnit > 0 ? cellUnit : 1;
    const scaled = (value + OFFSET_EPSILON) / step;
    const snapped = Math.floor(scaled) * step;
    return normalizeCoord(snapped);
  }, [snapStep, cellUnit]);

  const snapPointDown = useCallback((point: Point): Point => {
    return {
      x: snapValueDown(point.x),
      y: snapValueDown(point.y),
    };
  }, [snapValueDown]);

  const snapPoint = useCallback((point: Point): Point => {
    return {
      x: snapValue(point.x),
      y: snapValue(point.y),
    };
  }, [snapValue]);

  const snapLabel = useMemo(() => (snapDenominator === 0 ? 'Livre' : `1/${snapDenominator}`), [snapDenominator]);

  const snapStepText = useMemo(() => {
    if (snapStep === 0) {
      return 'livre';
    }
    const formatted = snapStep.toFixed(3);
    return formatted.replace(/\.0+$/, '').replace(/\.([1-9])0$/, '.$1');
  }, [snapStep]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pointerModeRef = useRef<'none' | 'pan' | 'draw-rect' | 'draw-wall' | 'draw-door' | 'move-selection' | 'free-select'>('none');
  const pointerIdRef = useRef<number | null>(null);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const selectionDragRef = useRef<{ startWorld: Point; initialOffset: Point } | null>(null);
  const freeSelectionDraftRef = useRef<Set<string> | null>(null);
  const drawingToolRef = useRef<Tool | null>(null);
  const historyRef = useRef<HistoryEntry[]>([{
    cellUnit,
    snapDenominator,
    cells: [],
    cellTextures: {},
    doors: [],
    walls: [],
  }]);
  const historyIndexRef = useRef(0);
  const cellUnitRef = useRef(cellUnit);
  const textureInputRef = useRef<HTMLInputElement | null>(null);
  const textureInputId = useId();
  const handlePaletteTile = useCallback((tile: PaletteTile) => {
    if (tile.tab !== 'ambience' || !tile.canvasTheme) {
      return;
    }
    if (tile.id === activeAmbienceId) {
      setStatus(`Ambiente "${tile.label}" já está ativo.`);
      return;
    }
    setActiveAmbienceId(tile.id);
    setStatus(`Ambiente "${tile.label}" aplicado.`);
  }, [activeAmbienceId, setStatus]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    setView((prev) => ({
      ...prev,
      x: wrapper.clientWidth / 2,
      y: wrapper.clientHeight / 2,
    }));
  }, []);

  useEffect(() => {
    cellUnitRef.current = cellUnit;
  }, [cellUnit]);

  const activeCanvasTheme = useMemo(() => {
    const tile = paletteTiles.find((item) => item.id === activeAmbienceId && item.canvasTheme);
    return tile?.canvasTheme ?? defaultCanvasTheme;
  }, [activeAmbienceId]);

  const canvasSurfaceStyle = useMemo<CSSProperties>(() => ({
    background: activeCanvasTheme.surfaceBackground,
  }), [activeCanvasTheme]);


  const cellSet = useMemo(() => new Set(cells), [cells]);
  const outlineSegments = useMemo(() => computeOutlineSegments(cellSet, cellUnit), [cellSet, cellUnit]);
  const selectedToolMeta = toolOptions.find((item) => item.id === activeTool) ?? toolOptions[0];
  const selectionCellSet = useMemo(() => (
    selection.kind === 'area' || selection.kind === 'free' ? new Set(selection.cells) : null
  ), [selection]);
  const selectionAllowsTexture = selection.kind === 'area' || selection.kind === 'free';
  const selectionLabel = useMemo(() => {
    if (selection.kind === 'none') {
      return 'Nenhuma';
    }
    if (selection.kind === 'area') {
      return 'Área';
    }
    if (selection.kind === 'free') {
      return 'Seleção livre';
    }
    if (selection.kind === 'wall') {
      return 'Parede';
    }
    if (selection.kind === 'door') {
      return 'Porta';
    }
    return 'Desconhecida';
  }, [selection]);
  const selectionTexturePreview = useMemo(() => {
    if (!selectionAllowsTexture) {
      return null;
    }
    for (const key of selection.cells) {
      const texture = cellTextures[key];
      if (texture) {
        return texture;
      }
    }
    return null;
  }, [selectionAllowsTexture, selection, cellTextures]);
  const hasClipboard = clipboard !== null;
  const canCopy = selection.kind === 'area';
  const canDelete = selection.kind !== 'none';
  const canPaste = hasClipboard;
  const cellRenderRects = useMemo(
    () => aggregateCellsForDisplay(cellSet, cellUnit, cellTextures, selectionCellSet),
    [cellSet, cellUnit, cellTextures, selectionCellSet],
  );
  const selectedWall = useMemo(() => (selection.kind === 'wall' ? walls.find((wall) => wall.id === selection.wallId) ?? null : null), [selection, walls]);
  const selectedDoor = useMemo(() => (selection.kind === 'door' ? doors.find((door) => door.id === selection.doorId) ?? null : null), [selection, doors]);
  const selectedWallIds = useMemo(() => {
    if (selection.kind === 'area') {
      return new Set(selection.walls.map((wall) => wall.id));
    }
    if (selection.kind === 'wall') {
      return new Set([selection.wallId]);
    }
    return null;
  }, [selection]);
  const selectedDoorIds = useMemo(() => {
    if (selection.kind === 'area') {
      return new Set(selection.doors.map((door) => door.id));
    }
    if (selection.kind === 'door') {
      return new Set([selection.doorId]);
    }
    return null;
  }, [selection]);

  const buildAreaSelection = useCallback((startKey: string) => {
    return buildAreaSelectionFromSources(startKey, cellSet, doors, walls, cellUnit);
  }, [cellSet, doors, walls, cellUnit]);

  const findCellKeyAtPoint = useCallback((point: Point): string | null => {
    const unit = cellUnitRef.current;
    for (let index = cells.length - 1; index >= 0; index -= 1) {
      const key = cells[index];
      const { x, y } = fromCellKey(key);
      if (
        point.x >= x - OFFSET_EPSILON &&
        point.x < x + unit + OFFSET_EPSILON &&
        point.y >= y - OFFSET_EPSILON &&
        point.y < y + unit + OFFSET_EPSILON
      ) {
        return key;
      }
    }
    return null;
  }, [cells]);

  const addCellToFreeSelectionDraft = useCallback((cellKey: string | null) => {
    if (!cellKey) {
      return;
    }
    if (!cellSet.has(cellKey)) {
      return;
    }
    let draft = freeSelectionDraftRef.current;
    if (!draft) {
      draft = new Set<string>();
      freeSelectionDraftRef.current = draft;
    }
    if (draft.has(cellKey)) {
      return;
    }
    draft.add(cellKey);
    const nextSelection = createFreeSelectionFromSet(draft, cellUnitRef.current);
    if (nextSelection) {
      setSelection(nextSelection);
      setStatus(`Seleção livre: ${draft.size} bloco${draft.size === 1 ? '' : 's'}.`);
    }
  }, [cellSet, setSelection, setStatus]);

  const updateHoverCell = useCallback((point: Point | null) => {
    if (!point) {
      setHoverCell(null);
      return;
    }
    const unit = hoverUnit;
    if (unit <= OFFSET_EPSILON) {
      setHoverCell(null);
      return;
    }
    const baseX = Math.floor(point.x);
    const baseY = Math.floor(point.y);
    const localX = point.x - baseX;
    const localY = point.y - baseY;
    const segmentIndexX = Math.max(0, Math.min(Math.floor(localX / unit), Math.floor((1 - OFFSET_EPSILON) / unit)));
    const segmentIndexY = Math.max(0, Math.min(Math.floor(localY / unit), Math.floor((1 - OFFSET_EPSILON) / unit)));
    const nextX = normalizeCoord(baseX + segmentIndexX * unit);
    const nextY = normalizeCoord(baseY + segmentIndexY * unit);
    setHoverCell((prev) => {
      if (prev && Math.abs(prev.x - nextX) <= OFFSET_EPSILON && Math.abs(prev.y - nextY) <= OFFSET_EPSILON) {
        return prev;
      }
      return { x: nextX, y: nextY };
    });
  }, [hoverUnit]);

  const clearSelection = useCallback((message?: string) => {
    setSelection({ kind: 'none' });
    if (message) {
      setStatus(message);
    }
  }, []);

  const refineCellResolution = useCallback((targetUnit: number) => {
    const currentUnit = cellUnitRef.current;
    if (targetUnit >= currentUnit - OFFSET_EPSILON) {
      return;
    }

    const expanded = expandCellsToUnit(cells, cellTextures, currentUnit, targetUnit);
    setCells(expanded.cells);
    setCellTextures(expanded.textures);

    historyRef.current = historyRef.current.map((entry) => {
      if (entry.cellUnit <= targetUnit + OFFSET_EPSILON) {
        return entry;
      }
      const upgraded = expandCellsToUnit(entry.cells, entry.cellTextures, entry.cellUnit, targetUnit);
      return {
        ...entry,
        cellUnit: targetUnit,
        cells: upgraded.cells,
        cellTextures: upgraded.textures,
      };
    });
    historyIndexRef.current = Math.min(historyIndexRef.current, historyRef.current.length - 1);

    setCellUnit(targetUnit);
    cellUnitRef.current = targetUnit;
    setSelection({ kind: 'none' });
    setClipboard(null);
    setStatus(`Grade refinada para blocos de ${formatUnitLabel(targetUnit)}.`);
  }, [cells, cellTextures, setClipboard, setStatus]);

  useEffect(() => {
    if (snapDenominator > 1) {
      const targetUnit = 1 / snapDenominator;
      refineCellResolution(targetUnit);
    }
  }, [snapDenominator, refineCellResolution]);

  const pointInsideSelection = useCallback((point: Point) => {
    if (selection.kind !== 'area' && selection.kind !== 'free') {
      return false;
    }
    const minX = selection.bounds.minX + selection.offset.x;
    const maxX = minX + selection.bounds.width;
    const minY = selection.bounds.minY + selection.offset.y;
    const maxY = minY + selection.bounds.height;
    return (
      point.x >= minX - OFFSET_EPSILON &&
      point.x < maxX + OFFSET_EPSILON &&
      point.y >= minY - OFFSET_EPSILON &&
      point.y < maxY + OFFSET_EPSILON
    );
  }, [selection]);

  const findDoorAtPoint = useCallback((point: Point): Door | null => {
    const tolerance = 0.35;
    let closest: { door: Door; distance: number } | null = null;
    for (const door of doors) {
      const distance = distancePointToSegment(point, door.start, door.end);
      if (distance <= tolerance && (!closest || distance < closest.distance)) {
        closest = { door, distance };
      }
    }
    return closest ? closest.door : null;
  }, [doors]);

  const findWallAtPoint = useCallback((point: Point): InteriorWall | null => {
    const tolerance = 0.35;
    let closest: { wall: InteriorWall; distance: number } | null = null;
    for (const wall of walls) {
      const distance = distancePointToSegment(point, wall.start, wall.end);
      if (distance <= tolerance && (!closest || distance < closest.distance)) {
        closest = { wall, distance };
      }
    }
    if (!closest) {
      return null;
    }
    return closest.wall;
  }, [walls]);

  const commitState = useCallback((
    nextCellsSet: Set<string>,
    nextDoors: Door[],
    nextWalls: InteriorWall[],
    message?: string,
    textureMoves?: Array<[string, string]>,
  ): { cellsSet: Set<string>; cellUnit: number } => {
    const workingTextures: Record<string, string> = { ...cellTextures };

    if (textureMoves && textureMoves.length > 0) {
      textureMoves.forEach(([fromKey, toKey]) => {
        if (fromKey === toKey) {
          return;
        }
        const texture = workingTextures[fromKey];
        if (texture !== undefined) {
          workingTextures[toKey] = texture;
        }
        delete workingTextures[fromKey];
      });
    }

    Object.keys(workingTextures).forEach((key) => {
      if (!nextCellsSet.has(key)) {
        delete workingTextures[key];
      }
    });

    const optimization = optimizeCellGrid(nextCellsSet, workingTextures, cellUnitRef.current, nextWalls, nextDoors);

    const optimizedCellsSet = new Set(optimization.cells);
    const doorsSnapshot = cloneDoors(nextDoors);
    const wallsSnapshot = cloneWalls(nextWalls);

    cellUnitRef.current = optimization.unit;
    setCellUnit(optimization.unit);

    const targetSnapDenominator = optimization.unit > 0 ? Math.round(1 / optimization.unit) : 1;
    const nextSnapDenominator = snapDenominator === 0 ? 0 : targetSnapDenominator;
    if (snapDenominator !== nextSnapDenominator) {
      setSnapDenominator(nextSnapDenominator);
    }

    setCellTextures(optimization.textures);
    setCells(optimization.cells);
    setDoors(doorsSnapshot);
    setWalls(wallsSnapshot);

    const trimmedHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmedHistory.push({
      cellUnit: optimization.unit,
      snapDenominator: nextSnapDenominator,
      cells: [...optimization.cells],
      cellTextures: { ...optimization.textures },
      doors: cloneDoors(doorsSnapshot),
      walls: cloneWalls(wallsSnapshot),
    });
    historyRef.current = trimmedHistory;
    historyIndexRef.current = trimmedHistory.length - 1;

    if (message || optimization.unitChanged) {
      let finalMessage = message ?? '';
      if (optimization.unitChanged) {
        const unitLabel = formatUnitLabel(optimization.unit);
        finalMessage = finalMessage
          ? `${finalMessage} Grade ajustada para blocos de ${unitLabel}.`
          : `Grade ajustada para blocos de ${unitLabel}.`;
      }
      if (finalMessage) {
        setStatus(finalMessage);
      }
    }

    return { cellsSet: optimizedCellsSet, cellUnit: optimization.unit };
  }, [cellTextures, snapDenominator, setCellTextures, setCells, setDoors, setWalls, setCellUnit, setSnapDenominator, setStatus]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) {
      setStatus('Nada para desfazer.');
      return;
    }
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    pointerModeRef.current = 'none';
    pointerIdRef.current = null;
    panRef.current = null;
    setIsPanning(false);
    setDraftRect(null);
    setWallDraft(null);
    cellUnitRef.current = snapshot.cellUnit;
    setCellUnit(snapshot.cellUnit);
    if (snapDenominator !== snapshot.snapDenominator) {
      setSnapDenominator(snapshot.snapDenominator);
    }
    setCells([...snapshot.cells]);
    setCellTextures({ ...snapshot.cellTextures });
    setDoors(cloneDoors(snapshot.doors));
    setWalls(cloneWalls(snapshot.walls));
    setStatus('Ação desfeita.');
  }, [snapDenominator, setSnapDenominator]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      setStatus('Nada para refazer.');
      return;
    }
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    pointerModeRef.current = 'none';
    pointerIdRef.current = null;
    panRef.current = null;
    setIsPanning(false);
    setDraftRect(null);
    setWallDraft(null);
    cellUnitRef.current = snapshot.cellUnit;
    setCellUnit(snapshot.cellUnit);
    if (snapDenominator !== snapshot.snapDenominator) {
      setSnapDenominator(snapshot.snapDenominator);
    }
    setCells([...snapshot.cells]);
    setCellTextures({ ...snapshot.cellTextures });
    setDoors(cloneDoors(snapshot.doors));
    setWalls(cloneWalls(snapshot.walls));
    setStatus('Ação refeita.');
  }, [snapDenominator, setSnapDenominator]);

  const screenToWorld = useCallback((clientX: number, clientY: number): Point => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return { x: 0, y: 0 };
    }
    const rect = wrapper.getBoundingClientRect();
    const x = (clientX - rect.left - view.x) / (view.scale * GRID_SIZE);
    const y = (clientY - rect.top - view.y) / (view.scale * GRID_SIZE);
    return { x, y };
  }, [view]);

  const finalizeSelectionMove = useCallback(() => {
    if (selection.kind !== 'area') {
      return;
    }

    const { offset } = selection;
    if (offset.x === 0 && offset.y === 0) {
      setSelection((prev) => (prev.kind === 'area' ? { ...prev, offset: { x: 0, y: 0 } } : prev));
      selectionDragRef.current = null;
      return;
    }

    const dx = offset.x;
    const dy = offset.y;

    const nextCellsSet = new Set(cellSet);
    selection.cells.forEach((key) => {
      nextCellsSet.delete(key);
    });

    const movedCellKeys: string[] = [];
    const textureMoves: Array<[string, string]> = [];
    selection.cells.forEach((key) => {
      const { x, y } = fromCellKey(key);
      const movedKey = toCellKey(x + dx, y + dy);
      nextCellsSet.add(movedKey);
      movedCellKeys.push(movedKey);
      const texture = cellTextures[key];
      if (texture) {
        textureMoves.push([key, movedKey]);
      }
    });

    const selectionWallIds = new Set(selection.walls.map((wall) => wall.id));
    const selectionDoorIds = new Set(selection.doors.map((door) => door.id));

    const remainingWalls = walls.filter((wall) => !selectionWallIds.has(wall.id));
    const movedWallsRaw = selection.walls.map((wall) => ({
      id: wall.id,
      start: { x: wall.start.x + dx, y: wall.start.y + dy },
      end: { x: wall.end.x + dx, y: wall.end.y + dy },
    }));
  const combinedWalls = sanitizeWalls([...remainingWalls, ...movedWallsRaw]);

    const remainingDoors = doors.filter((door) => !selectionDoorIds.has(door.id));
    const movedDoorsRaw = selection.doors.map((door) => ({
      id: door.id,
      start: { x: door.start.x + dx, y: door.start.y + dy },
      end: { x: door.end.x + dx, y: door.end.y + dy },
    }));
    const combinedDoorsPre = [...remainingDoors, ...movedDoorsRaw];
    const combinedDoors = combinedDoorsPre.filter(isDoorPlacementValid);

    const commitResult = commitState(nextCellsSet, combinedDoors, combinedWalls, 'Área movida.', textureMoves);

    let seedKey: string | null = null;
    if (movedCellKeys.length > 0) {
      const { x, y } = fromCellKey(movedCellKeys[0]);
      const coarseX = normalizeCoord(Math.floor((x + OFFSET_EPSILON) / commitResult.cellUnit) * commitResult.cellUnit);
      const coarseY = normalizeCoord(Math.floor((y + OFFSET_EPSILON) / commitResult.cellUnit) * commitResult.cellUnit);
      const coarseKey = toCellKey(coarseX, coarseY);
      if (commitResult.cellsSet.has(coarseKey)) {
        seedKey = coarseKey;
      }
    }

    if (!seedKey && commitResult.cellsSet.size > 0) {
      seedKey = commitResult.cellsSet.values().next().value ?? null;
    }

    if (seedKey) {
      const nextSelection = buildAreaSelectionFromSources(
        seedKey,
        commitResult.cellsSet,
        combinedDoors,
        combinedWalls,
        commitResult.cellUnit,
      );
      if (nextSelection) {
        setSelection(nextSelection);
      } else {
        clearSelection();
      }
    } else {
      clearSelection();
    }

    selectionDragRef.current = null;
  }, [selection, cellSet, walls, doors, commitState, clearSelection, cellTextures]);

  const handleDeleteSelection = useCallback(() => {
    if (selection.kind === 'none') {
      setStatus('Nada selecionado para deletar.');
      return;
    }

    if (selection.kind === 'area') {
      const nextCellsSet = new Set(cellSet);
      selection.cells.forEach((key) => nextCellsSet.delete(key));

      const selectionWallIds = new Set(selection.walls.map((wall) => wall.id));
      const selectionDoorIds = new Set(selection.doors.map((door) => door.id));

      const remainingWalls = walls.filter((wall) => !selectionWallIds.has(wall.id));
  const sanitizedWalls = sanitizeWalls(remainingWalls);
      const filteredDoors = doors
        .filter((door) => !selectionDoorIds.has(door.id))
        .filter(isDoorPlacementValid);

      commitState(nextCellsSet, filteredDoors, sanitizedWalls, 'Seleção removida.');
      clearSelection();
      return;
    }

    if (selection.kind === 'free') {
      const nextCellsSet = new Set(cellSet);
      selection.cells.forEach((key) => nextCellsSet.delete(key));
      const nextWalls = sanitizeWalls(walls);
      const nextDoors = doors.filter(isDoorPlacementValid);
      commitState(nextCellsSet, nextDoors, nextWalls, 'Seleção removida.');
      clearSelection();
      return;
    }

    if (selection.kind === 'door') {
      if (!doors.some((door) => door.id === selection.doorId)) {
        clearSelection('Esta porta já foi removida.');
        return;
      }
      const nextDoors = doors.filter((door) => door.id !== selection.doorId);
      commitState(new Set(cellSet), nextDoors, [...walls], 'Porta removida.');
      clearSelection();
      return;
    }

    if (selection.kind === 'wall') {
      if (!walls.some((wall) => wall.id === selection.wallId)) {
        clearSelection('Esta parede já foi removida.');
        return;
      }
      const nextWalls = walls.filter((wall) => wall.id !== selection.wallId);
  const sanitizedWalls = sanitizeWalls(nextWalls);
  const filteredDoors = doors.filter(isDoorPlacementValid);
      commitState(new Set(cellSet), filteredDoors, sanitizedWalls, 'Parede removida.');
      clearSelection();
    }
  }, [selection, cellSet, doors, walls, commitState, clearSelection]);

  const handleCopySelection = useCallback(() => {
    if (selection.kind !== 'area') {
      setStatus('Selecione uma área para copiar.');
      return;
    }

    const { bounds } = selection;
    const payload: SelectionClipboard = {
      width: bounds.width,
      height: bounds.height,
      cells: selection.cells.map((key) => {
        const { x, y } = fromCellKey(key);
        return { x: normalizeCoord(x - bounds.minX), y: normalizeCoord(y - bounds.minY) };
      }),
      walls: selection.walls.map((wall) => ({
        start: {
          x: normalizeCoord(wall.start.x - bounds.minX),
          y: normalizeCoord(wall.start.y - bounds.minY),
        },
        end: {
          x: normalizeCoord(wall.end.x - bounds.minX),
          y: normalizeCoord(wall.end.y - bounds.minY),
        },
      })),
      doors: selection.doors.map((door) => ({
        start: {
          x: normalizeCoord(door.start.x - bounds.minX),
          y: normalizeCoord(door.start.y - bounds.minY),
        },
        end: {
          x: normalizeCoord(door.end.x - bounds.minX),
          y: normalizeCoord(door.end.y - bounds.minY),
        },
      })),
    };

    setClipboard(payload);
    setStatus('Área copiada. Use Colar ou Ctrl+V para duplicar.');
  }, [selection]);

  const handlePasteSelection = useCallback(() => {
    if (!clipboard) {
      setStatus('Copie uma área antes de colar.');
      return;
    }

    const wrapper = wrapperRef.current;
    let targetMinX = 0;
    let targetMinY = 0;

    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const centerWorld = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
      targetMinX = snapValue(centerWorld.x - clipboard.width / 2);
      targetMinY = snapValue(centerWorld.y - clipboard.height / 2);
    }

    targetMinX = alignToCellUnit(targetMinX);
    targetMinY = alignToCellUnit(targetMinY);

    const nextCellsSet = new Set(cellSet);
    const newCellKeys: string[] = [];
    clipboard.cells.forEach(({ x, y }) => {
      const cellX = alignToCellUnit(x + targetMinX);
      const cellY = alignToCellUnit(y + targetMinY);
      const key = toCellKey(cellX, cellY);
      nextCellsSet.add(key);
      newCellKeys.push(key);
    });

    const newWalls: InteriorWall[] = clipboard.walls.map((wall) => ({
      id: idFactory('wall'),
      start: { x: alignToCellUnit(wall.start.x + targetMinX), y: alignToCellUnit(wall.start.y + targetMinY) },
      end: { x: alignToCellUnit(wall.end.x + targetMinX), y: alignToCellUnit(wall.end.y + targetMinY) },
    }));
  const combinedWalls = sanitizeWalls([...walls, ...newWalls]);

    const newDoors: Door[] = clipboard.doors.map((door) => ({
      id: idFactory('door'),
      start: { x: alignToCellUnit(door.start.x + targetMinX), y: alignToCellUnit(door.start.y + targetMinY) },
      end: { x: alignToCellUnit(door.end.x + targetMinX), y: alignToCellUnit(door.end.y + targetMinY) },
    }));
    const combinedDoorsPre = [...doors, ...newDoors];
    const combinedDoors = combinedDoorsPre.filter(isDoorPlacementValid);

    const commitResult = commitState(nextCellsSet, combinedDoors, combinedWalls, `Área colada (${clipboard.cells.length} blocos).`);

    let seedKey: string | null = null;
    if (newCellKeys.length > 0) {
      const { x, y } = fromCellKey(newCellKeys[0]);
      const coarseX = normalizeCoord(Math.floor((x + OFFSET_EPSILON) / commitResult.cellUnit) * commitResult.cellUnit);
      const coarseY = normalizeCoord(Math.floor((y + OFFSET_EPSILON) / commitResult.cellUnit) * commitResult.cellUnit);
      const coarseKey = toCellKey(coarseX, coarseY);
      if (commitResult.cellsSet.has(coarseKey)) {
        seedKey = coarseKey;
      }
    }

    if (!seedKey && commitResult.cellsSet.size > 0) {
      seedKey = commitResult.cellsSet.values().next().value ?? null;
    }

    if (seedKey) {
      const nextSelection = buildAreaSelectionFromSources(
        seedKey,
        commitResult.cellsSet,
        combinedDoors,
        combinedWalls,
        commitResult.cellUnit,
      );
      if (nextSelection) {
        setSelection(nextSelection);
      } else {
        clearSelection();
      }
    } else {
      clearSelection();
    }
  }, [clipboard, cellSet, doors, walls, commitState, clearSelection, screenToWorld, snapValue, alignToCellUnit]);

  const handleTextureUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!(selection.kind === 'area' || selection.kind === 'free')) {
      if (textureInputRef.current) {
        textureInputRef.current.value = '';
      }
      setStatus('Selecione blocos com uma área ou seleção livre para aplicar textura.');
      return;
    }

    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      if (textureInputRef.current) {
        textureInputRef.current.value = '';
      }
      setStatus('Escolha um arquivo de imagem para usar como textura.');
      return;
    }

    const targetKeys = [...selection.cells];
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (textureInputRef.current) {
        textureInputRef.current.value = '';
      }
      if (!result) {
        setStatus('Não foi possível ler a imagem selecionada.');
        return;
      }
      setCellTextures((prev) => {
        const next = { ...prev };
        targetKeys.forEach((key) => {
          next[key] = result;
        });
        return next;
      });
      setStatus(`Textura aplicada em ${targetKeys.length} bloco${targetKeys.length === 1 ? '' : 's'}.`);
    };

    reader.onerror = () => {
      if (textureInputRef.current) {
        textureInputRef.current.value = '';
      }
      setStatus('Falha ao carregar a imagem. Tente novamente.');
    };

    reader.readAsDataURL(file);
  }, [selection, setCellTextures, setStatus]);

  const handleTextureClear = useCallback(() => {
    if (!(selection.kind === 'area' || selection.kind === 'free')) {
      setStatus('Selecione blocos com textura para remover.');
      return;
    }
    if (textureInputRef.current) {
      textureInputRef.current.value = '';
    }
    let removedCount = 0;
    setCellTextures((prev) => {
      const next = { ...prev };
      selection.cells.forEach((key) => {
        if (next[key]) {
          delete next[key];
          removedCount += 1;
        }
      });
      return next;
    });
    if (removedCount > 0) {
      setStatus(`Texturas removidas de ${removedCount} bloco${removedCount === 1 ? '' : 's'}.`);
    } else {
      setStatus('Nenhuma textura para remover na seleção.');
    }
  }, [selection, setCellTextures, setStatus]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        const isEditableField = tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable;
        if (isEditableField && event.key !== 'Escape') {
          return;
        }
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        handleDeleteSelection();
        return;
      }

      if (event.key === 'Escape') {
        clearSelection('Seleção cancelada.');
        return;
      }

      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        redo();
        return;
      }

      if (key === 'c') {
        event.preventDefault();
        handleCopySelection();
        return;
      }

      if (key === 'v') {
        event.preventDefault();
        handlePasteSelection();
        return;
      }

      if (key === 'x') {
        event.preventDefault();
        if (selection.kind === 'area') {
          handleCopySelection();
          handleDeleteSelection();
        } else {
          setStatus('Somente áreas podem ser recortadas.');
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [clearSelection, handleCopySelection, handleDeleteSelection, handlePasteSelection, redo, selection, setStatus, undo]);

  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool);
    const meta = toolOptions.find((item) => item.id === tool);
    if (meta) {
      setStatus(meta.hint);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) {
      return;
    }

    const beginPan = () => {
      event.preventDefault();
      pointerModeRef.current = 'pan';
      pointerIdRef.current = event.pointerId;
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: view.x,
        originY: view.y,
      };
      drawingToolRef.current = 'pan';
      setIsPanning(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    };

    const isSecondary = event.button === 2 || event.button === 1 || event.shiftKey;

    if (isSecondary) {
      beginPan();
      return;
    }

    if (event.button !== 0) {
      return;
    }

  const worldPoint = screenToWorld(event.clientX, event.clientY);
  updateHoverCell(worldPoint);
  const snappedPoint = snapPoint(worldPoint);
  const snappedCellPoint = snapPointDown(worldPoint);

    if (activeTool === 'pan') {
      beginPan();
      return;
    }

    if (activeTool === 'free-select') {
      event.preventDefault();
      pointerModeRef.current = 'free-select';
      pointerIdRef.current = event.pointerId;
      drawingToolRef.current = activeTool;
      freeSelectionDraftRef.current = new Set<string>();
      setSelection({ kind: 'none' });
      addCellToFreeSelectionDraft(findCellKeyAtPoint(worldPoint));
      event.currentTarget.setPointerCapture(event.pointerId);
      if (!freeSelectionDraftRef.current || freeSelectionDraftRef.current.size === 0) {
        setStatus('Pinte sobre blocos preenchidos para adicioná-los à seleção.');
      }
      return;
    }

    if (activeTool === 'area' || activeTool === 'erase') {
      event.preventDefault();
      pointerModeRef.current = 'draw-rect';
      pointerIdRef.current = event.pointerId;
      drawingToolRef.current = activeTool;
      setDraftRect({ start: snappedCellPoint, current: snappedCellPoint });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === 'door') {
      event.preventDefault();
      pointerModeRef.current = 'draw-door';
      pointerIdRef.current = event.pointerId;
      drawingToolRef.current = activeTool;
      setDoorDraft({ start: { ...snappedPoint }, current: { ...snappedPoint } });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === 'wall') {
      event.preventDefault();
      pointerModeRef.current = 'draw-wall';
      pointerIdRef.current = event.pointerId;
      drawingToolRef.current = activeTool;
      setWallDraft({ start: { ...snappedPoint }, current: { ...snappedPoint } });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === 'select') {
      event.preventDefault();

      if (selection.kind === 'area' && pointInsideSelection(worldPoint)) {
        pointerModeRef.current = 'move-selection';
        pointerIdRef.current = event.pointerId;
        selectionDragRef.current = {
          startWorld: worldPoint,
          initialOffset: { ...selection.offset },
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setStatus('Arraste para mover a seleção.');
        return;
      }

      const doorHit = findDoorAtPoint(worldPoint);
      if (doorHit) {
        pointerModeRef.current = 'none';
        pointerIdRef.current = null;
        selectionDragRef.current = null;
        setSelection({ kind: 'door', doorId: doorHit.id });
        setStatus('Porta selecionada. Pressione Delete para remover.');
        return;
      }

      const wallHit = findWallAtPoint(worldPoint);
      if (wallHit) {
        pointerModeRef.current = 'none';
        pointerIdRef.current = null;
        selectionDragRef.current = null;
        setSelection({ kind: 'wall', wallId: wallHit.id });
        setStatus(`Parede selecionada (${segmentLength(wallHit).toFixed(2)} u). Delete para remover.`);
        return;
      }

      const cellKey = findCellKeyAtPoint(worldPoint) ?? toCellKey(Math.floor(worldPoint.x), Math.floor(worldPoint.y));
      const areaSelection = buildAreaSelection(cellKey);
      if (areaSelection) {
        pointerModeRef.current = 'move-selection';
        pointerIdRef.current = event.pointerId;
        selectionDragRef.current = {
          startWorld: worldPoint,
          initialOffset: { x: 0, y: 0 },
        };
        setSelection(areaSelection);
        event.currentTarget.setPointerCapture(event.pointerId);
        setStatus('Área selecionada. Arraste para mover ou Delete para remover.');
        return;
      }

      clearSelection('Nenhum elemento encontrado. Clique em blocos preenchidos, portas ou paredes.');
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) {
      return;
    }

    const worldPoint = screenToWorld(event.clientX, event.clientY);
    updateHoverCell(worldPoint);

    if (pointerModeRef.current === 'move-selection' && selection.kind === 'area' && selectionDragRef.current) {
      event.preventDefault();
      const dragState = selectionDragRef.current;
      const movementUnit = hoverUnit > 0 ? hoverUnit : cellUnitRef.current;
      const deltaXRaw = worldPoint.x - dragState.startWorld.x;
      const deltaYRaw = worldPoint.y - dragState.startWorld.y;
      const deltaX = movementUnit > 0 ? Math.round(deltaXRaw / movementUnit) * movementUnit : deltaXRaw;
      const deltaY = movementUnit > 0 ? Math.round(deltaYRaw / movementUnit) * movementUnit : deltaYRaw;
      const nextOffset = {
        x: alignToCellUnit(dragState.initialOffset.x + deltaX),
        y: alignToCellUnit(dragState.initialOffset.y + deltaY),
      };
      setSelection((prev) => {
        if (prev.kind !== 'area') {
          return prev;
        }
        const sameX = Math.abs(prev.offset.x - nextOffset.x) <= OFFSET_EPSILON;
        const sameY = Math.abs(prev.offset.y - nextOffset.y) <= OFFSET_EPSILON;
        if (sameX && sameY) {
          return prev;
        }
        return {
          ...prev,
          offset: nextOffset,
        };
      });
      return;
    }

    if (pointerModeRef.current === 'pan') {
      const panState = panRef.current;
      if (!panState) {
        return;
      }
      const dx = event.clientX - panState.startX;
      const dy = event.clientY - panState.startY;
      const { originX, originY } = panState;
      setView((prev) => ({
        ...prev,
        x: originX + dx,
        y: originY + dy,
      }));
      return;
    }

    if (pointerModeRef.current === 'draw-rect' && draftRect) {
      const snapped = snapPointDown(worldPoint);
      setDraftRect((prev) => (prev ? { ...prev, current: snapped } : prev));
      return;
    }

    if (pointerModeRef.current === 'draw-wall' && wallDraft) {
      const snapped = snapPoint(worldPoint);
      setWallDraft((prev) => (prev ? { ...prev, current: snapped } : prev));
      return;
    }

    if (pointerModeRef.current === 'draw-door' && doorDraft) {
      const snapped = snapPoint(worldPoint);
      setDoorDraft((prev) => (prev ? { ...prev, current: snapped } : prev));
      return;
    }

    if (pointerModeRef.current === 'free-select') {
      event.preventDefault();
      addCellToFreeSelectionDraft(findCellKeyAtPoint(worldPoint));
      return;
    }
  };

  const finalizeFreeSelection = useCallback(() => {
    const draft = freeSelectionDraftRef.current;
    freeSelectionDraftRef.current = null;
    if (!draft || draft.size === 0) {
      setSelection({ kind: 'none' });
      setStatus('Nenhum bloco selecionado.');
      return;
    }
    const result = createFreeSelectionFromSet(draft, cellUnitRef.current);
    if (result) {
      setSelection(result);
      setStatus(`Seleção livre concluída com ${draft.size} bloco${draft.size === 1 ? '' : 's'}.`);
    } else {
      setSelection({ kind: 'none' });
      setStatus('Seleção livre inválida.');
    }
  }, [setSelection, setStatus]);

  const interruptPointer = () => {
    pointerModeRef.current = 'none';
    pointerIdRef.current = null;
    panRef.current = null;
    drawingToolRef.current = null;
    setIsPanning(false);
    setWallDraft(null);
    setDoorDraft(null);
    selectionDragRef.current = null;
    freeSelectionDraftRef.current = null;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const leaveEvent = event.type === 'pointerleave' || event.type === 'pointercancel';
    const worldPoint = leaveEvent ? null : screenToWorld(event.clientX, event.clientY);
    updateHoverCell(worldPoint);

    if (pointerIdRef.current !== null && event.pointerId === pointerIdRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // captura pode não estar ativa; ignorar
      }
    }

    if (pointerModeRef.current === 'move-selection') {
      finalizeSelectionMove();
    }

    if (pointerModeRef.current === 'draw-rect' && draftRect) {
      finalizeRectangle();
    }

    if (pointerModeRef.current === 'draw-wall' && wallDraft) {
      finalizeWall();
    }

    if (pointerModeRef.current === 'draw-door' && doorDraft) {
      finalizeDoor();
    }

    if (pointerModeRef.current === 'free-select') {
      finalizeFreeSelection();
    }

    interruptPointer();

    if (leaveEvent) {
      updateHoverCell(null);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;

    setView((prev) => {
      const nextScale = clamp(prev.scale * scaleFactor, ZOOM_MIN, ZOOM_MAX);
      const worldX = (pointerX - prev.x) / prev.scale;
      const worldY = (pointerY - prev.y) / prev.scale;
      return {
        scale: nextScale,
        x: pointerX - worldX * nextScale,
        y: pointerY - worldY * nextScale,
      };
    });
  };

  const finalizeRectangle = () => {
    if (!draftRect) {
      return;
    }

    const tool = drawingToolRef.current;
    const minX = Math.min(draftRect.start.x, draftRect.current.x);
    const maxX = Math.max(draftRect.start.x, draftRect.current.x);
    const minY = Math.min(draftRect.start.y, draftRect.current.y);
    const maxY = Math.max(draftRect.start.y, draftRect.current.y);

    const step = cellUnit <= 0 ? 1 : cellUnit;
    const widthRaw = maxX - minX;
    const heightRaw = maxY - minY;
    const countX = Math.max(1, Math.ceil((widthRaw + OFFSET_EPSILON) / step));
    const countY = Math.max(1, Math.ceil((heightRaw + OFFSET_EPSILON) / step));

    setDraftRect(null);

    if (tool !== 'area' && tool !== 'erase') {
      setStatus('Ação cancelada.');
      return;
    }

    const nextCellsSet = new Set(cellSet);

    const baseIndexX = Math.floor((minX + OFFSET_EPSILON) / step);
    const baseIndexY = Math.floor((minY + OFFSET_EPSILON) / step);
    const baseX = normalizeCoord(baseIndexX * step);
    const baseY = normalizeCoord(baseIndexY * step);

    if (tool === 'area') {
      let additions = 0;
      for (let ix = 0; ix < countX; ix += 1) {
        const cellX = normalizeCoord(baseX + ix * step);
        for (let iy = 0; iy < countY; iy += 1) {
          const cellY = normalizeCoord(baseY + iy * step);
          const key = toCellKey(cellX, cellY);
          if (!nextCellsSet.has(key)) {
            nextCellsSet.add(key);
            additions += 1;
          }
        }
      }

      if (additions === 0) {
        setStatus('Todos os blocos dessa área já estão preenchidos.');
        return;
      }

    const nextWalls = sanitizeWalls(walls);
    const nextDoors = doors.filter(isDoorPlacementValid);
    commitState(nextCellsSet, nextDoors, nextWalls, `Área expandida com ${additions} blocos.`);
      return;
    }

    let removals = 0;
    for (let ix = 0; ix < countX; ix += 1) {
      const cellX = normalizeCoord(baseX + ix * step);
      for (let iy = 0; iy < countY; iy += 1) {
        const cellY = normalizeCoord(baseY + iy * step);
        const key = toCellKey(cellX, cellY);
        if (nextCellsSet.delete(key)) {
          removals += 1;
        }
      }
    }

    if (removals === 0) {
      setStatus('Nenhum bloco para remover nessa área.');
      return;
    }

    const nextWalls = sanitizeWalls(walls);
    const nextDoors = doors.filter(isDoorPlacementValid);
    commitState(nextCellsSet, nextDoors, nextWalls, `Removidos ${removals} blocos.`);
  };

  const finalizeWall = () => {
    if (!wallDraft) {
      return;
    }

    const start = wallDraft.start;
    const end = wallDraft.current;

    setWallDraft(null);

    if (drawingToolRef.current !== 'wall') {
      setStatus('Ação cancelada.');
      return;
    }

    const candidate: InteriorWall = {
      id: idFactory('wall'),
      start: { ...start },
      end: { ...end },
    };

    if (!isWallValid(candidate)) {
      setStatus('Paredes precisam ter comprimento positivo.');
      return;
    }

    if (wallExists(walls, candidate)) {
      setStatus('Já existe uma parede nesse trecho.');
      return;
    }

    const nextWalls = sanitizeWalls([...walls, candidate]);
    commitState(new Set(cellSet), [...doors], nextWalls, `Parede adicionada (${segmentLength(candidate).toFixed(2)} u).`);
  };

  const finalizeDoor = () => {
    if (!doorDraft) {
      return;
    }

    const start = doorDraft.start;
    const end = doorDraft.current;

    setDoorDraft(null);

    if (drawingToolRef.current !== 'door') {
      setStatus('Ação cancelada.');
      return;
    }

    const candidate: Door = {
      id: idFactory('door'),
      start: { ...start },
      end: { ...end },
    };

    if (!isDoorPlacementValid(candidate)) {
      setStatus('Portas precisam ter comprimento positivo. Arraste para definir o comprimento.');
      return;
    }

    if (doorExists(doors, candidate)) {
      setStatus('Já existe uma porta nesse trecho.');
      return;
    }

    const nextDoors = [...doors, candidate];
    commitState(new Set(cellSet), nextDoors, [...walls], `Porta adicionada (${doorLength(candidate).toFixed(2)} u).`);
  };


  const handleClear = () => {
    pointerModeRef.current = 'none';
    pointerIdRef.current = null;
    panRef.current = null;
    setIsPanning(false);
    setDraftRect(null);
    setWallDraft(null);
    setDoorDraft(null);
    commitState(new Set(), [], [], 'Projeto limpo. Desenhe uma nova área para recomeçar.');
    clearSelection();
  };

  const draftPreview: Rect | null = useMemo(() => {
    if (!draftRect) {
      return null;
    }
    const step = cellUnit <= 0 ? 1 : cellUnit;
    const startX = alignToCellUnit(Math.min(draftRect.start.x, draftRect.current.x));
    const startY = alignToCellUnit(Math.min(draftRect.start.y, draftRect.current.y));
    const rawWidth = Math.abs(draftRect.current.x - draftRect.start.x);
    const rawHeight = Math.abs(draftRect.current.y - draftRect.start.y);
    const widthSteps = Math.max(1, Math.ceil((rawWidth + OFFSET_EPSILON) / step));
    const heightSteps = Math.max(1, Math.ceil((rawHeight + OFFSET_EPSILON) / step));
    const width = widthSteps * step;
    const height = heightSteps * step;
    return {
      x: startX,
      y: startY,
      width,
      height,
    };
  }, [draftRect, alignToCellUnit, cellUnit]);

  const wallPreview = useMemo(() => {
    if (!wallDraft) {
      return null;
    }
    const length = Math.hypot(wallDraft.current.x - wallDraft.start.x, wallDraft.current.y - wallDraft.start.y);
    if (length <= WALL_EPSILON) {
      return null;
    }
    return {
      start: wallDraft.start,
      end: wallDraft.current,
    };
  }, [wallDraft]);

  const doorPreview = useMemo(() => {
    if (!doorDraft) {
      return null;
    }
    const length = segmentLengthFromPoints(doorDraft.start, doorDraft.current);
    if (length <= WALL_EPSILON) {
      return null;
    }
    return {
      start: doorDraft.start,
      end: doorDraft.current,
    };
  }, [doorDraft]);

  const filteredTiles = paletteTiles.filter((tile) => tile.tab === paletteTab);
  const canvasClassName = isPanning ? 'canvas-surface is-panning' : 'canvas-surface';

  return (
    <div className="interior-layout">
      <main className="interior-app" role="main">
        <header className="interior-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="back-button"
              onClick={() => navigate(-1)}
            >
              ← Voltar
            </button>
            <div className="topbar-heading">
              <span className="topbar-title">Editor de interiores</span>
              <span className="topbar-subtitle">
                Projeto: {projectName}
                {projectAuthor ? ` • ${projectAuthor}` : ''}
              </span>
            </div>
          </div>
          <div className="topbar-right">
            <span className="status-dot" />
            <span className="topbar-status">Não salvo</span>
            <button
              type="button"
              className="edit-metadata"
              onClick={() => setShowEditDialog(true)}
            >
              Editar
            </button>
            <button type="button" className="theme-toggle" aria-label="Alternar tema">●</button>
          </div>
        </header>

        {showEditDialog && (
          <div className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title">
            <div className="project-dialog__card">
              <div className="project-dialog__header">
                <h2 id="project-dialog-title">Editar projeto</h2>
                <button
                  type="button"
                  className="project-dialog__close"
                  onClick={() => setShowEditDialog(false)}
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
              <form
                className="project-dialog__form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const nextName = (formData.get('projectName') as string)?.trim();
                  const nextAuthor = (formData.get('projectAuthor') as string)?.trim();
                  if (nextName) {
                    setProjectName(nextName);
                  }
                  setProjectAuthor(nextAuthor ?? '');
                  setShowEditDialog(false);
                }}
              >
                <label className="project-dialog__field">
                  <span>Nome do arquivo</span>
                  <input
                    type="text"
                    name="projectName"
                    defaultValue={projectName}
                    placeholder="Nome do arquivo"
                    required
                  />
                </label>
                <label className="project-dialog__field">
                  <span>Autor</span>
                  <input
                    type="text"
                    name="projectAuthor"
                    defaultValue={projectAuthor}
                    placeholder="Nome do autor"
                  />
                </label>
                <div className="project-dialog__actions">
                  <button type="button" className="secondary" onClick={() => setShowEditDialog(false)}>Cancelar</button>
                  <button type="submit" className="primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="interior-body">
          <aside className="palette-panel">
            <div className="palette-tabs" role="tablist" aria-label="Categorias do acervo">
              {paletteTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={paletteTab === tab.id}
                  className={paletteTab === tab.id ? 'palette-tab active' : 'palette-tab'}
                  onClick={() => setPaletteTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="tile-grid" role="list">
              {filteredTiles.map((tile) => {
                const isActive = tile.tab === 'ambience' && tile.id === activeAmbienceId;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={isActive ? 'tile-card selected' : 'tile-card'}
                    role="listitem"
                    aria-pressed={tile.tab === 'ambience' ? isActive : undefined}
                    onClick={() => handlePaletteTile(tile)}
                  >
                    <span
                      className="tile-swatch"
                      style={{ background: tile.background, borderColor: tile.border ?? 'transparent' }}
                    />
                    <span className="tile-title">{tile.label}</span>
                    <span className="tile-desc">{tile.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid-settings-card">
              <div className="grid-settings-header">
                <strong>Grade</strong>
                <span>{snapLabel}</span>
              </div>
              <label className="grid-settings-row">
                <span>Fração da célula</span>
                <select
                  value={snapDenominator}
                  onChange={(event) => setSnapDenominator(Number(event.target.value))}
                >
                  {gridSnapOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 0 ? 'Livre' : `1/${option}`}
                    </option>
                  ))}
                </select>
              </label>
              <p className="grid-settings-note">
                {snapStep === 0
                  ? 'Segmentos seguem o cursor sem encaixe.'
                  : `Segmentos encaixam a cada ${snapStepText} unidade(s).`}
              </p>
            </div>

            <button type="button" className="app-button app-button--danger" onClick={handleClear}>Limpar projeto</button>
          </aside>

          <section className="workspace">
            <div className="workspace-header">
              <div className="workspace-info">
                <strong>{selectedToolMeta.label}</strong>
                <span>{status}</span>
              </div>
              <div className="workspace-right">
                <div className="workspace-actions">
                  <button type="button" onClick={handleCopySelection} disabled={!canCopy} title="Ctrl + C">
                    Copiar
                  </button>
                  <button type="button" onClick={handlePasteSelection} disabled={!canPaste} title="Ctrl + V">
                    Colar
                  </button>
                  <button type="button" onClick={handleDeleteSelection} disabled={!canDelete} title="Delete">
                    Deletar
                  </button>
                </div>
                <div className="workspace-metrics">
                  <span>Zoom {Math.round(view.scale * 100)}%</span>
                  <span>{cells.length} blocos</span>
                  <span>{doors.length} portas</span>
                  <span>{walls.length} paredes</span>
                </div>
              </div>
            </div>

            <div
              ref={wrapperRef}
              className={canvasClassName}
              data-tool={activeTool}
              style={canvasSurfaceStyle}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              onContextMenu={(event) => event.preventDefault()}
            >
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="floor-grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                    <rect width={GRID_SIZE} height={GRID_SIZE} fill={activeCanvasTheme.gridBackground} />
                    <path
                      d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                      stroke={activeCanvasTheme.gridStroke}
                      strokeWidth="1"
                      fill="none"
                    />
                  </pattern>
                  {subgridPatternId && subgridStep && (
                    <pattern id={subgridPatternId} width={subgridStep} height={subgridStep} patternUnits="userSpaceOnUse">
                      <rect width={subgridStep} height={subgridStep} fill="transparent" />
                      <path
                        d={`M ${subgridStep} 0 L 0 0 0 ${subgridStep}`}
                        stroke={activeCanvasTheme.subgridStroke}
                        strokeWidth={0.75}
                        fill="none"
                      />
                    </pattern>
                  )}
                </defs>

                <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
                  <rect
                    className="grid-background"
                    x={-GRID_EXTENT * GRID_SIZE}
                    y={-GRID_EXTENT * GRID_SIZE}
                    width={GRID_EXTENT * 2 * GRID_SIZE}
                    height={GRID_EXTENT * 2 * GRID_SIZE}
                    fill="url(#floor-grid)"
                  />
                  {subgridPatternId && (
                    <rect
                      className="grid-subdivision"
                      x={-GRID_EXTENT * GRID_SIZE}
                      y={-GRID_EXTENT * GRID_SIZE}
                      width={GRID_EXTENT * 2 * GRID_SIZE}
                      height={GRID_EXTENT * 2 * GRID_SIZE}
                      fill={`url(#${subgridPatternId})`}
                    />
                  )}

                  <line
                    className="axis-line origin"
                    x1={-GRID_EXTENT * GRID_SIZE}
                    y1={0}
                    x2={GRID_EXTENT * GRID_SIZE}
                    y2={0}
                    stroke={activeCanvasTheme.axisColor}
                  />
                  <line
                    className="axis-line origin"
                    x1={0}
                    y1={-GRID_EXTENT * GRID_SIZE}
                    x2={0}
                    y2={GRID_EXTENT * GRID_SIZE}
                    stroke={activeCanvasTheme.axisColor}
                  />

                  {hoverCell && (
                    <rect
                      className="hover-cell"
                      x={hoverCell.x * GRID_SIZE}
                      y={hoverCell.y * GRID_SIZE}
                      width={hoverUnit * GRID_SIZE}
                      height={hoverUnit * GRID_SIZE}
                      fill={activeCanvasTheme.hoverFill}
                      stroke={activeCanvasTheme.hoverStroke}
                    />
                  )}

                  {cellRenderRects.map((cell) => {
                    const cellClassName = cell.selected ? 'room-fill selected' : 'room-fill';
                    const baseFill = cell.selected ? activeCanvasTheme.roomFillSelected : activeCanvasTheme.roomFill;
                    const rectStyle: CSSProperties = {
                      fill: baseFill,
                    };
                    if (cell.texture) {
                      rectStyle.fillOpacity = cell.selected ? 0.65 : 0.3;
                    }
                    return (
                      <g key={cell.key}>
                        {cell.texture && (
                          <image
                            href={cell.texture}
                            x={cell.x * GRID_SIZE}
                            y={cell.y * GRID_SIZE}
                            width={cell.width * GRID_SIZE}
                            height={cell.height * GRID_SIZE}
                            preserveAspectRatio="none"
                            style={{ pointerEvents: 'none' }}
                          />
                        )}
                        <rect
                          className={cellClassName}
                          x={cell.x * GRID_SIZE}
                          y={cell.y * GRID_SIZE}
                          width={cell.width * GRID_SIZE}
                          height={cell.height * GRID_SIZE}
                          style={rectStyle}
                        />
                      </g>
                    );
                  })}

                  {outlineSegments.map((segment) => {
                    if (segment.orientation === 'horizontal') {
                      return (
                        <rect
                          key={`h-${segment.x}-${segment.y}-${segment.length}`}
                          className="room-outline"
                          x={segment.x * GRID_SIZE}
                          y={segment.y * GRID_SIZE - WALL_STROKE / 2}
                          width={segment.length * GRID_SIZE}
                          height={WALL_STROKE}
                          fill={activeCanvasTheme.outlineFill}
                          stroke="none"
                        />
                      );
                    }
                    return (
                      <rect
                        key={`v-${segment.x}-${segment.y}-${segment.length}`}
                        className="room-outline"
                        x={segment.x * GRID_SIZE - WALL_STROKE / 2}
                        y={segment.y * GRID_SIZE}
                        width={WALL_STROKE}
                        height={segment.length * GRID_SIZE}
                        fill={activeCanvasTheme.outlineFill}
                        stroke="none"
                      />
                    );
                  })}

                  {walls.map((wall) => {
                    const x1 = wall.start.x * GRID_SIZE;
                    const y1 = wall.start.y * GRID_SIZE;
                    const x2 = wall.end.x * GRID_SIZE;
                    const y2 = wall.end.y * GRID_SIZE;
                    const rawDx = x2 - x1;
                    const rawDy = y2 - y1;
                    const dx = Math.abs(rawDx);
                    const dy = Math.abs(rawDy);
                    const wallFill = selectedWallIds?.has(wall.id)
                      ? activeCanvasTheme.wallFillSelected
                      : activeCanvasTheme.wallFill;
                    const wallClassName = selectedWallIds?.has(wall.id)
                      ? 'room-outline internal-wall selected'
                      : 'room-outline internal-wall';

                    if (dx < OFFSET_EPSILON && dy < OFFSET_EPSILON) {
                      return null;
                    }

                    if (dy <= OFFSET_EPSILON) {
                      const left = Math.min(x1, x2);
                      return (
                        <rect
                          key={wall.id}
                          className={wallClassName}
                          x={left}
                          y={y1 - WALL_STROKE / 2}
                          width={dx}
                          height={WALL_STROKE}
                          fill={wallFill}
                          stroke="none"
                        />
                      );
                    }

                    if (dx <= OFFSET_EPSILON) {
                      const top = Math.min(y1, y2);
                      return (
                        <rect
                          key={wall.id}
                          className={wallClassName}
                          x={x1 - WALL_STROKE / 2}
                          y={top}
                          width={WALL_STROKE}
                          height={dy}
                          fill={wallFill}
                          stroke="none"
                        />
                      );
                    }

                    const length = Math.hypot(rawDx, rawDy);
                    if (length <= OFFSET_EPSILON) {
                      return null;
                    }

                    const halfWidth = WALL_STROKE / 2;
                    const offsetX = (-rawDy / length) * halfWidth;
                    const offsetY = (rawDx / length) * halfWidth;
                    const polygonPoints = [
                      `${x1 + offsetX},${y1 + offsetY}`,
                      `${x2 + offsetX},${y2 + offsetY}`,
                      `${x2 - offsetX},${y2 - offsetY}`,
                      `${x1 - offsetX},${y1 - offsetY}`,
                    ].join(' ');

                    return (
                      <polygon
                        key={wall.id}
                        className={wallClassName}
                        points={polygonPoints}
                        fill={wallFill}
                        stroke="none"
                      />
                    );
                  })}

                  {wallPreview && (() => {
                    const x1 = wallPreview.start.x * GRID_SIZE;
                    const y1 = wallPreview.start.y * GRID_SIZE;
                    const x2 = wallPreview.end.x * GRID_SIZE;
                    const y2 = wallPreview.end.y * GRID_SIZE;
                    const rawDx = x2 - x1;
                    const rawDy = y2 - y1;
                    const dx = Math.abs(rawDx);
                    const dy = Math.abs(rawDy);

                    if (dx < OFFSET_EPSILON && dy < OFFSET_EPSILON) {
                      return null;
                    }

                    if (dy <= OFFSET_EPSILON) {
                      const left = Math.min(x1, x2);
                      return (
                        <rect
                          className="draft-wall"
                          x={left}
                          y={y1 - WALL_STROKE / 2}
                          width={dx}
                          height={WALL_STROKE}
                          fill="none"
                          stroke={activeCanvasTheme.draftWallStroke}
                        />
                      );
                    }

                    if (dx <= OFFSET_EPSILON) {
                      const top = Math.min(y1, y2);
                      return (
                        <rect
                          className="draft-wall"
                          x={x1 - WALL_STROKE / 2}
                          y={top}
                          width={WALL_STROKE}
                          height={dy}
                          fill="none"
                          stroke={activeCanvasTheme.draftWallStroke}
                        />
                      );
                    }

                    const length = Math.hypot(rawDx, rawDy);
                    if (length <= OFFSET_EPSILON) {
                      return null;
                    }

                    const halfWidth = WALL_STROKE / 2;
                    const offsetX = (-rawDy / length) * halfWidth;
                    const offsetY = (rawDx / length) * halfWidth;
                    const polygonPoints = [
                      `${x1 + offsetX},${y1 + offsetY}`,
                      `${x2 + offsetX},${y2 + offsetY}`,
                      `${x2 - offsetX},${y2 - offsetY}`,
                      `${x1 - offsetX},${y1 - offsetY}`,
                    ].join(' ');

                    return (
                      <polygon
                        className="draft-wall"
                        points={polygonPoints}
                        fill="none"
                        stroke={activeCanvasTheme.draftWallStroke}
                      />
                    );
                  })()}

                  {doorPreview && (
                    <line
                      className="door-shape door-preview"
                      x1={doorPreview.start.x * GRID_SIZE}
                      y1={doorPreview.start.y * GRID_SIZE}
                      x2={doorPreview.end.x * GRID_SIZE}
                      y2={doorPreview.end.y * GRID_SIZE}
                      strokeWidth={WALL_STROKE}
                      strokeLinecap="square"
                      stroke={activeCanvasTheme.doorStroke}
                    />
                  )}

                  {doors.map((door) => {
                    const doorClassName = selectedDoorIds?.has(door.id) ? 'door-shape selected' : 'door-shape';
                    const strokeColor = selectedDoorIds?.has(door.id)
                      ? activeCanvasTheme.doorStrokeSelected
                      : activeCanvasTheme.doorStroke;
                    return (
                      <line
                        key={door.id}
                        className={doorClassName}
                        x1={door.start.x * GRID_SIZE}
                        y1={door.start.y * GRID_SIZE}
                        x2={door.end.x * GRID_SIZE}
                        y2={door.end.y * GRID_SIZE}
                        strokeWidth={WALL_STROKE}
                        strokeLinecap="square"
                        stroke={strokeColor}
                      />
                    );
                  })}

                  {selection.kind === 'area' && (
                    <g className="selection-preview">
                      {selection.cells.map((key) => {
                        const { x, y } = fromCellKey(key);
                        return (
                          <rect
                            key={`selection-cell-${key}`}
                            className="selection-fill"
                            x={(x + selection.offset.x) * GRID_SIZE}
                            y={(y + selection.offset.y) * GRID_SIZE}
                            width={selection.unit * GRID_SIZE}
                            height={selection.unit * GRID_SIZE}
                          />
                        );
                      })}

                      {selection.walls.map((wall) => {
                        const x1 = (wall.start.x + selection.offset.x) * GRID_SIZE;
                        const y1 = (wall.start.y + selection.offset.y) * GRID_SIZE;
                        const x2 = (wall.end.x + selection.offset.x) * GRID_SIZE;
                        const y2 = (wall.end.y + selection.offset.y) * GRID_SIZE;
                        return (
                          <line
                            key={`selection-wall-${wall.id}`}
                            className="selection-ghost-wall"
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            strokeWidth={WALL_STROKE}
                            strokeLinecap="round"
                          />
                        );
                      })}

                      {selection.doors.map((door) => (
                        <line
                          key={`selection-door-${door.id}`}
                          className="selection-ghost-door"
                          x1={(door.start.x + selection.offset.x) * GRID_SIZE}
                          y1={(door.start.y + selection.offset.y) * GRID_SIZE}
                          x2={(door.end.x + selection.offset.x) * GRID_SIZE}
                          y2={(door.end.y + selection.offset.y) * GRID_SIZE}
                          strokeWidth={DOOR_THICKNESS * GRID_SIZE}
                          strokeLinecap="round"
                        />
                      ))}

                      <rect
                        className="selection-outline"
                        x={(selection.bounds.minX + selection.offset.x) * GRID_SIZE - 2}
                        y={(selection.bounds.minY + selection.offset.y) * GRID_SIZE - 2}
                        width={(selection.bounds.width) * GRID_SIZE + 4}
                        height={(selection.bounds.height) * GRID_SIZE + 4}
                      />
                    </g>
                  )}

                  {draftPreview && draftPreview.width > 0 && draftPreview.height > 0 && (
                    <g>
                      <rect
                        className="draft-rect"
                        x={draftPreview.x * GRID_SIZE}
                        y={draftPreview.y * GRID_SIZE}
                        width={draftPreview.width * GRID_SIZE}
                        height={draftPreview.height * GRID_SIZE}
                        fill={activeCanvasTheme.draftRectFill}
                        stroke={activeCanvasTheme.draftRectStroke}
                      />
                      <text
                        className="draft-label"
                        x={(draftPreview.x + draftPreview.width / 2) * GRID_SIZE}
                        y={(draftPreview.y + draftPreview.height / 2) * GRID_SIZE}
                        fill={activeCanvasTheme.draftLabel}
                      >
                        {draftPreview.width} x {draftPreview.height}
                      </text>
                    </g>
                  )}
                </g>
              </svg>
            </div>
          </section>

          <aside className="properties-panel">
            <div className="properties-header">
              <strong>Seleção atual</strong>
              <span>{selectionLabel}</span>
            </div>

            {selection.kind === 'none' && (
              <p className="properties-placeholder">Use a ferramenta Selecionar para inspecionar elementos.</p>
            )}

            {selection.kind === 'area' && (
              <div className="property-group">
                <h3>Área conectada</h3>
                <ul className="property-list">
                  <li><span>Dimensões</span><strong>{selection.bounds.width} × {selection.bounds.height}</strong></li>
                  <li><span>Blocos</span><strong>{selection.cells.length}</strong></li>
                  <li><span>Paredes</span><strong>{selection.walls.length}</strong></li>
                  <li><span>Portas</span><strong>{selection.doors.length}</strong></li>
                  <li><span>Deslocamento</span><strong>{selection.offset.x}, {selection.offset.y}</strong></li>
                </ul>
              </div>
            )}

            {selection.kind === 'free' && (
              <div className="property-group">
                <h3>Seleção livre</h3>
                <ul className="property-list">
                  <li><span>Dimensões</span><strong>{selection.bounds.width} × {selection.bounds.height}</strong></li>
                  <li><span>Blocos</span><strong>{selection.cells.length}</strong></li>
                  <li><span>Grade</span><strong>{selection.unit}</strong></li>
                  <li><span>Início</span><strong>{selection.bounds.minX}, {selection.bounds.minY}</strong></li>
                </ul>
              </div>
            )}

            {(selection.kind === 'area' || selection.kind === 'free') && (
              <div className="property-group">
                <h3>Textura</h3>
                <div className="texture-controls">
                  <input
                    id={`${textureInputId}-texture`}
                    ref={textureInputRef}
                    className="texture-input"
                    type="file"
                    accept="image/*"
                    onChange={handleTextureUpload}
                  />
                  <label
                    className="app-button app-button--accent"
                    htmlFor={`${textureInputId}-texture`}
                  >
                    Escolher imagem
                  </label>
                  <button
                    type="button"
                    className="app-button app-button--danger"
                    onClick={handleTextureClear}
                  >
                    Remover textura
                  </button>
                </div>
                {selectionTexturePreview ? (
                  <div className="texture-preview">
                    <img src={selectionTexturePreview} alt="Pré-visualização da textura" />
                    <span>{selection.cells.length} bloco{selection.cells.length === 1 ? '' : 's'}</span>
                  </div>
                ) : (
                  <p className="properties-placeholder">Nenhuma textura aplicada.</p>
                )}
              </div>
            )}

            {selection.kind === 'wall' && (
              <div className="property-group">
                <h3>Parede</h3>
                {selectedWall ? (
                  <ul className="property-list">
                    <li><span>Comprimento</span><strong>{segmentLength(selectedWall).toFixed(2)} u</strong></li>
                    <li><span>Início</span><strong>{selectedWall.start.x.toFixed(2)}, {selectedWall.start.y.toFixed(2)}</strong></li>
                    <li><span>Fim</span><strong>{selectedWall.end.x.toFixed(2)}, {selectedWall.end.y.toFixed(2)}</strong></li>
                  </ul>
                ) : (
                  <p className="properties-placeholder">Esta parede não está mais disponível.</p>
                )}
              </div>
            )}

            {selection.kind === 'door' && (
              <div className="property-group">
                <h3>Porta</h3>
                {selectedDoor ? (
                  <ul className="property-list">
                    <li><span>Orientação</span><strong>{doorOrientationLabel(selectedDoor)}</strong></li>
                    <li><span>Comprimento</span><strong>{doorLength(selectedDoor).toFixed(2)} u</strong></li>
                    <li><span>Centro</span><strong>{doorMidpoint(selectedDoor).x.toFixed(2)}, {doorMidpoint(selectedDoor).y.toFixed(2)}</strong></li>
                    <li><span>Início</span><strong>{selectedDoor.start.x.toFixed(2)}, {selectedDoor.start.y.toFixed(2)}</strong></li>
                    <li><span>Fim</span><strong>{selectedDoor.end.x.toFixed(2)}, {selectedDoor.end.y.toFixed(2)}</strong></li>
                  </ul>
                ) : (
                  <p className="properties-placeholder">Esta porta não está mais disponível.</p>
                )}
              </div>
            )}

            <div className="property-group">
              <h3>Atalhos úteis</h3>
              <ul className="property-list property-list--compact">
                <li><span>Copiar</span><strong>Ctrl + C</strong></li>
                <li><span>Colar</span><strong>Ctrl + V</strong></li>
                <li><span>Recortar</span><strong>Ctrl + X</strong></li>
                <li><span>Excluir</span><strong>Delete</strong></li>
              </ul>
            </div>
          </aside>
        </div>

        <footer className="toolbelt">
          <div className="toolbelt-left">
            {hotbarTools.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === activeTool ? 'toolbelt-button active' : 'toolbelt-button'}
                onClick={() => handleToolChange(item.id)}
              >
                <span className="toolbelt-glyph">{item.glyph}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
};

export default InteriorBuilderPage;
