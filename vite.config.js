import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8503,
    strictPort: true, // 8503이 이미 사용중이면 다른 포트로 안 넘어가고 에러로 멈춤
    host: true        // 필요 없으면 지워도 됨(외부 접속 필요할 때만)
  },
  preview: {
    port: 8503,
    strictPort: true
  }
})
