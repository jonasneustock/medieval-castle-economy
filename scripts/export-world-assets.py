"""Re-export original generated atlas art. No substitute artwork is drawn here."""
from pathlib import Path
from PIL import Image, ImageEnhance
import numpy as np
from scipy import ndimage
import json, zipfile, io, xml.etree.ElementTree as ET, hashlib

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets'
SOURCES = ROOT / 'art/source/world'
SOURCES.mkdir(parents=True, exist_ok=True)
META = ROOT / 'art/meta'
META.mkdir(parents=True, exist_ok=True)
EXPORTS = []

def tight(image, coherent=True):
    # Generated alpha sometimes has almost-invisible 1/255 fringes far from art.
    # Crop bounds use meaningful alpha while preserving edge alpha inside bounds.
    alpha=np.asarray(image.getchannel('A'))
    if not coherent:
        box=image.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
        return image.crop(box),box
    labels,count=ndimage.label(alpha>12)
    if not count: raise ValueError('Empty artwork cell')
    counts=np.bincount(labels.ravel());counts[0]=0
    main=labels==counts.argmax()
    if coherent=='major':
        keep=[]
        for label in np.where(counts>max(600,counts.max()*.025))[0]:
            ys,xs=np.where(labels==label)
            # A cropped hat/boot from an adjacent atlas row is a shallow fragment.
            if label==counts.argmax() or ys.max()-ys.min()>18:keep.append(label)
        main=np.isin(labels,keep)
    # Extract the single coherent sprite, avoiding adjacent atlas-cell fragments.
    near=ndimage.binary_dilation(main,iterations=2)
    arr=np.array(image);arr[:,:,3]=np.where(near,arr[:,:,3],0)
    image=Image.fromarray(arr,'RGBA')
    box = Image.fromarray((main*255).astype('uint8')).getbbox()
    if not box: raise ValueError('Empty artwork cell')
    return image.crop(box), box

