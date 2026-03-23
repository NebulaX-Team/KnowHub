<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  NText,
  NTooltip,
  useMessage,
  type DataTableColumns,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import {
  CreateOutline,
  ReturnUpBackOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { collabApi, type TeamItem, type TeamMember } from '@/api/collab'
import { useUserStore } from '@/stores/user'
import { useSystemStore } from '@/stores/system'
import { formatDateTimeByOffset } from '@/utils/datetime'

const route = useRoute()
const { t, locale } = useI18n()
const message = useMessage()
const userStore = useUserStore()
const systemStore = useSystemStore()

const teams = ref<TeamItem[]>([])
const members = ref<TeamMember[]>([])
const loadingTeams = ref(false)
const loadingMembers = ref(false)
const creatingTeam = ref(false)
const addingMember = ref(false)

const selectedTeamId = ref<string | null>(null)

const createModalVisible = ref(false)
const createFormRef = ref<FormInst | null>(null)
const createForm = ref({
  name: '',
  description: '',
})

const memberModalVisible = ref(false)
const memberFormRef = ref<FormInst | null>(null)
const memberForm = ref({
  email: '',
  role: 'member' as 'member' | 'admin',
})

const title = computed(() => {
  const titleKey = route.meta.titleKey as string | undefined
  if (titleKey) {
    return t(titleKey)
  }
  return t('settingsPage.teams.defaultTitle')
})

const selectedTeam = computed(() => teams.value.find((team) => team.id === selectedTeamId.value) || null)
const isOwnerOfSelectedTeam = computed(() => selectedTeam.value?.myRole === 'owner')
const canManageSelectedTeam = computed(() => {
  const role = selectedTeam.value?.myRole
  return role === 'owner' || role === 'admin'
})
const selectedTeamDescription = computed(() => {
  const rawDescription = selectedTeam.value?.description?.trim() || ''
  const teamName = selectedTeam.value?.name?.trim() || ''
  if (!rawDescription || rawDescription === teamName) {
    return ''
  }
  return rawDescription
})

const createRules: FormRules = {
  name: [
    {
      required: true,
      message: t('settingsPage.teams.validation.nameRequired'),
      trigger: ['blur', 'input'],
    },
    {
      min: 1,
      max: 80,
      message: t('settingsPage.teams.validation.nameLength'),
      trigger: ['blur', 'input'],
    },
  ],
}

const memberRules: FormRules = {
  email: [
    {
      required: true,
      message: t('settingsPage.teams.validation.emailRequired'),
      trigger: ['blur', 'input'],
    },
    {
      type: 'email',
      message: t('settingsPage.teams.validation.emailInvalid'),
      trigger: ['blur', 'input'],
    },
  ],
}

const roleOptions = computed(() => [
  { label: t('settingsPage.teams.roles.member'), value: 'member' },
  { label: t('settingsPage.teams.roles.admin'), value: 'admin' },
])

function formatRole(role: string) {
  if (role === 'owner') return t('settingsPage.teams.roles.owner')
  if (role === 'admin') return t('settingsPage.teams.roles.admin')
  return t('settingsPage.teams.roles.member')
}

async function loadTeams(preferredTeamId?: string | null) {
  loadingTeams.value = true
  try {
    const response = await collabApi.listTeams()
    teams.value = response?.data || []

    const exists = preferredTeamId && teams.value.some((team) => team.id === preferredTeamId)
    if (exists) {
      selectedTeamId.value = preferredTeamId
    } else if (!selectedTeamId.value || !teams.value.some((team) => team.id === selectedTeamId.value)) {
      selectedTeamId.value = teams.value[0]?.id || null
    }
  } catch {
    message.error(t('settingsPage.teams.messages.loadTeamsFailed'))
  } finally {
    loadingTeams.value = false
  }
}

async function loadMembers(teamId: string | null) {
  if (!teamId) {
    members.value = []
    return
  }

  loadingMembers.value = true
  try {
    const response = await collabApi.listTeamMembers(teamId)
    members.value = response?.data?.members || []
  } catch {
    members.value = []
    message.error(t('settingsPage.teams.messages.loadMembersFailed'))
  } finally {
    loadingMembers.value = false
  }
}

watch(
  () => selectedTeamId.value,
  (teamId) => {
    loadMembers(teamId)
  },
)

function openCreateModal() {
  createForm.value = {
    name: '',
    description: '',
  }
  createModalVisible.value = true
}

async function handleCreateTeam() {
  await createFormRef.value?.validate()

  creatingTeam.value = true
  try {
    const response = await collabApi.createTeam({
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim() || undefined,
    })

    createModalVisible.value = false
    const createdTeamId = response?.data?.team?.id || null
    await loadTeams(createdTeamId)
    message.success(t('settingsPage.teams.messages.createSuccess'))
  } catch {
    message.error(t('settingsPage.teams.messages.createFailed'))
  } finally {
    creatingTeam.value = false
  }
}

function openAddMemberModal() {
  if (!selectedTeamId.value) return
  memberForm.value = {
    email: '',
    role: 'member',
  }
  memberModalVisible.value = true
}

async function handleAddMember() {
  if (!selectedTeamId.value) return
  await memberFormRef.value?.validate()

  addingMember.value = true
  try {
    await collabApi.addTeamMember(selectedTeamId.value, {
      email: memberForm.value.email.trim(),
      role: memberForm.value.role,
    })
    memberModalVisible.value = false
    await loadMembers(selectedTeamId.value)
    await loadTeams(selectedTeamId.value)
    message.success(t('settingsPage.teams.messages.addMemberSuccess'))
  } catch {
    message.error(t('settingsPage.teams.messages.addMemberFailed'))
  } finally {
    addingMember.value = false
  }
}

async function toggleMemberRole(member: TeamMember) {
  if (!selectedTeamId.value || member.role === 'owner') return

  const nextRole = member.role === 'admin' ? 'member' : 'admin'
  try {
    await collabApi.updateTeamMemberRole(selectedTeamId.value, member.userId, { role: nextRole })
    await loadMembers(selectedTeamId.value)
    message.success(t('settingsPage.teams.messages.updateRoleSuccess'))
  } catch {
    message.error(t('settingsPage.teams.messages.updateRoleFailed'))
  }
}

async function removeMember(member: TeamMember) {
  if (!selectedTeamId.value || member.role === 'owner') return

  try {
    await collabApi.removeTeamMember(selectedTeamId.value, member.userId)
    await loadMembers(selectedTeamId.value)
    await loadTeams(selectedTeamId.value)
    message.success(t('settingsPage.teams.messages.removeMemberSuccess'))
  } catch {
    message.error(t('settingsPage.teams.messages.removeMemberFailed'))
  }
}

async function transferOwnership(member: TeamMember) {
  if (!selectedTeamId.value || !isOwnerOfSelectedTeam.value) return

  try {
    await collabApi.transferTeamOwnership(selectedTeamId.value, member.userId)
    await loadTeams(selectedTeamId.value)
    await loadMembers(selectedTeamId.value)
    message.success(t('settingsPage.teams.messages.transferOwnerSuccess'))
  } catch {
    message.error(t('settingsPage.teams.messages.transferOwnerFailed'))
  }
}

const columns = computed<DataTableColumns<TeamMember>>(() => [
  {
    title: t('settingsPage.teams.table.member'),
    key: 'displayName',
    minWidth: 220,
    render: (row) => {
      const name = row.displayName || row.email
      return h(NSpace, { vertical: true, size: 2 }, {
        default: () => [
          h(NText, { strong: true }, { default: () => name }),
          h(NText, { depth: 3 }, { default: () => row.email }),
        ],
      })
    },
  },
  {
    title: t('settingsPage.teams.table.role'),
    key: 'role',
    width: 120,
    render: (row) => {
      const type = row.role === 'owner' ? 'warning' : row.role === 'admin' ? 'success' : 'default'
      return h(NTag, { type, size: 'small' }, { default: () => formatRole(row.role) })
    },
  },
  {
    title: t('settingsPage.teams.table.joinedAt'),
    key: 'joinedAt',
    minWidth: 180,
    render: (row) => formatDateTimeByOffset(row.joinedAt, systemStore.siteTimezone, locale.value),
  },
  {
    title: t('settingsPage.teams.table.actions'),
    key: 'actions',
    width: 170,
    align: 'center',
    render: (row): ReturnType<typeof h> => {
      if (row.userId === userStore.userId) {
        return h(NText, { depth: 3 }, { default: () => t('settingsPage.teams.actions.currentUserNoActions') })
      }

      if (row.role === 'owner') {
        return h(NText, { depth: 3 }, { default: () => t('settingsPage.teams.actions.ownerNoActions') })
      }

      if (!canManageSelectedTeam.value) {
        return h(NText, { depth: 3 }, { default: () => t('settingsPage.teams.actions.noPermission') })
      }

      const actions: ReturnType<typeof h>[] = []

      if (isOwnerOfSelectedTeam.value) {
        actions.push(
          h(NPopconfirm, {
            onPositiveClick: () => transferOwnership(row),
            positiveText: t('common.actions.confirm'),
            negativeText: t('common.actions.cancel'),
          }, {
            default: () => t('settingsPage.teams.confirmTransferOwnership', { name: row.displayName || row.email }),
            trigger: () => h(
              NButton,
              {
                size: 'small',
                type: 'warning',
                quaternary: true,
                circle: true,
                title: t('settingsPage.teams.actions.transferOwner'),
              },
              { icon: () => h(NIcon, { component: ReturnUpBackOutline }) },
            ),
          }),
        )
      }

      actions.push(
        h(
          NTooltip,
          null,
          {
            trigger: () => h(
              NButton,
              {
                size: 'small',
                quaternary: true,
                circle: true,
                onClick: () => toggleMemberRole(row),
                title: row.role === 'admin'
                  ? t('settingsPage.teams.actions.setMember')
                  : t('settingsPage.teams.actions.setAdmin'),
              },
              { icon: () => h(NIcon, { component: CreateOutline }) },
            ),
            default: () => row.role === 'admin'
              ? t('settingsPage.teams.actions.setMember')
              : t('settingsPage.teams.actions.setAdmin'),
          },
        )
      )

      actions.push(
        h(NPopconfirm, {
          onPositiveClick: () => removeMember(row),
          positiveText: t('common.actions.confirm'),
          negativeText: t('common.actions.cancel'),
        }, {
          default: () => t('settingsPage.teams.confirmRemoveMember', { name: row.displayName || row.email }),
          trigger: () => h(
            NButton,
            {
              size: 'small',
              type: 'error',
              quaternary: true,
              circle: true,
              title: t('common.actions.remove'),
            },
            { icon: () => h(NIcon, { component: TrashOutline }) },
          ),
        }),
      )

      return h(NSpace, { size: 4, justify: 'center' }, { default: () => actions })
    },
  },
])

onMounted(async () => {
  await loadTeams()
})
</script>

<template>
  <div class="settings-content">
    <div class="settings-header">
      <div>
        <h2>{{ title }}</h2>
        <p class="description">{{ t('settingsPage.teams.description') }}</p>
      </div>
      <n-button type="primary" @click="openCreateModal">
        {{ t('settingsPage.teams.actions.newTeam') }}
      </n-button>
    </div>

    <div class="teams-layout">
      <n-card :title="t('settingsPage.teams.teamListTitle')" class="team-list-card">
        <n-space vertical :size="8">
          <n-button
            v-for="team in teams"
            :key="team.id"
            text
            class="team-item"
            :type="selectedTeamId === team.id ? 'primary' : 'default'"
            @click="selectedTeamId = team.id"
          >
            <div class="team-item-main">
              <span class="team-name">{{ team.name }}</span>
              <n-tag size="small" :type="team.myRole === 'owner' ? 'warning' : team.myRole === 'admin' ? 'success' : 'default'">
                {{ formatRole(team.myRole) }}
              </n-tag>
            </div>
            <n-text depth="3" class="team-meta">
              {{ t('settingsPage.teams.memberCount', { count: team.memberCount }) }}
            </n-text>
          </n-button>

          <n-empty
            v-if="!loadingTeams && teams.length === 0"
            :description="t('settingsPage.teams.emptyTeams')"
          />
        </n-space>
      </n-card>

      <n-card>
        <template #header>
          <div class="member-header" v-if="selectedTeam">
            <div class="member-header-main">
              <div class="member-title-row">
                <div class="member-title">{{ selectedTeam.name }}</div>
                <n-tag size="small" :type="selectedTeam.myRole === 'owner' ? 'warning' : selectedTeam.myRole === 'admin' ? 'success' : 'default'">
                  {{ formatRole(selectedTeam.myRole) }}
                </n-tag>
              </div>
              <div class="member-subtitle">{{ selectedTeamDescription || t('settingsPage.teams.noDescription') }}</div>
              <n-text depth="3" class="member-meta">{{ t('settingsPage.teams.memberCount', { count: selectedTeam.memberCount }) }}</n-text>
            </div>
            <n-button
              type="primary"
              :disabled="!canManageSelectedTeam"
              @click="openAddMemberModal"
            >
              {{ t('settingsPage.teams.actions.addMember') }}
            </n-button>
          </div>
          <div v-else>{{ t('settingsPage.teams.membersTitle') }}</div>
        </template>

        <n-data-table
          v-if="selectedTeam"
          :columns="columns"
          :data="members"
          :loading="loadingMembers"
          striped
        />
        <n-empty
          v-else
          :description="t('settingsPage.teams.selectTeamHint')"
        />
      </n-card>
    </div>

    <n-modal
      v-model:show="createModalVisible"
      preset="card"
      :title="t('settingsPage.teams.actions.newTeam')"
      style="max-width: 520px"
      :mask-closable="false"
    >
      <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-placement="top">
        <n-form-item :label="t('settingsPage.teams.form.teamName')" path="name">
          <n-input v-model:value="createForm.name" :placeholder="t('settingsPage.teams.placeholders.teamName')" />
        </n-form-item>
        <n-form-item :label="t('settingsPage.teams.form.description')" path="description">
          <n-input
            v-model:value="createForm.description"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            :placeholder="t('settingsPage.teams.placeholders.description')"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="createModalVisible = false">{{ t('common.actions.cancel') }}</n-button>
          <n-button type="primary" :loading="creatingTeam" @click="handleCreateTeam">
            {{ t('common.actions.create') }}
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="memberModalVisible"
      preset="card"
      :title="t('settingsPage.teams.actions.addMember')"
      style="max-width: 520px"
      :mask-closable="false"
    >
      <n-form ref="memberFormRef" :model="memberForm" :rules="memberRules" label-placement="top">
        <n-form-item :label="t('settingsPage.teams.form.email')" path="email">
          <n-input v-model:value="memberForm.email" :placeholder="t('settingsPage.teams.placeholders.email')" />
        </n-form-item>
        <n-form-item :label="t('settingsPage.teams.form.role')" path="role">
          <n-select v-model:value="memberForm.role" :options="roleOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="memberModalVisible = false">{{ t('common.actions.cancel') }}</n-button>
          <n-button type="primary" :loading="addingMember" @click="handleAddMember">
            {{ t('common.actions.add') }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.settings-content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .description {
    margin: 8px 0 0;
    color: var(--color-text-secondary);
  }
}

.teams-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
}

.team-list-card {
  min-height: 420px;
}

.team-item {
  width: 100%;
  justify-content: flex-start;
  padding: 8px 6px;

  :deep(.n-button__content) {
    width: 100%;
    text-align: left;
    display: block;
  }
}

.team-item-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.team-name {
  font-weight: 600;
}

.team-meta {
  display: block;
  margin-top: 4px;
  font-size: 12px;
}

.member-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.member-header-main {
  min-width: 0;
}

.member-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-title {
  font-weight: 600;
}

.member-subtitle {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.member-meta {
  display: block;
  margin-top: 6px;
  font-size: 12px;
}

@media (max-width: 992px) {
  .teams-layout {
    grid-template-columns: 1fr;
  }

  .team-list-card {
    min-height: auto;
  }
}
</style>
