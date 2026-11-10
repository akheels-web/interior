import type {MetadataRoute} from 'next';
import {publicIndexing,siteURL} from '../lib/site';
export const dynamic='force-dynamic';
export default function sitemap():MetadataRoute.Sitemap{return publicIndexing()?[{url:new URL('/',siteURL()).href,changeFrequency:'monthly',priority:1}]:[];}
