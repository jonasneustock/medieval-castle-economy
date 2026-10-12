"""Deterministic lossless PNG atlas export from reviewed, original raster artwork."""
from pathlib import Path
from PIL import Image
import json,hashlib,math
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public/assets'
def main():
    files=sorted(p for category in ['building','worker','terrain','resource','effects','ui'] for p in (ASSETS/category).glob('*.png'))
    frames={};manifest=[];placements=[];width=2048;x=y=2;row=0
    for p in files:
        im=Image.open(p).convert('RGBA');w,h=im.size
        if x+w+2>width:x=2;y+=row+4;row=0
        asset=p.relative_to(ASSETS).with_suffix('').as_posix()
        if asset.startswith('terrain/') and h==64:anchor=[.5,.5]
        else:anchor=[.5,.9375] if p.parent.name in ['building','worker'] else [.5,.5]
        if asset=='effects/mill_rotor':anchor=[134/256,96/256]
        frames[asset]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h},'pivot':{'x':anchor[0],'y':anchor[1]}}
        placements.append((im,x,y));x+=w+4;row=max(row,h)
        manifest.append({'id':asset,'file':'/assets/'+p.relative_to(ASSETS).as_posix(),'size':[w,h],'anchor':anchor,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'provenance':'Original built-in imagegen artwork; deterministic export, no third-party game sprites','license':'Project original artwork'})
    height=1<<(y+row+2).bit_length();sheet=Image.new('RGBA',(width,height))
    for im,x,y in placements:
        sheet.paste(im,(x,y))
        # One-pixel edge extrusion; outer second padding pixel stays transparent.
        w,h=im.size
        sheet.paste(im.crop((0,0,1,h)),(x-1,y));sheet.paste(im.crop((w-1,0,w,h)),(x+w,y))
        sheet.paste(im.crop((0,0,w,1)),(x,y-1));sheet.paste(im.crop((0,h-1,w,h)),(x,y+h))
    sheet.save(ASSETS/'atlas.png',optimize=True)
    (ASSETS/'atlas.json').write_text(json.dumps({'frames':frames,'meta':{'app':'Medieval Castle & Economy deterministic asset export','version':'1','image':'atlas.png','format':'RGBA8888','size':{'w':width,'h':height},'scale':'1'}},separators=(',',':')))
    (ASSETS/'manifest.json').write_text(json.dumps({'version':1,'tileSize':[64,32],'lighting':'upper-left','projection':'2:1 isometric','assets':manifest},indent=2))
    (ROOT/'src/render/assets.ts').write_text('export const assets = '+json.dumps(manifest,indent=2)+' as const;\nexport type AssetId = typeof assets[number]["id"];\n')
    print(json.dumps({'frames':len(frames),'atlas':[width,height],'bytes':(ASSETS/'atlas.png').stat().st_size}))
if __name__=='__main__':main()
