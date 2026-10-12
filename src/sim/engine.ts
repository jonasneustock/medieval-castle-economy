import {BUILDINGS,BY_ID,CYCLE,EVENTS,FOOD,GOLD,inventory,PRICES,RESOURCES,SEASON,THRESHOLDS,YEAR} from './catalog';
import type {Resource} from './catalog';
import {environmentKernel,populationInput,populationKernel,productionKernel} from './kernels';
import {door,grid,path} from './pathfinding';
import type {Grid} from './pathfinding';
import {hash,makeChunk,nextRandom,owned,regenerate,terrain} from './world';
import type {Building,Command,EnvironmentProposal,Point,PopulationProposal,ProductionProposal,State,Trip} from './types';
export const sum=(obj:Partial<Record<Resource,number>>)=>Object.values(obj).reduce((a,b)=>a+(b??0),0);
export const foodTotal=(s:State)=>FOOD.reduce((a,r)=>a+s.goods[r],0);
export const housing=(s:State)=>s.buildings.filter(b=>b.type==='hovel'&&!b.paused).length*8;
export const capacity=(s:State,food:boolean)=>indexes(s).stores[food?'granary':'stockpile'].filter(b=>!b.paused).length*(food?1000:500);
export const stockTotal=(s:State,food:boolean)=>RESOURCES.filter(r=>FOOD.includes(r)===food).reduce((a,r)=>a+s.goods[r],0);
export const expansionCost=(s:State)=>Math.round((100+50*s.purchased)*(1+s.population/1000));
interface Indexes {signature:string;consumers:Record<Resource,Building[]>;stores:{granary:Building[];stockpile:Building[]};nodes:Map<string,State['chunks'][number]['nodes'][number]>}
const indexCache=new WeakMap<State,Indexes>();
function indexes(s:State):Indexes {
 const signature=s.buildings.length+':'+s.buildings.at(-1)?.id+':'+s.chunks.length,cached=indexCache.get(s);if(cached?.signature===signature)return cached;
 const consumers=Object.fromEntries(RESOURCES.map(r=>[r,[]])) as unknown as Record<Resource,Building[]>,stores={granary:[] as Building[],stockpile:[] as Building[]};
 for(const b of s.buildings){if(b.type==='granary'||b.type==='stockpile')stores[b.type].push(b);for(const r of RESOURCES)if(BY_ID[b.type].inputs?.[r])consumers[r].push(b)}
 const value={signature,consumers,stores,nodes:new Map(s.chunks.flatMap(c=>c.nodes).map(n=>[n.id,n]))};indexCache.set(s,value);return value;
}
export function notify(s:State,title:string,body:string,event?:number):void {s.notices.push({id:s.nextId++,tick:s.tick,title,body,...(event!==undefined?{event}:{})});if(s.notices.length>40)s.notices.shift()}
function createBuilding(s:State,type:string,x:number,y:number):Building{
 const b:Building={id:s.nextId++,type,x,y,input:inventory(),output:0,credit:0,progress:0,lastProduction:s.tick,worker:false,workerPos:{x,y},growth:0,status:'Ready',paused:false};
 b.workerPos=door(b);s.buildings.push(b);
 const d=BY_ID[type];if(d.node){const n=nearNodes(s,b,d.node)[0];b.node=n?.id}
 return b;
}
function schedule(s:State):void {
 const start=s.tick+YEAR*2+Math.floor(nextRandom(s)*YEAR),season=Math.floor(start/SEASON)%4;
 const pool=season<2?[0,1,2,3]:[1,2,3];
 s.nextEvent={type:pool[Math.floor(nextRandom(s)*pool.length)],start,warned:false,announced:false};
}
export function newGame(seed='Borgwedel'):State {
 const s:State={version:2,seed,tick:0,rng:hash(seed)||1,chunks:[makeChunk(seed,0,0)],purchased:0,buildings:[],goods:inventory(),gold:500*GOLD,population:8,stage:0,rations:2,tax:0,popularity:50,foodDebt:0,foodCursor:0,consumed:{},migrationCredit:0,aleDebt:0,aleUntil:0,nextEvent:{type:0,start:0,warned:false,announced:false},notices:[],nextId:1,stats:{produced:inventory(),consumed:inventory(),traded:0}};
 Object.assign(s.goods,{wood:100,stone:50,bread:60,apples:40});
 for(const [type,x,y] of [['keep',30,28],['stockpile',25,34],['granary',35,34],['hovel',29,36],['hovel',32,36]] as [string,number,number][])createBuilding(s,type,x,y);
 schedule(s);notify(s,'A new beginning','Build woodcutters near the western forest, a quarry by the eastern stone, and a marketplace. Keep food and housing ahead of immigration.');return s;
}
function nearNodes(s:State,b:Point,type:string){
 return s.chunks.flatMap(c=>c.nodes).filter(n=>n.type===type&&Math.abs(n.x-b.x)+Math.abs(n.y-b.y)<=12).sort((a,z)=>(Math.abs(a.x-b.x)+Math.abs(a.y-b.y))-(Math.abs(z.x-b.x)+Math.abs(z.y-b.y))||a.id.localeCompare(z.id));
}
export function canBuild(s:State,type:string,x:number,y:number):string|null{
 const d=BY_ID[type];if(!d)return 'Unknown building';
 if(d.stage>s.stage)return 'Requires '+['Hamlet','Village','Town','City'][d.stage];
 if(type==='keep'&&s.buildings.some(b=>b.type==='keep'))return 'Only one keep is needed';
 if(!Number.isInteger(x)||!Number.isInteger(y))return 'Choose a tile';
 for(let dy=0;dy<d.size[1];dy++)for(let dx=0;dx<d.size[0];dx++){
 const p={x:x+dx,y:y+dy},t=terrain(s,p);
 if(!owned(s,p))return 'Purchase this territory first';
 if(t==='water')return 'Build on land';
 for(const b of s.buildings){const bd=BY_ID[b.type];if(p.x>=b.x&&p.y>=b.y&&p.x<b.x+bd.size[0]&&p.y<b.y+bd.size[1])return 'This footprint is occupied'}
 // Reserve existing doors, including keep access.
 if(type!=='road'&&s.buildings.some(b=>{const q=door(b);return q.x===p.x&&q.y===p.y}))return 'Leave this entrance clear';
 }
 const q=door({x,y,type});if(type!=='road'&&type!=='wall'&&type!=='gatehouse'){
 if(!owned(s,q)||terrain(s,q)==='water'||grid(s).blocked.has(q.x+','+q.y))return 'Entrance needs a clear land tile';
 }
 if(d.crop){for(let dy=0;dy<d.size[1];dy++)for(let dx=0;dx<d.size[0];dx++)if(terrain(s,{x:x+dx,y:y+dy})!=='grass')return 'Crops need clear grassland'}
 if(d.node&&nearNodes(s,{x,y},d.node).length===0)return 'Requires nearby '+d.node.replace('_',' ')+' reserves (12 tiles)';
 if(RESOURCES.some(r=>s.goods[r]<(d.cost[r]??0))||s.gold<d.gold*GOLD)return 'Insufficient construction materials or gold';
 return null;
}
export function command(s:State,c:Command):string|null{
 if(c.type==='build'){const reason=canBuild(s,c.building,c.x,c.y);if(reason)return reason;const d=BY_ID[c.building];for(const r of RESOURCES)s.goods[r]-=d.cost[r]??0;s.gold-=d.gold*GOLD;createBuilding(s,c.building,c.x,c.y)}
 if(c.type==='rations'){if(!Number.isInteger(c.value)||c.value<0||c.value>3)return 'Invalid ration setting';s.rations=c.value}
 if(c.type==='tax'){if(!Number.isInteger(c.value)||c.value<-4||c.value>4)return 'Invalid taxation';s.tax=c.value}
 if(c.type==='pauseBuilding'){const b=s.buildings.find(b=>b.id===c.id);if(!b||!BY_ID[b.type].output)return 'Only production can be paused';b.paused=!b.paused}
 if(c.type==='demolish'){
 const b=s.buildings.find(b=>b.id===c.id);if(!b)return 'No building selected';
 if(['keep','stockpile','granary'].includes(b.type)&&s.buildings.filter(z=>z.type===b.type).length===1)return 'Preserve the last '+b.type;
 const food=b.type==='granary';if(['granary','stockpile'].includes(b.type)&&stockTotal(s,food)>capacity(s,food)-(food?1000:500))return 'Empty excess stored goods before demolition';
 if(b.trip)return 'Wait for the worker to return before demolition';
 // Clear selection safely; no refund. Buffers go into storage where capacity allows.
 for(const r of RESOURCES){const n=b.input[r]+(BY_ID[b.type].output===r?b.output:0),room=capacity(s,FOOD.includes(r))-stockTotal(s,FOOD.includes(r));s.goods[r]+=Math.max(0,Math.min(n,room))}
 s.buildings=s.buildings.filter(z=>z.id!==b.id);
 }
 if(c.type==='trade'){
 if(!RESOURCES.includes(c.resource)||!Number.isInteger(c.amount)||c.amount<1)return 'Invalid trade';
 if(!s.buildings.some(b=>b.type==='marketplace'))return 'Construct a marketplace first';
 const r=c.resource,price=PRICES[r][c.buy?0:1]*GOLD*c.amount;
 if(c.buy){if(s.gold<price)return 'Insufficient gold';if(capacity(s,FOOD.includes(r))-stockTotal(s,FOOD.includes(r))-reservedStorage(s,FOOD.includes(r))<c.amount)return 'Storage is full';s.gold-=price;s.goods[r]+=c.amount}else{if(s.goods[r]<c.amount)return 'Insufficient stored goods';s.goods[r]-=c.amount;s.gold+=price}
 s.stats.traded+=c.amount;
 }
 if(c.type==='expand'){
 if(!Number.isInteger(c.x)||!Number.isInteger(c.y))return 'Invalid territory';
 if(s.chunks.some(z=>z.x===c.x&&z.y===c.y))return 'Already owned';
 if(!s.chunks.some(z=>Math.abs(z.x-c.x)+Math.abs(z.y-c.y)===1))return 'Territory must share an edge';
 const price=expansionCost(s)*GOLD;if(s.gold<price)return 'Insufficient gold';s.gold-=price;s.chunks.push(makeChunk(s.seed,c.x,c.y));s.purchased++;
 notify(s,'New territory','An adjacent 64 × 64 region is now yours.');
 }
 return null;
}
const reservedStorage=(s:State,food:boolean)=>s.buildings.reduce((n,b)=>n+(b.trip?.kind==='output'&&b.trip.target===0&&FOOD.includes(b.trip.resource)===food&&b.trip.phase!=='inbound'?b.trip.amount:0),0);
const reservedInput=(s:State,id:number)=>s.buildings.reduce((n,b)=>n+(b.trip&&((b.trip.kind==='output'&&b.trip.target===id)||(b.trip.kind==='input'&&b.id===id))?b.trip.amount:0),0);
function recipients(s:State,b:Building,r:Resource,g:Grid){
 const targets=indexes(s).consumers[r].filter(z=>z.id!==b.id&&!z.paused&&z.input[r]<10&&sum(z.input)+reservedInput(s,z.id)<50);
 return targets.map(z=>({z,p:path(s,door(b),door(z),g)})).filter(v=>v.p&&v.p.cost<=30).sort((a,z)=>a.p!.cost-z.p!.cost||a.z.id-z.z.id);
}
function storagePath(s:State,b:Building,r:Resource,g:Grid){
 const start=door(b),candidates=indexes(s).stores[FOOD.includes(r)?'granary':'stockpile'].map(z=>({z,lower:(Math.abs(door(z).x-start.x)+Math.abs(door(z).y-start.y))*(g.roads.size?.5:1)})).sort((a,z)=>a.lower-z.lower||a.z.id-z.z.id);
 let best:{z:Building;p:NonNullable<ReturnType<typeof path>>}|undefined;
 for(const v of candidates){if(best&&v.lower>best.p.cost)break;const p=path(s,start,door(v.z),g);if(p&&(!best||p.cost<best.p.cost||p.cost===best.p.cost&&v.z.id<best.z.id))best={z:v.z,p}}
 return best;
}
function dispatchOutput(s:State,b:Building,g:Grid):boolean{
 const r=BY_ID[b.type].output!;
 if(b.output<10&&s.tick-b.lastProduction<240&&b.output<50)return false;
 if(b.output===0)return false;
 const direct=recipients(s,b,r,g)[0];let amount=Math.min(10,b.output),target=0,route:Point[];
 if(direct){amount=Math.min(amount,50-sum(direct.z.input)-reservedInput(s,direct.z.id),10-direct.z.input[r]);target=direct.z.id;route=direct.p!.route}
 else{
 const room=capacity(s,FOOD.includes(r))-stockTotal(s,FOOD.includes(r))-reservedStorage(s,FOOD.includes(r));amount=Math.min(amount,room);if(amount<=0)return false;
 const store=storagePath(s,b,r,g);if(!store)return false;route=store.p!.route;
 }
 if(amount<=0)return false;
 b.output-=amount;
 b.trip={resource:r,amount,target,source:b.id,kind:'output',route,index:0,progress:0,phase:'outbound',wait:0};return true;
}
function dispatchInput(s:State,b:Building,g:Grid):boolean{
 const d=BY_ID[b.type],inputs=RESOURCES.filter(r=>d.inputs?.[r]&&b.input[r]<10);
 const options=inputs.map(r=>{
 const sources=s.buildings.filter(z=>z.id!==b.id&&BY_ID[z.type].output===r&&z.output>0).map(z=>({z,p:path(s,door(b),door(z),g)})).filter(v=>v.p&&v.p.cost<=30).sort((a,z)=>a.p!.cost-z.p!.cost||a.z.id-z.z.id);
 const producer=sources[0],store=s.goods[r]>0?storagePath(s,b,r,g):undefined;
 const source=producer??store;
 return {r,cycles:Math.floor(b.input[r]/(d.inputs![r]??1)),source,producer:!!producer};
 }).filter(v=>v.source).sort((a,z)=>a.cycles-z.cycles||a.source!.p!.cost-z.source!.p!.cost||a.r.localeCompare(z.r));
 const o=options[0];if(!o)return false;
 const source=o.source!,available=o.producer?source.z.output:s.goods[o.r],amount=Math.min(10,available,50-sum(b.input)-reservedInput(s,b.id));
 if(amount<=0)return false;
 // Reserve physically by deducting source immediately; payload becomes carried only at pickup.
 if(o.producer)source.z.output-=amount;else s.goods[o.r]-=amount;
 b.trip={resource:o.r,amount,target:b.id,source:o.producer?source.z.id:0,kind:'input',route:source.p!.route,index:0,progress:0,phase:'outbound',wait:0};return true;
}
function move(s:State,b:Building,g:Grid):void{
 const t=b.trip!;b.status=t.phase==='collect'?'Collecting':t.phase==='unload'?'Unloading':t.phase==='inbound'?'Returning':t.kind==='output'?'Delivering':'Collecting inputs';
 if(t.phase==='collect'||t.phase==='unload'){
 if(++t.wait<2)return;t.wait=0;
 if(t.phase==='collect'){t.phase='inbound';t.route=[...t.route].reverse();t.index=0;t.progress=0;return}
 if(t.kind==='output'){
 const target=s.buildings.find(z=>z.id===t.target);
 if(target){target.input[t.resource]+=t.amount;t.amount=0}
 else{const room=capacity(s,FOOD.includes(t.resource))-stockTotal(s,FOOD.includes(t.resource));const delivered=Math.min(room,t.amount);s.goods[t.resource]+=delivered;t.amount-=delivered;if(t.amount>0){b.output+=t.amount;t.amount=0}}
 t.phase='inbound';t.route=[...t.route].reverse();t.index=0;t.progress=0;
 }else{b.input[t.resource]+=t.amount;b.trip=undefined;b.workerPos=door(b)}
 return;
 }
 if(t.index>=t.route.length-1){
 if(t.phase==='outbound'){t.phase=t.kind==='input'?'collect':'unload';t.wait=0}
 else if(t.kind==='input'){t.phase='unload';t.wait=0}
 else {b.trip=undefined;b.workerPos=door(b)}
 return;
 }
 const next=t.route[t.index+1],k=next.x+','+next.y,cost=g.roads.has(k)?1:2;
 // Roads/walls can be edited during travel. Re-route around a newly blocked tile.
 if(g.blocked.has(k)||terrain(s,next)==='water'){
 const route=path(s,{x:Math.round(b.workerPos.x),y:Math.round(b.workerPos.y)},t.route[t.route.length-1],g);
 if(!route){b.status='Route blocked';return}t.route=route.route;t.index=0;t.progress=0;return;
 }
 t.progress++;const from=t.route[t.index];b.workerPos={x:from.x+(next.x-from.x)*t.progress/cost,y:from.y+(next.y-from.y)*t.progress/cost};
 if(t.progress>=cost){t.index++;t.progress=0;b.workerPos={...next}}
}
export function applyEnvironment(s:State,e:EnvironmentProposal):void {
 if(e.warning){s.nextEvent.warned=true;notify(s,'Warning: '+EVENTS[s.nextEvent.type].name,'Begins in two minutes. '+EVENTS[s.nextEvent.type].sectors+'.',s.nextEvent.type)}
 if(e.onset){s.nextEvent.announced=true;notify(s,EVENTS[s.nextEvent.type].name,'Production effects are now active. '+EVENTS[s.nextEvent.type].sectors+'.',s.nextEvent.type)}
 if(e.ended){notify(s,'Fair weather returns',EVENTS[s.nextEvent.type].name+' has ended.',s.nextEvent.type);schedule(s)}
 for(const c of s.chunks)for(const n of c.nodes)regenerate(n,e.activeEvent===0&&n.type==='forest'?60:100);
 if(s.tick%YEAR===0)for(const b of s.buildings)if(BY_ID[b.type].crop)b.growth=0;
}
export function applyEconomy(s:State,proposals:ProductionProposal[],navigation?:Grid):void{
 const g=navigation??grid(s),map=new Map(proposals.map(p=>[p.id,p])),nodes=indexes(s).nodes;
 let staffed=0;for(const b of s.buildings){
 const d=BY_ID[b.type];if(!d.output)continue;
 // A travelling worker keeps their assignment until returning, even during emigration.
 b.worker=!!b.trip||(!b.paused&&staffed<s.population);if(b.worker)staffed++;
 if(b.trip){move(s,b,g);continue}
 if(b.paused){b.status='Paused';continue}
 if(!b.worker){b.status='Needs worker';continue}
 const missing=RESOURCES.some(r=>b.input[r]<(d.inputs?.[r]??0));
 if(missing&&dispatchInput(s,b,g))continue;
 if(dispatchOutput(s,b,g))continue;
 if(dispatchInput(s,b,g))continue;
 if(missing){b.status='Needs inputs';continue}
 const p=map.get(b.id)!;if(d.crop&&p.grow)b.growth=Math.min(720000,b.growth+p.grow);
 if(!p.eligible){b.status=['Planting','Growing','Harvesting','Dormant'][Math.floor(s.tick/SEASON)%4];if(b.output>0)dispatchOutput(s,b,g);continue}
 const node=b.node?nodes.get(b.node):undefined;
 if(d.node&&(!node||node.stock<1)){b.status='Reserve regenerating';dispatchOutput(s,b,g);continue}
 const yieldAmount=d.crop?(d.yield??1)*Math.min(10000,Math.floor(b.growth*10000/720000)):p.modifier;
 const units=Math.floor((b.credit+yieldAmount)/10000);
 if(b.output+units>50){b.status='Output full';dispatchOutput(s,b,g);continue}
 b.status='Working';if(++b.progress<CYCLE)continue;
 b.progress-=CYCLE;for(const r of RESOURCES)b.input[r]-=d.inputs?.[r]??0;
 if(node)node.stock--;
 b.credit+=yieldAmount;const output=Math.floor(b.credit/10000);b.credit%=10000;b.output+=output;s.stats.produced[d.output]+=output;b.lastProduction=s.tick;
 }
}
export function applyPopulation(s:State,p:PopulationProposal):void {
 if(p.cancelSubsidy){s.tax=0;notify(s,'Subsidies cancelled','Treasury funds cannot cover the next payment. Taxation has returned to neutral.')}
 s.gold+=p.goldDelta;s.foodDebt+=p.demand;
 while(s.foodDebt>=4800){
 const foods=FOOD.filter(r=>s.goods[r]>0);if(!foods.length){s.foodDebt%=4800;break}
 const r=foods[s.foodCursor%foods.length];s.foodCursor++;s.goods[r]--;s.consumed[r]=s.tick;s.stats.consumed[r]++;s.foodDebt-=4800;
 }
 if(s.buildings.some(b=>b.type==='tavern')&&s.goods.ale>0){
 s.aleDebt+=s.population;
 if(s.aleDebt>=24000){s.aleDebt-=24000;s.goods.ale--;s.aleUntil=s.tick+240;s.stats.consumed.ale++}
 }
 // Recalculate after consumption and subsidy cancellation at this same boundary.
 s.popularity=populationKernel(populationInput(s)).popularity;
 s.migrationCredit+=s.popularity-50;
 while(Math.abs(s.migrationCredit)>=120){const sign=Math.sign(s.migrationCredit);s.migrationCredit-=sign*120;if(sign>0){if(s.population<housing(s))s.population++}else if(s.population>0)s.population--}
 const next=s.stage+1;if(next<4&&s.population>=THRESHOLDS[next]&&s.popularity>50&&foodTotal(s)>=s.population){s.stage=next;notify(s,'A thriving '+['Hamlet','Village','Town','City'][next],'New industries and civic buildings are permanently unlocked.')}
}
export function step(s:State):void {
 s.tick++;applyEnvironment(s,environmentKernel(s));applyEconomy(s,productionKernel(s));applyPopulation(s,populationKernel(populationInput(s)));
}
export function advance(s:State,ticks:number):State {for(let i=0;i<ticks;i++)step(s);return s}
export function totalPhysical(s:State,r:Resource):number {
 return s.goods[r]+s.buildings.reduce((a,b)=>a+b.input[r]+(BY_ID[b.type].output===r?b.output:0)+(b.trip?.resource===r?b.trip.amount:0),0);
}
