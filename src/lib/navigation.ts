import { LayoutDashboard, Map as MapIcon, Activity, History, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TabType = 'PANEL' | 'FEED' | 'HISTORIAL';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  tab?: TabType;
  path?: string;
  alert?: boolean;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'panel', label: 'Panel', icon: LayoutDashboard, tab: 'PANEL' },
  { id: 'mapa', label: 'Mapa', icon: MapIcon, path: '/map' },
  { id: 'alerta', label: 'Alerta', icon: ShieldAlert, alert: true },
  { id: 'feed', label: 'Feed', icon: Activity, tab: 'FEED' },
  { id: 'historial', label: 'Historial', icon: History, tab: 'HISTORIAL' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, path: '/admin', adminOnly: true },
];