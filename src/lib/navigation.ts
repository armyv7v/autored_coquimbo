import { SquaresFour, MapTrifold, Pulse, ClockCounterClockwise, ShieldWarning, ShieldCheck } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

export type TabType = 'PANEL' | 'FEED' | 'HISTORIAL';

export interface NavItem {
  id: string;
  label: string;
  icon: Icon;
  tab?: TabType;
  path?: string;
  alert?: boolean;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'panel', label: 'Panel', icon: SquaresFour, tab: 'PANEL' },
  { id: 'mapa', label: 'Mapa', icon: MapTrifold, path: '/map' },
  { id: 'alerta', label: 'Alerta', icon: ShieldWarning, alert: true },
  { id: 'feed', label: 'Feed', icon: Pulse, tab: 'FEED' },
  { id: 'historial', label: 'Historial', icon: ClockCounterClockwise, tab: 'HISTORIAL' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, path: '/admin', adminOnly: true },
];