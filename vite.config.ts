import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base 是 GitHub Pages 项目站的路径：https://<用户>.github.io/shichao/
export default defineConfig({
  base: '/shichao/',
  plugins: [react()],
})
