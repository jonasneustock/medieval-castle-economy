import Phaser from 'phaser';
import {BUILDINGS,BY_ID,FOOD,SEASON,SEASONS} from '../sim/catalog';
import {canBuild} from '../sim/engine';
import {terrainAtSeed} from '../sim/world';
import {door} from '../sim/pathfinding';
import type {Building,Point,State} from '../sim/types';
import type {Coordinator} from '../coordinator';
const iso=(x:number,y:number)=>({x:(x-y)*32,y:(x+y)*16});
const uniso=(x:number,y:number)=>({x:Math.floor(x/64+y/32),y:Math.floor(y/32-x/64)});
export interface SceneBridge {coordinator:Coordinator;getTool:()=>string|null;select:(id:number|null)=>void;hover:(p:Point,reason:string|null)=>void;camera:(p:Point)=>void}
export class WorldScene extends Phaser.Scene{
 bridge:SceneBridge;chunks=new Map<string,Phaser.GameObjects.Image[]>();buildings=new Map<number,Phaser.GameObjects.Image>();workers=new Map<number,Phaser.GameObjects.Sprite>();loads=new Map<number,Phaser.GameObjects.Image>();rotors=new Map<number,Phaser.GameObjects.Image>();smoke=new Map<number,Phaser.GameObjects.Arc>();props:Phaser.GameObjects.Image[]=[];water:Phaser.GameObjects.Image[]=[];cropKeys=new Map<number,string>();ghost!:Phaser.GameObjects.Graphics;highlight!:Phaser.GameObjects.Graphics;hoverPoint:Point={x:0,y:0};selected:number|null=null;drag?:{x:number;y:number;cx:number;cy:number};moved=false;lastPaint='';pinch=0;prior?:State;unsubscribe?:()=>void;season=-1;frameTime=0;lastTick=0;
 constructor(bridge:SceneBridge){super('World');this.bridge=bridge}
 preload(){this.load.atlas('world','/assets/atlas.png','/assets/atlas.json')}
 create(){
 this.cameras.main.setBackgroundColor('#334c35');this.cameras.main.setZoom(.83);this.center(32,34);
 this.ghost=this.add.graphics().setDepth(100000);this.highlight=this.add.graphics().setDepth(99999);
 for(const direction of ['NE','NW','SE','SW'])for(const role of ['','smith.','hunter.','logger.']){
 const frames=[0,1,2,3].map(n=>({key:'world',frame:'worker/'+role+'walk.'+direction+'.'+n})).filter(f=>this.textures.get('world').has(f.frame));
 if(frames.length===4)this.anims.create({key:role+'walk.'+direction,frames,frameRate:8,repeat:-1});
 }
 for(const role of ['','smith.','hunter.','logger.','processor.'])for(const state of ['idle','work','collect','unload']){const frames=[0,1,2,3].map(n=>({key:'world',frame:'worker/'+role+state+'.SE.'+n})).filter(f=>this.textures.get('world').has(f.frame));if(frames.length===4)this.anims.create({key:role+state,frames,frameRate:state==='idle'?3:6,repeat:-1})}
 this.input.addPointer(2);
 this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
 this.drag={x:p.x,y:p.y,cx:this.cameras.main.scrollX,cy:this.cameras.main.scrollY};this.moved=false;this.lastPaint='';
 if(p.rightButtonDown())this.game.canvas.style.cursor='grabbing';
 });
 this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
 const cam=this.cameras.main,world=cam.getWorldPoint(p.x,p.y),tile=uniso(world.x,world.y);this.hoverPoint=tile;
 if(this.input.pointer1.isDown&&this.input.pointer2.isDown){
 const distance=Phaser.Math.Distance.Between(this.input.pointer1.x,this.input.pointer1.y,this.input.pointer2.x,this.input.pointer2.y);
 if(this.pinch)cam.setZoom(Phaser.Math.Clamp(cam.zoom*distance/this.pinch,.3,1.8));this.pinch=distance;this.moved=true;return;
 }
 if(p.isDown&&this.drag){
 if(Math.hypot(p.x-this.drag.x,p.y-this.drag.y)>6)this.moved=true;
 const tool=this.bridge.getTool();
 if(tool==='road'||tool==='wall'){this.paint(tile)}
 else if(p.rightButtonDown()||!tool){cam.scrollX=this.drag.cx-(p.x-this.drag.x)/cam.zoom;cam.scrollY=this.drag.cy-(p.y-this.drag.y)/cam.zoom}
 }
 this.drawGhost();
 });
 this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{
 this.pinch=0;if(p.rightButtonReleased()){this.drag=undefined;this.game.canvas.style.cursor='default';return}
 if(!this.moved){const world=this.cameras.main.getWorldPoint(p.x,p.y),tile=uniso(world.x,world.y),tool=this.bridge.getTool();if(tool)this.paint(tile);else this.selectTile(tile)}
 this.drag=undefined;this.drawGhost();
 });
 this.input.on('wheel',(_p:unknown,_o:unknown,_x:number,dy:number)=>{this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom*(dy>0?.9:1.1),.3,1.8));this.drawGhost()});
 this.input.keyboard?.on('keydown',(e:KeyboardEvent)=>{
 if((e.target as HTMLElement)?.closest('input,select,textarea'))return;
 if(e.key==='Home')this.center(32,34);
 if(e.key===' '){e.preventDefault();this.bridge.coordinator.setSpeed(this.bridge.coordinator.speed?0:1)}
 });
 this.game.canvas.addEventListener('contextmenu',e=>e.preventDefault());
 this.unsubscribe=this.bridge.coordinator.subscribe(()=>this.sync());
 this.events.once('shutdown',()=>this.unsubscribe?.());this.sync();
 }
 center(x:number,y:number){const p=iso(x,y);this.cameras.main.centerOn(p.x,p.y)}
 frame(key:string,fallback?:string){const atlas=this.textures.get('world');return atlas.has(key)?key:fallback&&atlas.has(fallback)?fallback:'building/keep'}
 paint(p:Point){const type=this.bridge.getTool();if(!type)return;const k=p.x+','+p.y;if(this.lastPaint===k)return;this.lastPaint=k;this.bridge.coordinator.enqueue({type:'build',building:type,...p})}
 selectTile(p:Point){const b=[...this.bridge.coordinator.state.buildings].reverse().find(b=>{const d=BY_ID[b.type];return p.x>=b.x&&p.y>=b.y&&p.x<b.x+d.size[0]&&p.y<b.y+d.size[1]});this.selected=b?.id??null;this.bridge.select(this.selected);this.drawSelection()}
 sync(){
 if(!this.sys.isActive())return;
 const s=this.bridge.coordinator.state;
 if(this.prior!==s){for(const a of this.chunks.values())for(const i of a)i.destroy();this.chunks.clear();for(const m of [this.buildings,this.workers,this.loads,this.rotors,this.smoke]){for(const i of m.values())i.destroy();m.clear()}for(const p of this.props)p.destroy();this.props=[];this.water=[];this.season=-1;this.cropKeys.clear();this.prior=s}
 const season=Math.floor(s.tick/SEASON)%4;
 for(const c of s.chunks){const k=c.x+','+c.y;if(this.chunks.has(k))continue;const images:Phaser.GameObjects.Image[]=[];
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 const wx=c.x*64+x,wy=c.y*64+y,t=c.tiles[y*64+x],p=iso(wx,wy),ground=t==='water'?'water':'grass';
 const im=this.add.image(p.x,p.y+16,'world',this.frame('terrain/'+ground)).setOrigin(.5,.5).setDisplaySize(64,32).setDepth(-10000);im.setData('ground',ground);images.push(im);if(t==='water'){this.water.push(im);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(terrainAtSeed(s.seed,wx+dx,wy+dy)!=='water'){const shore=this.add.image(p.x,p.y+16,'world',this.frame('terrain/shore')).setOrigin(.5,.5).setDisplaySize(64,32).setFlipX(dx<0||dy>0).setFlipY(dx>0||dy>0).setDepth(-9999);shore.setData('ground','shore');images.push(shore)}}
 if((wx%3===0&&wy%3===0)&&['forest','stone','iron_ore','coal'].includes(t)){
 const asset=t==='forest'?(Math.abs(wx+wy)%2?'pine':'oak'):t,prop=this.add.image(p.x,p.y+22,'world',this.frame('terrain/'+asset)).setOrigin(.5,.9375).setDisplaySize(t==='forest'?100:72,t==='forest'?150:108).setDepth(p.y+20);prop.setData('node',wx+':'+wy+':'+(t==='forest'?'forest':t));prop.setData('asset',asset);prop.setData('tile',{x:wx,y:wy});this.props.push(prop);images.push(prop);
 if(t==='forest'&&Math.abs(wx-wy)%9===0){const animal=this.add.image(p.x+18,p.y+28,'world',this.frame('terrain/deer')).setOrigin(.5,.9375).setDisplaySize(38,57).setDepth(p.y+29);animal.setData('animal',true);animal.setData('baseX',animal.x);this.props.push(animal);images.push(animal)}
 }
 }
 this.chunks.set(k,images);
 }
 if(season!==this.season){
 this.season=season;
 for(const images of this.chunks.values())for(const im of images){
 if(im.getData('ground')){const ground=im.getData('ground'),key='terrain/'+ground+'.'+SEASONS[season].toLowerCase();im.setFrame(this.frame(key,'terrain/'+(season===3&&ground==='grass'?'snow':ground)));im.clearTint()}
 else if(im.getData('asset'))im.setFrame(this.frame('terrain/'+im.getData('asset')+'.'+SEASONS[season].toLowerCase(),'terrain/'+im.getData('asset')));
 }
 }
 const ids=new Set(s.buildings.map(b=>b.id));
 for(const [id,im] of this.buildings)if(!ids.has(id)){im.destroy();this.buildings.delete(id);this.workers.get(id)?.destroy();this.workers.delete(id);this.loads.get(id)?.destroy();this.loads.delete(id);this.rotors.get(id)?.destroy();this.rotors.delete(id);this.smoke.get(id)?.destroy();this.smoke.delete(id)}
 for(const b of s.buildings){
 const d=BY_ID[b.type],p=iso(b.x+d.size[0],b.y+d.size[1]);let im=this.buildings.get(b.id);
 const asset=d.crop?'building/'+b.type+'.'+SEASONS[season].toLowerCase():b.type==='mill'?'building/mill.base':'building/'+b.type;
 if(!im){
 im=this.add.image(p.x,p.y,'world',this.frame(asset,'building/'+b.type)).setOrigin(.5,.9375);const size=b.type==='road'?256:Math.max(68,(d.size[0]+d.size[1])*32*1.1);im.setDisplaySize(size,size).setDepth(p.y+(b.type==='road'?-9999:1));this.buildings.set(b.id,im);
 }
 if(this.cropKeys.get(b.id)!==asset){im.setFrame(this.frame(asset,'building/'+b.type));this.cropKeys.set(b.id,asset)}
 if(d.output&&!this.workers.has(b.id)){const w=this.add.sprite(0,0,'world',this.frame('worker/idle.SE.0','worker/walk.SE.0')).setOrigin(.5,.9375).setDisplaySize(24,32);w.setTint(b.type.includes('mine')||['smelter','toolsmith'].includes(b.type)?0xd9c5b7:b.type.includes('fish')?0xaacccd:b.type.includes('wood')?0xc6d4a8:0xffffff);this.workers.set(b.id,w);
 const load=this.add.image(0,0,'world',this.frame('resource/'+d.output)).setDisplaySize(15,15);this.loads.set(b.id,load)}
 if(b.type==='mill'&&!this.rotors.has(b.id)&&this.textures.get('world').has('effects/mill_rotor')){const scale=im.displayWidth/256,rotor=this.add.image(p.x+6*scale,p.y-144*scale,'world','effects/mill_rotor').setOrigin(134/256,96/256).setDisplaySize(im.displayWidth,im.displayHeight).setDepth(p.y+2);this.rotors.set(b.id,rotor)}
 if(['smelter','toolsmith','bakery','brewery'].includes(b.type)&&!this.smoke.has(b.id)){const smoke=this.add.circle(p.x+im.displayWidth*.12,p.y-im.displayHeight*.7,5,0xcdd0c3,.3).setDepth(p.y+3);smoke.setData('y',smoke.y);this.smoke.set(b.id,smoke)}
 }
 const nodes=new Map(s.chunks.flatMap(c=>c.nodes).map(n=>[n.id,n]));
 for(const p of this.props){const id=p.getData('node');if(id){const n=nodes.get(id);p.setAlpha(n?Math.max(.25,n.stock/n.max):1)}}
 this.drawSelection();this.drawGhost();
 if(s.tick!==this.lastTick){this.frameTime=performance.now();this.lastTick=s.tick}
 }
 drawSelection(){
 this.highlight.clear();const b=this.bridge.coordinator.state.buildings.find(b=>b.id===this.selected);if(!b)return;
 const d=BY_ID[b.type],points=[iso(b.x,b.y),iso(b.x+d.size[0],b.y),iso(b.x+d.size[0],b.y+d.size[1]),iso(b.x,b.y+d.size[1])];
 this.highlight.lineStyle(2,0xf4dea2,.9).fillStyle(0xf4dea2,.12).fillPoints(points,true).strokePoints(points,true);
 if(b.type==='tower'){const p=iso(b.x+1,b.y+1);this.highlight.lineStyle(1,0xf4dea2,.35).strokeEllipse(p.x,p.y,32*24,16*24)}
 }
 drawGhost(){
 this.ghost.clear();const tool=this.bridge.getTool();if(!tool){this.bridge.hover(this.hoverPoint,null);return}
 const d=BY_ID[tool],p=this.hoverPoint,reason=canBuild(this.bridge.coordinator.state,tool,p.x,p.y),points=[iso(p.x,p.y),iso(p.x+d.size[0],p.y),iso(p.x+d.size[0],p.y+d.size[1]),iso(p.x,p.y+d.size[1])];
 this.ghost.fillStyle(reason?0xb35d42:0xd4e4a0,.3).lineStyle(2,reason?0xe28e71:0xe6efb9,.85).fillPoints(points,true).strokePoints(points,true);this.bridge.hover(p,reason);
 }
 update(_time:number,delta:number){
 const s=this.bridge.coordinator.state,speed=this.bridge.coordinator.speed,cam=this.cameras.main,view=cam.worldView;
 const keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
 if(keys){const rate=delta*.7/cam.zoom;if(keys.A.isDown||keys.LEFT.isDown)cam.scrollX-=rate;if(keys.D.isDown||keys.RIGHT.isDown)cam.scrollX+=rate;if(keys.W.isDown||keys.UP.isDown)cam.scrollY-=rate;if(keys.S.isDown||keys.DOWN.isDown)cam.scrollY+=rate}
 const alpha=speed?Math.min(1,(performance.now()-this.frameTime)/(250/speed)):1;
 for(const b of s.buildings){const im=this.buildings.get(b.id);if(im)im.setVisible(im.x>view.left-300&&im.x<view.right+300&&im.y>view.top-100&&im.y<view.bottom+300);
 const w=this.workers.get(b.id);if(w){
 const t=b.trip,pos=b.workerPos;let x=pos.x,y=pos.y;
 if(t&&t.route[t.index+1]&&t.phase!=='collect'&&t.phase!=='unload'){const from=t.route[t.index],next=t.route[t.index+1],cost=this.bridge.coordinator.navigation?.roads.has(next.x+','+next.y)?1:2;const fraction=Math.min(1,(t.progress+alpha)/cost);x=from.x+(next.x-from.x)*fraction;y=from.y+(next.y-from.y)*fraction}
 const p=iso(x+.5,y+.5);w.setPosition(p.x,p.y).setDepth(p.y+25).setVisible(b.worker&&p.x>view.left-30&&p.x<view.right+30&&p.y>view.top-60&&p.y<view.bottom+60);
 const profession=['smelter','toolsmith','iron_mine','coal_mine','quarry'].includes(b.type)?'smith.':b.type==='hunting_lodge'?'hunter.':b.type==='woodcutter'?'logger.':BY_ID[b.type].inputs?'processor.':'';
 let anim=profession+(b.status==='Working'?'work':'idle');if(!this.anims.exists(anim))anim=b.status==='Working'?'work':'idle';
 if(t){if(t.phase==='collect'||t.phase==='unload')anim=this.anims.exists(profession+t.phase)?profession+t.phase:t.phase;else{const next=t.route[Math.min(t.index+1,t.route.length-1)],from=t.route[t.index];const dx=next.x-from.x,dy=next.y-from.y;const direction=dx>0?'SE':dx<0?'NW':dy>0?'SW':'NE',role=profession==='processor.'?'':profession;anim=this.anims.exists(role+'walk.'+direction)?role+'walk.'+direction:'walk.'+direction}}
 if(this.anims.exists(anim)){if(w.anims.currentAnim?.key!==anim)w.play(anim);w.anims.timeScale=speed; if(!speed)w.anims.pause();else w.anims.resume()}
 const load=this.loads.get(b.id)!;load.setVisible(w.visible&&!!t&&t.amount>0&&(t.kind==='output'||t.phase==='inbound'||t.phase==='unload'));if(t){load.setFrame(this.frame('resource/'+t.resource));load.setPosition(p.x+6,p.y-13).setDepth(p.y+26)}
 }
 const rotor=this.rotors.get(b.id);if(rotor){rotor.visible=im?.visible??false;if(b.status==='Working')rotor.rotation+=delta*.002*speed}
 const smoke=this.smoke.get(b.id);if(smoke){const phase=(_time*.001+b.id)%3;smoke.setVisible(!!im?.visible&&b.status==='Working');smoke.setPosition(smoke.x,smoke.getData('y')-phase*10).setAlpha(.3*(1-phase/3)).setScale(.8+phase*.3)}
 }
 for(const images of this.chunks.values())for(const im of images)im.setVisible(im.x>view.left-120&&im.x<view.right+120&&im.y>view.top-50&&im.y<view.bottom+190);
 for(const w of this.water)if(w.visible)w.setAlpha(.92+.08*Math.sin(_time*.001+w.x*.02));
 for(const p of this.props)if(p.visible&&p.getData('animal'))p.x=p.getData('baseX')+Math.sin(_time*.0007+p.y)*3;
 this.bridge.camera(uniso(cam.midPoint.x,cam.midPoint.y));
 }
}
export function createWorld(parent:HTMLElement,bridge:SceneBridge):{game:Phaser.Game;scene:WorldScene}{
 const scene=new WorldScene(bridge),game=new Phaser.Game({type:Phaser.AUTO,parent,backgroundColor:'#334c35',antialias:true,scale:{mode:Phaser.Scale.RESIZE,width:parent.clientWidth,height:parent.clientHeight},scene:[scene],render:{roundPixels:false},fps:{target:60},input:{mouse:{preventDefaultWheel:true}}});return {game,scene};
}
