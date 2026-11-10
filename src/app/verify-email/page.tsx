import {Suspense} from 'react';
import Platform from '../../platform/Platform';
export default function Page(){return <Suspense fallback={<div className="studio-loading" role="status">Opening PlanSaathi…</div>}><Platform view="verify"/></Suspense>;}
