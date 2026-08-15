import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../lib/soundEngine';

export interface WebNode {
  id: string;
  name: string;
  sector: string;
  rx: number; // 0..1 relative position
  ry: number; // 0..1 relative position
  isCore?: boolean;
  baseRadius: number;
  status: 'ONLINE' | 'STANDBY' | 'ALERT';
  latency: number;
  dealersCount: number;
}

interface WebRingPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
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
  isHighEnergy?: boolean;
}

interface CoreShockwave {
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface MicroSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const NODES: WebNode[] = [
  { id: 'core', name: 'Centro de Comando AutoRed', sector: 'Nodo Matriz', rx: 0.48, ry: 0.5, isCore: true, baseRadius: 28, status: 'ONLINE', latency: 4, dealersCount: 14 },
  { id: 'n1', name: 'Ruta 5 Norte', sector: 'Sector Norte', rx: 0.18, ry: 0.18, baseRadius: 6, status: 'ONLINE', latency: 8, dealersCount: 3 },
  { id: 'n2', name: 'Muelle Fiscal', sector: 'Zona Portuaria', rx: 0.42, ry: 0.14, baseRadius: 6, status: 'ONLINE', latency: 12, dealersCount: 2 },
  { id: 'n3', name: 'Zona Puerto / Altamira', sector: 'Sector Costero', rx: 0.72, ry: 0.18, baseRadius: 6, status: 'ONLINE', latency: 11, dealersCount: 4 },
  { id: 'n4', name: 'Peaje Ruta 43', sector: 'Acceso Suroriente', rx: 0.86, ry: 0.32, baseRadius: 6, status: 'ONLINE', latency: 15, dealersCount: 1 },
  { id: 'n5', name: 'Centro Coquimbo', sector: 'Casco Central', rx: 0.14, ry: 0.72, baseRadius: 6, status: 'ONLINE', latency: 7, dealersCount: 5 },
  { id: 'n6', name: 'Patio Automotriz Norte', sector: 'Parque Automotriz', rx: 0.35, ry: 0.84, baseRadius: 6, status: 'ONLINE', latency: 9, dealersCount: 6 },
  { id: 'n7', name: 'Patio Automotriz Sur', sector: 'Parque Industrial', rx: 0.65, ry: 0.82, baseRadius: 6, status: 'ONLINE', latency: 10, dealersCount: 4 },
  { id: 'n8', name: 'Acceso Panul / El Culebrón', sector: 'Acceso Sur', rx: 0.88, ry: 0.68, baseRadius: 6, status: 'ONLINE', latency: 14, dealersCount: 2 },
  { id: 'n9', name: 'Barrio Industrial', sector: 'Zona Logística', rx: 0.28, ry: 0.45, baseRadius: 5, status: 'ONLINE', latency: 9, dealersCount: 3 },
  { id: 'n10', name: 'Costanera La Herradura', sector: 'Ribera Sur', rx: 0.76, ry: 0.48, baseRadius: 5, status: 'ONLINE', latency: 13, dealersCount: 2 },
];

const RING_SCALES = [0.20, 0.42, 0.68, 0.90];
const PENTATONIC_FREQS = [261.63, 293.66, 329.63, 392.00, 523.25, 587.33, 659.25, 783.99];

interface InteractiveNetworkWebProps {
  className?: string;
  interactive?: boolean;
  pulseTriggerCount?: number;
  stormActive?: boolean;
  selectedNodeId?: string | null;
  onNodeSelect?: (node: WebNode) => void;
}

export default function InteractiveNetworkWeb({
  className = '',
  interactive = true,
  pulseTriggerCount = 0,
  stormActive = false,
  selectedNodeId = null,
  onNodeSelect,
}: InteractiveNetworkWebProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulsesRef = useRef<FiberPulse[]>([]);
  const shockwavesRef = useRef<CoreShockwave[]>([]);
  const sparksRef = useRef<MicroSpark[]>([]);
  const mousePosRef = useRef<{ x: number; y: number; prevX: number; prevY: number; speed: number }>({
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    speed: 0,
  });
  
  const hoverNodeRef = useRef<WebNode | null>(null);
  const stormActiveRef = useRef(stormActive);
  stormActiveRef.current = stormActive;

  const spawnPulse = useCallback((fromId: string, speed = 0.008 + Math.random() * 0.006, isHighEnergy = false, playAudio = false) => {
    const color = stormActiveRef.current || isHighEnergy
      ? '#ef4444'
      : Math.random() > 0.4
      ? '#ff6b00'
      : '#0ea5e9';

    pulsesRef.current.push({
      id: Math.random(),
      fromId,
      toId: 'core',
      progress: 0,
      speed: isHighEnergy ? 0.020 : speed,
      color,
      size: isHighEnergy ? 4.0 : 2.5,
      tailLength: isHighEnergy ? 0.28 : 0.18,
      isHighEnergy,
    });

    if (playAudio) {
      sound.playNodePulse(isHighEnergy || stormActiveRef.current);
    }
  }, []);

  const spawnSparks = (x: number, y: number, count = 8, color = '#ff6b00') => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.5;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 20 + Math.random() * 25,
        color,
        size: 1 + Math.random() * 2,
      });
    }
  };

  // External trigger burst
  const prevTriggerRef = useRef(pulseTriggerCount);
  useEffect(() => {
    if (pulseTriggerCount > prevTriggerRef.current) {
      const outerIds = NODES.filter((n) => !n.isCore).map((n) => n.id);
      outerIds.forEach((id, i) => {
        setTimeout(() => spawnPulse(id, 0.020, true, i === 0), i * 45);
      });
      prevTriggerRef.current = pulseTriggerCount;
    }
  }, [pulseTriggerCount, spawnPulse]);

  // Handle programmatic node selection from parent
  useEffect(() => {
    if (selectedNodeId) {
      const target = NODES.find((n) => n.id === selectedNodeId);
      if (target) {
        spawnPulse(target.id, 0.022, true, true);
        hoverNodeRef.current = target;
      }
    }
  }, [selectedNodeId, spawnPulse]);

  // Main Canvas & WebGL-level Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
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

    // Auto organic pulse generator (Silent background ambiance)
    const interval = setInterval(() => {
      const outerNodes = NODES.filter((n) => !n.isCore);
      const randNode = outerNodes[Math.floor(Math.random() * outerNodes.length)];
      spawnPulse(randNode.id, 0.007, false, false);
    }, 1100);

    let time = 0;
    let lastPluckTime = 0;

    // Draw Cyber Shield Matrix Core with Glowing Forcefield
    const drawCyberShield = (cx: number, cy: number, timeVal: number, glowIntensity: number) => {
      const sw = 48; // Shield width
      const sh = 56; // Shield height

      ctx.save();
      ctx.translate(cx, cy);

      const isStorm = stormActiveRef.current;
      const primaryColor = isStorm ? '#ef4444' : '#ff6b00';
      const secondaryColor = isStorm ? '#dc2626' : '#0ea5e9';

      // 1. Radiant Aura & Plasma Core Glow
      const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 75);
      aura.addColorStop(0, isStorm ? 'rgba(239, 68, 68, 0.7)' : `rgba(255, 107, 0, ${0.45 + glowIntensity * 0.4})`);
      aura.addColorStop(0.4, isStorm ? 'rgba(220, 38, 38, 0.3)' : 'rgba(14, 165, 233, 0.2)');
      aura.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, Math.PI * 2);
      ctx.fillStyle = aura;
      ctx.fill();

      // Helper function to define shield path
      const createShieldPath = (scale: number) => {
        const w = (sw / 2) * scale;
        const h = (sh / 2) * scale;
        ctx.beginPath();
        ctx.moveTo(0, -h - 5 * scale);
        ctx.quadraticCurveTo(w * 0.5, -h - 7 * scale, w, -h + 7 * scale);
        ctx.quadraticCurveTo(w * 1.15, h * 0.35, 0, h + 9 * scale);
        ctx.quadraticCurveTo(-w * 1.15, h * 0.35, -w, -h + 7 * scale);
        ctx.quadraticCurveTo(-w * 0.5, -h - 7 * scale, 0, -h - 5 * scale);
        ctx.closePath();
      };

      // 2. Rotating Tachyon Ring
      ctx.save();
      ctx.rotate(timeVal * 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.setLineDash([6, 10]);
      ctx.strokeStyle = `${secondaryColor}88`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 3. Outer Cyber Shield Contour
      createShieldPath(1.0);
      ctx.fillStyle = 'rgba(2, 6, 18, 0.92)';
      ctx.fill();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 20 + Math.sin(timeVal * 4) * 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 4. Inner Tech Accent Shield Contour
      createShieldPath(0.72);
      ctx.strokeStyle = `${secondaryColor}cc`;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 5. Central Diamond Core (Custodia & Conexión)
      const dSize = 11 + Math.sin(timeVal * 5) * 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -dSize);
      ctx.lineTo(dSize, 0);
      ctx.lineTo(0, dSize);
      ctx.lineTo(-dSize, 0);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 6. Crosshair Lines extending from diamond
      ctx.beginPath();
      ctx.moveTo(0, -dSize - 5); ctx.lineTo(0, -sh * 0.38);
      ctx.moveTo(0, dSize + 5); ctx.lineTo(0, sh * 0.42);
      ctx.moveTo(-dSize - 5, 0); ctx.lineTo(-sw * 0.36, 0);
      ctx.moveTo(dSize + 5, 0); ctx.lineTo(sw * 0.36, 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.restore();
    };

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const mouse = mousePosRef.current;
      mouse.speed = Math.hypot(mouse.x - mouse.prevX, mouse.y - mouse.prevY);
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      const nodePosMap = new Map<string, { x: number; y: number; node: WebNode }>();

      // Compute Floating Nodes with Elastic Mouse Reaction
      NODES.forEach((n) => {
        const floatX = Math.sin(time * 0.8 + n.rx * 14) * 6;
        const floatY = Math.cos(time * 0.9 + n.ry * 14) * 6;
        
        let px = n.rx * width + floatX;
        let py = n.ry * height + floatY;

        const distMouse = Math.hypot(mouse.x - px, mouse.y - py);
        if (distMouse < 200 && !n.isCore) {
          const force = (1 - distMouse / 200) * 16;
          const angle = Math.atan2(mouse.y - py, mouse.x - px);
          px += Math.cos(angle) * force;
          py += Math.sin(angle) * force;
        }

        nodePosMap.set(n.id, { x: px, y: py, node: n });
      });

      const corePos = nodePosMap.get('core')!;
      const outerNodes = NODES.filter((n) => !n.isCore);
      const isStorm = stormActiveRef.current;

      // 1. ORGANIC SPRING-MASS SPIDER WEB RINGS
      RING_SCALES.forEach((scale, ringIdx) => {
        ctx.beginPath();
        outerNodes.forEach((n, idx) => {
          const np = nodePosMap.get(n.id)!;
          const rx = corePos.x + (np.x - corePos.x) * scale;
          const ry = corePos.y + (np.y - corePos.y) * scale;

          const nextNode = outerNodes[(idx + 1) % outerNodes.length];
          const nextNp = nodePosMap.get(nextNode.id)!;
          const nextRx = corePos.x + (nextNp.x - corePos.x) * scale;
          const nextRy = corePos.y + (nextNp.y - corePos.y) * scale;

          // Catenary sag curve
          const midX = (rx + nextRx) / 2;
          const midY = (ry + nextRy) / 2;
          const sagX = midX + (corePos.x - midX) * 0.08;
          const sagY = midY + (corePos.y - midY) * 0.08;

          // Mouse Pluck Interaction on web strands
          const distToMid = Math.hypot(mouse.x - midX, mouse.y - midY);
          let deformedX = sagX;
          let deformedY = sagY;

          if (distToMid < 70) {
            const pushFactor = (1 - distToMid / 70) * 20;
            const pushAngle = Math.atan2(sagY - mouse.y, sagX - mouse.x);
            deformedX += Math.cos(pushAngle) * pushFactor;
            deformedY += Math.sin(pushAngle) * pushFactor;

            // Trigger harmonic pluck ONLY on high-velocity mouse crossing
            if (mouse.speed > 12 && Date.now() - lastPluckTime > 140) {
              const freq = PENTATONIC_FREQS[ringIdx % PENTATONIC_FREQS.length];
              sound.playWebPluck(freq, 1.1);
              spawnSparks(mouse.x, mouse.y, 4, isStorm ? '#ef4444' : '#ff6b00');
              lastPluckTime = Date.now();
            }
          }

          if (idx === 0) ctx.moveTo(rx, ry);
          ctx.quadraticCurveTo(deformedX, deformedY, nextRx, nextRy);
        });

        ctx.closePath();
        ctx.strokeStyle = isStorm
          ? `rgba(239, 68, 68, ${0.22 + scale * 0.15})`
          : `rgba(248, 250, 252, ${0.10 + scale * 0.08})`;
        ctx.lineWidth = isStorm ? 1.1 : 0.75;
        ctx.stroke();
      });

      // 2. RADIAL ELASTIC FIBER STRANDS (Center to Nodes)
      outerNodes.forEach((n, idx) => {
        const np = nodePosMap.get(n.id)!;

        const lineGrad = ctx.createLinearGradient(corePos.x, corePos.y, np.x, np.y);
        if (isStorm) {
          lineGrad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
          lineGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.45)');
          lineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
        } else {
          lineGrad.addColorStop(0, 'rgba(255, 107, 0, 0.55)');
          lineGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.35)');
          lineGrad.addColorStop(1, 'rgba(248, 250, 252, 0.2)');
        }

        const midRx = (corePos.x + np.x) / 2;
        const midRy = (corePos.y + np.y) / 2;
        const distToRadial = Math.hypot(mouse.x - midRx, mouse.y - midRy);
        let pullX = midRx;
        let pullY = midRy;

        if (distToRadial < 75) {
          pullX += (mouse.x - midRx) * 0.2;
          pullY += (mouse.y - midRy) * 0.2;

          if (mouse.speed > 14 && Date.now() - lastPluckTime > 140) {
            const freq = PENTATONIC_FREQS[idx % PENTATONIC_FREQS.length];
            sound.playWebPluck(freq, 1.2);
            spawnSparks(mouse.x, mouse.y, 5, isStorm ? '#ef4444' : '#0ea5e9');
            lastPluckTime = Date.now();
          }
        }

        ctx.beginPath();
        ctx.moveTo(corePos.x, corePos.y);
        ctx.quadraticCurveTo(pullX, pullY, np.x, np.y);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = isStorm ? 1.4 : 0.9;
        ctx.stroke();
      });

      // 3. SECONDARY NEURAL INTERCONNECTS
      for (let i = 0; i < outerNodes.length; i++) {
        for (let j = i + 1; j < outerNodes.length; j++) {
          const n1 = nodePosMap.get(outerNodes[i].id)!;
          const n2 = nodePosMap.get(outerNodes[j].id)!;
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);

          if (dist < width * 0.32) {
            const alpha = (1 - dist / (width * 0.32)) * (isStorm ? 0.25 : 0.16);
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = isStorm ? `rgba(239, 68, 68, ${alpha})` : `rgba(14, 165, 233, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // 4. CORE SHOCKWAVES
      let recentCoreHitIntensity = 0;
      shockwavesRef.current.forEach((sw, idx) => {
        sw.radius += 3.2;
        sw.alpha *= 0.94;
        recentCoreHitIntensity = Math.max(recentCoreHitIntensity, sw.alpha);

        if (sw.alpha > 0.01) {
          ctx.beginPath();
          ctx.arc(corePos.x, corePos.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = sw.alpha;
          ctx.lineWidth = 2.0;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        } else {
          shockwavesRef.current.splice(idx, 1);
        }
      });

      // 5. FIBER OPTIC PULSES
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
          pulseGrad.addColorStop(0, 'rgba(255, 107, 0, 0)');
          pulseGrad.addColorStop(0.6, p.color);
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
          ctx.shadowBlur = 14;
          ctx.fill();
          ctx.shadowBlur = 0;

          if (Math.random() > 0.7) {
            spawnSparks(headX, headY, 1, p.color);
          }

          activePulses.push(p);
        } else if (pTo && p.toId === 'core') {
          shockwavesRef.current.push({
            radius: 18,
            maxRadius: 110,
            alpha: 0.95,
            color: p.color,
          });
          spawnSparks(corePos.x, corePos.y, p.isHighEnergy ? 16 : 8, p.color);
          if (p.isHighEnergy) {
            sound.playCoreImpact(1.4);
          }
        }
      });
      pulsesRef.current = activePulses;

      // 6. MICRO SPARKS
      const activeSparks: MicroSpark[] = [];
      sparksRef.current.forEach((sp) => {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.95;
        sp.vy *= 0.95;
        sp.life -= 1 / sp.maxLife;

        if (sp.life > 0) {
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2);
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = sp.life;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          activeSparks.push(sp);
        }
      });
      sparksRef.current = activeSparks;

      // 7. NODES
      nodePosMap.forEach(({ x, y, node }) => {
        const isHovered = hoverNodeRef.current?.id === node.id || selectedNodeId === node.id;

        if (node.isCore) {
          drawCyberShield(x, y, time, recentCoreHitIntensity);
        } else {
          const r = isHovered ? 8 : node.baseRadius;
          const nodeColor = isStorm ? '#ef4444' : isHovered ? '#ff6b00' : '#0ea5e9';

          ctx.beginPath();
          ctx.arc(x, y, r + 5, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? 'rgba(255, 107, 0, 0.4)' : 'rgba(14, 165, 233, 0.15)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = nodeColor;
          ctx.shadowColor = nodeColor;
          ctx.shadowBlur = isHovered ? 16 : 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          if (isHovered) {
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 6;
            ctx.fillText(node.name, x, y - 16);
            ctx.shadowBlur = 0;
          }
        }
      });

      // 8. HUD CURSOR RETICLE
      if (mouse.x > 0 && mouse.y > 0) {
        ctx.save();
        ctx.translate(mouse.x, mouse.y);
        ctx.rotate(time * 1.5);
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = isStorm ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 107, 0, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, [spawnPulse, selectedNodeId]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mousePosRef.current.x = mx;
    mousePosRef.current.y = my;

    const w = rect.width;
    const h = rect.height;

    let found: WebNode | null = null;
    NODES.forEach((n) => {
      const px = n.rx * w;
      const py = n.ry * h;
      if (Math.hypot(mx - px, my - py) < 32) {
        found = n;
      }
    });

    hoverNodeRef.current = found;
  };

  const handleMouseLeave = () => {
    mousePosRef.current.x = -1000;
    mousePosRef.current.y = -1000;
    hoverNodeRef.current = null;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    let clickedNode: WebNode | null = null;
    NODES.forEach((n) => {
      const px = n.rx * w;
      const py = n.ry * h;
      if (Math.hypot(mx - px, my - py) < 35) {
        clickedNode = n;
        if (!n.isCore) {
          spawnPulse(n.id, 0.022, true, true);
          spawnSparks(px, py, 12, '#ff6b00');
        } else {
          NODES.filter((item) => !item.isCore).forEach((item, i) => {
            setTimeout(() => spawnPulse(item.id, 0.016, true, i === 0), i * 45);
          });
          sound.playCoreImpact(1.6);
        }
      }
    });

    if (clickedNode && onNodeSelect) {
      onNodeSelect(clickedNode);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`w-full h-full block ${interactive ? 'cursor-crosshair' : ''}`}
      />
    </div>
  );
}
