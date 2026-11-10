// @vitest-environment happy-dom
import {createElement} from 'react';
import {act,cleanup,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createProject} from './model';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('next/dynamic',()=>({default:()=>function Editor(props:any){return createElement('div',{'data-testid':'editor'},props.initialProject.id);}}));
import EditorPage from './EditorPage';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('editor route isolation',()=>{it('never mounts a new route with the previous project document',async()=>{const a=createProject(),b=createProject();let finish!:(response:Response)=>void;vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({document:a,revision:1})).mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;})));const view=render(createElement(EditorPage,{id:a.id}));await act(async()=>{await Promise.resolve();});expect(screen.getByTestId('editor').textContent).toBe(a.id);view.rerender(createElement(EditorPage,{id:b.id}));expect(screen.queryByTestId('editor')).toBeNull();await act(async()=>{finish(Response.json({document:b,revision:1}));await Promise.resolve();});expect(screen.getByTestId('editor').textContent).toBe(b.id);});});
