import type {Inventory,Resource} from './catalog';
export interface Point {x:number;y:number}
export type Terrain='grass'|'forest'|'water'|'stone'|'iron_ore'|'coal';
export interface Node extends Point {id:string;type:string;max:number;stock:number;regen:number}
export interface Chunk {x:number;y:number;tiles:Terrain[];nodes:Node[]}
export interface Trip {
 resource:Resource; amount:number; target:number; source:number; kind:'input'|'output';
 route:Point[]; index:number; progress:number; phase:'outbound'|'collect'|'inbound'|'unload'; wait:number;
 // Path node costs are in authoritative ticks: 2 off-road, 1 road.
}
export interface Building extends Point {
 id:number;type:string; input:Inventory;output:number;credit:number;progress:number;lastProduction:number;
 worker:boolean; workerPos:Point; trip?:Trip; node?:string; growth:number; status:string; paused:boolean;
}
export interface Notice {id:number;tick:number;title:string;body:string;event?:number}
export interface State {
 version:2;seed:string;tick:number;rng:number;chunks:Chunk[];purchased:number;buildings:Building[];
 goods:Inventory;gold:number;population:number;stage:number;rations:number;tax:number;popularity:number;
 foodDebt:number;foodCursor:number;consumed:Partial<Record<Resource,number>>;migrationCredit:number;
 aleDebt:number;aleUntil:number;nextEvent:{type:number;start:number;warned:boolean;announced:boolean};
 notices:Notice[];nextId:number;stats:{produced:Inventory;consumed:Inventory;traded:number};
}
export type Command =
 |{type:'build';building:string;x:number;y:number}
 |{type:'demolish';id:number}
 |{type:'pauseBuilding';id:number}
 |{type:'rations';value:number}|{type:'tax';value:number}
 |{type:'trade';resource:Resource;amount:number;buy:boolean}
 |{type:'expand';x:number;y:number};
export interface KernelInput {tick:number;population:number;rations:number;tax:number;gold:number;food:number;diversity:number;chapels:number;taverns:number;fairgrounds:number;treasury:boolean;keep:boolean;ale:boolean}
export interface PopulationProposal {demand:number;goldDelta:number;cancelSubsidy:boolean;popularity:number;migration:number}
export interface ProductionProposal {id:number;modifier:number;grow:number;eligible:boolean}
export interface EnvironmentProposal {season:number;activeEvent:number;warning:boolean;onset:boolean;ended:boolean}
