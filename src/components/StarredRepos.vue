<template>
  <div class="page-container">
    <div class="content-wrapper">
      <div class="starred-repos-container">
        <div class="header-container">
          <n-space justify="space-between" class="header-space">
            <div class="avatar-container">
              <img :src="avatarUrl" alt="GitHub Avatar" class="avatar" @click="showUsernameInput = true" v-if="!showUsernameInput" />
              <n-input v-else round placeholder="输入GitHub用户名" v-model:value="username" @keydown.enter="fetchAllStarredRepos" @blur="hideUsernameInput" />
            </div>
            <div class="tag-input-container">
              <n-select
                v-model:value="selectedTags"
                multiple
                filterable
                placeholder="选择标签进行筛选"
                :options="tagOptions"
                @update:value="handleTagChange"
              />
              <n-button @click="showModal = true">+</n-button>
            </div>
          </n-space>
          <div class="divider"></div>
        </div>
        <n-space vertical class="content-container">
          <div v-if="filteredRepos.length > 0" class="repo-grid">
            <n-card v-for="repo in filteredRepos" :key="repo.id" class="repo-card">
              <template #header>
                <div class="repo-header">
                  <h3 class="repo-title">{{ repo.name }}</h3>
                  <div class="tag-select-container">
                    <n-select v-model:value="repoTags[repo.id]" multiple filterable size="small" placeholder="添加标签" :options="tagOptions" @update:value="(value) => handleRepoTagChange(repo.id, value)" />
                  </div>
                </div>
              </template>
              <n-space vertical>
                <a :href="repo.html_url" target="_blank" class="repo-link">{{ repo.full_name }}</a>
                <p class="repo-description">{{ repo.description }}</p>
                <n-space>
                  <n-tag v-if="repo.language">{{ repo.language }}</n-tag>
                  <n-tag>
                    <template #icon>
                      <n-icon color="#e7bd46"><star-filled /></n-icon>
                    </template>
                    {{ repo.stargazers_count }}
                  </n-tag>
                </n-space>
                <n-space wrap>
                  <n-tag :type="tag.split('::')[1]" v-for="tag in repoTags[repo.id]" :key="tag" closable @close="removeRepoTag(repo.id, tag)">
                    {{ tag.split('::')[0] }}
                  </n-tag>
                </n-space>
              </n-space>
            </n-card>
          </div>
          <div v-else class="empty-state">
            <n-icon size="48" :component="InboxOutlined" />
          </div>
        </n-space>
      </div>
      
      <!-- 版权页脚 -->
      <footer class="copyright-footer">
        <n-text depth="3">© {{ currentYear }} GitHub Star Manager. 保留所有权利。</n-text>
      </footer>
    </div>
  </div>

  <!-- 标签创建模态框 -->
  <n-modal v-model:show="showModal" preset="card" title="创建新标签" style="width: 90%; max-width: 400px;">
    <n-space vertical>
      <n-input v-model:value="newTagName" placeholder="输入新标签名称" />
      <n-space align="center" justify="space-between">
        <n-space>
          <n-button
            v-for="color in colorOptions"
            :key="color.value"
            circle
            :style="{ backgroundColor: color.color }"
            :type="newTagColor === color.value ? 'primary' : 'default'"
            @click="newTagColor = color.value"
          />
        </n-space>
      </n-space>
      <n-space justify="end">
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" @click="createNewTag">保存</n-button>
      </n-space>
    </n-space>
  </n-modal>
</template>
  
<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { NInput, NButton, NCard, NSpace, NTag, NIcon, NSelect, NModal, NText, useLoadingBar, useMessage } from 'naive-ui';
import { StarFilled, InboxOutlined } from '@vicons/antd';
import githubService, { perPage } from '../services/githubService';

const username = ref('');
const repos = ref([]);
const showUsernameInput = ref(false);
const avatarUrl = ref('https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png');

const loadingBar = useLoadingBar();
const message = useMessage();

const tagOptions = ref([]);
const selectedTags = ref([]);
const repoTags = ref({});

const showModal = ref(false);
const newTagName = ref('');
const newTagColor = ref('');

const colorOptions = [
  { label: '红色', value: 'error', color: '#d03050' },
  { label: '绿色', value: 'success', color: '#18a058' },
  { label: '蓝色', value: 'info', color: '#2080f0' },
  { label: '黄色', value: 'warning', color: '#f0a020' },
  { label: '灰色', value: 'default', color: '#909399' },
];

const loadTags = () => {
  const savedTags = localStorage.getItem('github-tags');
  if (savedTags) {
    tagOptions.value = JSON.parse(savedTags);
  }
};

const saveTags = () => {
  localStorage.setItem('github-tags', JSON.stringify(tagOptions.value));
};

const handleTagChange = (value) => {
  selectedTags.value = value;
};

const handleRepoTagChange = (repoId, value) => {
  repoTags.value[repoId] = value;
  localStorage.setItem(`repo-tags-${repoId}`, JSON.stringify(value));
};

const filteredRepos = computed(() => {
  if (selectedTags.value.length === 0) {
    return repos.value;
  }
  return repos.value.filter(repo => {
    const repoTagValues = repoTags.value[repo.id] || [];
    return selectedTags.value.some(tag => repoTagValues.includes(tag));
  });
});

