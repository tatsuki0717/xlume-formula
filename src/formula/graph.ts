import type { CellAddress, CellRange } from "../model/address.js";
import { rangeContains } from "../model/address.js";

export type VertexId = string;

export function vertexId(addr: CellAddress): VertexId {
  return `${addr.sheetId ?? 0}:${addr.row}:${addr.column}`;
}

export interface FormulaVertex {
  id: VertexId;
  cell: CellAddress;
  dependencies: Dependency[];
  dependents: Set<VertexId>;
  dirty: boolean;
  formulaText?: string;
}

export type Dependency =
  | { kind: "cell"; address: CellAddress }
  | { kind: "range"; range: CellRange; sheetId?: number }
  | { kind: "name"; name: string }
  | { kind: "volatile" };

export interface RangeDependency {
  range: CellRange;
  sheetId: number;
  targetFormula: VertexId;
}

/**
 * Range dependency index: avoid 100k edges for SUM(A1:A100000).
 * Lookup is linear over registered ranges (acceptable until spatial index is needed).
 */
export class RangeDependencyIndex {
  private items: RangeDependency[] = [];

  add(dep: RangeDependency): void {
    this.items.push(dep);
  }

  removeTarget(targetFormula: VertexId): void {
    this.items = this.items.filter((i) => i.targetFormula !== targetFormula);
  }

  clear(): void {
    this.items = [];
  }

  /** Find formulas whose ranges contain the changed cell. */
  findAffected(sheetId: number, row: number, column: number): VertexId[] {
    const out: VertexId[] = [];
    for (const item of this.items) {
      if (item.sheetId !== sheetId) continue;
      if (rangeContains(item.range, row, column)) out.push(item.targetFormula);
    }
    return out;
  }

  /** Ranges owned by a formula vertex. */
  rangesFor(targetFormula: VertexId): RangeDependency[] {
    return this.items.filter((i) => i.targetFormula === targetFormula);
  }
}

export type DirtyReason = "cellChanged" | "workbookRecalc" | "volatileRecalc" | "structuralChange";

export class DependencyGraph {
  vertices = new Map<VertexId, FormulaVertex>();
  rangeIndex = new RangeDependencyIndex();
  volatileVertices = new Set<VertexId>();

  ensure(cell: CellAddress): FormulaVertex {
    const id = vertexId(cell);
    let v = this.vertices.get(id);
    if (!v) {
      v = { id, cell, dependencies: [], dependents: new Set(), dirty: true };
      this.vertices.set(id, v);
    }
    return v;
  }

  setDependencies(cell: CellAddress, deps: Dependency[], formulaText?: string): void {
    const v = this.ensure(cell);
    // Remove old reverse edges
    for (const d of v.dependencies) {
      if (d.kind === "cell") {
        const other = this.vertices.get(vertexId(d.address));
        other?.dependents.delete(v.id);
      }
    }
    // Remove old range index entries for this formula
    this.rangeIndex.removeTarget(v.id);
    this.volatileVertices.delete(v.id);

    v.dependencies = deps;
    v.formulaText = formulaText;
    v.dirty = true;

    for (const d of deps) {
      if (d.kind === "cell") {
        const other = this.ensure(d.address);
        other.dependents.add(v.id);
      } else if (d.kind === "range") {
        this.rangeIndex.add({
          range: d.range,
          sheetId: d.sheetId ?? cell.sheetId ?? 0,
          targetFormula: v.id,
        });
      } else if (d.kind === "volatile") {
        this.volatileVertices.add(v.id);
      }
    }
  }

  markDirty(cell: CellAddress, _reason: DirtyReason = "cellChanged"): Set<VertexId> {
    const dirty = new Set<VertexId>();
    const queue: VertexId[] = [];
    const start = vertexId(cell);
    if (this.vertices.has(start)) {
      queue.push(start);
    }
    // Also mark the changed cell itself if it has no formula (so dependents still refresh)
    // Range dependents of this cell
    for (const id of this.rangeIndex.findAffected(cell.sheetId ?? 0, cell.row, cell.column)) {
      queue.push(id);
    }
    // Direct cell dependents via reverse edges (ensure vertex exists for non-formula cells)
    const ensured = this.ensure(cell);
    for (const dep of ensured.dependents) queue.push(dep);

    while (queue.length) {
      const id = queue.pop()!;
      if (dirty.has(id)) continue;
      dirty.add(id);
      const v = this.vertices.get(id);
      if (!v) continue;
      v.dirty = true;
      for (const dep of v.dependents) queue.push(dep);
      // Formulas that range-depend on this formula cell
      for (const rid of this.rangeIndex.findAffected(
        v.cell.sheetId ?? 0,
        v.cell.row,
        v.cell.column,
      )) {
        queue.push(rid);
      }
    }
    return dirty;
  }

  markAllVolatile(): void {
    for (const id of this.volatileVertices) {
      const v = this.vertices.get(id);
      if (v) v.dirty = true;
    }
  }

  /**
   * Topological order of dirty vertices.
   * Cell deps AND range deps (when a dirty formula cell lies inside a range) contribute to indegree.
   */
  dirtyOrder(): { order: VertexId[]; cycles: VertexId[] } {
    const dirty = [...this.vertices.values()].filter((v) => v.dirty);
    const ids = new Set(dirty.map((v) => v.id));
    const indeg = new Map<VertexId, number>();
    for (const id of ids) indeg.set(id, 0);

    // Build edge list: precedent -> dependent
    const edges: { from: VertexId; to: VertexId }[] = [];

    for (const v of dirty) {
      for (const d of v.dependencies) {
        if (d.kind === "cell") {
          const depId = vertexId(d.address);
          if (ids.has(depId)) {
            edges.push({ from: depId, to: v.id });
            indeg.set(v.id, (indeg.get(v.id) ?? 0) + 1);
          }
        } else if (d.kind === "range") {
          // Any dirty formula cell inside the range is a precedent of v
          const sheetId = d.sheetId ?? v.cell.sheetId ?? 0;
          for (const other of dirty) {
            if (other.id === v.id) continue;
            if ((other.cell.sheetId ?? 0) !== sheetId) continue;
            if (rangeContains(d.range, other.cell.row, other.cell.column)) {
              edges.push({ from: other.id, to: v.id });
              indeg.set(v.id, (indeg.get(v.id) ?? 0) + 1);
            }
          }
        }
      }
    }

    const adj = new Map<VertexId, VertexId[]>();
    for (const e of edges) {
      const list = adj.get(e.from) ?? [];
      list.push(e.to);
      adj.set(e.from, list);
    }

    const queue = [...ids].filter((id) => (indeg.get(id) ?? 0) === 0);
    const order: VertexId[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      for (const to of adj.get(id) ?? []) {
        if (!ids.has(to)) continue;
        indeg.set(to, (indeg.get(to) ?? 0) - 1);
        if ((indeg.get(to) ?? 0) === 0) queue.push(to);
      }
    }
    const cycles = [...ids].filter((id) => !order.includes(id));
    return { order, cycles };
  }
}
