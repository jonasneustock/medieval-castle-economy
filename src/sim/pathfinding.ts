import {BY_ID} from './catalog';
import {terrain,owned} from './world';
import type {Point,State} from './types';
const key=(p:Point)=>p.x+','+p.y;
class Heap {
 a:{p:Point;f:number;g:number;n:number}[]=[];
 compare(a:{f:number;g:number;n:number},b:{f:number;g:number;n:number}){return a.f-b.f||b.g-a.g||a.n-b.n}
 push(v:{p:Point;f:number;g:number;n:number}){let i=this.a.length;this.a.push(v);while(i>0){const j=(i-1)>>1;if(this.compare(this.a[j],v)<=0)break;this.a[i]=this.a[j];i=j}this.a[i]=v}
 pop(){const first=this.a[0],last=this.a.pop()!;if(this.a.length){let i=0;while(i*2+1<this.a.length){let j=i*2+1;if(j+1<this.a.length&&this.compare(this.a[j+1],this.a[j])<0)j++;if(this.compare(last,this.a[j])<=0)break;this.a[i]=this.a[j];i=j}this.a[i]=last}return first}
}
export interface Grid {blocked:Set<string>;roads:Set<string>;paths?:Map<string,{route:Point[];cost:number}|null>}
const grids=new WeakMap<State,{signature:string;value:Grid}>();
export function grid(s:State):Grid {
 const signature=s.buildings.length+':'+s.buildings.at(-1)?.id+':'+s.chunks.length;
 const existing=grids.get(s);if(existing?.signature===signature)return existing.value;
 const blocked=new Set<string>(),roads=new Set<string>();
 for(const b of s.buildings){const d=BY_ID[b.type];for(let y=b.y;y<b.y+d.size[1];y++)for(let x=b.x;x<b.x+d.size[0];x++){
 if(b.type==='road')roads.add(x+','+y);else if(b.type!=='gatehouse')blocked.add(x+','+y)
 }}const value={blocked,roads,paths:new Map<string,{route:Point[];cost:number}|null>()};grids.set(s,{signature,value});return value;
}
export function door(b:{x:number;y:number;type:string}):Point {return {x:b.x+Math.floor(BY_ID[b.type].size[0]/2),y:b.y+BY_ID[b.type].size[1]}}
export function path(s:State,start:Point,end:Point,g=grid(s),maxNodes=30000):{route:Point[];cost:number}|null {
 const cacheKey=key(start)+'>'+key(end);
 if(g.paths?.has(cacheKey))return g.paths.get(cacheKey)!;
 if(!owned(s,start)||!owned(s,end))return null;
 if(g.blocked.has(key(end))||terrain(s,end)==='water'){g.paths?.set(cacheKey,null);return null}
 if(start.x===end.x&&start.y===end.y)return {route:[start],cost:0};
 const open=new Heap(),scores=new Map<string,number>([[key(start),0]]),parents=new Map<string,Point>();
 let seq=0,visited=0;const heuristic=(p:Point)=>(Math.abs(p.x-end.x)+Math.abs(p.y-end.y))*(g.roads.size?1:2);
 open.push({p:start,g:0,f:heuristic(start),n:seq++});
 while(open.a.length&&visited++<maxNodes){
 const v=open.pop(),k=key(v.p);if(v.g!==scores.get(k))continue;
 if(v.p.x===end.x&&v.p.y===end.y){const route=[end];let p=end;while(key(p)!==key(start)){p=parents.get(key(p))!;route.push(p)}const result={route:route.reverse(),cost:v.g/2};g.paths?.set(cacheKey,result);return result}
 for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){
 const p={x:v.p.x+dx,y:v.p.y+dy},pk=key(p);
 if(!owned(s,p)||terrain(s,p)==='water'||g.blocked.has(pk))continue;
 const cost=v.g+(g.roads.has(pk)?1:2);
 if(cost<(scores.get(pk)??Infinity)){scores.set(pk,cost);parents.set(pk,v.p);open.push({p,g:cost,f:cost+heuristic(p),n:seq++})}
 }}
 g.paths?.set(cacheKey,null);return null;
}
