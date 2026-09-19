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

export type SheetName = typeof SHEET_NAMES[keyof typeof SHEET_NAMES];

export const EXPECTED_HEADERS: Record<SheetName, string[]> = {
  'Outlet Master': ['Outlet ID','Retailer','Branch Name','Location','Priority','Monthly Target','Sampling Target Days','Assigned Merchandiser','Active'],
  'SKU Master': ['SKU','Product Name','COGS','Wholesale Price','Retail Price','Active'],
  'Visits': ['Visit ID','Timestamp','Merchandiser','Outlet ID','Channel','Visit Type','Planned','Shelf Photo URL','Next Action','Next Visit Date'],
  'Stock': ['Visit ID','Date','Outlet ID','SKU','Shelf Stock','Back Stock','Out of Stock','Expiry Issue','Prior Shelf Stock','Reorders Delivered Since Prior Visit','Estimated Units Sold','Merchandiser Est Sold','Variance Flag'],
  'Sampling': ['Visit ID','Date','Outlet ID','Merchandiser','Hero SKU','People Approached','People Tasted','Purchases','Conversion','Approach Taste Rate','Preferred SKU','Objections','Feedback','Reorder Generated Within 14 Days'],
  'Reorders': ['Reorder ID','Visit ID','Date Requested','Outlet ID','Merchandiser','SKU','Quantity','Status','Follow Up Date','Date Delivered'],
  'Roster': ['Week','Day','Planned Date','Merchandiser','Outlet ID','Planned Activity','Sampling','Actual Date','Completed','Notes'],
};