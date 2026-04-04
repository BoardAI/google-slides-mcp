import { LayoutContainer, LayoutDirective, LayoutResult } from './types.js';

/**
 * Compute positions and sizes for child elements within a container
 * based on the layout directive (row, column, or grid).
 */
export function computeLayout(
  container: LayoutContainer,
  childCount: number,
  directive: LayoutDirective
): LayoutResult[] {
  if (childCount === 0) return [];

  const gap = directive.gap ?? 15;
  const padding = directive.padding ?? 0;

  // Effective container after padding
  const cx = container.x + padding;
  const cy = container.y + padding;
  const cw = container.width - padding * 2;
  const ch = container.height - padding * 2;

  switch (directive.type) {
    case 'row':
      return computeRow(cx, cy, cw, ch, childCount, gap, directive.align);

    case 'column':
      return computeColumn(cx, cy, cw, ch, childCount, gap, directive.align);

    case 'grid':
      return computeGrid(cx, cy, cw, ch, childCount, directive.columns ?? 2, gap);

    default:
      return computeRow(cx, cy, cw, ch, childCount, gap, directive.align);
  }
}

function computeRow(
  cx: number, cy: number, cw: number, ch: number,
  childCount: number, gap: number, align?: string
): LayoutResult[] {
  const childWidth = (cw - (childCount - 1) * gap) / childCount;
  const results: LayoutResult[] = [];

  for (let i = 0; i < childCount; i++) {
    let y = cy;
    if (align === 'center') {
      y = cy; // height fills container, centering is default
    } else if (align === 'end') {
      y = cy; // height fills container
    }

    results.push({
      x: cx + i * (childWidth + gap),
      y,
      width: childWidth,
      height: ch,
    });
  }

  return results;
}

function computeColumn(
  cx: number, cy: number, cw: number, ch: number,
  childCount: number, gap: number, align?: string
): LayoutResult[] {
  const childHeight = (ch - (childCount - 1) * gap) / childCount;
  const results: LayoutResult[] = [];

  for (let i = 0; i < childCount; i++) {
    let x = cx;
    if (align === 'center') {
      x = cx; // width fills container
    } else if (align === 'end') {
      x = cx; // width fills container
    }

    results.push({
      x,
      y: cy + i * (childHeight + gap),
      width: cw,
      height: childHeight,
    });
  }

  return results;
}

function computeGrid(
  cx: number, cy: number, cw: number, ch: number,
  childCount: number, columns: number, gap: number
): LayoutResult[] {
  const rowCount = Math.ceil(childCount / columns);
  const colWidth = (cw - (columns - 1) * gap) / columns;
  const rowHeight = (ch - (rowCount - 1) * gap) / rowCount;
  const results: LayoutResult[] = [];

  for (let i = 0; i < childCount; i++) {
    results.push({
      x: cx + (i % columns) * (colWidth + gap),
      y: cy + Math.floor(i / columns) * (rowHeight + gap),
      width: colWidth,
      height: rowHeight,
    });
  }

  return results;
}
