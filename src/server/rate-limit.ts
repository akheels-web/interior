import Redis from 'ioredis';
let redis:Redis|null=null,unavailableUntil=0,connecting:Promise<void>|null=null;
/** Optional cache for request throttling only. Billing, quota, users and sessions always use PostgreSQL. */
export async function cachedRateCount(bucket:string,windowSeconds:number):Promise<number|null>{
  if(!process.env.REDIS_URL||Date.now()<unavailableUntil)return null;
  try{
    if(!redis){redis=new Redis(process.env.REDIS_URL,{lazyConnect:true,connectTimeout:1000,maxRetriesPerRequest:1,enableOfflineQueue:false,retryStrategy:()=>null});redis.on('error',()=>{});connecting=redis.connect();}
    if(connecting){await connecting;connecting=null;}
    const count=await redis.eval("local count=redis.call('INCR',KEYS[1]);if count==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return count",1,`forma:rate:${bucket}`,windowSeconds+5);
    return typeof count==='number'?count:null;
  }catch{unavailableUntil=Date.now()+30_000;redis?.disconnect();redis=null;connecting=null;console.warn('PlanSaathi rate-limit cache unavailable; PostgreSQL fallback enabled.');return null;}
}
export function closeRateCache(){redis?.disconnect();redis=null;connecting=null;unavailableUntil=0;}
