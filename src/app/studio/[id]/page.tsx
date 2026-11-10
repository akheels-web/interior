import EditorPage from '../../../EditorPage';
export default async function Studio({params}:{params:Promise<{id:string}>}){const {id}=await params;return <EditorPage id={id}/>;}
