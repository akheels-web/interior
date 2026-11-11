// Client-safe copy of the billing constants in src/server/projects.ts (amounts in paise).
// estimate.test.ts fails if the two drift apart.
export const PLAN={monthlyPrice:149900,included:10,addonPrice:29900,addonQuantity:2};

/** What a month with `projects` new projects costs: the studio plan plus the extra packs it needs. */
export function estimateMonth(projects:number){
  const extra=Math.max(0,projects-PLAN.included),packs=Math.ceil(extra/PLAN.addonQuantity),total=PLAN.monthlyPrice+packs*PLAN.addonPrice;
  return {packs,total,carried:packs*PLAN.addonQuantity-extra,perProject:Math.round(total/Math.max(1,projects))};
}

export const rupees=(paise:number)=>`₹${Math.round(paise/100).toLocaleString('en-IN')}`;
