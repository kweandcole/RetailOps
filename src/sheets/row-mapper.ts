import type { Outlet, SKU, Visit, StockRow, SamplingRow, Reorder, RosterEntry, Retailer, Priority, VisitType, ReorderStatus, PlannedActivity } from '@/domain/types';

const bool = (v: unknown) => v === true || String(v).toLowerCase() === 'true';
const num = (v: unknown) => Number(v ?? 0);
const nullableNum = (v: unknown) => v === '' || v === null || v === undefined ? null : Number(v);

export function mapRows<T>(rows:string[][], mapper:(row:string[])=>T):T[] { const [, ...data] = rows; return data.filter(r=>r.some(Boolean)).map(mapper); }
export const outletFromRow = (r:string[]):Outlet => ({outletId:r[0]??'', retailer:r[1] as Retailer, branchName:r[2]??'', location:r[3]??'', priority:r[4] as Priority, monthlyTarget:num(r[5]), samplingTargetDays:num(r[6]), assignedMerchandiser:r[7]??'', active:bool(r[8])});
export const skuFromRow = (r:string[]):SKU => ({sku:r[0]??'', productName:r[1]??'', cogs:num(r[2]), wholesalePrice:num(r[3]), retailPrice:num(r[4]), active:bool(r[5])});
export const visitFromRow = (r:string[]):Visit => ({visitId:r[0]??'', timestamp:r[1]??'', merchandiser:r[2]??'', outletId:r[3]??'', channel:r[4] as Retailer, visitType:r[5] as VisitType, planned:bool(r[6]), shelfPhotoUrl:r[7]??'', nextAction:r[8]??'', nextVisitDate:r[9]??''});
export const stockFromRow = (r:string[]):StockRow => ({visitId:r[0]??'', date:r[1]??'', outletId:r[2]??'', sku:r[3]??'', shelfStock:num(r[4]), backStock:num(r[5]), outOfStock:bool(r[6]), expiryIssue:bool(r[7]), priorShelfStock:nullableNum(r[8]), reordersDeliveredSincePriorVisit:num(r[9]), estimatedUnitsSold:nullableNum(r[10]), merchandiserEstSold:nullableNum(r[11]), varianceFlag:(r[12]??'') as 'CHECK'|'OK'|''});
export const reorderFromRow = (r:string[]):Reorder => ({reorderId:r[0]??'', visitId:r[1]??'', dateRequested:r[2]??'', outletId:r[3]??'', merchandiser:r[4]??'', sku:r[5]??'', quantity:num(r[6]), status:r[7] as ReorderStatus, followUpDate:r[8]??'', dateDelivered:r[9]??''});
export const rosterFromRow = (r:string[]):RosterEntry => ({week:r[0]??'', day:r[1]??'', plannedDate:r[2]??'', merchandiser:r[3]??'', outletId:r[4]??'', plannedActivity:r[5] as PlannedActivity, sampling:bool(r[6]), actualDate:r[7]??'', completed:bool(r[8]), notes:r[9]??''});
export const samplingFromRow = (r:string[]):SamplingRow => ({visitId:r[0]??'', date:r[1]??'', outletId:r[2]??'', merchandiser:r[3]??'', heroSku:r[4]??'', peopleApproached:num(r[5]), peopleTasted:num(r[6]), purchases:num(r[7]), conversion:num(r[8]), approachTasteRate:num(r[9]), preferredSku:r[10]??'', objections:(r[11]??'').split(',').filter(Boolean), feedback:r[12]??'', reorderGeneratedWithin14Days:bool(r[13])});
