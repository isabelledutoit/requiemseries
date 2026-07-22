# Requiem responsive HIG improvements

**Status:** complete with device follow-up
**Date:** 2026-07-16

## Goal

Preserve Requiem's funerary, post-digital visual language while making its
slideshow, artwork viewer, and tokenizer fully usable on compact touch screens,
keyboards, and assistive technology.

## Baseline evidence

- No page-level horizontal overflow across 320x568, 375x812, 390x844,
  812x375, 768x1024, 1024x768, 1280x720, and 1440x900.
- Token pills render at 39px high, the custom input at 39px, Dissect at 37px,
  and the artwork viewer close control at 40px.
- Inactive opacity-hidden slides remain exposed in the accessibility tree.
- Slideshow position dots are clickable `div` elements and are unavailable to
  keyboard users.
- Artwork images open the viewer only through pointer clicks.
- The closed artwork viewer remains rendered with visible geometry.
- The custom tokenizer input uses its placeholder as its only label.
- Small blood-red labels were 3.20:1 against the dark canvas, below the 4.5:1
  normal-text target.
- All nine artwork JPEGs loaded on the initial visit because opacity-hidden
  slides still occupied the viewport, totaling roughly 5.1 MB.

## Tasks

- [x] Add skip navigation, a main landmark, and a consistent focus indicator.
- [x] Hide inactive slides semantically and make direct slide selection
  keyboard-operable.
- [x] Make artwork enlargement keyboard-operable and complete the viewer's
  focus, background-inertness, Escape, and restoration behavior.
- [x] Add a persistent tokenizer label, selected-state semantics, live output,
  and 44px primary controls.
- [x] Strengthen reduced-motion behavior without changing the default art
  direction.
- [x] Load inactive artwork only when its slide becomes active.
- [x] Repeat the viewport, target-size, keyboard, console, and semantic checks.

## Verification record

- Playwright Chromium emulation passed 320x568, 375x812, 390x844, 812x375,
  768x1024, 1024x768, 1280x720, and 1440x900.
- Every tested viewport had `scrollWidth === clientWidth`.
- No visible primary control measured below 44px. Redundant desktop slideshow
  dots retain a 24px WCAG AA target and are hidden on compact layouts where
  Previous, Next, and Play remain 44px.
- The artwork viewer opens from keyboard-operable artwork controls, places
  focus on its 44px close button, contains Tab focus, closes with Escape,
  makes the page background inert, and restores focus to the artwork trigger.
- Inactive slides expose `aria-hidden="true"` and `inert`; the active slide,
  current dot, and polite slide counter update together.
- Token choices expose `aria-pressed`; output is announced through a polite
  status region; the custom input has a persistent label.
- `--blood-bright` now measures 4.53:1 on `--dark`; other muted foreground
  tokens tested above 4.5:1.
- Initial artwork loading dropped from all nine JPEGs (roughly 5.1 MB) to the
  first artwork only. Each later image receives `src` when its slide activates.
- The local browser console is clean. Vercel analytics are loaded only outside
  localhost, loopback, and `file:` use.
- `git diff --check` passes.

## Device follow-up

- Physical iPhone/iPad Safari, Display Zoom, and VoiceOver remain release-device
  checks after emulated Chromium verification.
