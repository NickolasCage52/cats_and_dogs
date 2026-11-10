import type { Detection } from './logic'

type Model = { detect: (input: HTMLCanvasElement, maxNumBoxes?: number, minScore?: number) => Promise<Detection[]> }
let modelPromise: Promise<Model> | null = null

export function getModel(): Promise<Model> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import('@tensorflow/tfjs')
      const cocoSsd = await import('@tensorflow-models/coco-ssd')
      const modelUrl = new URL('models/coco-ssd/model.json', window.location.href).href
      return cocoSsd.load({ base: 'lite_mobilenet_v2', modelUrl }) as Promise<Model>
    })().catch(error => {
      modelPromise = null
      throw error
    })
  }
  return modelPromise
}

export async function detectAnimals(model: Model, canvas: HTMLCanvasElement): Promise<Detection[]> {
  return model.detect(canvas, 20, 0.2)
}
