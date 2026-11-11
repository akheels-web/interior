'use client';
import type {ComponentProps,ReactNode} from 'react';
import {Tooltip as TooltipPrimitive} from 'radix-ui';
import {CircleHelp} from 'lucide-react';
import {cn} from '../../lib/utils';

export function TooltipProvider({delayDuration=250,...props}:ComponentProps<typeof TooltipPrimitive.Provider>){return <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={400} {...props}/>;}
export function Tooltip(props:ComponentProps<typeof TooltipPrimitive.Root>){return <TooltipProvider><TooltipPrimitive.Root {...props}/></TooltipProvider>;}
export const TooltipTrigger=TooltipPrimitive.Trigger;
export function TooltipContent({className,sideOffset=8,children,...props}:ComponentProps<typeof TooltipPrimitive.Content>){
  // A modal <dialog> sits in the top layer, so a tooltip portalled to <body> would render behind it.
  const modals=typeof document==='undefined'?[]:Array.from(document.querySelectorAll<HTMLElement>('dialog:modal'));
  return <TooltipPrimitive.Portal container={modals.at(-1)}><TooltipPrimitive.Content sideOffset={sideOffset} collisionPadding={8} className={cn('z-[1000] max-w-[260px] rounded-md bg-popover px-3 py-2 font-sans text-xs font-normal leading-[1.5] tracking-normal text-popover-foreground normal-case shadow-[0_8px_24px_#171a2b33] animate-tooltip origin-(--radix-tooltip-content-transform-origin) text-balance',className)} {...props}>{children}<TooltipPrimitive.Arrow className="fill-popover" width={10} height={5}/></TooltipPrimitive.Content></TooltipPrimitive.Portal>;
}

/** Wraps one focusable element with a tooltip. An absent label renders the child untouched. */
export function Hint({label,children,side='top',align}:{label?:ReactNode;children:ReactNode;side?:'top'|'right'|'bottom'|'left';align?:'start'|'center'|'end'}){
  if(!label)return <>{children}</>;
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent side={side} align={align}>{label}</TooltipContent></Tooltip>;
}

/** A small "?" button that explains the option beside it; reachable by keyboard and touch. */
export function HelpHint({label,title='More information',className}:{label:ReactNode;title?:string;className?:string}){
  return <Tooltip><TooltipTrigger asChild><button type="button" aria-label={title} className={cn('inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full border-0 bg-transparent p-0 align-middle text-muted-foreground hover:text-primary',className)}><CircleHelp size={14} aria-hidden="true"/></button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}
