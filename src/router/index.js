import { createRouter, createWebHistory } from 'vue-router'
import MsdsUpload from '../pages/MsdsUpload.vue'
import MsdsManage from '../pages/MsdsManage.vue'
import MsdsSummary from '../pages/MsdsSummary.vue'
import MsdsDetail from '../pages/MsdsDetail.vue'
import ShmsRegulApi from '../pages/ShmsRegulApi.vue'

const routes = [
  { path: '/', redirect: '/msds/upload' },
  { path: '/msds/upload', component: MsdsUpload },
  { path: '/msds/manage', component: MsdsManage },
  { path: '/msds/summary', component: MsdsSummary },
  {
    path: '/msds/:id',
    name: 'msds-detail',
    component: MsdsDetail,
    props: true,
  },
  // SHMS 연계 화면은 나중에 추가
  { path: '/shms/regulation', component: ShmsRegulApi },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
