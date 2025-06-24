<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import { useRouter } from 'vitepress'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const router = useRouter()

export type BookmarkType = {
  name: string
  chord: string
  url: string
  icon?: string // e.g. 'i-logos:github'
  color?: string
  isCustom?: boolean // Track if it's a custom bookmark
  customSvg?: string // Store custom SVG icon
}

const props = defineProps<{ isInputGloballyFocused: boolean }>()

const currentChordInput = ref('')
const activePossibleChords = ref<BookmarkType[]>([])
const customBookmarks = ref<BookmarkType[]>([])
const allBookmarks = ref<BookmarkType[]>([])

// Dialog states
const isAddDialogOpen = ref(false)
const isEditDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)

// Form states
const formData = ref<BookmarkType>({
  name: '',
  chord: '',
  url: '',
  icon: '',
  color: '',
  isCustom: true,
  customSvg: ''
})

const editingBookmark = ref<BookmarkType | null>(null)
const deletingBookmark = ref<BookmarkType | null>(null)

let chordTimeout: NodeJS.Timeout | null = null

const initialBookmarksData: BookmarkType[] = [
  {
    name: 'Hacker News',
    chord: 'HN',
    url: 'https://news.ycombinator.com/',
    icon: 'i-logos:ycombinator'
  },
  {
    name: 'GitHub',
    chord: 'GH',
    url: 'https://github.com/',
    icon: 'i-simple-icons:github'
  },
  {
    name: 'Reddit',
    chord: 'RD',
    url: 'https://reddit.com/',
    icon: 'i-logos:reddit-icon'
  },
  {
    name: 'Twitter',
    chord: 'TW',
    url: 'https://twitter.com/',
    icon: 'i-logos:twitter'
  },
  {
    name: 'YouTube',
    chord: 'YT',
    url: 'https://youtube.com/',
    icon: 'i-logos:youtube-icon'
  },
  {
    name: 'Wikipedia',
    chord: 'WK',
    url: 'https://wikipedia.org/',
    icon: 'i-simple-icons:wikipedia'
  },
  {
    name: "Beginner's Guide",
    chord: 'BG',
    url: '/beginners-guide',
    icon: 'i-lucide:book-open-text'
  },
  {
    name: 'Wotaku',
    chord: 'WT',
    url: 'https://wotaku.wiki/',
    icon: 'i-twemoji:flag-japan'
  },
  {
    name: 'privateersclub',
    chord: 'PC',
    url: 'https://megathread.pages.dev/',
    icon: 'i-custom:privateersclub'
  }
]

