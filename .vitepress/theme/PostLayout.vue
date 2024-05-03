<script setup lang="ts">
// Import the 'useData' function from 'vitepress' to access frontmatter data
import { useData } from 'vitepress'

// Import the 'Authors' component to display the list of authors
import Authors from './components/Authors.vue'

// Define the props that this component accepts, including an array of authors
const props = defineProps<{
  authors: string[]
}>()

// Define a function to format the raw date string into a more readable format
const formatDate = (raw: string): string => {
  // Create a new Date object using the raw date string
  const date = new Date(raw)

  // Return the formatted date string using the en-US locale and specifying
  // the month and day in short and numeric formats, respectively
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

// Destructure the 'frontmatter' object from the data returned by the 'useData' function
const { frontmatter } = useData()
</script>

<template>
  <!-- Display the title from the frontmatter object -->
  <h1>{{ frontmatter.title }}</h1>

  <!-- Display the description and formatted date from the frontmatter object -->
  <div>{{ frontmatter.description }} • {{ formatDate(frontmatter.date) }}</div>

  <!-- Render the 'Authors' component, passing in the array of authors as a prop -->
  <Authors :authors="props.authors" />
</template>

