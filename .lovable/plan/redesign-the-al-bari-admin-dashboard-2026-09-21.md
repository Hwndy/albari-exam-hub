# Redesign the Al-Bari admin dashboard

## Direction
Build the selected **Modern Executive Emerald** direction using the uploaded dashboard only as a structural reference. The result will use Al-Bari’s real logo, heritage dark green palette, Sora headings, and Manrope body text.

## What will change

1. **Admin shell and navigation**
   - Restyle the existing collapsible sidebar in deep forest green with clearer section labels, stronger active states, and the Al-Bari logo at the top.
   - Refine the sticky header with a compact breadcrumb, administrator identity, and a clearer logout control.
   - Preserve every current navigation item, URL, collapsed state, and mobile drawer behavior.

2. **Overview hierarchy**
   - Recompose the existing overview into a compact operational dashboard: school/session heading, refresh control, six key indicators, charts, attention items, activity, and quick actions.
   - Keep all current live values and destinations: students, attendance, fees, outstanding balances, admissions, and live exams.
   - Use the reference’s information density without copying its wording, logo, data, or branding.

3. **Cards, charts, and status treatments**
   - Give KPI cards concise labels, icon tiles, stronger number hierarchy, and useful supporting context.
   - Restyle the four existing charts with Al-Bari green, lime, and restrained semantic status colours while preserving the current datasets.
   - Present needs-attention and recent activity as compact, scannable operational lists.
   - Keep quick actions visible without turning the page into nested cards.

4. **Responsive behavior and states**
   - Adapt the selected desktop composition into two-column/tablet and single-column/mobile layouts.
   - Preserve loading skeletons, empty states, errors, realtime refresh, keyboard focus, and reduced-motion support.
   - Ensure long currency values, labels, chart axes, and account details do not overlap or overflow.

## Design system

- Palette: forest `#123A2A`, leaf `#74A947`, mist `#EEF3EC`, ink `#18211D`, expressed through semantic design tokens rather than hardcoded page colours.
- Typography: Sora for headings and Manrope for interface/body text.
- Visual treatment: light workspace, dark institutional sidebar, thin borders, restrained shadows, compact radii, and no decorative gradients.
- Existing Al-Bari logo remains the sole dashboard identity.

## Technical scope

- Update the global semantic tokens and font loading.
- Refine the existing admin sidebar, dashboard shell, and overview presentation components.
- Do not change the dashboard RPC, database schema, business rules, or navigation contract.
- Verify the result on desktop and mobile, including sidebar collapse, links, loading/error states, charts, and overflow.
