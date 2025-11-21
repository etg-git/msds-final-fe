<template>
  <div class="page">
    <n-card class="list-card" size="small" :bordered="false">
      <template #header>
        <div class="card-header">
          <div class="title-block">
            <h1 class="title">규제사항 검증</h1>
            <p class="subtitle">
              저장된 MSDS 중에서 규제사항 검증이 필요한 문서를 선택하고,
              각 행의 ‘규제사항 보기’ 링크를 눌러 섹션 15 법적 규제 현황을 확인합니다.
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

    <!-- 규제사항 모달 컴포넌트 -->
    <ShmsRegulDetailModal
      v-model:show="regulVisible"
      :doc="selectedDoc"
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
  NIcon            // ← 아이콘 추가 (선택)
} from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'  // ← 돋보기 아이콘

import ShmsRegulDetailModal from './ShmsRegulDetailModal.vue'
// import ShmsRegulDetailModal from './ShmsRegulDetailModal2.vue'

const API_BASE_URL =
  import.meta.env.VITE_MSDS_API_BASE || 'http://localhost:8000'

const docs = ref([])
const listLoading = ref(false)

// 모달 상태
const regulVisible = ref(false)
const selectedDoc = ref(null)

// “규제사항 보기” 클릭 시 모달 오픈
function openRegulationModal (row) {
  if (!row || !row.id) return
  selectedDoc.value = row
  regulVisible.value = true
}

// 테이블 컬럼 정의
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
    title: 'Cas No',
    key: 'cas_no',
    width: 200,
    ellipsis: { tooltip: true }
  },
  {
    title: 'MSDS 번호',
    key: 'msds_no',
    width: 250,
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
    title: '규제 검증',
    key: 'action',
    width: 140,
    align: 'center',
    render (row) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'success',
          tertiary: true,      // 연두색 테두리 느낌
          onClick: () => openRegulationModal(row)
        },
        {
          default: () => [
            h(
              NIcon,
              { style: { marginRight: '4px' } },
              { default: () => h(SearchOutline) }
            ),
            '규제사항 보기'
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

/* 카드 헤더 */
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

/* 링크 스타일 */
.regul-link {
  font-size: 12px;
  color: #16a34a;
  text-decoration: none;
  cursor: pointer;
}

.regul-link:hover {
  text-decoration: underline;
}
</style>
