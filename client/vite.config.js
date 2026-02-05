import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'https://random-video-chat-node.onrender.com',
        ws: true,
        secure: true,
        changeOrigin: true
      }
    }
  }
})
