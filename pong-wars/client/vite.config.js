import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,  // Reactのホットリロードを有効にする
    })],
  server: {
    host: '0.0.0.0',  // 自分のIPアドレスでアクセス可能にする
    port: 3000,  // 使用するポートを指定
  }
})
