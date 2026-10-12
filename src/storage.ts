import {BUILDINGS,RESOURCES,inventory} from './sim/catalog';
import type {State} from './sim/types';
const NAME='castle-economy',VERSION=1;
export function serialize(s:State):string {return JSON.stringify({format:'castle-economy',version:2,savedAt:new Date().toISOString(),state:s})}
export function parseSave(text:string):State {
 const envelope=JSON.parse(text);
 if(envelope.format!=='castle-economy')throw new Error('This file is not a Castle & Economy save.');
 if(envelope.version!==1&&envelope.version!==2)throw new Error('Unsupported save version.');
 const s=envelope.state as State;
 if(envelope.version===1){s.version=2;s.aleDebt??=0;s.aleUntil??=0;s.stats??={produced:inventory(),consumed:inventory(),traded:0};for(const b of s.buildings){b.credit??=0;b.growth??=0;b.paused??=false}}
 if(!s||!Array.isArray(s.buildings)||!Array.isArray(s.chunks)||s.version!==2||!Number.isInteger(s.tick)||s.tick<0||!Number.isInteger(s.population)||s.population<0||s.population>1000000||!Number.isFinite(s.gold)||s.gold<0||!Number.isInteger(s.stage)||s.stage<0||s.stage>3)throw new Error('Invalid save state.');
 for(const r of RESOURCES)if(!Number.isInteger(s.goods[r])||s.goods[r]<0)throw new Error('Invalid goods inventory.');
 const ids=new Set<number>();
 for(const b of s.buildings){if(!BUILDINGS.some(d=>d.id===b.type)||!Number.isInteger(b.id)||ids.has(b.id)||!Number.isInteger(b.x)||!Number.isInteger(b.y)||!Number.isFinite(b.progress)||b.progress<0||!Number.isInteger(b.output)||b.output<0||b.output>50)throw new Error('Invalid building');ids.add(b.id);for(const r of RESOURCES)if(!Number.isInteger(b.input[r])||b.input[r]<0)throw new Error('Invalid input buffer');if(b.trip&&(!RESOURCES.includes(b.trip.resource)||!Number.isInteger(b.trip.amount)||b.trip.amount<0||b.trip.amount>10||!Array.isArray(b.trip.route)||b.trip.route.length===0))throw new Error('Invalid transport job')}
 for(const c of s.chunks)if(!Number.isInteger(c.x)||!Number.isInteger(c.y)||c.tiles.length!==4096||!Array.isArray(c.nodes))throw new Error('Invalid terrain chunk.');
 if(!s.nextEvent||!Number.isInteger(s.nextEvent.type)||s.nextEvent.type<0||s.nextEvent.type>3||!Number.isInteger(s.nextEvent.start))throw new Error('Invalid event clock.');
 return s;
}
async function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const q=indexedDB.open(NAME,VERSION);q.onupgradeneeded=()=>q.result.createObjectStore('saves',{keyPath:'slot'});q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
export interface SaveSlot {slot:string;name:string;date:string;population:number;seed:string;data:string}
export async function saveSlot(slot:string,name:string,state:State):Promise<void>{
 const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('saves','readwrite');t.objectStore('saves').put({slot,name,date:new Date().toISOString(),population:state.population,seed:state.seed,data:serialize(state)});t.oncomplete=()=>{d.close();resolve()};t.onerror=()=>{d.close();reject(t.error)}})
}
export async function listSlots():Promise<SaveSlot[]>{const d=await db();return new Promise((resolve,reject)=>{const q=d.transaction('saves').objectStore('saves').getAll();q.onsuccess=()=>{d.close();resolve(q.result.sort((a:SaveSlot,b:SaveSlot)=>b.date.localeCompare(a.date)))};q.onerror=()=>{d.close();reject(q.error)}})}
export async function loadSlot(slot:string):Promise<State>{const slots=await listSlots(),v=slots.find(x=>x.slot===slot);if(!v)throw new Error('Save slot not found');return parseSave(v.data)}
export async function deleteSlot(slot:string):Promise<void>{const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('saves','readwrite');t.objectStore('saves').delete(slot);t.oncomplete=()=>{d.close();resolve()};t.onerror=()=>reject(t.error)})}
