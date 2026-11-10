import {headers} from 'next/headers';
import {PRODUCT_NAME,SITE_DESCRIPTION,siteURL} from '../lib/site';
import type {Metadata} from 'next';
import '../brand/brand.css';
import '../styles.css';
import '../PremiumStudio.css';
export const metadata:Metadata={metadataBase:siteURL(),title:PRODUCT_NAME,description:SITE_DESCRIPTION,robots:{index:false,follow:false},referrer:'same-origin'};
export default async function RootLayout({children}:{children:React.ReactNode}){await headers();return <html lang="en-IN"><body>{children}</body></html>;}
