<script setup>
import {RouterView } from 'vue-router'
import { NLoadingBarProvider, NMessageProvider } from 'naive-ui'
</script>

<template>
  <n-loading-bar-provider>
    <n-message-provider>
      <main>
        <RouterView />
      </main>
    </n-message-provider>
  </n-loading-bar-provider>
</template>

<style scoped>
</style>
