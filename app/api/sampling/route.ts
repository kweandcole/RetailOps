import { NextResponse } from 'next/server';
import { SheetsRepository } from '@/sheets/repository';
import { approachTasteRate, conversion } from '@/domain/calculations';
import type { SamplingRow, Visit, VisitType } from '@/domain/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const required = ['outletId','merchandiser','heroSku'];
    const missing = required.filter(key => !body[key]);
    if (missing.length) return NextResponse.json({ ok:false, error:`Missing: ${missing.join(', ')}` }, { status:400 });
    const peopleApproached = Number(body.peopleApproached ?? 0);
    const peopleTasted = Number(body.peopleTasted ?? 0);
    const purchases = Number(body.purchases ?? 0);
    if ([peopleApproached, peopleTasted, purchases].some(n => !Number.isFinite(n) || n < 0) || peopleTasted > peopleApproached || purchases > peopleTasted) {
      return NextResponse.json({ ok:false, error:'Check the sampling counts: approached ≥ tasted ≥ purchases.' }, { status:400 });
    }
    const now = new Date().toISOString();
    const visitId = `V-${Date.now()}`;
    const visit: Visit = { visitId, timestamp:now, merchandiser:String(body.merchandiser), outletId:String(body.outletId), channel:body.channel ?? 'Other', visitType:'Sampling only' as VisitType, planned:false, shelfPhotoUrl:'', nextAction:String(body.nextAction ?? ''), nextVisitDate:String(body.nextVisitDate ?? '') };
    const sample: SamplingRow = {
      visitId, date:now, outletId:String(body.outletId), merchandiser:String(body.merchandiser), heroSku:String(body.heroSku),
      peopleApproached, peopleTasted, purchases,
      conversion:conversion(purchases, peopleTasted), approachTasteRate:approachTasteRate(peopleTasted, peopleApproached),
      preferredSku:String(body.preferredSku ?? ''), objections:Array.isArray(body.objections) ? body.objections.map(String) : [],
      feedback:String(body.feedback ?? ''), reorderGeneratedWithin14Days:false,
    };
    const repo = new SheetsRepository();
    await repo.appendVisit(visit);
    await repo.appendSampling(sample);
    return NextResponse.json({ ok:true, visitId, sample });
  } catch (error) {
    return NextResponse.json({ ok:false, error:error instanceof Error ? error.message : 'Unable to save sampling visit' }, { status:500 });
  }
}
