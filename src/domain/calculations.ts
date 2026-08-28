import type { Reorder, SamplingRow } from './types';

export function velocity(priorShelfStock:number|null, deliveredReorders:number, currentShelfStock:number):number|null {
  if (priorShelfStock === null) return null;
  return priorShelfStock + deliveredReorders - currentShelfStock;
}

export function varianceFlag(v:number|null, estimate:number|null):'CHECK'|'OK'|'' {
  if (v === null || estimate === null) return '';
  return Math.abs(v - estimate) > 5 ? 'CHECK' : 'OK';
}

export function conversion(purchases:number, tasted:number):number { return tasted === 0 ? 0 : purchases / tasted; }
export function approachTasteRate(tasted:number, approached:number):number { return approached === 0 ? 0 : tasted / approached; }

export function reorderWithin14Days(samplingDate:string, outletId:string, reorders:Reorder[]):boolean {
  const start = new Date(samplingDate).getTime();
  const end = start + 14 * 86400000;
  return reorders.some(r => r.outletId === outletId && new Date(r.dateRequested).getTime() >= start && new Date(r.dateRequested).getTime() <= end && r.status !== 'Cancelled');
}

export function rag(achievementPercent:number):'GREEN'|'YELLOW'|'RED' {
  if (achievementPercent >= 100) return 'GREEN';
  if (achievementPercent >= 58) return 'YELLOW';
  return 'RED';
}
