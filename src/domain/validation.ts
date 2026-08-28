import { z } from 'zod';

export const samplingInputSchema = z.object({
  peopleApproached: z.number().int().min(0),
  peopleTasted: z.number().int().min(0),
  purchases: z.number().int().min(0),
}).superRefine((v, ctx) => {
  if (v.peopleTasted > v.peopleApproached) ctx.addIssue({ code:'custom', path:['peopleTasted'], message:'People tasted cannot exceed people approached.' });
  if (v.purchases > v.peopleTasted) ctx.addIssue({ code:'custom', path:['purchases'], message:'Purchases cannot exceed people tasted.' });
});
