import { NextRequest, NextResponse } from 'next/server';

export function proxy(request:NextRequest){
  const nonce=Buffer.from(crypto.randomUUID()).toString('base64');
  const dev=process.env.NODE_ENV==='development';
  const csp=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","font-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'","frame-src https://*.razorpay.com","connect-src 'self' https://*.razorpay.com"+(dev?' ws: wss:':''),"worker-src 'self' blob:","media-src 'self' blob:"].join('; ');
  const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',csp);
  const response=NextResponse.next({request:{headers}});response.headers.set('Content-Security-Policy',csp);response.headers.set('Cache-Control','private, no-store');
  if(request.nextUrl.pathname!=='/')response.headers.set('X-Robots-Tag','noindex, nofollow');
  if(request.nextUrl.protocol==='https:')response.headers.set('Strict-Transport-Security','max-age=31536000');
  return response;
}
export const config={matcher:['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|opengraph-image|.*\\.(?:png|jpg|jpeg|webp|svg|woff2|mjs)$).*)']};
