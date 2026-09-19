export type Retailer = 'Chandarana' | 'Zucchini' | 'ONN The Way' | 'Other';
export type Priority = 'High' | 'Medium' | 'Low';
export type VisitType = 'Merchandising only' | 'Sampling only' | 'Merchandising + Sampling' | 'Retailer check-in only';
export type ReorderStatus = 'Requested' | 'Confirmed' | 'Delivered' | 'Cancelled';
export type PlannedActivity = 'Merchandising' | 'Sampling' | 'Both';

export interface Outlet { outletId:string; retailer:Retailer; branchName:string; location:string; priority:Priority; monthlyTarget:number; samplingTargetDays:number; assignedMerchandiser:string; active:boolean; }
export interface SKU { sku:string; productName:string; cogs:number; wholesalePrice:number; retailPrice:number; active:boolean; }
export interface Visit { visitId:string; timestamp:string; merchandiser:string; outletId:string; channel:Retailer; visitType:VisitType; planned:boolean; shelfPhotoUrl:string; nextAction:string; nextVisitDate:string; }
export interface StockRow { visitId:string; date:string; outletId:string; sku:string; shelfStock:number; backStock:number; outOfStock:boolean; expiryIssue:boolean; priorShelfStock:number|null; reordersDeliveredSincePriorVisit:number; estimatedUnitsSold:number|null; merchandiserEstSold:number|null; varianceFlag:'CHECK'|'OK'|''; }
export interface SamplingRow { visitId:string; date:string; outletId:string; merchandiser:string; heroSku:string; peopleApproached:number; peopleTasted:number; purchases:number; conversion:number; approachTasteRate:number; preferredSku:string; objections:string[]; feedback:string; reorderGeneratedWithin14Days:boolean; }
export interface Reorder { reorderId:string; visitId:string; dateRequested:string; outletId:string; merchandiser:string; sku:string; quantity:number; status:ReorderStatus; followUpDate:string; dateDelivered:string; }
export interface RosterEntry { week:string; day:string; plannedDate:string; merchandiser:string; outletId:string; plannedActivity:PlannedActivity; sampling:boolean; actualDate:string; completed:boolean; notes:string; }

export const SHEET_NAMES = {
  OUTLETS: 'Outlet Master',
  SKUS: 'SKU Master',
  VISITS: 'Visits',
  STOCK: 'Stock',
  SAMPLING: 'Sampling',
  REORDERS: 'Reorders',
  ROSTER: 'Roster',
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

export const EXPECTED_HEADERS: Record<SheetName, string[]> = {
  [SHEET_NAMES.OUTLETS]: ['outletId', 'retailer', 'branchName', 'location', 'priority', 'monthlyTarget', 'samplingTargetDays', 'assignedMerchandiser', 'active'],
  [SHEET_NAMES.SKUS]: ['sku', 'productName', 'cogs', 'wholesalePrice', 'retailPrice', 'active'],
  [SHEET_NAMES.VISITS]: ['visitId', 'timestamp', 'merchandiser', 'outletId', 'channel', 'visitType', 'planned', 'shelfPhotoUrl', 'nextAction', 'nextVisitDate'],
  [SHEET_NAMES.STOCK]: ['visitId', 'date', 'outletId', 'sku', 'shelfStock', 'backStock', 'outOfStock', 'expiryIssue', 'priorShelfStock', 'reordersDeliveredSincePriorVisit', 'estimatedUnitsSold', 'merchandiserEstSold', 'varianceFlag'],
  [SHEET_NAMES.SAMPLING]: ['visitId', 'date', 'outletId', 'merchandiser', 'heroSku', 'peopleApproached', 'peopleTasted', 'purchases', 'conversion', 'approachTasteRate', 'preferredSku', 'objections', 'feedback', 'reorderGeneratedWithin14Days'],
  [SHEET_NAMES.REORDERS]: ['reorderId', 'visitId', 'dateRequested', 'outletId', 'merchandiser', 'sku', 'quantity', 'status', 'followUpDate', 'dateDelivered'],
  [SHEET_NAMES.ROSTER]: ['week', 'day', 'plannedDate', 'merchandiser', 'outletId', 'plannedActivity', 'sampling', 'actualDate', 'completed', 'notes'],
};
