import { appendRows, readRange } from './google-sheets';
import { mapRows, outletFromRow, skuFromRow, visitFromRow, stockFromRow, samplingFromRow, reorderFromRow, rosterFromRow } from './row-mapper';
import type { Outlet, SKU, Visit, StockRow, SamplingRow, Reorder, RosterEntry } from '@/domain/types';

export class SheetsRepository {
  async outlets():Promise<Outlet[]> { return mapRows(await readRange("'Outlet Master'!A:I"), outletFromRow); }
  async skus():Promise<SKU[]> { return mapRows(await readRange("'SKU Master'!A:F"), skuFromRow); }
  async visits():Promise<Visit[]> { return mapRows(await readRange("'Visits'!A:J"), visitFromRow); }
  async stock():Promise<StockRow[]> { return mapRows(await readRange("'Stock'!A:M"), stockFromRow); }
  async sampling():Promise<SamplingRow[]> { return mapRows(await readRange("'Sampling'!A:N"), samplingFromRow); }
  async reorders():Promise<Reorder[]> { return mapRows(await readRange("'Reorders'!A:J"), reorderFromRow); }
  async roster():Promise<RosterEntry[]> { return mapRows(await readRange("'Roster'!A:J"), rosterFromRow); }
  async appendVisit(v:Visit) { return appendRows('Visits', [[v.visitId,v.timestamp,v.merchandiser,v.outletId,v.channel,v.visitType,v.planned,v.shelfPhotoUrl,v.nextAction,v.nextVisitDate]]); }
  async appendStock(rows:StockRow[]) { return appendRows('Stock', rows.map(v=>[v.visitId,v.date,v.outletId,v.sku,v.shelfStock,v.backStock,v.outOfStock,v.expiryIssue,v.priorShelfStock ?? '',v.reordersDeliveredSincePriorVisit,v.estimatedUnitsSold ?? '',v.merchandiserEstSold ?? '',v.varianceFlag])); }
  async appendSampling(v:SamplingRow) { return appendRows('Sampling', [[v.visitId,v.date,v.outletId,v.merchandiser,v.heroSku,v.peopleApproached,v.peopleTasted,v.purchases,v.conversion,v.approachTasteRate,v.preferredSku,v.objections.join(','),v.feedback,v.reorderGeneratedWithin14Days]]); }
  async appendReorder(v:Reorder) { return appendRows('Reorders', [[v.reorderId,v.visitId,v.dateRequested,v.outletId,v.merchandiser,v.sku,v.quantity,v.status,v.followUpDate,v.dateDelivered]]); }
}
