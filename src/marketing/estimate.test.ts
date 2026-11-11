import {describe,expect,it} from 'vitest';
import {PLAN,estimateMonth,rupees} from './estimate';

describe('estimateMonth',()=>{
  it('covers up to the monthly allowance with the plan alone',()=>{
    expect(estimateMonth(1)).toEqual({packs:0,total:149900,carried:0,perProject:149900});
    expect(estimateMonth(10)).toEqual({packs:0,total:149900,carried:0,perProject:14990});
  });
  it('adds extra packs of two and carries the unused credit forward',()=>{
    expect(estimateMonth(11)).toMatchObject({packs:1,total:179800,carried:1});
    expect(estimateMonth(12)).toMatchObject({packs:1,total:179800,carried:0});
    expect(estimateMonth(15)).toMatchObject({packs:3,total:239600,carried:1});
  });
  it('formats paise as Indian rupees',()=>{
    expect(rupees(149900)).toBe('₹1,499');
    expect(rupees(1049900)).toBe('₹10,499');
  });
  it('matches the server billing constants',async()=>{
    const server=await import('../server/projects');
    expect(PLAN).toEqual({monthlyPrice:server.MONTHLY_PRICE,included:server.MONTHLY_LIMIT,addonPrice:server.ADDON_PRICE,addonQuantity:server.ADDON_QUANTITY});
  });
});
