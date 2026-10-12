import {BY_ID,EVENTS,FOOD,SEASON} from './catalog';
import type {EnvironmentProposal,KernelInput,PopulationProposal,ProductionProposal,State} from './types';
export function environmentKernel(s:Pick<State,'tick'|'nextEvent'>):EnvironmentProposal {
 const e=s.nextEvent,d=EVENTS[e.type];return {season:Math.floor(s.tick/SEASON)%4,activeEvent:s.tick>=e.start&&s.tick<e.start+d.duration?e.type:-1,warning:!e.warned&&s.tick>=e.start-480,onset:!e.announced&&s.tick>=e.start,ended:s.tick>=e.start+d.duration};
}
export function productionKernel(s:Pick<State,'tick'|'nextEvent'|'buildings'>):ProductionProposal[]{
 const env=environmentKernel(s),event=env.activeEvent<0?null:EVENTS[env.activeEvent];
 return s.buildings.filter(b=>BY_ID[b.type].output).map(b=>{
 const d=BY_ID[b.type];let modifier=10000;
 if(env.season===3&&b.type==='fishing_hut')modifier=5000;
 if(env.season===3&&b.type==='dairy_farm')modifier=7500;
 if(event&&(event.buildings as readonly string[]).includes(b.type))modifier=modifier*(100-event.penalty)/100;
 const grow=d.crop&&env.season<2?(event?.id==='drought'?60:100):0;
 return {id:b.id,modifier,grow,eligible:!d.crop||env.season===2};
 });
}
export function populationInput(s:State):KernelInput {
 const count=(id:string)=>s.buildings.filter(b=>b.type===id&&!b.paused).length;
 return {tick:s.tick,population:s.population,rations:s.rations,tax:s.tax,gold:s.gold,food:FOOD.reduce((n,r)=>n+s.goods[r],0),diversity:FOOD.filter(r=>s.consumed[r]!==undefined&&s.tick-s.consumed[r]!<1200).length,chapels:count('chapel'),taverns:count('tavern'),fairgrounds:count('fairground'),treasury:count('treasury')>0,keep:count('keep')>0,ale:s.tick<s.aleUntil};
}
export function populationKernel(k:KernelInput):PopulationProposal {
 const flow=k.keep?k.tax*k.population:0,cancelSubsidy=flow<0&&k.gold<-flow;
 const tax=cancelSubsidy?0:k.tax;
 const faith=Math.min(10,Math.floor(k.chapels*200*10/Math.max(1,k.population)));
 const entertainment=Math.min(10,Math.floor(k.fairgrounds*500*10/Math.max(1,k.population)));
 const ale=k.ale?Math.min(10,Math.floor(k.taverns*200*10/Math.max(1,k.population))):0;
 const foodModifier=k.rations>0&&k.food===0?-50:[-50,-20,0,20][k.rations];
 const popularity=Math.max(0,Math.min(100,50+foodModifier-5*tax+4*Math.max(0,k.diversity-1)+faith+entertainment+ale+(k.keep&&k.treasury?5:0)));
 return {demand:k.population*[0,1,2,4][k.rations],goldDelta:cancelSubsidy?0:flow,cancelSubsidy,popularity,migration:popularity-50};
}
