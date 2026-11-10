export function safeNext(value:string|null){
  if(!value?.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f\u007f]/.test(value))return '/dashboard';
  try{const url=new URL(value,'https://internal.invalid');return url.origin==='https://internal.invalid'?url.pathname+url.search+url.hash:'/dashboard';}catch{return '/dashboard';}
}
