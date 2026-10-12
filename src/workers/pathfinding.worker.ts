import {BY_ID,RESOURCES} from '../sim/catalog';
import {door,grid,path} from '../sim/pathfinding';
import type {State} from '../sim/types';
self.onmessage=e=>{
 const {request,tick,input}=e.data,s:State=input,g=grid(s);g.paths=new Map();
 const producers=s.buildings.filter(b=>BY_ID[b.type].output),stores=s.buildings.filter(b=>b.type==='stockpile'||b.type==='granary');
 for(const b of producers){
 const candidates=stores.map(z=>({z,d:Math.abs(z.x-b.x)+Math.abs(z.y-b.y)})).sort((a,z)=>a.d-z.d||a.z.id-z.z.id).slice(0,6).map(v=>v.z);
 const r=BY_ID[b.type].output!;
 for(const z of producers)if(z.id!==b.id&&Math.abs(z.x-b.x)+Math.abs(z.y-b.y)<=60&&(BY_ID[z.type].inputs?.[r]||RESOURCES.some(v=>BY_ID[b.type].inputs?.[v]&&BY_ID[z.type].output===v)))candidates.push(z);
 for(const z of candidates){const from=door(b),to=door(z),k=from.x+','+from.y+'>'+to.x+','+to.y;if(!g.paths.has(k))g.paths.set(k,path(s,from,to,g))}
 }
 self.postMessage({request,tick,result:g});
};
