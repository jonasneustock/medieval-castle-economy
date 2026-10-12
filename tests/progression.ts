import {writeFileSync,mkdirSync} from 'node:fs';
import {BY_ID,FOOD,GOLD,RESOURCES} from '../src/sim/catalog';
import {advance,canBuild,command,foodTotal,housing,newGame} from '../src/sim/engine';
import {parseSave,serialize} from '../src/storage';
const s=newGame('City acceptance');
const count=(type:string)=>s.buildings.filter(b=>b.type===type).length;
function build(type:string):boolean {
 const d=BY_ID[type];if(d.stage>s.stage||s.gold<d.gold*GOLD||RESOURCES.some(r=>s.goods[r]<(d.cost[r]??0)))return false;
 const coords=[];for(const c of s.chunks)for(let y=c.y*64+1;y<(c.y+1)*64-d.size[1]-2;y+=type==='hovel'?3:5)for(let x=c.x*64+1;x<(c.x+1)*64-d.size[0]-2;x+=type==='hovel'?3:5)coords.push({x,y,d:Math.abs(x-32)+Math.abs(y-32)});
 coords.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);
 for(const {x,y} of coords)if(!canBuild(s,type,x,y)){command(s,{type:'build',building:type,x,y});return true}return false;
}
command(s,{type:'rations',value:3});
build('marketplace');build('woodcutter');build('woodcutter');build('hunting_lodge');build('quarry');build('hunting_lodge');
const milestones:unknown[]=[];let priorStage=0;
for(let minute=0;minute<480&&s.stage<3;minute++){
 // All state changes are ordinary player commands. No granted goods or residents.
 if(s.stage>=1&&count('dairy_farm')<6&&s.goods.wood<10&&s.gold>80*GOLD)command(s,{type:'trade',resource:'wood',amount:10,buy:true});
 for(let j=0;j<16;j++){
 const foodProducer=s.stage>=1?'dairy_farm':'hunting_lodge',foodTarget=s.stage>=1?Math.max(6,Math.ceil(s.population/7)+4):2;
 if(s.stage>=1&&count('dairy_farm')<6&&build('dairy_farm'))continue;
 if(count('woodcutter')<Math.min(16,Math.max(4,Math.floor(s.population/15)))&&build('woodcutter'))continue;
 if(count('quarry')<Math.min(12,Math.max(2,Math.floor(s.population/30)))&&build('quarry'))continue;
 if(count(foodProducer)<foodTarget&&build(foodProducer))continue;
 if(s.population>400&&count('granary')<Math.ceil(s.population/500)&&build('granary'))continue;
 const sustainableHomes=s.stage===0?56:Math.max(56,(count('dairy_farm')*7+count('hunting_lodge')*5));
 if(housing(s)<Math.min(sustainableHomes,s.population+24)&&s.goods.wood>=10){if(build('hovel'))continue}
 if(s.stage>=1&&count('chapel')<Math.ceil(s.population/200)&&build('chapel'))continue;
 if(s.stage>=1&&!count('treasury')&&build('treasury'))continue;
 break;
 }
 // Reinvest resource surplus and maintain sustainable tax/food settings.
 for(const r of ['wood','stone'] as const)if(s.goods[r]>150)command(s,{type:'trade',resource:r,amount:Math.min(40,s.goods[r]-150),buy:false});
 if(s.gold>100*GOLD&&s.population>40&&foodTotal(s)<s.population*.8)command(s,{type:'trade',resource:'bread',amount:Math.min(30,Math.floor(s.gold/(7*GOLD))),buy:true});
 const canNormal=s.stage>=1;
 command(s,{type:'rations',value:canNormal?2:3});
 // Religion + consumed-food diversity must support positive tax popularity.
 command(s,{type:'tax',value:s.popularity>=70?2:s.popularity>=60?1:0});
 if(s.chunks.length===1&&s.goods.wood>100&&s.gold>300*GOLD)command(s,{type:'expand',x:0,y:1});
 if(s.gold>800*GOLD&&s.goods.wood<50)command(s,{type:'trade',resource:'wood',amount:50,buy:true});
 advance(s,240);
 if(s.stage!==priorStage){milestones.push({stage:s.stage,minute:minute+1,population:s.population,food:foodTotal(s),gold:s.gold/GOLD,buildings:s.buildings.length});priorStage=s.stage}
 if(minute%30===29)console.log('Progression minute',minute+1,'population',s.population,'stage',s.stage,'food',foodTotal(s),'wood',s.goods.wood,'gold',Math.floor(s.gold/GOLD),'buildings',s.buildings.length);
}
if(s.stage===3){
 for(const [x,y] of [[1,0],[-1,0],[0,-1]]){for(let i=0;i<60&&s.gold<Math.round((100+50*s.purchased)*(1+s.population/1000))*GOLD;i++)advance(s,240);command(s,{type:'expand',x,y})}
 for(let minute=0;minute<180&&Object.keys(BY_ID).some(type=>!count(type));minute++){
 for(const r of RESOURCES)if(!FOOD.includes(r)&&s.goods[r]>100)command(s,{type:'trade',resource:r,amount:s.goods[r]-100,buy:false});
 for(const type of Object.keys(BY_ID)){
 if(count(type))continue;const d=BY_ID[type];
 for(const r of RESOURCES){const needed=(d.cost[r]??0)-s.goods[r];if(needed>0)command(s,{type:'trade',resource:r,amount:needed,buy:true})}
 build(type);
 }
 advance(s,240);
 }
}
const roundtrip=parseSave(serialize(s));const valid=JSON.stringify(roundtrip)===JSON.stringify(s);
const result={seed:s.seed,passed:s.stage===3&&Object.keys(BY_ID).every(type=>count(type)>0),stage:s.stage,buildingTypesPresent:Object.keys(BY_ID).filter(type=>count(type)>0).length,missingTypes:Object.keys(BY_ID).filter(type=>!count(type)),simulatedMinutes:s.tick/240,population:s.population,food:foodTotal(s),gold:s.gold/GOLD,buildings:s.buildings.length,saveRoundtrip:valid,milestones,method:'Scripted ordinary build/trade/ration/tax/expansion commands from exact opening conditions. No resource or population injection. This is simulation progression, not browser tutorial usability validation.'};
mkdirSync('reports',{recursive:true});writeFileSync('reports/progression.json',JSON.stringify(result,null,2));writeFileSync('reports/city-progression.save.json',serialize(s));console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
