/** Two open room corners; one shared vector source for every brand asset. */
export const BRAND_PATHS=[
  'M26 4H16C9.373 4 4 9.373 4 16V26H14V16C14 14.895 14.895 14 16 14H26V4Z',
  'M22 44H32C38.627 44 44 38.627 44 32V22H34V32C34 33.105 33.105 34 32 34H22V44Z',
];
export default function BrandMark(){return <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">{BRAND_PATHS.map(path=><path key={path} d={path}/>)}</svg>;}
