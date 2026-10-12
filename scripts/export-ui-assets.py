from pathlib import Path
from PIL import Image
import json,zipfile,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art/source/ui/icons.png'
names=['stage_hamlet','stage_village','stage_town','stage_city','population','popularity','housing','food','tax','religion','entertainment','ale_service','transport','storage','worker','pause']
im=Image.open(SOURCE).convert('RGBA');bounds=[0,276,532,764,1024];entries=[]
for i,name in enumerate(names):
 r,c=divmod(i,4);cell=im.crop((384*c,bounds[r],384*(c+1),bounds[r+1]));box=cell.getchannel('A').point(lambda x:255 if x>16 else 0).getbbox()
 crop=cell.crop(box);crop.thumbnail((60,60),Image.Resampling.LANCZOS);out=Image.new('RGBA',(64,64));out.paste(crop,((64-crop.width)//2,(64-crop.height)//2))
 target=ROOT/'public/assets/ui'/(name+'.png');target.parent.mkdir(parents=True,exist_ok=True);out.save(target)
 entries.append({'id':'ui/'+name,'source':str(SOURCE.relative_to(ROOT)),'cell':[384*c,bounds[r],384*(c+1),bounds[r+1]],'crop':box,'anchor':[.5,.5],'frameSize':[64,64]})
tree=ET.Element('image',{'w':str(im.width),'h':str(im.height),'name':'Original medieval UI icons'});stack=ET.SubElement(tree,'stack');ET.SubElement(stack,'layer',{'name':'Original illustrated icons','src':'data/layer0.png','x':'0','y':'0','opacity':'1','visibility':'visible','composite-op':'svg:src-over'})
with zipfile.ZipFile(SOURCE.with_suffix('.ora'),'w') as z:
 z.writestr('mimetype','image/openraster');z.writestr('stack.xml',ET.tostring(tree));z.writestr('data/layer0.png',SOURCE.read_bytes());z.writestr('mergedimage.png',SOURCE.read_bytes())
(ROOT/'art/meta/ui-assets.json').write_text(json.dumps({'exports':entries,'generator':'Original built-in imagegen artwork, deterministic extraction'},indent=2))
print('Exported 16 original UI icons.')
