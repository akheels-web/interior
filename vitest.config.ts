import {defineConfig} from 'vitest/config';
import {config} from 'dotenv';
config({path:'.env.local',quiet:true});
export default defineConfig({test:{include:['src/**/*.test.ts','tests/**/*.test.ts'],globalSetup:['./tests/setup-database.ts'],testTimeout:30000,hookTimeout:30000},resolve:{alias:{'@':new URL('./src',import.meta.url).pathname}}});
