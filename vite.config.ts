import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{target:'es2022',rollupOptions:{output:{manualChunks:{three:['three'],pdf:['pdfjs-dist'],export:['jspdf']}}}},server:{host:'127.0.0.1'}});
