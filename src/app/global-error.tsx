'use client';
import '../brand/brand.css';
import '../styles.css';

// Replaces the root layout when it fails, so it must render its own html/body.
export default function GlobalError({retry}:{error:unknown;retry:()=>void}){
  return <html lang="en-IN"><body><title>Something went wrong · PlanSaathi</title><main className="studio-loading"><h1>Something went wrong.</h1><p>Your saved projects are safe. Please try again.</p><button className="button primary" type="button" onClick={()=>retry()}>Try again</button></main></body></html>;
}
