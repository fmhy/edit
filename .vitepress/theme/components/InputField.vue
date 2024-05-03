<script setup lang="ts">
// Define props for the component
// 'label' prop is a string that serves as the label for the input field
// 'id' prop is a string that serves as the unique identifier for the input field
defineProps<{
  label: string
  id: string
}>()
</script>

<template>
  <!-- The input-field class is used to style the input field container -->
  <div class="input-field">
    <!-- The input-label class is used to style the label and display value container -->
    <div v-if="label" class="input-label">
      <!-- The label element is used to display the label for the input field -->
      <!-- The 'for' attribute is set to the 'id' prop to associate the label with the input field -->
      <label :for="id" class="pane-label">
        <!-- The label text is passed through the 'label' prop -->
        {{ label }}
      </label>
      <!-- The display-value class is used to style the slot for displaying additional information -->
      <div class="display-value">
        <!-- The slot for displaying additional information is named 'display' -->
        <slot name="display" />
      </div>
    </div>
    <!-- The slot for the input field is named 'default' -->
    <slot />
  </div>
</template>

<style scoped>
.pane-label {
  /* The line-height property is used to vertically align the label text */
  line-height: 20px;
  /* The font-size property is used to set the size of the label text */
  font-size: 13px;
  /* The font-weight property is used to make the label text bold */
  font-weight: 600;
  /* The color property is used to set the color of the label text */
  color: var(--vt-c-text-1);
  /* The display property is used to make the label text a block-level element */
  display: block;
}

/* The input-field class is used to style the input field container */
.input-field:not(:last-child) {
  /* The margin-bottom property is used to add space between the input field container and the next element */
  margin-bottom: 16px;
}

.display-value {
  /* The font-size property is used to set the size of the display value text */
  font-size: 13px;
  /* The color property is used to set the color of the display value text */
  color: var(--vp-c-text-2);
}

.input-label {
  /* The display property is used to align the label and display value horizontally */
  display: flex;
  /* The align-items property is used to vertically align the label and display value */
  align-items: center;
  /* The justify-content property is used to horizontally align the label and display value */
  justify-content: space-between;
  /* The margin-bottom property is used to add space between the label and the input field */
  margin-bottom: 8px;
  /* The gap property is used to add space between the label and display value */
  gap: 12px;
}
</style>
