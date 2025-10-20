import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import type { GraphNode, GraphEdge } from "@/lib/api";

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number;
};

export function ResearchGraph({ nodes, edges, height = 420 }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  // Precompute degrees to size nodes and spread layout
  const { data, degree } = useMemo(() => {
    const deg = new Map<string, number>();
    for (const e of edges) {
      deg.set(e.sourceId, (deg.get(e.sourceId) || 0) + 1);
      deg.set(e.targetId, (deg.get(e.targetId) || 0) + 1);
    }
    return {
      degree: deg,
      data: {
        nodes: nodes.map(n => ({ ...n })),
        links: edges.map(e => ({ id: e.id, source: e.sourceId, target: e.targetId, label: e.label, type: e.type })),
      },
    };
  }, [nodes, edges]);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const width = ref.current?.clientWidth || 800;
    const h = height;
    const margin = 24;
    const color = d3.scaleOrdinal<string, string>(d3.schemeTableau10 as any);

    // Root group for zoom/pan
    const root = svg
      .attr('viewBox', `0 0 ${width} ${h}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('class', 'graph-root');

    // Layers
    const linkLayer = root.append('g').attr('class', 'links');
    const nodeLayer = root.append('g').attr('class', 'nodes');

    // Compute node radius from degree (clamped)
    const rFor = (d: any) => {
      const deg = degree.get(d.id) || 0;
      return Math.max(6, Math.min(16, 6 + deg * 1.2));
    };

    // Force simulation with more spacing
    const linkForce = d3.forceLink(data.links as any)
      .id((d: any) => d.id)
      .distance((d: any) => {
        const ds = degree.get(d.source.id || d.source) || 0;
        const dt = degree.get(d.target.id || d.target) || 0;
        return 110 + 10 * Math.min(ds + dt, 12);
      })
      .strength(0.5);

    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', linkForce)
      .force('charge', d3.forceManyBody().strength(-420))
      .force('center', d3.forceCenter(width / 2, h / 2))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(h / 2).strength(0.05))
      .force('collision', d3.forceCollide().radius((d: any) => rFor(d) + 26));

    // Draw links
    const link = linkLayer
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.2)
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke-width', 1.25);

    // Drag helpers
    const drag = d3.drag<any, any>()
      .on('start', (event, d: any) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (event, d: any) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d: any) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; });

    // Node groups
    const node = nodeLayer
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'grab')
      .call(drag);

    // Node visuals
    node.append('circle')
      .attr('r', (d: any) => rFor(d))
      .attr('fill', (d: any) => color(String(d.type || 'paper')))
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    // Truncate labels for readability and add tooltip with full text
    const truncate = (s: string, n = 60) => s.length > n ? s.slice(0, n - 1) + '…' : s;
    node.append('text')
      .text((d: any) => truncate(String(d.label)))
      .attr('x', (d: any) => rFor(d) + 6)
      .attr('y', 4)
      .attr('class', 'text-xs fill-foreground')
      .style('font', '12px system-ui, -apple-system, Segoe UI, Roboto')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--background, #0b0b0b)')
      .style('stroke-width', '3px')
      .style('pointer-events', 'none');

    // Native tooltip
    node.append('title').text((d: any) => {
      const meta = d.data?.authors?.length ? `\nAuthors: ${d.data.authors.join(', ').slice(0, 140)}${d.data.authors.length > 5 ? '…' : ''}` : '';
      const yr = d.data?.year ? `\nYear: ${d.data.year}` : '';
      const src = d.data?.source ? `\nSource: ${d.data.source}` : '';
      return `${d.label}${meta}${yr}${src}`;
    });

    // Hover highlight
    const linked = new Set<string>();
    data.links.forEach((e: any) => {
      linked.add(`${e.source}-${e.target}`);
      linked.add(`${e.target}-${e.source}`);
    });
    const isLinked = (a: any, b: any) => a === b || linked.has(`${a.id}-${b.id}`);

    node.on('mouseenter', function (_event, d: any) {
      node.selectAll('circle').attr('opacity', (o: any) => isLinked(d, o) ? 1 : 0.3);
      node.selectAll('text').attr('opacity', (o: any) => isLinked(d, o) ? 1 : 0.3);
      link.attr('stroke-opacity', (l: any) => l.source.id === d.id || l.target.id === d.id ? 0.6 : 0.08)
          .attr('stroke-width', (l: any) => l.source.id === d.id || l.target.id === d.id ? 2 : 1);
    });
    node.on('mouseleave', function () {
      node.selectAll('circle').attr('opacity', 1);
      node.selectAll('text').attr('opacity', 1);
      link.attr('stroke-opacity', 0.2).attr('stroke-width', 1.25);
    });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source as any).x)
        .attr('y1', (d: any) => (d.source as any).y)
        .attr('x2', (d: any) => (d.target as any).x)
        .attr('y2', (d: any) => (d.target as any).y);

      node.attr('transform', (d: any) => {
        // Keep nodes roughly within bounds
        d.x = Math.max(margin, Math.min(width - margin, d.x));
        d.y = Math.max(margin, Math.min(h - margin, d.y));
        return `translate(${d.x},${d.y})`;
      });
    });

    // Zoom/pan
    const zoomed = (event: any) => {
      root.attr('transform', event.transform);
    };
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', zoomed);
    svg.call(zoom as any);

    // Zoom to fit once the layout stabilizes
    const zoomToFit = () => {
      const nodesSel = node as any;
      const bounds = nodesSel.nodes().reduce((acc: any, el: SVGGElement) => {
        const { x, y, width: w, height: hh } = (el as any).getBBox();
        const minX = Math.min(acc[0], x);
        const minY = Math.min(acc[1], y);
        const maxX = Math.max(acc[2], x + w);
        const maxY = Math.max(acc[3], y + hh);
        return [minX, minY, maxX, maxY];
      }, [Infinity, Infinity, -Infinity, -Infinity]);

      const bWidth = bounds[2] - bounds[0];
      const bHeight = bounds[3] - bounds[1];
      if (!isFinite(bWidth) || !isFinite(bHeight) || bWidth === 0 || bHeight === 0) return;

      const scale = Math.max(0.6, Math.min(2.2, 0.92 / Math.max(bWidth / width, bHeight / h)));
      const tx = (width - scale * (bounds[0] + bounds[2])) / 2;
      const ty = (h - scale * (bounds[1] + bounds[3])) / 2;
      svg.transition().duration(450).call(zoom.transform as any, d3.zoomIdentity.translate(tx, ty).scale(scale));
    };

    const endOnce = () => {
      simulation.alphaTarget(0);
      zoomToFit();
      // Remove the handler by setting null
      simulation.on('end', null as any);
    };
    simulation.on('end', endOnce as any);

    // Clean up
    return () => { simulation.stop(); };
  }, [data, degree, height]);

  return (
    <div className="w-full overflow-hidden rounded-md border">
      <svg ref={ref} width="100%" height={height} />
    </div>
  );
}

export default ResearchGraph;
