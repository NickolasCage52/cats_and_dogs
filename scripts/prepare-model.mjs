import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const destination = join(root, 'public', 'models', 'coco-ssd')
const source = 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/'

async function download(name) {
  if (name.includes('..') || name.startsWith('/') || !/^[\w./-]+$/.test(name)) throw new Error(`Unsafe model path: ${name}`)
  const response = await fetch(new URL(name, source))
  if (!response.ok) throw new Error(`Model download failed: ${name} (${response.status})`)
  const data = Buffer.from(await response.arrayBuffer())
  if (!data.length) throw new Error(`Empty model asset: ${name}`)
  const target = join(destination, name)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, data)
  console.log(`Saved ${name} (${data.length} bytes)`)
  return data
}

await mkdir(destination, { recursive: true })
const model = JSON.parse((await download('model.json')).toString('utf8'))
const paths = [...new Set(model.weightsManifest.flatMap(group => group.paths))]
for (const path of paths) await download(path)
await writeFile(join(destination, 'SOURCE.txt'), `Source: ${source}\nArchitecture: COCO-SSD ssdlite_mobilenet_v2\nLicense: Apache-2.0 (TensorFlow Models)\n`)
const licenseResponse = await fetch('https://raw.githubusercontent.com/tensorflow/tfjs-models/master/LICENSE')
if (!licenseResponse.ok) throw new Error(`License download failed (${licenseResponse.status})`)
await writeFile(join(destination, 'LICENSE-APACHE-2.0.txt'), await licenseResponse.text())
console.log(`Prepared ${paths.length} weight file(s) in ${destination}`)
