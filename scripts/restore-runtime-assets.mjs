import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {dirname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const archive = resolve(root, 'art/runtime/remaining-images.json.gz');
const bundle = JSON.parse(gunzipSync(await readFile(archive)).toString('utf8'));
if (bundle.version !== 1 || !Array.isArray(bundle.files)) throw new Error('Unsupported runtime artwork archive');
const decoded = new Map();
let restored = 0;
for (const file of bundle.files) {
  if (!/^(public|dist)\//.test(file.path) || file.path.includes('..') || file.path.includes('\\')) throw new Error('Invalid artwork path');
  const target = resolve(root, file.path);
  if (!target.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Artwork path escapes project');
  let bytes = decoded.get(file.sha);
  if (!bytes) {
    if (typeof bundle.blobs[file.sha] !== 'string') throw new Error('Missing artwork blob');
    bytes = Buffer.from(bundle.blobs[file.sha], 'base64');
    const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (bytes.length !== file.size || sha !== file.sha) throw new Error(`Artwork integrity error: ${file.path}`);
    decoded.set(file.sha, bytes);
  }
  if (bytes.length !== file.size) throw new Error('Artwork size mismatch');
  let existing;
  try { existing = await readFile(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing?.equals(bytes)) continue;
  await mkdir(dirname(target), {recursive:true});
  await writeFile(target, bytes);
  restored++;
}
console.log(`Runtime artwork verified: ${bundle.files.length} files, ${restored} restored.`);
