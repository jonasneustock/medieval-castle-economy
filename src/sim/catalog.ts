export const RESOURCES = ['wood','stone','iron_ore','iron','tools','coal','wheat','flour','bread','apples','fish','meat','milk','cheese','hops','ale','wool','cloth'] as const;
export type Resource = typeof RESOURCES[number];
export const FOOD: Resource[] = ['bread','apples','fish','meat','milk','cheese'];
export type Inventory = Record<Resource, number>;
export const inventory = (): Inventory => Object.fromEntries(RESOURCES.map(r=>[r,0])) as Inventory;
export const GOLD = 12000;
export const TICK_MS = 250;
export const YEAR = 14400;
export const SEASON = 3600;
export const CYCLE = 120;
export const STAGES = ['Hamlet','Village','Town','City'];
export const THRESHOLDS = [0,50,200,1000];
export const SEASONS = ['Spring','Summer','Autumn','Winter'];
export type Category = 'Settlement'|'Food'|'Industry'|'Services'|'Castle';
export interface Definition {
 id: string; name: string; stage: number; category: Category; size: [number,number];
 cost: Partial<Inventory>; gold: number; output?: Resource; inputs?: Partial<Inventory>;
 yield?: number; node?: string; crop?: boolean; description: string;
}
const d=(id:string,name:string,stage:number,category:Category,size:[number,number],cost:Partial<Inventory>,gold:number,description:string,production:Partial<Definition>={}):Definition=>({id,name,stage,category,size,cost,gold,description,...production});
export const BUILDINGS: Definition[] = [
 d('keep','Keep',0,'Castle',[4,4],{wood:50,stone:50},250,'Your administrative seat. One keep permits governance and taxation.'),
 d('stockpile','Stockpile',0,'Settlement',[3,3],{wood:10},0,'Stores 500 units of materials, shared across the settlement.'),
 d('granary','Granary',0,'Settlement',[3,3],{wood:10,stone:5},0,'Stores 1,000 food units. Shared food feeds every resident.'),
 d('hovel','Hovel',0,'Settlement',[2,2],{wood:10},0,'A comfortable home for eight residents.'),
 d('road','Stone road',0,'Settlement',[1,1],{stone:1},0,'Workers travel twice as fast on roads. Drag to lay a road.'),
 d('woodcutter','Woodcutter',0,'Industry',[3,3],{wood:5},0,'Harvests nearby regenerating forest.',{output:'wood',node:'forest'}),
 d('quarry','Quarry',0,'Industry',[3,3],{wood:5},0,'Extracts stone from a nearby mineral deposit.',{output:'stone',node:'stone'}),
 d('wheat_farm','Wheat farm',0,'Food',[4,4],{wood:5},0,'Plant in spring, grow in summer, harvest ten wheat per autumn cycle.',{output:'wheat',crop:true,yield:10}),
 d('mill','Mill',0,'Food',[3,3],{wood:10,stone:5},0,'Grinds one wheat into one flour.',{output:'flour',inputs:{wheat:1}}),
 d('bakery','Bakery',0,'Food',[3,3],{wood:10,stone:5},0,'Bakes one flour into one bread.',{output:'bread',inputs:{flour:1}}),
 d('apple_orchard','Apple orchard',0,'Food',[4,4],{wood:5},0,'Harvests eight apples per autumn cycle.',{output:'apples',crop:true,yield:8}),
 d('hunting_lodge','Hunting lodge',0,'Food',[3,3],{wood:5},0,'Hunts nearby wildlife throughout the year.',{output:'meat',node:'wildlife'}),
 d('marketplace','Marketplace',0,'Settlement',[3,3],{wood:20,stone:15},100,'Buy and sell all eighteen goods at fixed prices.'),
 d('fishing_hut','Fishing hut',1,'Food',[3,3],{wood:10,stone:5},0,'Fishable water within eight tiles. Winter output is halved.',{output:'fish',node:'fish'}),
 d('dairy_farm','Dairy farm',1,'Food',[4,4],{wood:10,stone:5},0,'Fresh milk. Winter output is 75% of normal.',{output:'milk'}),
 d('cheesemaker','Cheesemaker',1,'Food',[3,3],{wood:15,stone:10},0,'Turns one milk into one cheese.',{output:'cheese',inputs:{milk:1}}),
 d('sheep_farm','Sheep farm',1,'Industry',[4,4],{wood:10,stone:5},0,'Produces wool for the weaver.',{output:'wool'}),
 d('weaver','Weaver',1,'Industry',[3,3],{wood:15,stone:10},0,'Weaves one wool into one cloth.',{output:'cloth',inputs:{wool:1}}),
 d('chapel','Chapel',1,'Services',[3,3],{wood:20,stone:20},100,'Faith adds up to ten popularity; one chapel serves 200 residents.'),
 d('treasury','Treasury',1,'Castle',[3,3],{wood:25,stone:25},150,'Civic administration adds five popularity, with a keep.'),
 d('iron_mine','Iron mine',2,'Industry',[3,3],{wood:30,stone:25},0,'Extracts iron ore from a nearby regenerating deposit.',{output:'iron_ore',node:'iron_ore'}),
 d('coal_mine','Coal mine',2,'Industry',[3,3],{wood:30,stone:25},0,'Extracts coal for the smelter.',{output:'coal',node:'coal'}),
 d('smelter','Smelter',2,'Industry',[3,3],{wood:40,stone:30},0,'One iron ore and one coal become one iron.',{output:'iron',inputs:{iron_ore:1,coal:1}}),
 d('toolsmith','Toolsmith',2,'Industry',[3,3],{wood:40,stone:30},0,'One iron and one wood become one tools.',{output:'tools',inputs:{iron:1,wood:1}}),
 d('hop_farm','Hop farm',2,'Food',[4,4],{wood:20,stone:15},0,'Harvests six hops per autumn cycle.',{output:'hops',crop:true,yield:6}),
 d('brewery','Brewery',2,'Food',[3,3],{wood:30,stone:25},0,'One hops and one wheat become one ale.',{output:'ale',inputs:{hops:1,wheat:1}}),
 d('tavern','Tavern',2,'Services',[3,3],{wood:30,stone:25},100,'Ale adds up to ten popularity. One tavern serves 200 residents.'),
 d('wall','Castle wall',2,'Castle',[1,1],{stone:3},2,'Stone curtain walls block passage. Leave access through a gatehouse.'),
 d('fairground','Fairground',3,'Services',[5,5],{wood:60,stone:50},300,'Entertainment adds up to ten popularity; one fair serves 500 residents.'),
 d('gatehouse','Gatehouse',3,'Castle',[3,2],{wood:30,stone:75},250,'A traversable gateway connecting your castle courtyard to the town.'),
 d('tower','Tower',3,'Castle',[2,2],{wood:20,stone:60},200,'A castle landmark. Select to survey its surrounding district.')
];
export const BY_ID = Object.fromEntries(BUILDINGS.map(b=>[b.id,b])) as Record<string,Definition>;
export const PRICES: Record<Resource,[number,number]> = {
 wood:[4,3],stone:[5,3],iron_ore:[8,5],iron:[14,10],tools:[20,14],coal:[6,4],wheat:[3,2],flour:[5,3],bread:[7,5],apples:[4,3],fish:[6,4],meat:[7,5],milk:[4,3],cheese:[7,5],hops:[4,3],ale:[9,6],wool:[5,3],cloth:[10,7]
};
export const EVENTS = [
 {id:'drought',name:'Drought',duration:1440,penalty:40,sectors:'Crop growth and forest regeneration',buildings:[],node:'forest'},
 {id:'storm',name:'Storm',duration:960,penalty:30,sectors:'Fishing and woodcutting',buildings:['fishing_hut','woodcutter']},
 {id:'livestock_illness',name:'Livestock illness',duration:1920,penalty:40,sectors:'Dairy farms',buildings:['dairy_farm']},
 {id:'mine_flooding',name:'Mine flooding',duration:1200,penalty:50,sectors:'Stone, iron ore and coal extraction',buildings:['quarry','iron_mine','coal_mine']}
] as const;
export const label=(s:string)=>s.split('_').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
