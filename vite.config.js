import {defineConfig} from 'vite';
import handler from './api/market.js';
export default defineConfig({server:{allowedHosts:['terminal.local']},plugins:[{name:'local-market-api',configureServer(server){server.middlewares.use('/api/market',async(req,res)=>{req.query=Object.fromEntries(new URL(req.url,'http://localhost').searchParams);res.status=code=>{res.statusCode=code;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};await handler(req,res);});}}]});
