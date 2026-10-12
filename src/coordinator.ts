import {applyEconomy,applyEnvironment,applyPopulation,command,newGame} from './sim/engine';
import {populationInput} from './sim/kernels';
import type {Command,EnvironmentProposal,PopulationProposal,ProductionProposal,State} from './sim/types';
import type {Grid} from './sim/pathfinding';
import {saveSlot} from './storage';
class Specialist<T>{
 worker:Worker;sequence=0;pending=new Map<number,{resolve:(v:T)=>void;reject:(e:Error)=>void;tick:number}>();
 constructor(worker:Worker){this.worker=worker;worker.onmessage=e=>{const p=this.pending.get(e.data.request);if(!p)return;this.pending.delete(e.data.request);if(e.data.tick!==p.tick)p.reject(new Error('Worker tick mismatch'));else p.resolve(e.data.result)};worker.onerror=e=>{for(const p of this.pending.values())p.reject(new Error(e.message));this.pending.clear()}}
 compute(tick:number,input:unknown):Promise<T>{const request=++this.sequence;return new Promise((resolve,reject)=>{this.pending.set(request,{resolve,reject,tick});this.worker.postMessage({tick,request,input})})}
 close(){this.worker.terminate()}
}
export class Coordinator{
 state:State=newGame();speed=1;listeners=new Set<()=>void>();commands:Command[]=[];error='';busy=false;last=0;accumulator=0;navigation?:Grid;navDirty=true;generation=0;timer=0;
 economy=new Specialist<ProductionProposal[]>(new Worker(new URL('./workers/economy.worker.ts',import.meta.url),{type:'module'}));
 environment=new Specialist<EnvironmentProposal>(new Worker(new URL('./workers/environment.worker.ts',import.meta.url),{type:'module'}));
 population=new Specialist<PopulationProposal>(new Worker(new URL('./workers/population.worker.ts',import.meta.url),{type:'module'}));
 paths=new Specialist<Grid>(new Worker(new URL('./workers/pathfinding.worker.ts',import.meta.url),{type:'module'}));
 start(){this.last=performance.now();this.timer=window.setInterval(()=>void this.pump(),25)}
 subscribe(fn:()=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
 emit(){for(const fn of this.listeners)fn()}
 enqueue(c:Command){this.commands.push(c);if(!this.busy)void this.pump()}
 replace(state:State){this.generation++;this.state=state;this.commands=[];this.navigation=undefined;this.navDirty=true;this.accumulator=0;this.emit()}
 setSpeed(speed:number){this.speed=speed;this.accumulator=0;this.last=performance.now();this.emit()}
 async pump(){
 if(this.busy)return;this.busy=true;
 try{
 const now=performance.now();this.accumulator+=Math.min(2000,now-this.last)*this.speed;this.last=now;
 const gen=this.generation;
 const commands=this.commands.splice(0);
 for(const c of commands){this.error=command(this.state,c)??'';if(['build','demolish','expand'].includes(c.type))this.navDirty=true}
 if(this.navDirty){const navigation=await this.paths.compute(this.state.tick,this.state);if(gen!==this.generation)return;this.navigation=navigation;this.navDirty=false}
 let ticks=0;
 while(this.accumulator>=250&&ticks<8){
 const s=this.state,tick=s.tick+1,snapshot={tick,nextEvent:s.nextEvent,buildings:s.buildings.map(b=>({id:b.id,type:b.type}))};
 const [env,eco,pop]=await Promise.all([this.environment.compute(tick,snapshot),this.economy.compute(tick,snapshot),this.population.compute(tick,{...populationInput(s),tick})]);
 if(gen!==this.generation)return;
 s.tick=tick;applyEnvironment(s,env);applyEconomy(s,eco,this.navigation);applyPopulation(s,pop);this.accumulator-=250;ticks++;
 if(s.tick%240===0)void saveSlot('autosave','Automatic save',s).catch(()=>{this.error='Automatic save failed. Export a backup from the save menu.'});
 }
 if(ticks||commands.length)this.emit();
 }catch(e){this.error=e instanceof Error?e.message:String(e);this.speed=0;this.emit()}
 finally{this.busy=false}
 }
 close(){clearInterval(this.timer);this.economy.close();this.environment.close();this.population.close();this.paths.close()}
}
