import { NextResponse } from 'next/server';
import { SheetsRepository } from '@/sheets/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const repo = new SheetsRepository();
    const [outlets, skus, visits, sampling, reorders, stock] = await Promise.all([
      repo.outlets(), repo.skus(), repo.visits(), repo.sampling(), repo.reorders(), repo.stock(),
    ]);
    const now = Date.now();
    const daysAgo = (days:number) => now - days * 86400000;
    const recentVisits = visits.filter(v => new Date(v.timestamp).getTime() >= daysAgo(7));
    const recentSampling = sampling.filter(v => new Date(v.date).getTime() >= daysAgo(30));
    const tasted = recentSampling.reduce((n,s) => n + s.peopleTasted, 0);
    const purchases = recentSampling.reduce((n,s) => n + s.purchases, 0);
    const approached = recentSampling.reduce((n,s) => n + s.peopleApproached, 0);
    const openReorders = reorders.filter(r => r.status === 'Requested' || r.status === 'Confirmed');
    const outOfStocks = stock.filter(s => s.outOfStock).length;
    const activeOutlets = outlets.filter(o => o.active).length;
    const byOutlet = outlets.map(o => ({
      outletId: o.outletId,
      retailer: o.retailer,
      branchName: o.branchName,
      priority: o.priority,
      visits7d: recentVisits.filter(v => v.outletId === o.outletId).length,
      sampling30d: recentSampling.filter(s => s.outletId === o.outletId).length,
      outOfStock: stock.filter(s => s.outletId === o.outletId && s.outOfStock).length,
    })).filter(o => o.visits7d || o.sampling30d || o.outOfStock).slice(0, 12);
    return NextResponse.json({
      ok: true,
      stats: {
        activeOutlets, visits7d: recentVisits.length, sampling30d: recentSampling.length,
        approached30d: approached, tasted30d: tasted, purchases30d: purchases,
        tasteRate: approached ? tasted / approached : 0,
        conversion: tasted ? purchases / tasted : 0,
        openReorders: openReorders.length, outOfStocks,
      },
      outlets: outlets.filter(o => o.active),
      skus: skus.filter(s => s.active),
      byOutlet,
      recentSampling: recentSampling.slice(-8).reverse(),
    });
  } catch (error) {
    return NextResponse.json({ ok:false, error: error instanceof Error ? error.message : 'Unable to load RetailOps data' }, { status:500 });
  }
}
