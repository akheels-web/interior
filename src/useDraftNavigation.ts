'use client';
import {useEffect,useRef} from 'react';
/** Restore the editor entry on either Back or Forward while account saves are pending. */
export function useDraftNavigation(projectId:string,state:string,onBlocked:()=>void,onLeave:()=>void){
  const current=useRef(state),blocked=useRef(onBlocked),leave=useRef(onLeave),guard=useRef(false),approved=useRef(false);
  current.current=state;blocked.current=onBlocked;leave.current=onLeave;
  useEffect(()=>{
    const editorUrl=window.location.href,editorState=window.history.state;
    // A restored marker may belong to an earlier document. The first new edit
    // must create a same-document entry instead of trusting that old sentinel.
    guard.current=false;approved.current=false;
    const pop=(event:PopStateEvent)=>{
      if(approved.current)return;
      if(current.current==='saved'){
        if(guard.current&&window.location.href===editorUrl){event.stopImmediatePropagation();window.history.back();}
        return;
      }
      event.stopImmediatePropagation();
      // A pop may traverse in either direction or across multiple entries.
      // Push the captured Next router state/URL instead of guessing a traversal delta.
      window.history.pushState({...editorState,formaDraftGuard:projectId},'',editorUrl);
      guard.current=true;blocked.current();
    };
    window.addEventListener('popstate',pop,true);
    return()=>window.removeEventListener('popstate',pop,true);
  },[projectId]);
  useEffect(()=>{if(state==='saved'||guard.current)return;window.history.pushState({...window.history.state,formaDraftGuard:projectId},'',window.location.href);guard.current=true;},[state,projectId]);
  return ()=>{approved.current=true;guard.current=false;leave.current();};
}

