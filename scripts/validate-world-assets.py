"""Validate original world sprite exports and the Phaser atlas against provenance."""
from pathlib import Path
import json, hashlib, zipfile
from PIL import Image
import numpy as np

root=Path(__file__).resolve().parents[1]/'public/assets'
meta=json.loads((root.parents[1]/'art/meta/world-assets.json').read_text())
entries=meta['exports']
assert len(entries)==236
assert len({x['id'] for x in entries})==len(entries)
atlas_meta=json.loads((root/'atlases/world.json').read_text())
atlas=Image.open(root/'atlases/world.png').convert('RGBA')
for entry in entries:
    path=root/entry['file'].removeprefix('/assets/')
    image=Image.open(path)
    assert image.mode=='RGBA',entry['id']
    assert image.size==(entry['width'],entry['height']),entry['id']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256'],entry['id']
    assert image.getchannel('A').getextrema()[0]==0,entry['id']
    assert image.getchannel('A').getextrema()[1]>100,entry['id']
    f=atlas_meta['frames'][entry['id']]['frame']
    assert f['w']==image.width and f['h']==image.height
    assert f['x']+f['w']<=atlas.width and f['y']+f['h']<=atlas.height
    packed=atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
    # alpha_composite is allowed to clear undefined RGB where alpha is zero.
    a=np.array(image);b=np.array(packed);visible=a[:,:,3]>0
    assert np.array_equal(a[visible],b[visible]),entry['id']

for profession in ['', 'smith.', 'hunter.', 'logger.']:
    for direction in ['NE','NW','SE','SW']:
        frames=[np.array(Image.open(root/f'worker/{profession}walk.{direction}.{i}.png')) for i in range(4)]
        for i in range(4):
            for j in range(i+1,4):
                changed=np.any(frames[i]!=frames[j],axis=2)
                assert np.count_nonzero(changed)>200,(profession,direction,i,j)

resources=['wood','stone','iron_ore','iron','tools','coal','wheat','flour','bread','apples','fish','meat','milk','cheese','hops','ale','wool','cloth','gold']
assert all((root/f'resource/{x}.png').is_file() for x in resources)
for plant in ['wheat','hops','orchard']:
    assert all((root/f'terrain/{plant}.{s}.png').is_file() for s in ['spring','summer','autumn','winter'])
sources=list((root.parents[1]/'art/source/world').glob('*.ora'))
assert len(sources)==14
for path in sources:
    with zipfile.ZipFile(path) as z:
        assert z.read('mimetype')==b'image/openraster'
        assert {'stack.xml','data/layer0.png','mergedimage.png'}<=set(z.namelist())
for profession in ['', 'smith.', 'hunter.', 'logger.', 'processor.']:
    for state in ['idle','work','collect','unload']:
        frames=[Image.open(root/f'worker/{profession}{state}.SE.{i}.png').tobytes() for i in range(4)]
        assert len(set(frames))==4,(profession,state)
print('PASS: 236 RGBA exports, source hashes, atlas pixel/coordinate match, 64 distinct walking frames, 80 profession action frames, 12 illustrated crop states, 19 icons, 14 OpenRaster sources.')
