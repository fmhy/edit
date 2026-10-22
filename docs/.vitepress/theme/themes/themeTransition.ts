import { nextTick } from 'vue'

const REVEAL_DURATION = 400
const REVEAL_EASING = 'ease-in-out'

/** Whether the animated light/dark reveal should run. */
function canAnimate(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  )
}

/**
 * Apply a light/dark change as a radial clip-path reveal that grows from the
 * point the user clicked, using the View Transitions API.
 *
 * `apply` must perform the actual mode switch (toggle classes / CSS vars). It
 * runs inside the transition so both snapshots are captured around it.
 *
 * While the reveal runs we add `.theme-view-transition` to <html>; the rule in
 * style.scss disables every CSS transition for its duration so the clip reveal
 * is the ONLY animation — otherwise the page's own background/colour
 * transitions animate a second time underneath it and the two drift out of
 * sync (the old "laggy / unsynced" look). The clip itself is a Web Animations
 * API animation on a pseudo-element, so `transition: none` does not touch it.
 *
 * Falls back to applying the change instantly when View Transitions are
 * unavailable, the user prefers reduced motion, or there is no click origin.
 */
export async function revealThemeChange(
  event: MouseEvent | undefined,
  isDarkAfter: boolean,
  apply: () => void
): Promise<void> {
  if (!event || !canAnimate()) {
    apply()
    return
  }

  // Fallback to viewport center if the event lacks client coordinates or is keyboard-triggered (where clientX/Y are 0)
  const isKeyboardClick = event.clientX === 0 && event.clientY === 0
  const x =
    !isKeyboardClick && typeof event.clientX === 'number'
      ? event.clientX
      : window.innerWidth / 2
  const y =
    !isKeyboardClick && typeof event.clientY === 'number'
      ? event.clientY
      : window.innerHeight / 2

  const endRadius =
    Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    ) + 30
  const clipPath = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${endRadius}px at ${x}px ${y}px)`
  ]

  const root = document.documentElement
  root.classList.add('theme-view-transition')

  const transition = document.startViewTransition(async () => {
    apply()
    await nextTick()
  })

  // Re-enable normal transitions once the reveal finishes, even if it is
  // interrupted, so the page is never left with transitions disabled.
  transition.finished.finally(() => {
    root.classList.remove('theme-view-transition')
  })

  try {
    await transition.ready
  } catch {
    // If transition fails to start (e.g., interrupted/aborted), do not animate.
    await transition.finished.catch(() => {})
    return
  }

  // Going to dark: shrink the old (light) layer away to reveal dark beneath.
  // Going to light: grow the new (light) layer over the dark beneath.
  // The z-index layering that puts the clipped layer on top lives in
  // Layout.vue's `::view-transition-*(root)` rules.
  root.animate(
    { clipPath: isDarkAfter ? [...clipPath].reverse() : clipPath },
    {
      duration: REVEAL_DURATION,
      easing: REVEAL_EASING,
      // Hold the final frame. Going to dark we shrink the old (light) layer to
      // circle(0); without `forwards` its clip-path reverts to "no clip" for
      // the frame between the animation ending and the snapshot being removed,
      // briefly flashing the whole old theme back into view.
      fill: 'forwards',
      pseudoElement: `::view-transition-${isDarkAfter ? 'old' : 'new'}(root)`
    }
  )

  // Resolve only once the reveal has fully finished, so callers can defer
  // cleanup (e.g. restoring elements hidden for the snapshot) until the end.
  await transition.finished.catch(() => {})
}
