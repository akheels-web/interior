import type {ComponentProps} from 'react';
import {Progress as ProgressPrimitive} from 'radix-ui';
import {cva,type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/utils';

export function Card({className,...props}:ComponentProps<'div'>){return <div className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_#171a2b08]',className)} {...props}/>;}

const badgeVariants=cva('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',{variants:{variant:{default:'bg-secondary text-secondary-foreground',outline:'border border-border bg-card text-muted-foreground',solid:'bg-primary text-primary-foreground',warning:'bg-[#fbf5e8] text-[#76592b]'}},defaultVariants:{variant:'default'}});
export function Badge({className,variant,...props}:ComponentProps<'span'>&VariantProps<typeof badgeVariants>){return <span className={cn(badgeVariants({variant}),className)} {...props}/>;}

export function Skeleton({className,...props}:ComponentProps<'div'>){return <div aria-hidden="true" className={cn('rounded-md bg-[linear-gradient(90deg,var(--brand-border)_25%,var(--brand-ground)_50%,var(--brand-border)_75%)] bg-[length:200%_100%] animate-shimmer',className)} {...props}/>;}

export function Progress({className,value=0,max=100,...props}:ComponentProps<typeof ProgressPrimitive.Root>){
  const ratio=max>0?Math.min(1,Math.max(0,(value??0)/max)):0;
  return <ProgressPrimitive.Root value={Math.min(value??0,max)} max={max} className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary',className)} {...props}><ProgressPrimitive.Indicator className="block h-full w-full origin-left rounded-full bg-primary transition-transform duration-700 ease-out" style={{transform:`scaleX(${ratio})`}}/></ProgressPrimitive.Root>;
}
