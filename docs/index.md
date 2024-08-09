---
title: Welcome
layout: home
description: The largest collection of free stuff on the internet!

hero:
  name: FMHY
  text: freemediaheckyeah
  tagline: The largest collection of free stuff on the internet!
  prelink:
    title: August Updates ✨
    link: /posts/aug-2024
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
      text: Contribute
      link: /other/contributing
    - theme: alt
      text: Discord
      link: https://discord.gg/Stz6y6NgNg

features:
  - title: Movies / TV / Anime
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7aa2f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-projector"><path d="M5 7 3 5"/><path d="M9 6V3"/><path d="m13 7 2-2"/><circle cx="9" cy="13" r="3"/><path d="M11.83 12H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2.17"/><path d="M16 16h2"/></svg>
    link: /videopiracyguide
    details: Stream, download, torrent and binge all your favourites movies or shows!
  - title: Music / Podcasts / Radio
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c82fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-drum"><path d="m2 2 8 8"/><path d="m22 2-8 8"/><ellipse cx="12" cy="9" rx="10" ry="5"/><path d="M7 13.4v7.9"/><path d="M12 14v8"/><path d="M17 13.4v7.9"/><path d="M2 9v8a10 5 0 0 0 20 0V9"/></svg>
    link: /audiopiracyguide
    details:  Stream, download and torrent songs, podcasts and more!
  - title: Games / Emulation
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#49d3e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-swords"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/></svg>
    link: /gamingpiracyguide
    details: Download and play all your favourite games or emulate some old but gold ones!
  - title: Book / Comics / Manga
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3ccd93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-marked"><path d="M10 2v8l3-3 3 3V2"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg>
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
  const resetKawaii = () => {
    const images = document.querySelectorAll('.VPImage.image-src')
    images.forEach((img) => {
      img.src = '/test.png'
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
    resetKawaii()
  } else if (preferredKawaii) {
    setKawaii()
  }

  let clickCount = 0;
  const heroImage = document.querySelector('.VPImage.image-src');
  
  const handleClick = () => {
    clickCount += 1;
    if (clickCount === 5) {
      const isKawaii = localStorage.getItem('uwu') === 'true';
      if (isKawaii) {
        localStorage.removeItem('uwu');
        resetKawaii();
        console.log('uwu mode disabled.');
      } else {
        localStorage.setItem('uwu', true);
        setKawaii();
        console.log('uwu mode enabled after 5 clicks.');
      }
      clickCount = 0;
    }
  };

  if (heroImage) {
    heroImage.addEventListener('click', handleClick);
  }
})
</script>
