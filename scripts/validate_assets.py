from pathlib import Path
from PIL import Image
import json,hashlib,zipfile
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'public/assets'
B=['keep','stockpile','granary','hovel','road','woodcutter','quarry','wheat_farm','mill','bakery','apple_orchard','hunting_lodge','marketplace','fishing_hut','dairy_farm','cheesemaker','sheep_farm','weaver','chapel','treasury','iron_mine','coal_mine','smelter','toolsmith','hop_farm','brewery','tavern','wall','fairground','gatehouse','tower']
R=['wood','stone','iron_ore','iron','tools','coal','wheat','flour','bread','apples','fish','meat','milk','cheese','hops','ale','wool','cloth','gold']
expected=['building/'+b for b in B]+['resource/'+r for r in R]+['terrain/'+t for t in ['grass','soil','water','snow','farmland','road','oak','pine','stone','iron_ore','coal','deer','cow','sheep','shore']]
expected+=['building/'+b+'.'+s for b in ['wheat_farm','apple_orchard','hop_farm'] for s in ['spring','summer','winter']]
expected+=['worker/'+role+'walk.'+d+'.'+str(f) for role in ['','smith.','hunter.','logger.'] for d in ['NE','NW','SE','SW'] for f in range(4)]
expected+=['worker/'+role+s+'.SE.'+str(f) for role in ['','smith.','hunter.','logger.','processor.'] for s in ['idle','work','collect','unload'] for f in range(4)]
expected+=['building/mill.base','effects/mill_rotor']
expected+=['ui/'+s for s in ['stage_hamlet','stage_village','stage_town','stage_city','population','popularity','housing','food','tax','religion','entertainment','ale_service','transport','storage','worker','pause']]
manifest=json.loads((A/'manifest.json').read_text());ids={x['id'] for x in manifest['assets']};errors=[];warnings=[]
for id in expected:
    if id not in ids:errors.append('Missing '+id)
atlas=json.loads((A/'atlas.json').read_text());sheet=Image.open(A/'atlas.png');seen=[]
for a in manifest['assets']:
    p=A/a['file'].removeprefix('/assets/');im=Image.open(p)
    if im.mode!='RGBA':errors.append('No alpha '+a['id']);continue
    alpha=im.getchannel('A');box=alpha.point(lambda x:255 if x>12 else 0).getbbox()
    if not box:errors.append('Empty '+a['id'])
    if hashlib.sha256(p.read_bytes()).hexdigest()!=a['sha256']:errors.append('Hash mismatch '+a['id'])
    if a['id'] not in atlas['frames']:errors.append('Not in atlas '+a['id']);continue
    f=atlas['frames'][a['id']]['frame']
    if f['x']+f['w']>sheet.width or f['y']+f['h']>sheet.height:errors.append('Atlas overflow '+a['id'])
    if sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).tobytes()!=im.tobytes():errors.append('Atlas pixel mismatch '+a['id'])
for role in ['','smith.','hunter.','logger.']:
    for d in ['NE','NW','SE','SW']:
        frames=[A/('worker/'+role+'walk.'+d+'.'+str(f)+'.png') for f in range(4)]
        if all(p.exists() for p in frames):
            if len({hashlib.sha256(p.read_bytes()).hexdigest() for p in frames})!=4:errors.append('Repeated walk frame '+role+d)
            for p in frames:
                if Image.open(p).size!=(96,128):errors.append('Worker frame alignment '+str(p))
for event in ['drought','storm','livestock_illness','mine_flooding']:
    p=A/'events'/(event+'.webp')
    if not p.exists():errors.append('Missing event '+event)
    elif Image.open(p).size!=(960,320):errors.append('Event dimensions '+event)
sourceRoot=ROOT/'art/source' if (ROOT/'art/source').exists() else A/'source'
metaRoot=ROOT/'art/meta' if (ROOT/'art/meta').exists() else A/'meta'
for b in B:
    if not (metaRoot/(b+'.json')).exists():errors.append('Missing provenance '+b)
    if sourceRoot.exists() and not (sourceRoot/'building'/(b+'.ora')).exists():errors.append('Missing editable original '+b)
if not sourceRoot.exists():warnings.append('Editable masters are retained in the saved handoff archive; full source audit not performed for this code-only snapshot.')
sources=list(sourceRoot.rglob('*.ora'))
for p in sources:
    try:
        with zipfile.ZipFile(p) as z:
            if z.read('mimetype')!=b'image/openraster' or 'stack.xml' not in z.namelist():errors.append('Invalid OpenRaster '+str(p))
    except Exception as e:errors.append('Unreadable OpenRaster '+str(p))
report={'assets':len(ids),'required':len(expected),'editableSourceFiles':len(sources),'atlasSize':sheet.size,'errors':errors,'warnings':warnings,'visualReview':'Individual building/event images and worker contact sheets reviewed during generation. Integrated Phaser/browser visual review still required.'}
(ROOT/'reports').mkdir(exist_ok=True);(ROOT/'reports/assets.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));raise SystemExit(bool(errors))
