# Shared design and accessibility

These rules apply to every public page. A page may have its own information architecture and accent color, but it must still feel like one Family Hub.

## Layout and interaction

- Start with a narrow phone viewport and one-handed use. Verify at 375, 768, 1024, and 1440 CSS pixels.
- Keep body text at least 18px, controls at least 17px, card titles in the 28–32px range, and interactive targets at least 48px.
- Keep the home page a directory of working tools, not a dashboard. Use the shared header, back link, filter shell, result count, empty state, source link, and trust-note patterns.
- Keep filters discoverable and collapsible where appropriate. Query state should be bookmarkable, clearing filters should recover an empty state, and list sorting must have a deterministic default.
- Avoid horizontal overflow, hover-only actions, sticky filter panels, decorative animation, and color-only status. Use text labels, icons with accessible names where needed, and sufficient contrast.

## Accessibility

- Target WCAG 2.2 AA. Use semantic landmarks, one logical heading order, labels for every form control, keyboard-operable controls, visible focus, and live result counts/status messages.
- Support text zoom to 200% without clipping or losing controls. Respect `prefers-reduced-motion`; do not make essential information depend on animation.
- Server-render the complete reference content. JavaScript may enhance search, sorting, URL state, counts, ranking, and Meal Builder state. When a page needs JavaScript for derived behavior, explain that limitation while keeping the reference content readable.
- Empty and error states must explain what happened and offer a recoverable action. Never make a disabled control the only explanation of a missing permission or incomplete state.

## Trust and content presentation

- Present source facts, family judgments, limitations, and “check before going/booking/cooking” actions as distinct content.
- Do not imply that a family tier, score, review count, or recipe fit is an official quality or medical rating. Label evidence scope and unknowns.
- External links are user-initiated HTTPS links with safe new-tab attributes. Do not add analytics, remote fonts, third-party embeds, or passive tracking without a privacy review.
