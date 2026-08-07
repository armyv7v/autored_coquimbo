import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface WebNode {
  id: string;
  name: string;
  rx: number; // 0..1 relative position
  ry: number; // 0..1 relative position
  isCore?: boolean;
  baseRadius: number;
}

interface WebRing {
  radiusScale: number; // 0..1 fraction towards outer nodes
}

interface FiberPulse {
  id: number;
  fromId: string;
  toId: string;
  progress: number;
  speed: number;
  color: string;
  size: number;
  tailLength: number;
}

interface CoreShockwave {
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

const NODES: WebNode[] = [
  { id: 'core', name: 'Centro de Control AutoRed', rx: 0.48, ry: 0.5, isCore: true, baseRadius: 26 },
  { id: 'n1', name: 'Ruta 5 Norte', rx: 0.18, ry: 0.18, baseRadius: 5 },
  { id: 'n2', name: 'Muelle Fiscal', rx: 0.42, ry: 0.15, baseRadius: 5 },
  { id: 'n3', name: 'Zona Puerto / Altamira', rx: 0.68, ry: 0.19, baseRadius: 5 },
  { id: 'n4', name: 'Peaje Ruta 43', rx: 0.84, ry: 0.28, baseRadius: 5 },
  { id: 'n5', name: 'Centro Coquimbo', rx: 0.14, ry: 0.72, baseRadius: 5 },
  { id: 'n6', name: 'Patio Automotora A', rx: 0.36, ry: 0.82, baseRadius: 5 },
  { id: 'n7', name: 'Patio Automotora B', rx: 0.65, ry: 0.78, baseRadius: 5 },
  { id: 'n8', name: 'Acceso Sur / Panul', rx: 0.88, ry: 0.68, baseRadius: 5 },
  { id: 'n9', name: 'Zona Industrial', rx: 0.28, ry: 0.45, baseRadius: 4 },
  { id: 'n10', name: 'Costanera Norte', rx: 0.74, ry: 0.48, baseRadius: 4 },
];

// Concentric web spiral levels
const RINGS: WebRing[] = [
  { radiusScale: 0.22 },
  { radiusScale: 0.45 },
  { radiusScale: 0.70 },
  { radiusScale: 0.90 },
];

interface InteractiveNetworkWebProps {
  className?: string;
  interactive?: boolean;
  pulseTriggerCount?: number;
}

export default function InteractiveNetworkWeb({
  className = '',
  interactive = true,
  pulseTriggerCount = 0,
}: InteractiveNetworkWebProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulsesRef = useRef<FiberPulse[]>([]);
  const shockwavesRef = useRef<CoreShockwave[]>([]);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const hoverNodeRef = useRef<WebNode | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const spawnPulse = useCallback((fromId: string, speed = 0.008 + Math.random() * 0.008, isHighEnergy = false) => {
    pulsesRef.current.push({
      id: Math.random(),
      fromId,
      toId: 'core',
      progress: 0,
      speed,
      color: isHighEnergy ? '#ff2a00' : Math.random() > 0.4 ? '#ff5a1f' : '#38bdf8',
      size: isHighEnergy ? 3.5 : 2.0,
      tailLength: isHighEnergy ? 0.22 : 0.15,
    });
  }, []);

  // Parent trigger burst
  const prevTriggerRef = useRef(pulseTriggerCount);
  useEffect(() => {
    if (pulseTriggerCount > prevTriggerRef.current) {
      const outerIds = NODES.filter((n) => !n.isCore).map((n) => n.id);
      outerIds.forEach((id, i) => {
        setTimeout(() => spawnPulse(id, 0.018, true), i * 65);
      });
      prevTriggerRef.current = pulseTriggerCount;
    }
  }, [pulseTriggerCount, spawnPulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Auto background pulse generator
    const interval = setInterval(() => {
      const outerNodes = NODES.filter((n) => !n.isCore);
      const randNode = outerNodes[Math.floor(Math.random() * outerNodes.length)];
      spawnPulse(randNode.id);
    }, 900);

    let time = 0;

    const drawCyberShield = (cx: number, cy: number, timeVal: number, glowIntensity: number) => {
      const sw = 42; // Shield width
      const sh = 48; // Shield height

      ctx.save();
      ctx.translate(cx, cy);

      // 1. Radiant Aura Glow behind Shield
      const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
      aura.addColorStop(0, `rgba(255, 90, 31, ${0.4 + glowIntensity * 0.4})`);
      aura.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
      aura.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.fillStyle = aura;
      ctx.fill();

      // Helper function to define shield path
      const createShieldPath = (scale: number) => {
        const w = (sw / 2) * scale;
        const h = (sh / 2) * scale;
        ctx.beginPath();
        ctx.moveTo(0, -h - 4 * scale); // Top center dip/crest
        ctx.quadraticCurveTo(w * 0.5, -h - 6 * scale, w, -h + 6 * scale); // Top right shoulder
        ctx.quadraticCurveTo(w * 1.1, h * 0.3, 0, h + 8 * scale); // Bottom tip
        ctx.quadraticCurveTo(-w * 1.1, h * 0.3, -w, -h + 6 * scale); // Left shoulder
        ctx.quadraticCurveTo(-w * 0.5, -h - 6 * scale, 0, -h - 4 * scale); // Back to top center
        ctx.closePath();
      };

      // 2. Outer Cyber Shield Contour (Dark glass fill + glowing stroke)
      createShieldPath(1.0);
      ctx.fillStyle = 'rgba(5, 10, 22, 0.85)';
      ctx.fill();
      ctx.strokeStyle = '#ff5a1f';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#ff5a1f';
      ctx.shadowBlur = 16 + Math.sin(timeVal * 3) * 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. Inner Tech Accent Shield Contour
      createShieldPath(0.72);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 4. Central Diamond Core Symbol (Custodia & Conexión)
      const dSize = 10 + Math.sin(timeVal * 4) * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -dSize);
      ctx.lineTo(dSize, 0);
      ctx.lineTo(0, dSize);
      ctx.lineTo(-dSize, 0);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 5. Crosshair Lines extending from diamond
      ctx.beginPath();
      ctx.moveTo(0, -dSize - 4); ctx.lineTo(0, -sh * 0.35);
      ctx.moveTo(0, dSize + 4); ctx.lineTo(0, sh * 0.38);
      ctx.moveTo(-dSize - 4, 0); ctx.lineTo(-sw * 0.32, 0);
      ctx.moveTo(dSize + 4, 0); ctx.lineTo(sw * 0.32, 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
    };

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      const nodePosMap = new Map<string, { x: number; y: number; node: WebNode }>();

      NODES.forEach((n) => {
        const floatX = Math.sin(time * 0.7 + n.rx * 12) * 5;
        const floatY = Math.cos(time * 0.8 + n.ry * 12) * 5;
        
        let px = n.rx * width + floatX;
        let py = n.ry * height + floatY;

        const distMouse = Math.hypot(mousePosRef.current.x - px, mousePosRef.current.y - py);
        if (distMouse < 180 && !n.isCore) {
          const force = (1 - distMouse / 180) * 12;
          const angle = Math.atan2(mousePosRef.current.y - py, mousePosRef.current.x - px);
          px += Math.cos(angle) * force;
          py += Math.sin(angle) * force;
        }

        nodePosMap.set(n.id, { x: px, y: py, node: n });
      });

      const corePos = nodePosMap.get('core')!;
      const outerNodes = NODES.filter((n) => !n.isCore);

      // 1. CONCENTRIC SPIDER WEB RINGS
      RINGS.forEach((ring) => {
        ctx.beginPath();
        outerNodes.forEach((n, idx) => {
          const np = nodePosMap.get(n.id)!;
          const rx = corePos.x + (np.x - corePos.x) * ring.radiusScale;
          const ry = corePos.y + (np.y - corePos.y) * ring.radiusScale;

          const nextNode = outerNodes[(idx + 1) % outerNodes.length];
          const nextNp = nodePosMap.get(nextNode.id)!;
          const nextRx = corePos.x + (nextNp.x - corePos.x) * ring.radiusScale;
          const nextRy = corePos.y + (nextNp.y - corePos.y) * ring.radiusScale;

          const midX = (rx + nextRx) / 2;
          const midY = (ry + nextRy) / 2;
          const sagX = midX + (corePos.x - midX) * 0.05;
          const sagY = midY + (corePos.y - midY) * 0.05;

          if (idx === 0) ctx.moveTo(rx, ry);
          ctx.quadraticCurveTo(sagX, sagY, nextRx, nextRy);
        });
        ctx.closePath();

        ctx.strokeStyle = `rgba(248, 250, 252, ${0.08 + ring.radiusScale * 0.06})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      // 2. RADIAL WEB STRANDS
      outerNodes.forEach((n) => {
        const np = nodePosMap.get(n.id)!;

        const lineGrad = ctx.createLinearGradient(corePos.x, corePos.y, np.x, np.y);
        lineGrad.addColorStop(0, 'rgba(255, 90, 31, 0.45)');
        lineGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
        lineGrad.addColorStop(1, 'rgba(248, 250, 252, 0.15)');

        ctx.beginPath();
        ctx.moveTo(corePos.x, corePos.y);
        ctx.lineTo(np.x, np.y);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });

      // 3. SECONDARY NEURAL INTERCONNECTS
      for (let i = 0; i < outerNodes.length; i++) {
        for (let j = i + 1; j < outerNodes.length; j++) {
          const n1 = nodePosMap.get(outerNodes[i].id)!;
          const n2 = nodePosMap.get(outerNodes[j].id)!;
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);

          if (dist < width * 0.28) {
            const alpha = (1 - dist / (width * 0.28)) * 0.14;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // 4. CORE SHOCKWAVES
      let recentCoreHitIntensity = 0;
      shockwavesRef.current.forEach((sw, idx) => {
        sw.radius += 2.2;
        sw.alpha *= 0.95;
        recentCoreHitIntensity = Math.max(recentCoreHitIntensity, sw.alpha);

        if (sw.alpha > 0.01) {
          ctx.beginPath();
          ctx.arc(corePos.x, corePos.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = sw.alpha;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        } else {
          shockwavesRef.current.splice(idx, 1);
        }
      });

      // 5. RENDER FIBER OPTIC PULSES
      const activePulses: FiberPulse[] = [];
      pulsesRef.current.forEach((p) => {
        p.progress += p.speed;

        const pFrom = nodePosMap.get(p.fromId);
        const pTo = nodePosMap.get(p.toId);

        if (pFrom && pTo && p.progress <= 1) {
          const headX = pFrom.x + (pTo.x - pFrom.x) * p.progress;
          const headY = pFrom.y + (pTo.y - pFrom.y) * p.progress;

          const tailProg = Math.max(0, p.progress - p.tailLength);
          const tailX = pFrom.x + (pTo.x - pFrom.x) * tailProg;
          const tailY = pFrom.y + (pTo.y - pFrom.y) * tailProg;

          const pulseGrad = ctx.createLinearGradient(tailX, tailY, headX, headY);
          pulseGrad.addColorStop(0, 'rgba(255, 90, 31, 0)');
          pulseGrad.addColorStop(0.7, p.color);
          pulseGrad.addColorStop(1, '#ffffff');

          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(headX, headY);
          ctx.strokeStyle = pulseGrad;
          ctx.lineWidth = p.size;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(headX, headY, p.size * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;

          activePulses.push(p);
        } else if (pTo && p.toId === 'core') {
          shockwavesRef.current.push({
            radius: 14,
            maxRadius: 85,
            alpha: 0.85,
            color: p.color,
          });
        }
      });
      pulsesRef.current = activePulses;

      // 6. RENDER CYBER SHIELD LOGO CORE & NODES
      nodePosMap.forEach(({ x, y, node }) => {
        const isHovered = hoverNodeRef.current?.id === node.id;

        if (node.isCore) {
          // Render new Cyber Shield logo core!
          drawCyberShield(x, y, time, recentCoreHitIntensity);
        } else {
          // PERIPHERAL NODE
          const r = isHovered ? 7 : node.baseRadius;

          ctx.beginPath();
          ctx.arc(x, y, r + 4, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? 'rgba(255, 90, 31, 0.35)' : 'rgba(56, 189, 248, 0.12)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? '#ff5a1f' : '#38bdf8';
          ctx.shadowColor = isHovered ? '#ff5a1f' : '#38bdf8';
          ctx.shadowBlur = isHovered ? 12 : 6;
          ctx.fill();
          ctx.shadowBlur = 0;

          if (isHovered) {
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(node.name, x, y - 14);
          }
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, [spawnPulse]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mousePosRef.current = { x: mx, y: my };

    const w = rect.width;
    const h = rect.height;

    let found: WebNode | null = null;
    NODES.forEach((n) => {
      const px = n.rx * w;
      const py = n.ry * h;
      if (Math.hypot(mx - px, my - py) < 28) {
        found = n;
      }
    });

    hoverNodeRef.current = found;
    setHoveredName(found ? (found.isCore ? 'Escudo Ciber-Automotriz AutoRed' : found.name) : null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    NODES.forEach((n) => {
      const px = n.rx * w;
      const py = n.ry * h;
      if (Math.hypot(mx - px, my - py) < 30 && !n.isCore) {
        spawnPulse(n.id, 0.018, true);
        spawnPulse(n.id, 0.012, false);
      }
    });
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className={`w-full h-full block ${interactive ? 'cursor-pointer' : ''}`}
      />
      {hoveredName && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-slate-950/90 text-brand-primary border border-brand-primary/40 text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl pointer-events-none backdrop-blur-md z-20">
          Nodo: <span className="text-white">{hoveredName}</span> — Clic para transmitir pulsos al Escudo Central
        </div>
      )}
    </div>
  );
}
