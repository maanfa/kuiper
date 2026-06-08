import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

// 创建路由实例，使用 hash 模式以兼容 Electron file:// 协议
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: HomeView,
      children: [
        {
          path: '',
          name: 'welcome',
          component: () => import('../views/WelcomeView.vue'),
        },
        {
          path: 'terrain-tile',
          name: 'terrainTile',
          component: () => import('../views/TerrainTileView.vue'),
        },
        {
          path: 'terrain-tile-converter',
          name: 'terrainTileConverter',
          component: () => import('../views/TerrainTileConverterView.vue'),
        },
        {
          path: 'inspector',
          name: 'inspector',
          component: () => import('../views/InspectorView.vue'),
        },
        {
          path: 'tileset-converter',
          name: 'tilesetConverter',
          component: () => import('../views/TilesetConverterView.vue'),
        },
        {
          path: 'static-server',
          name: 'staticServer',
          component: () => import('../views/StaticServerView.vue'),
        },
      ],
    },
  ],
})

export default router
