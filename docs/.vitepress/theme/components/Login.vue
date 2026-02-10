<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

const isLoggedIn = ref(false)
const currentUser = ref<{ username: string; displayName: string } | null>(null)
const isCardShown = ref(false)
const isRegisterMode = ref(false)
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  username: '',
  password: ''
})

const isDisabled = computed(() => {
  return !form.username || form.username.length < 3 || !form.password || form.password.length < 6
})

const API_BASE = 'https://api.fmhy.net'

onMounted(() => {
  const token = localStorage.getItem('auth_token')
  const user = localStorage.getItem('auth_user')
  if (token && user) {
    isLoggedIn.value = true
    currentUser.value = JSON.parse(user)
  }
})

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ''

  const endpoint = isRegisterMode.value ? '/auth/register' : '/auth/login'

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username, password: form.password })
    })

    const data = await response.json()
    if (!response.ok) {
      errorMsg.value = data.statusMessage || 'Something went wrong'
      return
    }

    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('auth_user', JSON.stringify(data.user))
    isLoggedIn.value = true
    currentUser.value = data.user
    isCardShown.value = false
    form.username = ''
    form.password = ''
  } catch {
    errorMsg.value = 'Network error. Please try again.'
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
  isLoggedIn.value = false
  currentUser.value = null
}

function toggleMode() {
  isRegisterMode.value = !isRegisterMode.value
  errorMsg.value = ''
}

const toggleCard = () => (isCardShown.value = !isCardShown.value)
</script>

<template>
  <div class="login-wrapper">
    <template v-if="isLoggedIn && currentUser">
      <div class="user-info">
        <span class="i-lucide:user mr-1" />
        <span class="username">{{ currentUser.displayName }}</span>
        <button class="btn btn-sm" @click="handleLogout">Logout</button>
      </div>
    </template>
    <template v-else>
      <button class="btn" @click="toggleCard()">
        <span class="i-lucide:log-in mr-1" />
        <span>Login</span>
      </button>
    </template>

    <Transition name="fade" mode="out-in">
      <div v-if="isCardShown && !isLoggedIn" class="login-card">
        <div class="step">
          <p class="heading">
            {{ isRegisterMode ? 'Create Account' : 'Login' }}
          </p>
          <p class="desc">
            {{ isRegisterMode ? 'Register with a username and password.' : 'Sign in with your username and password.' }}
          </p>

          <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

          <input
            v-model="form.username"
            class="input"
            type="text"
            placeholder="Username"
            autocomplete="username"
          />
          <input
            v-model="form.password"
            class="input"
            type="password"
            :placeholder="isRegisterMode ? 'Password (min 6 chars)' : 'Password'"
            autocomplete="current-password"
            @keyup.enter="!isDisabled && handleSubmit()"
          />

          <button
            class="btn btn-primary"
            :disabled="isDisabled || loading"
            @click="handleSubmit()"
          >
            {{ loading ? 'Please wait...' : isRegisterMode ? 'Register' : 'Login' }}
          </button>

          <p class="desc mt-2">
            <span>{{ isRegisterMode ? 'Already have an account?' : "Don't have an account?" }}</span>
            <a class="text-primary text-underline ml-1 cursor-pointer" @click="toggleMode">
              {{ isRegisterMode ? 'Login' : 'Register' }}
            </a>
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="css">
.login-wrapper {
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.username {
  font-weight: 600;
  font-size: 14px;
}

.login-card {
  border: 2px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg-alt);
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 0.5rem;
  position: absolute;
  right: 0;
  z-index: 100;
  min-width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.step > * + * {
  margin-top: 0.75rem;
}

.error-msg {
  color: var(--vp-c-danger-1, #e53e3e);
  font-size: 13px;
  font-weight: 500;
}

.btn {
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  border-radius: 8px;
  transition: border-color 0.25s, background-color 0.25s;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  margin: 0;
  padding: 0.375rem 0.75rem;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand);
}

.btn-sm {
  font-size: 12px;
  padding: 0.25rem 0.5rem;
}

.btn-primary {
  color: #fff;
  background-color: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  width: 100%;
  justify-content: center;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--vp-c-brand-darker);
  border-color: var(--vp-c-brand-darker);
}

.heading {
  font-size: 1.2rem;
  font-weight: 700;
}

.input {
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 14px;
  display: block;
}

.input:focus {
  outline: none;
  border-color: var(--vp-c-brand);
}

.desc {
  display: block;
  line-height: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
