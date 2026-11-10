import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { realpathSync } from 'node:fs'

const root = realpathSync(process.cwd())
process.chdir(root)

export default defineConfig({ root, plugins: [react()], base: './' })
