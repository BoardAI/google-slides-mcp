export interface LayoutDirective {
  type: 'row' | 'column' | 'grid';
  columns?: number;       // for grid, default 2
  gap?: number;           // pt between items, default 15
  padding?: number;       // pt inside container, default 0
  align?: 'start' | 'center' | 'end';  // cross-axis alignment
}

export interface LayoutContainer {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  x: number;
  y: number;
  width: number;
  height: number;
}
