export const PRODUCT_NAME='PlanSaathi';
export const SITE_DESCRIPTION='Turn floor plans into editable 3D interior concepts. Plan rooms, arrange furniture, explore materials and present your ideas to clients with PlanSaathi.';
export function siteURL(){return new URL(process.env.APP_URL||process.env.BETTER_AUTH_URL||'https://plansaathi.com');}
export function publicIndexing(){return process.env.PUBLIC_INDEXING_ENABLED==='true'&&process.env.LOCAL_DEVELOPMENT!=='true'&&siteURL().protocol==='https:';}
