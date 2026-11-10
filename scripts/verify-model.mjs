import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const folder = join(root, 'public', 'models', 'coco-ssd')
const model = JSON.parse(await readFile(join(folder, 'model.json'), 'utf8'))
const license = await readFile(join(folder, 'LICENSE-APACHE-2.0.txt'), 'utf8')
if (!license.includes('Apache License')) throw new Error('Model license missing')
if (!model.modelTopology || !Array.isArray(model.weightsManifest) || !model.weightsManifest.length) throw new Error('Invalid model manifest')
let total = 0
for (const group of model.weightsManifest) {
  for (const path of group.paths) {
    if (path.includes('..') || path.startsWith('/')) throw new Error(`Unsafe path: ${path}`)
    const size = (await stat(join(folder, path))).size
    if (!size) throw new Error(`Empty weight: ${path}`)
    total += size
  }
}
console.log(`MODEL_OK: ${model.weightsManifest.length} manifest group(s), ${total} weight bytes`)
