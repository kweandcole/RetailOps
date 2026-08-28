import { velocity, varianceFlag } from '@/domain/calculations';
import type { Reorder, StockRow } from '@/domain/types';

export function calculateStockMetrics(outletId:string, sku:string, date:string, currentShelfStock:number, estimate:number|null, priorRows:StockRow[], reorders:Reorder[]) {
  const prior = priorRows.filter(r=>r.outletId===outletId && r.sku===sku && new Date(r.date).getTime() < new Date(date).getTime()).sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())[0];
  const priorShelfStock = prior?.shelfStock ?? null;
  const priorDate = prior?.date ? new Date(prior.date).getTime() : null;
  const currentDate = new Date(date).getTime();
  const delivered = priorDate === null ? 0 : reorders.filter(r => r.outletId===outletId && r.sku===sku && r.status==='Delivered' && new Date(r.dateDelivered || r.dateRequested).getTime() > priorDate && new Date(r.dateDelivered || r.dateRequested).getTime() <= currentDate).reduce((sum,r)=>sum+r.quantity,0);
  const sold = velocity(priorShelfStock, delivered, currentShelfStock);
  return { priorShelfStock, reordersDeliveredSincePriorVisit: delivered, estimatedUnitsSold:sold, varianceFlag:varianceFlag(sold, estimate) };
}
