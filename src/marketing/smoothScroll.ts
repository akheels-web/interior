// Lets components scroll through the landing page's smooth scroller when it is active.
let scroller:((y:number)=>void)|null=null;
export function setSmoothScroller(next:((y:number)=>void)|null){scroller=next;}
export function scrollToY(y:number){if(scroller)scroller(y);else window.scrollTo({top:y,behavior:'smooth'});}