// Load custom bookmarks from localStorage
const loadCustomBookmarks = () => {
  try {
    const stored = localStorage.getItem('customBookmarks')
    if (stored) {
      customBookmarks.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error loading custom bookmarks:', error)
  }
}

// Save custom bookmarks to localStorage
const saveCustomBookmarks = () => {
  try {
    localStorage.setItem(
      'customBookmarks',
      JSON.stringify(customBookmarks.value)
    )
  } catch (error) {
    console.error('Error saving custom bookmarks:', error)
  }
}

// Update all bookmarks when custom bookmarks change
const updateAllBookmarks = () => {
  allBookmarks.value = [...initialBookmarksData, ...customBookmarks.value]
}

// Watch for changes in custom bookmarks
watch(
  customBookmarks,
  () => {
    updateAllBookmarks()
    saveCustomBookmarks()
  },
  { deep: true }
)

const resetChord = () => {
  currentChordInput.value = ''
  activePossibleChords.value = []
  if (chordTimeout) clearTimeout(chordTimeout)
  chordTimeout = null
}

const handleBookmarkClick = (bookmark: BookmarkType) => {
  if (bookmark.url.startsWith('/')) {
    router.go(bookmark.url)
  } else {
    window.open(bookmark.url, '_self')
  }
}

// Form validation
const isFormValid = () => {
  return (
    formData.value.name.trim() &&
    formData.value.chord.trim() &&
    formData.value.url.trim() &&
    !isChordTaken(formData.value.chord, editingBookmark.value?.chord)
  )
}

const isChordTaken = (chord: string, excludeChord?: string) => {
  return allBookmarks.value.some(
    (b) =>
      b.chord.toUpperCase() === chord.toUpperCase() && b.chord !== excludeChord
  )
}

// Reset form
const resetForm = () => {
  formData.value = {
    name: '',
    chord: '',
    url: '',
    icon: '',
    color: '',
    isCustom: true,
    customSvg: ''
  }
}

// Add bookmark
const handleAddBookmark = () => {
  if (!isFormValid()) return

  const newBookmark: BookmarkType = {
    ...formData.value,
    chord: formData.value.chord.toUpperCase(),
    isCustom: true
  }

  // If no icon and no custom SVG, use default website icon
  if (!newBookmark.icon && !newBookmark.customSvg) {
    newBookmark.icon = 'i-lucide:globe'
  }

  customBookmarks.value.push(newBookmark)
  isAddDialogOpen.value = false
  resetForm()
}

// Edit bookmark
const openEditDialog = (bookmark: BookmarkType) => {
  editingBookmark.value = bookmark
  formData.value = { ...bookmark }
  isEditDialogOpen.value = true
}

const handleEditBookmark = () => {
  if (!isFormValid() || !editingBookmark.value) return

  const index = customBookmarks.value.findIndex(
    (b) => b === editingBookmark.value
  )
  if (index !== -1) {
    customBookmarks.value[index] = {
      ...formData.value,
      chord: formData.value.chord.toUpperCase(),
      isCustom: true
    }

    // If no icon and no custom SVG, use default website icon
    if (
      !customBookmarks.value[index].icon &&
      !customBookmarks.value[index].customSvg
    ) {
      customBookmarks.value[index].icon = 'i-lucide:globe'
    }
  }

  isEditDialogOpen.value = false
  editingBookmark.value = null
  resetForm()
}

// Delete bookmark
const openDeleteDialog = (bookmark: BookmarkType) => {
  deletingBookmark.value = bookmark
  isDeleteDialogOpen.value = true
}

const handleDeleteBookmark = () => {
  if (!deletingBookmark.value) return

  const index = customBookmarks.value.findIndex(
    (b) => b === deletingBookmark.value
  )
  if (index !== -1) {
    customBookmarks.value.splice(index, 1)
  }

  isDeleteDialogOpen.value = false
  deletingBookmark.value = null
}

// Handle SVG input
const handleSvgInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  formData.value.customSvg = target.value
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (
    props.isInputGloballyFocused ||
    e.altKey ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey
  )
    return

  const active = document.activeElement as HTMLElement | null
  if (
    active?.tagName === 'INPUT' ||
    active?.tagName === 'TEXTAREA' ||
    active?.isContentEditable
  )
    return

  const key = e.key.toUpperCase()
  if (chordTimeout) clearTimeout(chordTimeout)

  if (!currentChordInput.value) {
    const matches = allBookmarks.value.filter((b) => b.chord.startsWith(key))
    if (matches.length) {
      e.preventDefault()
      currentChordInput.value = key
      activePossibleChords.value = matches
      chordTimeout = setTimeout(resetChord, 2000)
    }
  } else {
    const next = currentChordInput.value + key
    const match = activePossibleChords.value.find((b) => b.chord === next)
    if (match) {
      if (match.url.startsWith('/')) {
        router.go(match.url)
      } else {
        window.open(match.url, '_self')
      }
      resetChord()
    } else {
      const filtered = allBookmarks.value.filter((b) =>
        b.chord.startsWith(next)
      )
      if (filtered.length) {
        currentChordInput.value = next
        activePossibleChords.value = filtered
        chordTimeout = setTimeout(resetChord, 2000)
      } else {
        resetChord()
      }
    }
  }
}

