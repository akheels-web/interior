'use client';
import { useCallback, useEffect, useState } from 'react';

export type PlatformView='login'|'register'|'forgot'|'reset'|'verify'|'twofactor'|'dashboard'|'billing'|'profile'|'admin';
export interface Account {id:string;name:string;email:string;role:'user'|'super_admin';mfaEnabled?:boolean;mfaVerified?:boolean;status?:string;projectCount?:number;monthlyUsed?:number;addonCredits?:number;subscriptionStatus?:string;createdAt?:string}
export interface Billing {status:string;periodStart:string|null;periodEnd:string|null;monthlyLimit:number;monthlyUsed:number;monthlyRemaining:number;addonCredits:number;canCreate:boolean;price:number;addonPrice:number;addonQuantity:number;configured:boolean}
export interface Me {user:Account;billing:Billing;setup:{emailConfigured:boolean;paymentsConfigured:boolean}}
export interface ProjectSummary {id:string;name:string;client:string;updatedAt:string;revision:number;roomCount:number;itemCount:number;archived:boolean;preview:{x:number;z:number}[]}
export interface ProjectsResponse {projects:ProjectSummary[];page:number;pages:number;total:number}
export interface Device {id:string;label:string;userAgent:string;createdAt:string;lastActiveAt:string;expiresAt:string;current:boolean}
export interface AuditEntry {id?:string;action:string;reason:string;createdAt:string;actorEmail?:string;actorId?:string;credits?:number}
export interface AccountsResponse {accounts:Account[];page:number;pages:number;total:number;stats:{accounts:number;activeSubscriptions:number;projects:number}}
export class ApiError extends Error {status:number;code?:string;constructor(message:string,status=0,code?:string){super(message);this.status=status;this.code=code;}}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const deadline=AbortSignal.timeout(30_000);const signal=options.signal?AbortSignal.any([options.signal,deadline]):deadline;let response:Response;try{response=await fetch(path,{...options,signal,credentials:'same-origin',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});}catch(error){if(options.signal?.aborted)throw error;if(deadline.aborted)throw new ApiError('The request took too long. Refresh the current state before retrying.');throw new ApiError('The request could not reach PlanSaathi. Check your connection and try again.');}
  let data:unknown;try{data=await response.json();}catch{throw new ApiError('PlanSaathi returned an unreadable response. Please try again.',response.status);}
  if(!response.ok){const body=data as {error?:unknown;code?:string};throw new ApiError(typeof body?.error==='string'?body.error:`The request failed (${response.status}). Please try again.`,response.status,body?.code);}return data as T;
}
export function useApi<T>(path:string|null){const [data,setData]=useState<T|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(!!path);const [version,setVersion]=useState(0);const refresh=useCallback(()=>setVersion(v=>v+1),[]);useEffect(()=>{if(!path){setLoading(false);return;}const controller=new AbortController();setLoading(true);setError('');void api<T>(path,{signal:controller.signal}).then(value=>{if(!controller.signal.aborted)setData(value);}).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'The data could not be loaded.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[path,version]);return {data,error,loading,refresh};}
export const money=(amount:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(amount/100);
export function date(value:string|null|undefined,withTime=false){if(!value)return 'Not available';const parsed=new Date(value);if(Number.isNaN(parsed.getTime()))return 'Not available';return parsed.toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',...(withTime?{hour:'numeric',minute:'2-digit'}:{})});}
export const readable=(value:string|undefined)=>value?value.replace(/_/g,' ').replace(/^./,s=>s.toUpperCase()):'Not active';
export const message=(error:unknown)=>error instanceof Error?error.message:'The request could not be completed. Please try again.';
export type Notify=(value:string)=>void;
