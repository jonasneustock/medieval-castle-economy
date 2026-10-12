import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
async function walk(dir){const files=[];for(const name of await readdir(dir)){const file=join(dir,name);if((await stat(file)).isDirectory())files.push(...await walk(file));else files.push(file)}return files}
const files=(await walk('dist')).filter(f=>!f.endsWith('sw.js')&&!f.includes('/source/')&&!f.includes('/meta/')&&!f.includes('/atlases/')).sort();
const urls=files.map(f=>'/'+relative('dist',f).replaceAll('\\','/'));
const hash=createHash('sha256');for(const f of files)hash.update(await readFile(f));
const version='castle-economy-'+hash.digest('hex').slice(0,16);
const source="const CACHE="+JSON.stringify(version)+";\nconst PRECACHE="+JSON.stringify(urls)+";\n"+
 "self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async cache=>{for(let i=0;i<PRECACHE.length;i+=12)await cache.addAll(PRECACHE.slice(i,i+12));await self.skipWaiting()}))});\n"+
 "self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('castle-economy-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});\n"+
 "self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put(event.request,clone))}return response}).catch(()=>event.request.mode==='navigate'?caches.match('/index.html'):Response.error())))});\n";
await writeFile('dist/sw.js',source);await writeFile('reports/precache.json',JSON.stringify({cache:version,files:urls.length,urls},null,2));
console.log('Offline precache generated:',urls.length,'files',version);
