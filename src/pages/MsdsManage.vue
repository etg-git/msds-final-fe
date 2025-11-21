<template>
  <div class="page">
    <n-card class="list-card" size="small" :bordered="false">
      <template #header>
        <div class="card-header">
          <div class="title-block">
            <h1 class="title">MSDS 관리</h1>
            <p class="subtitle">
              저장된 MSDS 문서를 조회·검색하고,
              각 행의 ‘상세 / 수정’ 링크를 눌러 기본 정보와 구성성분, 유해성, 물리·화학적 특성을 수정합니다.
            </p>
          </div>
          <n-button size="small" tertiary @click="fetchDocs" :loading="listLoading">
            목록 새로고침
          </n-button>
        </div>
      </template>

      <n-spin :show="listLoading">
        <n-data-table
          size="small"
          :columns="columns"
          :data="docs"
          :bordered="false"
          :single-line="true"
        />
      </n-spin>
    </n-card>

    <!-- 상세 / 수정 드로어 -->
    <MsdsManageDetailDrawer
      v-model:show="detailVisible"
      :doc="selectedDoc"
      @saved="fetchDocs"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import axios from 'axios'
import {
  NCard,
  NButton,
  NSpin,
  NDataTable,
  NIcon,
  NTag
} from 'naive-ui'
import { PencilOutline } from '@vicons/ionicons5'

import MsdsManageDetailDrawer from './MsdsManageDetailDrawer.vue'

const API_BASE_URL =
  import.meta.env.VITE_MSDS_API_BASE || 'http://localhost:8000'

const docs = ref([])
const listLoading = ref(false)

// 상세 드로어 상태
const detailVisible = ref(false)
const selectedDoc = ref(null)

function openDetail (row) {
  if (!row || !row.id) return
  selectedDoc.value = row
  detailVisible.value = true
}

// 규제사항 검증 화면과 거의 동일한 컬럼 포맷
const columns = [
  {
    title: '제품명',
    key: 'chem_name',
    ellipsis: { tooltip: true },
    render (row) {
      return row.chem_name || row.file_name || '-'
    }
  },
  {
    title: '회사명',
    key: 'vendor_name',
    ellipsis: { tooltip: true }
  },
  {
    title: 'Cas No.',
    key: 'cas_no',
    width: 220,
    ellipsis: { tooltip: true }
  },
  {
    title: 'MSDS No.',
    key: 'msds_no',
    width: 220,
    ellipsis: { tooltip: true }
  },
  {
    title: '개정일자',
    key: 'revision_date',
    width: 120
  },
  {
    title: '개정번호',
    key: 'version_no',
    width: 90
  },
  {
    title: '관리',
    key: 'action',
    width: 140,
    align: 'center',
    render (row) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          tertiary: true,
          onClick: () => openDetail(row)
        },
        {
          default: () => [
            h(
              NIcon,
              { style: { marginRight: '4px' } },
              { default: () => h(PencilOutline) }
            ),
            '상세 / 수정'
          ]
        }
      )
    }
  }
]

// 문서 목록 조회
async function fetchDocs () {
  listLoading.value = true
  try {
    const resp = await axios.get(`${API_BASE_URL}/msds/documents`)
    docs.value = Array.isArray(resp.data) ? resp.data : []
  } catch (err) {
    console.error(err)
  } finally {
    listLoading.value = false
  }
}

onMounted(() => {
  fetchDocs()
})
</script>

<style scoped>
.page {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, -apple-system, sans-serif;
  max-width: 2300px;
  margin: 0 auto;
  padding: 16px 0 32px;
}

.list-card {
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

/* 카드 헤더 – shmsRegulApi랑 같은 느낌 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}
</style>
