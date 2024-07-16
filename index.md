---
title: Welcome
layout: home
description: The largest collection of free stuff on the internet!

hero:
  name: FMHY
  text: freemediaheckyeah
  tagline: The largest collection of free stuff on the internet!
  prelink:
    title: Check out Retro Rewind!
    link: /posts/Retro-Rewind
  image:
    src: /test.png
    alt: FMHY Icon
  actions:
    - theme: brand
      text: Browse Collection
      link: /adblockvpnguide
    - theme: alt
      text: Posts
      link: /posts
    - theme: alt
      text: Discord
      link: https://discord.gg/Stz6y6NgNg

features:
  - title: Movies / TV / Anime
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#7aa2f7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><path d="m17 2l-5 5l-5-5"/></g></svg>
    link: /videopiracyguide
    details: Stream, download, torrent and binge all your favourites movies or shows!
  - title: Music / Podcasts / Radio
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#ad7fa8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M9 18V5l12-2v13M9 9l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></g></svg>
    link: /audiopiracyguide
    details:  Stream, download and torrent songs, podcasts and more!
  - title: Games / Emulation
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#73d216" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M6 12h4m-2-2v4m7-1h.01M18 11h.01"/><rect width="20" height="12" x="2" y="6" rx="2"/></g></svg>
    link: /gamingpiracyguide
    details: Download and play all your favourite games or emulate some old but gold ones!
  - title: Book / Comics / Manga
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#fcaf3e" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M8 3H2v15h7c1.7 0 3 1.3 3 3V7c0-2.2-1.8-4-4-4m8 9l2 2l4-4"/><path d="M22 6V3h-6c-2.2 0-4 1.8-4 4v14c0-1.7 1.3-3 3-3h7v-2.3"/></g></svg>
    link: /readingpiracyguide
    details: Whether you're a bookworm, otaku or comic book fan, you'll be able to find your favourite pieces of literature here for free!
---

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  var preferredKawaii
  try {
    preferredKawaii = localStorage.getItem('uwu')
  } catch (err) {}
  const urlParams = new URLSearchParams(window.location.search)
  const kawaii = urlParams.get('uwu')
  const setKawaii = () => {
    const images = document.querySelectorAll('.VPImage.image-src')
    images.forEach((img) => {
      img.src = '/logo-uwu.svg'
    })
  }
  if (kawaii === 'true') {
    try {
      localStorage.setItem('uwu', true)
    } catch (err) {}
    console.log('uwu mode enabled. Disable with "?uwu=false".');
    setKawaii()
  } else if (kawaii === 'false') {
    try {
      localStorage.removeItem('uwu', false)
    } catch (err) {}
    const images = document.querySelectorAll('.VPImage.image-src')
    images.forEach((img) => {
      img.src = '/test.png'
    })
  } else if (preferredKawaii) {
    setKawaii()
  }
})
</script>
