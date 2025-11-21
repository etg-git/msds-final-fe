<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <!-- 전역 메시지 사용 가능 -->
    <n-dialog-provider>
      <n-message-provider>
        <n-layout has-sider class="app-layout">
          <!-- 사이드바 -->
          <n-layout-sider
            bordered
            collapse-mode="width"
            :collapsed-width="72"
            :native-scrollbar="false"
            width="240"
            class="app-sider"
          >
            <div class="sider-inner">
              <!-- 로고 / 타이틀 영역 -->
              <div class="logo-block">
                <div class="logo-mark">🧪</div>
                <div class="logo-text">
                  <div class="logo-title">MSDS AI</div>
                  <div class="logo-sub">Safety Data Workspace</div>
                </div>
              </div>

              <!-- 메뉴: MSDS -->
              <div class="menu-section-label">MSDS</div>
              <n-menu
                class="app-menu"
                :options="msdsMenuOptions"
                :value="activeKey"
                :indent="18"
                :collapsed-icon-size="20"
                :root-indent="20"
                @update:value="handleMenuSelect"
              />

              <!-- 메뉴: SHMS / API -->
              <div class="menu-section-label second">SHMS / API</div>
              <n-menu
                class="app-menu"
                :options="shmsMenuOptions"
                :value="activeKey"
                :indent="18"
                :collapsed-icon-size="20"
                :root-indent="20"
                @update:value="handleMenuSelect"
              />

              <!-- 하단 작은 정보 -->
              <div class="sider-footer">
                <div class="env-pill">LOCAL · DEV</div>
                <div class="version-text">v0.1.0</div>
              </div>
            </div>
          </n-layout-sider>

          <!-- 메인 레이아웃 -->
          <n-layout>
            <!-- <n-layout-header bordered class="app-header">
              <div class="header-left">
                <div class="header-breadcrumb">
                  <span class="crumb-root">MSDS AI</span>
                  <span class="crumb-sep">/</span>
                  <span class="crumb-leaf">{{ headerTitle }}</span>
                </div>
                <div class="header-main">
                  <span class="header-title">{{ headerTitle }}</span>
                  <span
                    v-if="headerSubtitle"
                    class="header-subtitle"
                  >{{ headerSubtitle }}</span>
                </div>
              </div>
            </n-layout-header> -->

            <n-layout-content embedded class="app-content">
              <RouterView />
            </n-layout-content>
          </n-layout>
        </n-layout>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import {
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NLayoutHeader,
  NDialogProvider,
  NConfigProvider,
  NMenu,
  NMessageProvider
} from 'naive-ui'

const router = useRouter()
const route = useRoute()

// 메인 색감 조금만 커스터마이징
const themeOverrides = {
  common: {
    primaryColor: '#16a34a',
    primaryColorHover: '#22c55e',
    primaryColorPressed: '#15803d'
  }
}

// 메뉴 옵션
const msdsMenuOptions = [
  {
    label: 'MSDS 파일 업로드',
    key: '/msds/upload'
  },
  {
    label: 'MSDS 데이터 관리',
    key: '/msds/manage'
  },
  {
    label: 'MSDS 상세보기 / AI 요약',
    key: '/msds/summary'
  }
]

const shmsMenuOptions = [
  {
    label: '규제사항 검증',
    key: '/shms/regulation',
  }
]

const activeKey = computed(() => route.path)

const headerTitle = computed(() => {
  switch (route.path) {
    case '/msds/upload':
      return 'MSDS 파일 업로드'
    case '/msds/manage':
      return 'MSDS 관리'
    case '/msds/summary':
      return 'MSDS 요약 / RAG'
    case '/shms/regulation':
      return 'SHMS 규제 매핑 (준비중)'
    default:
      return 'MSDS AI'
  }
})

