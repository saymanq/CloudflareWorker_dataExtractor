import { Hono } from 'hono'
import type { R2Bucket } from '@cloudflare/workers-types'
import { LlamaParseReader } from "llamaindex"
import 'dotenv/config'

interface CloudflareBindings {
  MY_BUCKET: R2Bucket;
  LLAMA_CLOUD_API_KEY: string;
}

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('study/', (c) => {
  return c.text('Hello Hono!')
})

app.get('study/health', (c) => {
  return c.json({ status: 'healthy', code: 200 })
})

app.get('study/extract/:userId/:locationName/:filename', async (c) => {
  try {
    const userId = c.req.param('userId')
    const locationName = c.req.param('locationName')
    const filename = c.req.param('filename')
    const id = `${userId}/${locationName}/${filename}`
    console.log("Worker getting executed !!")
    const bucket: R2Bucket = c.env.MY_BUCKET
    const object = await bucket.get(id)
    if (!object) {
      return c.json({ error: 'File not found' }, 500)
    }
    const data = await object.arrayBuffer()
    const apiKey = c.env.LLAMA_CLOUD_API_KEY;
    const reader = new LlamaParseReader({ resultType: "markdown", apiKey });
    const documents = await reader.loadDataAsContent(new Uint8Array(data as ArrayBuffer));
    return c.json(documents)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.json({ error: errorMessage }, 500)
  }
})


export default app