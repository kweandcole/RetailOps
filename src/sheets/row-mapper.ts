import type { Outlet, SKU, Visit, StockRow, SamplingRow, Reorder, RosterEntry, Retailer, Priority, VisitType, ReorderStatus, PlannedActivity } from '@/domain/types';

const bool = (v: unknown) => v === true || String(v).toLowerCase() === 'true';
const num = (v: unknown) => Number(v ?? 0);
const nullableNum = (v: unknown) => v === '' || v === null || v === undefined ? null : Number(v);

export function mapRows<T>(rows:string[][], mapper:(row:string[])=>T):T[] { const [, ...data] = rows; return data.filter(r=>r.some(Boolean)).map(mapper); }

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

function column(headers: string[], aliases: string[]) {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(normalizeHeader(alias));
    if (index >= 0) return index;
  }
  return -1;
}

const valueAt = (row: string[], index: number, fallback = '') => index >= 0 ? (row[index] ?? fallback) : fallback;

export function outletsFromRows(rows: string[][]): Outlet[] {
  if (!rows.length) return [];
  const headers = rows[0] ?? [];

  const id = column(headers, ['outletId', 'retailerCode', 'retailer-code', 'outletCode', 'storeCode', 'code']);
  const retailer = column(headers, ['retailer', 'retailerName', 'retailerName']);
  const branch = column(headers, ['branchName', 'branch', 'branchName/store', 'storeName', 'store', 'outletName', 'outlet']);
  const location = column(headers, ['location', 'address', 'area']);
  const priority = column(headers, ['priority']);
  const monthlyTarget = column(headers, ['monthlyTarget', 'monthlyTargetUnits', 'target']);
  const samplingTargetDays = column(headers, ['samplingTargetDays', 'samplingDays']);
  const assignedMerchandiser = column(headers, ['assignedMerchandiser', 'merchandiser']);
  const active = column(headers, ['active', 'status']);

  return rows.slice(1).filter(r => r.some(Boolean)).map((r) => ({
    outletId: valueAt(r, id, valueAt(r, 0)),
    retailer: valueAt(r, retailer, valueAt(r, 1)) as Retailer,
    branchName: valueAt(r, branch, valueAt(r, 2)),
    location: valueAt(r, location, valueAt(r, 3)),
    priority: valueAt(r, priority, valueAt(r, 4)) as Priority,
    monthlyTarget: num(valueAt(r, monthlyTarget, valueAt(r, 5))),
    samplingTargetDays: num(valueAt(r, samplingTargetDays, valueAt(r, 6))),
    assignedMerchandiser: valueAt(r, assignedMerchandiser, valueAt(r, 7)),
    active: bool(valueAt(r, active, valueAt(r, 8))),
  }));
}

export const outletFromRow = (r:string[]):Outlet => ({outletId:r[0]??'', retailer:r[1] as Retailer, branchName:r[2]??'', location:r[3]??'', priority:r[4] as Priority, monthlyTarget:num(r[5]), samplingTargetDays:num(r[6]), assignedMerchandiser:r[7]??'', active:bool(r[8])});
export const skuFromRow = (r:string[]):SKU => ({sku:r[0]??'', productName:r[1]??'', cogs:num(r[2]), wholesalePrice:num(r[3]), retailPrice:num(r[4]), active:bool(r[5])});
export const visitFromRow = (r:string[]):Visit => ({visitId:r[0]??'', timestamp:r[1]??'', merchandiser:r[2]??'', outletId:r[3]??'', channel:r[4] as Retailer, visitType:r[5] as VisitType, planned:bool(r[6]), shelfPhotoUrl:r[7]??'', nextAction:r[8]??'', nextVisitDate:r[9]??''});
export const stockFromRow = (r:string[]):StockRow => ({visitId:r[0]??'', date:r[1]??'', outletId:r[2]??'', sku:r[3]??'', shelfStock:num(r[4]), backStock:num(r[5]), outOfStock:bool(r[6]), expiryIssue:bool(r[7]), priorShelfStock:nullableNum(r[8]), reordersDeliveredSincePriorVisit:num(r[9]), estimatedUnitsSold:nullableNum(r[10]), merchandiserEstSold:nullableNum(r[11]), varianceFlag:(r[12]??'') as 'CHECK'|'OK'|''});
export const reorderFromRow = (r:string[]):Reorder => ({reorderId:r[0]??'', visitId:r[1]??'', dateRequested:r[2]??'', outletId:r[3]??'', merchandiser:r[4]??'', sku:r[5]??'', quantity:num(r[6]), status:r[7] as ReorderStatus, followUpDate:r[8]??'', dateDelivered:r[9]??''});
export const rosterFromRow = (r:string[]):RosterEntry => ({week:r[0]??'', day:r[1]??'', plannedDate:r[2]??'', merchandiser:r[3]??'', outletId:r[4]??'', plannedActivity:r[5] as PlannedActivity, sampling:bool(r[6]), actualDate:r[7]??'', completed:bool(r[8]), notes:r[9]??''});
export const samplingFromRow = (r:string[]):SamplingRow => ({visitId:r[0]??'', date:r[1]??'', outletId:r[2]??'', merchandiser:r[3]??'', heroSku:r[4]??'', peopleApproached:num(r[5]), peopleTasted:num(r[6]), purchases:num(r[7]), conversion:num(r[8]), approachTasteRate:num(r[9]), preferredSku:r[10]??'', objections:(r[11]??'').split(',').filter(Boolean), feedback:r[12]??'', reorderGeneratedWithin14Days:bool(r[13])});