const headerSubtitle = computed(() => {
  switch (route.path) {
    case '/msds/upload':
      return '여러 MSDS PDF를 한 번에 업로드하고 섹션을 자동 분석합니다.'
    case '/msds/manage':
      return '저장된 MSDS와 섹션 데이터를 조회·관리합니다.'
    case '/msds/summary':
      return '벡터 DB와 RAG를 이용해 MSDS 내용을 요약·검색합니다.'
    case '/shms/regulation':
      return 'SHMS 규제 매핑 기능을 준비 중입니다.'
    default:
      return 'MSDS 기반 안전·보건 데이터를 통합 관리하는 워크스페이스입니다.'
  }
})

function handleMenuSelect(key) {
  if (typeof key === 'string' && key.startsWith('/')) {
    router.push(key)
  }
}
</script>

<style scoped>
/* 1. 전역 배경색: 항상 동일한 회색 */
:global(html, body, #app) {
  margin: 0;
  padding: 0;
  background-color: #f3f4f6;  /* 원하는 회색 코드 */
}

/* 전체 레이아웃은 화면 높이 채우기 */
.app-layout {
  height: 100vh;          /* 화면 높이에 딱 맞게 고정 */
}


/* Naive UI 레이아웃 기본 배경도 회색으로 맞추기 */
:deep(.n-layout) {
  background-color: #f3f4f6;
}

/* 사이드바 */
.app-sider {
  background: #020617;
  color: #e5e7eb;
  padding: 12px 12px 16px;
  height: 100vh;          /* 사이드바도 화면 높이 고정 */
  flex-shrink: 0;         /* 오른쪽 내용이 커져도 같이 줄어들지 않게 */
}


/* 오른쪽 메인 컨텐츠 영역 배경도 회색으로 고정 */
.app-content {
  padding: 20px 24px;
  background-color: #f3f4f6;
}

/* 아래부터는 기존 스타일 그대로 유지 */
.sider-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 로고 영역 */
.logo-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  margin-bottom: 10px;
}

.logo-mark {
  width: 30px;
  height: 30px;
  border-radius: 12px;
  background: linear-gradient(135deg, #22c55e, #4ade80);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 17px;
  font-weight: 600;
  color: #f9fafb;
}

.logo-sub {
  font-size: 11px;
  color: #9ca3af;
}

/* 메뉴 섹션 라벨 – 눈에 확 띄게 */
.menu-section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e5e7eb;
  padding: 6px 12px;
  margin: 12px 4px 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
}

.menu-section-label.second {
  margin-top: 18px;
}

/* Naive Menu 커스터마이징 */
:deep(.app-menu .n-menu-item-content) {
  border-radius: 999px;
  padding: 6px 10px;
  margin: 2px 4px;
}

:deep(.app-menu .n-menu-item-content-header) {
  color: #e5e7eb;
  font-size: 13px;
}

/* 호버 */
:deep(.app-menu .n-menu-item-content:hover) {
  background: rgba(148, 163, 184, 0.3);
}

/* 선택된 메뉴 */
:deep(.app-menu .n-menu-item-content.n-menu-item-content--selected) {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #f9fafb !important;
}

:deep(.app-menu .n-menu-item-content.n-menu-item-content--selected
       .n-menu-item-content-header) {
  color: #f9fafb !important;
}

/* disabled 메뉴 */
:deep(.app-menu .n-menu-item-content.n-menu-item-content--disabled
       .n-menu-item-content-header) {
  color: #6b7280;
}

/* 사이드바 하단 정보 */
.sider-footer {
  margin-top: auto;
  padding: 12px 8px 6px;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.env-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, 0.7);
  font-size: 10px;
  padding: 2px 10px;
  color: #4ade80;
}

.version-text {
  font-size: 11px;
  color: #6b7280;
}

/* 헤더 (지금은 주석이라 영향 X) */
.app-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-breadcrumb {
  font-size: 12px;
  color: #9ca3af;
}

.crumb-root {
  font-weight: 500;
}

.crumb-sep {
  margin: 0 4px;
}

.crumb-leaf {
  color: #4b5563;
}

.header-main {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.header-subtitle {
  font-size: 13px;
  color: #6b7280;
}
</style>