const fetchAllStarredRepos = async () => {
  loadingBar.start();
  repos.value = [];
  let page = 1;
  let hasMoreRepos = true;

  try {
    while (hasMoreRepos) {
      const response = await githubService.getStarredRepos(username.value, page);
      const newRepos = response.data;
      repos.value = [...repos.value, ...newRepos];
      
      newRepos.forEach(repo => {
        const savedTags = localStorage.getItem(`repo-tags-${repo.id}`);
        if (savedTags) {
          repoTags.value[repo.id] = JSON.parse(savedTags);
        }
      });
      
      if (newRepos.length < perPage) {
        hasMoreRepos = false;
      } else {
        page++;
      }
    }

    localStorage.setItem('github-username', username.value);
    await fetchAvatarUrl();
    loadingBar.finish();
    showUsernameInput.value = false;
  } catch (error) {
    console.error(error);
    loadingBar.error();
    message.error('获取仓库失败，请检查用户名是否正确');
  }
};

const fetchAvatarUrl = async () => {
  try {
    const response = await githubService.getUser(username.value);
    avatarUrl.value = response.data.avatar_url;
  } catch (error) {
    console.error(error);
  }
};

const hideUsernameInput = () => {
  showUsernameInput.value = false;
};

onMounted(() => {
  loadTags();
  const savedUsername = localStorage.getItem('github-username');
  if (savedUsername) {
    username.value = savedUsername;
    fetchAvatarUrl();
    fetchAllStarredRepos();
  }
});

watch(repos, () => {
  repos.value.forEach(repo => {
    if (!repoTags.value[repo.id]) {
      repoTags.value[repo.id] = [];
    }
  });
});

const removeRepoTag = (repoId, tagToRemove) => {
  repoTags.value[repoId] = repoTags.value[repoId].filter(tag => tag !== tagToRemove);
  localStorage.setItem(`repo-tags-${repoId}`, JSON.stringify(repoTags.value[repoId]));
};

// 监听 tagOptions 的变化
watch(tagOptions, () => {
  saveTags();
}, { deep: true });

const createNewTag = () => {
  if (newTagName.value.trim() === '') {
    message.error('标签名称不能为空');
    return;
  }
  const newTag = {
    label: newTagName.value,
    value: newTagName.value + "::" + newTagColor.value || 'default'
  };
  if (!tagOptions.value.some(tag => tag.value === newTag.value)) {
    tagOptions.value.push(newTag);
    saveTags();
    message.success('标签创建成功');
    showModal.value = false;
    newTagName.value = '';
    newTagColor.value = '';
  } else {
    message.warning('该标签已存在');
  }
};

// 计算当前年份
const currentYear = computed(() => new Date().getFullYear());
</script>
  
<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  padding: 0 24px;
  box-sizing: border-box;
}

.starred-repos-container {
  flex: 1;
}

.header-container {
  position: sticky;
  top: 0;
  background-color: #fff;
  z-index: 100;
  padding-top: 20px;
}

.header-space {
  margin-bottom: 20px;
}

.avatar-container, .tag-input-container {
  flex: 1;
}

.avatar-container {
  display: flex;
  align-items: center;
}

.tag-input-container {
  display: flex;
  justify-content: flex-end;
}

.tag-input-container :deep(.n-select) {
  width: 300px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
}

.divider {
  height: 1px;
  background-color: #e0e0e0;
  margin-bottom: 20px;
}

.content-container {
  padding-top: 20px;
}

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.repo-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  position: relative;
}

.repo-card:hover {
  border-color: #18a058;
  box-shadow: 0 0 2px rgba(24, 160, 88, 0.2);
}

.repo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.repo-title {
  margin: 0;
  font-size: 1.2em;
}

.tag-select-container {
  opacity: 0;
  transition: opacity 0.3s ease;
  position: absolute;
  right: 20px;
  top: 20px;
}

.repo-card:hover .tag-select-container {
  opacity: 1;
}

.tag-select-container :deep(.n-select) {
  width: 150px;
}

.repo-link {
  font-weight: bold;
  color: #0366d6;
  text-decoration: none;
}

.repo-description {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

@media (max-width: 768px) {
  .repo-grid {
    grid-template-columns: 1fr;
  }

  .tag-input-container :deep(.n-select) {
    width: 100%;
    max-width: none;
  }

  .tag-input-container :deep(.n-base-selection) {
    min-height: auto;
    height: auto;
    max-height: none;
  }

  .tag-input-container :deep(.n-base-selection-tags) {
    flex-wrap: wrap;
    max-height: none;
    overflow: visible;
  }

  .tag-input-container :deep(.n-base-selection-tag-wrapper) {
    margin-bottom: 4px;
  }

  .header-space {
    flex-direction: column;
    align-items: stretch;
  }

  .avatar-container, .tag-input-container {
    margin-bottom: 10px;
  }

  .repo-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tag-select-container {
    position: static;
    opacity: 0;
    margin-top: 10px;
    width: 100%;
  }

  .tag-select-container :deep(.n-select) {
    width: 100%;
  }

  .repo-card:hover .tag-select-container,
  .repo-card:focus .tag-select-container,
  .repo-card:active .tag-select-container {
    opacity: 1;
  }

  .content-wrapper {
    padding: 0 16px;
  }
}

/* 添加以下样式来美化颜色球 */
.n-button.n-button--circle {
  width: 24px;
  height: 24px;
  padding: 0;
  min-width: 24px;
}

.n-button.n-button--circle:hover {
  opacity: 0.8;
}

.n-button.n-button--circle.n-button--primary-type {
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px var(--n-color);
}

/* 版权页脚样式 */
.copyright-footer {
  text-align: center;
  padding: 20px 0;
  margin-top: 40px;
  border-top: 1px solid #e0e0e0;
  background-color: #fff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
}

.empty-state .n-icon {
  margin-bottom: 16px;
  color: #909399;
}

.empty-state p {
  margin-bottom: 16px;
  font-size: 16px;
  color: #606266;
}
</style>