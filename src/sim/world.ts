import {YEAR} from './catalog';
import type {Chunk,Node,Point,State,Terrain} from './types';
export function hash(seed:string):number {let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
export function randomAt(seed:string,x:number,y:number):number {let n=hash(seed)^Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296}
export function nextRandom(s:State):number {let n=s.rng;n^=n<<13;n^=n>>>17;n^=n<<5;s.rng=n>>>0||1;return s.rng/4294967296}
export const chunkKey=(x:number,y:number)=>x+','+y;
export function terrainAtSeed(seed:string,x:number,y:number):Terrain {
 // A world-coordinate river stays coherent when neighbouring chunks are generated.
 const river=78+Math.sin(y/23+randomAt(seed,0,0)*6)*9+Math.sin(y/57)*5;
 if(Math.abs(x-river)<2.4)return 'water';
 if((x-30)**2+(y+14)**2<100)return 'water';
 if(Math.abs(x-72)<4&&Math.abs(y-28)<4)return 'iron_ore';
 if(Math.abs(x+12)<4&&Math.abs(y-32)<4)return 'coal';
 if(Math.abs(x-48)<3&&Math.abs(y-24)<3)return 'stone';
 if(Math.abs(x-14)<5&&Math.abs(y-22)<7)return 'forest';
 if(x>22&&x<44&&y>22&&y<46)return 'grass';
 const n=randomAt(seed,Math.floor(x/4),Math.floor(y/4));
 if(n<.18)return 'forest';
 if(n>.977)return 'stone';
 if(n>.965)return 'coal';
 if(n>.951)return 'iron_ore';
 return 'grass';
}
export function makeChunk(seed:string,cx:number,cy:number):Chunk {
 const c:Chunk={x:cx,y:cy,tiles:[],nodes:[]};
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 const wx=cx*64+x,wy=cy*64+y,t=terrainAtSeed(seed,wx,wy);c.tiles.push(t);
 if(t!=='grass'&&(wx%3===0&&wy%3===0)){
 const type=t==='water'?'fish':t,max=type==='forest'?80:type==='fish'?120:200;
 c.nodes.push({id:wx+':'+wy+':'+type,x:wx,y:wy,type,max,stock:max,regen:0});
 if(t==='forest')c.nodes.push({id:wx+':'+wy+':wildlife',x:wx,y:wy,type:'wildlife',max:60,stock:60,regen:0});
 }}
 return c;
}
export function owned(s:State,p:Point):boolean {return s.chunks.some(c=>c.x===Math.floor(p.x/64)&&c.y===Math.floor(p.y/64))}
export function terrain(s:State,p:Point):Terrain|undefined {const c=s.chunks.find(c=>c.x===Math.floor(p.x/64)&&c.y===Math.floor(p.y/64));return c?.tiles[((p.y%64+64)%64)*64+((p.x%64+64)%64)]}
export function regenerationRate(n:Node):number{return n.type==='forest'?50:n.type==='fish'||n.type==='wildlife'?100:10}
export function regenerate(n:Node,modifier=100):void {n.regen+=n.max*regenerationRate(n)*modifier;const den=YEAR*10000;const amount=Math.floor(n.regen/den);n.regen%=den;n.stock=Math.min(n.max,n.stock+amount);if(n.stock===n.max)n.regen=0}
