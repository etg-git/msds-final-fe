import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// naive-ui 전체 등록 (간단 버전)
import naive from 'naive-ui'

import './assets/main.css'  // 필요하면 공통 스타일용

const app = createApp(App)

app.use(router)
app.use(naive)

app.mount('#app')
