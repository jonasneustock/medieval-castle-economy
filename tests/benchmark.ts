import {writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {BY_ID,inventory} from '../src/sim/catalog';
import {newGame,step} from '../src/sim/engine';
import {makeChunk} from '../src/sim/world';
import {door} from '../src/sim/pathfinding';
import type {Building} from '../src/sim/types';
const results=[];
for(const residents of [5000,10000]){
 const s=newGame('benchmark-'+residents);s.population=residents;s.stage=3;s.rations=2;s.chunks=[];s.goods=inventory();s.goods.bread=10000;
 for(let y=0;y<4;y++)for(let x=0;x<5;x++){const c=makeChunk(s.seed,x,y);c.tiles.fill('grass');c.nodes=[];s.chunks.push(c)}s.buildings=[];
 const add=(type:string,x:number,y:number)=>{const b:Building={id:s.nextId++,type,x,y,input:inventory(),output:0,credit:0,progress:0,lastProduction:0,worker:true,workerPos:{x,y},growth:720000,status:'Ready',paused:false};b.workerPos=door(b);s.buildings.push(b);return b};
 for(let i=0;i<residents/8;i++)add('hovel',i%100*3,Math.floor(i/100)*3);
 const productionCount=residents/5;
 for(let i=0;i<productionCount;i++)add('dairy_farm',i%59*5,65+Math.floor(i/59)*5);
 for(let i=0;i<40;i++)add('granary',310,i*5);
 add('stockpile',310,225);add('keep',310,215);
 const tiles=new Set<string>();for(const b of s.buildings){for(let y=b.y;y<b.y+BY_ID[b.type].size[1];y++)for(let x=b.x;x<b.x+BY_ID[b.type].size[0];x++){const k=x+','+y;if(tiles.has(k))throw new Error('Overlapping benchmark fixture');tiles.add(k)}}
 const times:number[]=[];const start=performance.now();
 for(let i=0;i<2400;i++){const t=performance.now();step(s);times.push(performance.now()-t);if(i%600===599)console.log(residents,'residents:',i+1,'ticks elapsed',Math.round(performance.now()-start),'ms')}
 times.sort((a,b)=>a-b);const p95=times[Math.floor(times.length*.95)],p99=times[Math.floor(times.length*.99)];
 results.push({residents,endingResidents:s.population,buildings:s.buildings.length,productionBuildings:productionCount,simulatedMinutes:10,ticks:2400,totalMs:Math.round(performance.now()-start),medianTickMs:+times[1200].toFixed(2),p95TickMs:+p95.toFixed(2),p99TickMs:+p99.toFixed(2),worstTickMs:+times.at(-1)!.toFixed(2),tickBudget1xMs:250,tickBudget4xMs:62.5,passesSimulationBudget4x:p95<62.5,renderFPS:'not measured: supported browser automation unavailable',notes:'Synthetic non-overlapping large-state deterministic simulation; 20 empty-land chunks, active dairy production and physical deliveries, 40 granaries, adequate initial food and housing. Natural-resource regeneration and browser worker/rendering overhead are not represented.'});
}
mkdirSync('reports',{recursive:true});writeFileSync('reports/performance.json',JSON.stringify({runtime:process.version,platform:process.platform,generatedAt:new Date().toISOString(),results},null,2));console.log(JSON.stringify(results,null,2));
