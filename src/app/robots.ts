import type {MetadataRoute} from 'next';
import {publicIndexing,siteURL} from '../lib/site';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{return publicIndexing()?{rules:{userAgent:'*',allow:'/',disallow:['/api/','/studio/','/dashboard','/billing','/profile','/admin','/login','/register','/two-factor','/forgot-password','/reset-password','/verify-email']},sitemap:new URL('/sitemap.xml',siteURL()).href}:{rules:{userAgent:'*',disallow:'/'}};}