onMounted(() => {
  loadCustomBookmarks()
  updateAllBookmarks()
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (chordTimeout) clearTimeout(chordTimeout)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-text-2">
        <i class="i-lucide:bookmark w-5 h-5" />
        <h2 class="text-xl">Bookmarks</h2>
      </div>
      <div class="flex items-center gap-2">
        <div
          v-if="currentChordInput"
          class="px-3 py-1 rounded-md text-sm font-medium bg-yellow-200/20 text-yellow-600"
        >
          Chord: {{ currentChordInput }}...
        </div>

        <!-- Add Bookmark Button -->
        <DialogRoot v-model:open="isAddDialogOpen">
          <DialogTrigger as-child>
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-bg-alt text-white hover:opacity-80 transition-opacity"
            >
              <i class="i-lucide:plus w-4 h-4" />
              Add Bookmark
            </button>
          </DialogTrigger>

          <DialogPortal>
            <DialogOverlay class="fixed inset-0 bg-black/50 z-50" />
            <DialogContent
              description="Add New Bookmark"
              class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-bg border border-div rounded-lg p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto"
            >
              <DialogTitle class="text-lg font-semibold text-text mb-4">
                Add New Bookmark
              </DialogTitle>
              <DialogDescription class="text-text-2 mb-6">
                Add a new bookmark
              </DialogDescription>
              <form @submit.prevent="handleAddBookmark" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-text-2 mb-1">
                    Name
                  </label>
                  <input
                    v-model="formData.name"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none"
                    placeholder="Bookmark name"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-2 mb-1">
                    Chord (2 letters)
                  </label>
                  <input
                    v-model="formData.chord"
                    type="text"
                    required
                    maxlength="2"
                    class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none uppercase"
                    placeholder="AB"
                    @input="
                      (e) =>
                        (formData.chord = (
                          e.target as HTMLInputElement
                        ).value.toUpperCase())
                    "
                  />
                  <p
                    v-if="isChordTaken(formData.chord)"
                    class="text-red-500 text-xs mt-1"
                  >
                    This chord is already taken
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-2 mb-1">
                    URL
                  </label>
                  <input
                    v-model="formData.url"
                    type="url"
                    required
                    class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-2 mb-1">
                    Icon (UnoCSS class)
                  </label>
                  <input
                    v-model="formData.icon"
                    type="text"
                    class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none"
                    placeholder="i-lucide:globe (optional)"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-2 mb-1">
                    Custom SVG Icon
                  </label>
                  <textarea
                    v-model="formData.customSvg"
                    class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none h-20 resize-none"
                    placeholder="Paste SVG code here (optional)"
                  />
                  <p class="text-xs text-text-2 mt-1">
                    If provided, this will override the icon class
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-2 mb-1">
                    Color
                  </label>
                  <input
                    v-model="formData.color"
                    type="text"
                    class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none"
                    placeholder="#3B82F6 (optional)"
                  />
                </div>

                <div class="flex gap-3 pt-4">
                  <button
                    type="submit"
                    :disabled="!isFormValid()"
                    class="flex-1 bg-primary text-white py-2 px-4 rounded-md font-medium hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    Add Bookmark
                  </button>
                  <DialogClose as-child>
                    <button
                      type="button"
                      class="flex-1 bg-bg-alt text-text py-2 px-4 rounded-md font-medium border border-div hover:bg-bg-elv transition-colors"
                    >
                      Cancel
                    </button>
                  </DialogClose>
                </div>
              </form>
            </DialogContent>
          </DialogPortal>
        </DialogRoot>
      </div>
    </div>

    <div
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2"
    >
      <div
        v-for="bookmark in allBookmarks"
        :key="bookmark.name"
        class="relative group"
      >
        <button
          :class="[
            'w-full rounded-md border border-div bg-bg-alt px-3 py-2 text-left transition-opacity duration-150',
            activePossibleChords.some((ab) => ab.chord === bookmark.chord)
              ? bookmark.chord === currentChordInput
                ? 'opacity-100 ring-2 ring-primary ring-offset-2 ring-offset-bg'
                : 'opacity-75'
              : currentChordInput
                ? 'opacity-30'
                : 'opacity-100'
          ]"
          @click="handleBookmarkClick(bookmark)"
        >
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 w-full"
          >
            <div class="flex items-center gap-2 truncate">
              <!-- Custom SVG Icon -->
              <div
                v-if="bookmark.customSvg"
                class="shrink-0 w-4 h-4"
                v-html="bookmark.customSvg"
              />
              <!-- Regular Icon -->
              <i
                v-else-if="bookmark.icon"
                :class="`shrink-0 w-4 h-4 ${bookmark.icon}`"
                :style="bookmark.color ? { color: bookmark.color } : {}"
              />
              <!-- Fallback Icon -->
              <i v-else class="shrink-0 w-4 h-4 i-lucide:globe" />

              <span class="truncate font-medium">{{ bookmark.name }}</span>
            </div>
            <div class="hidden sm:flex text-xs items-center gap-1 text-text-2">
              <kbd
                v-for="(char, i) in bookmark.chord.split('')"
                :key="i"
                class="bg-bg border border-div px-1 py-0.5 rounded text-sm font-semibold"
              >
                {{ char }}
              </kbd>
            </div>
          </div>
        </button>

        <!-- Edit/Delete buttons for custom bookmarks -->
        <div
          v-if="bookmark.isCustom"
          class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
        >
          <button
            @click.stop="openEditDialog(bookmark)"
            class="p-1 bg-bg-elv border border-div rounded hover:bg-bg-alt transition-colors"
            title="Edit bookmark"
          >
            <i class="i-lucide:edit-2 w-3 h-3 text-text-2" />
          </button>
          <button
            @click.stop="openDeleteDialog(bookmark)"
            class="p-1 bg-bg-elv border border-div rounded hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Delete bookmark"
          >
            <i class="i-lucide:trash-2 w-3 h-3 text-text-2" />
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <DialogRoot v-model:open="isEditDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 bg-black/50 z-50" />
        <DialogContent
          class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-bg border border-div rounded-lg p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto"
        >
          <DialogTitle class="text-lg font-semibold text-text mb-4">
            Edit Bookmark
          </DialogTitle>
          <DialogDescription class="text-text-2 mb-6">
            Editing "{{ editingBookmark?.name }}"
          </DialogDescription>
          <form @submit.prevent="handleEditBookmark" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-2 mb-1">
                Name
              </label>
              <input
                v-model="formData.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none"
                placeholder="Bookmark name"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-2 mb-1">
                Chord (2 letters)
              </label>
              <input
                v-model="formData.chord"
                type="text"
                required
                maxlength="2"
                class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none uppercase"
                placeholder="AB"
                @input="
                  (e) =>
                    (formData.chord = (
                      e.target as HTMLInputElement
                    ).value.toUpperCase())
                "
              />
              <p
                v-if="isChordTaken(formData.chord, editingBookmark?.chord)"
                class="text-red-500 text-xs mt-1"
              >
                This chord is already taken
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-2 mb-1">
                URL
              </label>
              <input
                v-model="formData.url"
                type="url"
                required
                class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-2 mb-1">
                Icon (UnoCSS class)
              </label>
              <input
                v-model="formData.icon"
                type="text"
                class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none"
                placeholder="i-lucide:globe (optional)"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-2 mb-1">
                Custom SVG Icon
              </label>
              <textarea
                v-model="formData.customSvg"
                class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none h-20 resize-none"
                placeholder="Paste SVG code here (optional)"
              />
              <p class="text-xs text-text-2 mt-1">
                If provided, this will override the icon class
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-2 mb-1">
                Color
              </label>
              <input
                v-model="formData.color"
                type="text"
                class="w-full px-3 py-2 border border-div rounded-md bg-bg-alt text-text focus:border-primary outline-none"
                placeholder="#3B82F6 (optional)"
              />
            </div>

            <div class="flex gap-3 pt-4">
              <button
                type="submit"
                :disabled="!isFormValid()"
                class="flex-1 bg-primary text-white py-2 px-4 rounded-md font-medium hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                Save Changes
              </button>
              <DialogClose as-child>
                <button
                  type="button"
                  class="flex-1 bg-bg-alt text-text py-2 px-4 rounded-md font-medium border border-div hover:bg-bg-elv transition-colors"
                >
                  Cancel
                </button>
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete Confirmation Dialog -->
    <DialogRoot v-model:open="isDeleteDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 bg-black/50 z-50" />
        <DialogContent
          class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-bg border border-div rounded-lg p-6 w-full max-w-md z-50"
        >
          <DialogTitle class="text-lg font-semibold text-text mb-2">
            Delete Bookmark
          </DialogTitle>
          <DialogDescription class="text-text-2 mb-6">
            Are you sure you want to delete "{{ deletingBookmark?.name }}"? This
            action cannot be undone.
          </DialogDescription>

          <div class="flex gap-3">
            <button
              @click="handleDeleteBookmark"
              class="flex-1 bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
            <DialogClose as-child>
              <button
                type="button"
                class="flex-1 bg-bg-alt text-text py-2 px-4 rounded-md font-medium border border-div hover:bg-bg-elv transition-colors"
              >
                Cancel
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