def write(name, image, size, anchor, source, rect, scale=None, season=None, coherent=True):
    crop, box = tight(image,coherent=coherent)
    if scale is None: scale = min((size[0]-8)/crop.width, (size[1]-12)/crop.height)
    art = crop.resize((max(1, round(crop.width*scale)),max(1,round(crop.height*scale))), Image.Resampling.LANCZOS)
    out = Image.new('RGBA',size)
    x = round(anchor[0]-art.width/2)
    y = round(anchor[1]-art.height) if anchor[1] > size[1]/2 else round(anchor[1]-art.height/2)
    out.alpha_composite(art,(x,y))
    target=ASSETS/(name+'.png'); target.parent.mkdir(parents=True,exist_ok=True);out.save(target)
    EXPORTS.append({'id':name,'file':'/assets/'+name+'.png','width':size[0],'height':size[1], 'anchor':list(anchor), 'source':str(source.relative_to(ROOT)), 'sourceCell':list(rect),'crop':list(box),'scale':scale,'season':season,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    return out

def atlas(source, names, cols, rows, size, anchor, xbounds=None, scale=None):
    im=Image.open(source).convert('RGBA'); xb=xbounds or [round(im.width*i/cols) for i in range(cols+1)]
    for i,name in enumerate(names):
        r,c=divmod(i,cols); rect=(xb[c],round(im.height*r/rows),xb[c+1],round(im.height*(r+1)/rows))
        write(name,im.crop(rect),size,anchor,source,rect,scale)

def ora(source):
    im=Image.open(source).convert('RGBA'); tree=ET.Element('image',{'w':str(im.width),'h':str(im.height),'name':source.stem});stack=ET.SubElement(tree,'stack')
    ET.SubElement(stack,'layer',{'name':'Original generated RGBA art','src':'data/layer0.png','x':'0','y':'0','opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
    with zipfile.ZipFile(source.with_suffix('.ora'),'w') as z:
        z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED);z.writestr('stack.xml',ET.tostring(tree));z.writestr('data/layer0.png',source.read_bytes());z.writestr('mergedimage.png',source.read_bytes())

def pack():
    entries=[];x=y=2;row=0
    for item in sorted(EXPORTS,key=lambda e:e['id']):
        im=Image.open(ASSETS/item['file'].removeprefix('/assets/')).convert('RGBA')
        if x+im.width+2>1024:x=2;y+=row+4;row=0
        entries.append((item,im,x,y));x+=im.width+4;row=max(row,im.height)
        item['sha256']=hashlib.sha256((ASSETS/item['file'].removeprefix('/assets/')).read_bytes()).hexdigest()
    height=2**(y+row+2).bit_length();sheet=Image.new('RGBA',(1024,height));frames={}
    for item,im,x,y in entries:
        sheet.alpha_composite(im,(x,y));w,h=im.size
        frames[item['id']]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h},'pivot':{'x':item['anchor'][0]/w,'y':item['anchor'][1]/h}}
    folder=ASSETS/'atlases';folder.mkdir(exist_ok=True)
    sheet.save(folder/'world.png');(folder/'world.json').write_text(json.dumps({'frames':frames,'meta':{'app':'Medieval Castle & Economy original world art exporter','version':'1','image':'world.png','format':'RGBA8888','size':{'w':1024,'h':height},'scale':'1'}},indent=2))
    (META/'world-manifest.ts').write_text('export const worldArt = '+json.dumps([{'id':x['id'],'file':x['file'],'size':[x['width'],x['height']],'anchor':x['anchor']} for x in EXPORTS],indent=2)+' as const;\nexport type WorldArtId = typeof worldArt[number]["id"];\n')

def main():
    walk=SOURCES/'worker-walk.png'; actions=SOURCES/'worker-actions.png';res=SOURCES/'resources.png';terrain=SOURCES/'terrain.png';props=SOURCES/'props.png'
    atlas(walk,[f'worker/walk.{direction}.{i}' for direction in ['NE','NW','SE','SW'] for i in range(4)],4,4,(96,128),(48,120),[0,470,785,1095,1536],.44)
    im=Image.open(actions).convert('RGBA')
    for r,state in enumerate(['idle','work','collect','unload']):
        for c in range(4):
            rect=(c*384,240 if r==1 else r*256,(c+1)*384,(r+1)*256)
            write(f'worker/{state}.SE.{c}',im.crop(rect),(96,128),(48,120),actions,rect,.42)
    smith=SOURCES/'worker-smith.png';hunter=SOURCES/'worker-hunter.png';overlays=SOURCES/'overlays.png'
    atlas(smith,[f'worker/smith.walk.{direction}.{i}' for direction in ['NE','NW','SE','SW'] for i in range(4)],4,4,(96,128),(48,120),[0,470,785,1095,1536],.44)
    atlas(hunter,[f'worker/hunter.walk.{direction}.{i}' for direction in ['NE','NW','SE','SW'] for i in range(4)],4,4,(96,128),(48,120),[0,535,785,1035,1536],.44)
    logger=SOURCES/'worker-logger.png'
    atlas(logger,[f'worker/logger.walk.{direction}.{i}' for direction in ['NE','NW','SE','SW'] for i in range(4)],4,4,(96,128),(48,120),[0,435,785,1135,1536],.44)
    for role in ['smith','hunter','logger','processor']:
        source=SOURCES/f'worker-{role}-actions.png';im=Image.open(source).convert('RGBA')
        for r,state in enumerate(['idle','work','collect','unload']):
            for c in range(4):
                top=240 if r==1 and role in ['smith','logger'] else r*256
                if role=='processor' and r==2 and c==2:top=530
                bottom={'hunter':504,'logger':528,'processor':530,'smith':512}[role] if r==1 else (r+1)*256
                rect=(c*384,top,(c+1)*384,bottom)
                write(f'worker/{role}.{state}.SE.{c}',im.crop(rect),(96,128),(48,120),source,rect,.41 if role=='processor' and r==1 else .42,coherent='major' if r==1 else True)
    atlas(res,['resource/'+x for x in ['wood','stone','iron_ore','iron','tools','coal','wheat','flour','bread','apples','fish','meat','milk','cheese','hops','ale','wool','cloth']],6,3,(64,64),(32,32))
    atlas(terrain,['terrain/'+x for x in ['grass','soil','water','snow','farmland','road']],3,2,(128,64),(64,32))
    # Exact diamond geometry comes from stretching only the generated texture alpha bbox.
    for x in ['grass','soil','water','snow','farmland','road']:
        i=['grass','soil','water','snow','farmland','road'].index(x);im=Image.open(terrain).convert('RGBA');r,c=divmod(i,3);rect=(round(im.width*c/3),round(im.height*r/2),round(im.width*(c+1)/3),round(im.height*(r+1)/2)); crop,box=tight(im.crop(rect));crop.resize((128,64),Image.Resampling.LANCZOS).save(ASSETS/f'terrain/{x}.png')
    im=Image.open(props).convert('RGBA')
    props_rects=[('oak',(0,0,490,500)),('pine',(490,0,870,500)),('stone',(870,0,1320,500)),('iron_ore',(1320,0,1774,500)),('coal',(0,500,500,887)),('deer',(500,449,944,887)),('cow',(944,500,1360,887)),('sheep',(1360,500,1774,887))]
    for name,rect in props_rects:write('terrain/'+name,im.crop(rect),(128,192),(64,180),props,rect)
    crops=SOURCES/'crop-states.png'
    atlas(crops,[f'terrain/{plant}.{season}' for plant in ['wheat','hops','orchard'] for season in ['spring','summer','autumn','winter']],4,3,(128,128),(64,120))
    im=Image.open(overlays).convert('RGBA')
    write('resource/gold',im.crop((0,0,768,512)),(64,64),(32,32),overlays,(0,0,768,512))
    for name,rect in [('shore',(768,0,1536,512)),('leaves',(0,512,768,1024)),('snow_overlay',(768,512,1536,1024))]:
        art,box=tight(im.crop(rect),coherent=False);art.resize((128,64),Image.Resampling.LANCZOS).save(ASSETS/f'terrain/{name}.png')
        EXPORTS.append({'id':'terrain/'+name,'file':'/assets/terrain/'+name+'.png','width':128,'height':64,'anchor':[64,32],'source':str(overlays.relative_to(ASSETS)),'sourceCell':rect,'crop':box})
    # Palette variants are layered exports from the generated art, not substitute drawings.
    palettes={'spring':(1.00,1.10,0.99),'summer':(1.0,1.0,1.0),'autumn':(1.19,.91,.72),'winter':(.87,.98,1.10)}
    for name in ['grass','soil','water','farmland','road','shore','oak','pine','stone','iron_ore','coal']:
        base=Image.open(ASSETS/f'terrain/{name}.png').convert('RGBA')
        for season,mults in palettes.items():
            arr=np.array(base);arr[:,:,:3]=np.minimum(255,arr[:,:,:3].astype(float)*np.array(mults)).astype('uint8');out=Image.fromarray(arr,'RGBA')
            if name in ['grass','soil','farmland','road'] and season in ['autumn','winter']:
                overlay=Image.open(ASSETS/f'terrain/{"leaves" if season=="autumn" else "snow_overlay"}.png').convert('RGBA')
                overlay.putalpha(overlay.getchannel('A').point(lambda a:round(a*(.45 if season=='autumn' else .80))))
                out.alpha_composite(overlay)
            out.save(ASSETS/f'terrain/{name}.{season}.png')
            EXPORTS.append({'id':f'terrain/{name}.{season}','file':f'/assets/terrain/{name}.{season}.png','width':out.width,'height':out.height,'anchor':[64,32 if out.height==64 else 180],'derivedFrom':f'terrain/{name}.png','paletteMultipliers':mults,'season':season,'overlay': 'generated autumn leaves or snow dusting' if name in ['grass','soil','farmland','road'] and season in ['autumn','winter'] else None})
    for source in [walk,actions,res,terrain,props,smith,hunter,logger,overlays,crops]+[SOURCES/f'worker-{role}-actions.png' for role in ['smith','hunter','logger','processor']]:ora(source)
    pack()
    (META/'world-assets.json').write_text(json.dumps({'generator':'Built-in image_gen','exporter':'scripts/export-world-assets.py','exports':EXPORTS,'projection':'2:1 isometric','light':'upper-left','note':'Original generated artwork. Scaled/cropped RGBA exports; no synthetic replacement drawings.'},indent=2))
    print(f'Exported {len(EXPORTS)} original world sprites')

if __name__ == '__main__':main()
