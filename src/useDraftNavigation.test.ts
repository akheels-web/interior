// @vitest-environment happy-dom
import {act,cleanup,renderHook} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {useDraftNavigation} from './useDraftNavigation';

afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('pending-draft history navigation',()=>{
  function setup(){
    window.history.replaceState({__NA:true,editorTree:'private-project'},'','/studio/private-project');
    const blocked=vi.fn(),leave=vi.fn();
    const hook=renderHook(({state})=>useDraftNavigation('private-project',state,blocked,leave),{initialProps:{state:'saved'}});
    return {hook,blocked,leave};
  }
  function popTo(path:string,state:object){
    window.history.replaceState(state,'',path);
    window.dispatchEvent(new PopStateEvent('popstate',{state}));
  }
  it('creates a fresh sentinel for new edits even when a restored entry already has a matching marker',()=>{
    window.history.replaceState({__NA:true,editorTree:'restored-project',formaDraftGuard:'private-project'},'','/studio/private-project');
    const push=vi.spyOn(window.history,'pushState'),blocked=vi.fn();
    const hook=renderHook(({state})=>useDraftNavigation('private-project',state,blocked,vi.fn()),{initialProps:{state:'saved'}});
    expect(push).not.toHaveBeenCalled();hook.rerender({state:'saving'});
    expect(push).toHaveBeenCalledOnce();expect(window.history.state).toMatchObject({__NA:true,editorTree:'restored-project',formaDraftGuard:'private-project'});
    act(()=>popTo('/studio/private-project',{__NA:true,editorTree:'restored-project',formaDraftGuard:'private-project'}));
    expect(blocked).toHaveBeenCalledOnce();
  });
  it.each([['Forward','/dashboard'],['multi-entry Back','/billing']])('restores the exact editor entry after blocked %s',(_,path)=>{
    const {hook,blocked}=setup();hook.rerender({state:'saving'});
    const routerPop=vi.fn();window.addEventListener('popstate',routerPop);
    try{
      act(()=>popTo(path,{__NA:true,otherTree:path}));
      expect(window.location.pathname).toBe('/studio/private-project');
      expect(window.history.state).toMatchObject({__NA:true,editorTree:'private-project',formaDraftGuard:'private-project'});
      expect(blocked).toHaveBeenCalledOnce();expect(routerPop).not.toHaveBeenCalled();
    }finally{window.removeEventListener('popstate',routerPop);}
  });
  it('skips the duplicate editor entry once the draft has saved',()=>{
    const {hook,blocked}=setup();hook.rerender({state:'saving'});hook.rerender({state:'saved'});
    const back=vi.spyOn(window.history,'back').mockImplementation(()=>{});
    act(()=>popTo('/studio/private-project',{__NA:true,editorTree:'private-project'}));
    expect(back).toHaveBeenCalledOnce();expect(blocked).not.toHaveBeenCalled();
  });
  it('uses the approved leave callback instead of guessing how far to traverse history',()=>{
    const {hook,blocked,leave}=setup();hook.rerender({state:'saving'});
    const go=vi.spyOn(window.history,'go').mockImplementation(()=>{}),routerPop=vi.fn();window.addEventListener('popstate',routerPop);
    try{
      act(()=>hook.result.current());expect(leave).toHaveBeenCalledOnce();expect(go).not.toHaveBeenCalled();
      act(()=>popTo('/dashboard',{__NA:true,otherTree:'dashboard'}));
      expect(routerPop).toHaveBeenCalledOnce();expect(blocked).not.toHaveBeenCalled();
    }finally{window.removeEventListener('popstate',routerPop);}
  });
});
