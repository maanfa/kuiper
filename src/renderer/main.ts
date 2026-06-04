import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import App from './App.vue'
import router from './router'
import './assets/fonts.css'

// 创建 Vue 应用实例，依次注册 Pinia、Naive UI、路由后挂载
const app = createApp(App)
app.use(createPinia())
app.use(naive)
app.use(router)
app.mount('#app')
