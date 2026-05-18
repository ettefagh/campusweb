<script lang="ts">
  export let title: string | undefined = undefined;
  export let decorative = true;
</script>

<svg
  class="ios-accessibility-icon"
  viewBox="0 0 32 32"
  role={decorative ? undefined : "img"}
  aria-hidden={decorative ? "true" : undefined}
  aria-label={!decorative && title ? title : undefined}
  focusable="false"
>
  {#if !decorative && title}
    <title>{title}</title>
  {/if}
  <circle class="ios-accessibility-icon__ring" cx="16" cy="16" r="13" />
  <circle class="ios-accessibility-icon__head" cx="16" cy="9.2" r="2.4" />
  <path class="ios-accessibility-icon__body" d="M8.8 14.2c2.1 1.05 4.5 1.6 7.2 1.6s5.1-.55 7.2-1.6" />
  <path class="ios-accessibility-icon__body" d="M16 15.8v4.2" />
  <path class="ios-accessibility-icon__body" d="M16 20l-4.4 6.1" />
  <path class="ios-accessibility-icon__body" d="M16 20l4.4 6.1" />
</svg>

<style>
  .ios-accessibility-icon {
    display: block;
    width: 1em;
    height: 1em;
    overflow: visible;
  }

  .ios-accessibility-icon__ring,
  .ios-accessibility-icon__body {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .ios-accessibility-icon__head {
    fill: currentColor;
  }
</style>
