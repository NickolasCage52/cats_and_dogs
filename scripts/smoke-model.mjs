import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import jpeg from 'jpeg-js'
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const url = process.argv[2] || 'http://127.0.0.1:5173/models/coco-ssd/model.json'
const model = await cocoSsd.load({ base: 'lite_mobilenet_v2', modelUrl: url })
async function imageTensor(name) {
  const image = jpeg.decode(await readFile(join(root, 'tests/fixtures', name)), { useTArray: true })
  const rgb = new Int32Array(image.width * image.height * 3)
  for (let i = 0, j = 0; i < image.data.length; i += 4) { rgb[j++] = image.data[i]; rgb[j++] = image.data[i + 1]; rgb[j++] = image.data[i + 2] }
  return tf.tensor3d(rgb, [image.height, image.width, 3], 'int32')
}
const catTensor = await imageTensor('cat.jpg')
const dogTensor = await imageTensor('dog.jpg')
const blankTensor = tf.fill([300, 300, 3], 245, 'int32')
try {
  const cats = await model.detect(catTensor, 20, 0.2)
  const dogs = await model.detect(dogTensor, 20, 0.2)
  const blank = await model.detect(blankTensor, 20, 0.2)
  console.log('Cat photo detections:', cats.map(({ class: kind, score }) => ({ kind, score: score.toFixed(3) })))
  console.log('Dog photo detections:', dogs.map(({ class: kind, score }) => ({ kind, score: score.toFixed(3) })))
  console.log('Blank image detections:', blank.map(({ class: kind, score }) => ({ kind, score: score.toFixed(3) })))
  if (!cats.some(item => item.class === 'cat' && item.score >= 0.55)) throw new Error('Real cat photo not confidently detected')
  if (!dogs.some(item => item.class === 'dog' && item.score >= 0.55)) throw new Error('Real dog photo not confidently detected')
  if (blank.some(item => ['cat', 'dog'].includes(item.class) && item.score >= 0.55)) throw new Error('False positive on blank image')
  console.log('REAL_MODEL_OK')
} finally { catTensor.dispose(); dogTensor.dispose(); blankTensor.dispose(); model.dispose() }
