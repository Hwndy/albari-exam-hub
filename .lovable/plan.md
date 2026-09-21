# Al-Bari Public Website Redesign Proposal

## Goal
Refresh the public-facing Al-Bari Group of Schools website into a more confident, welcoming, admissions-first experience that feels rooted in the school’s identity rather than like a generic template.

## Proposed visual direction
- **Palette:** Heritage Green with warm ivory, restrained gold, and pale sage surfaces, aligned to the Al-Bari crest.
- **Typography:** Sora for headlines and Manrope for body copy, navigation, forms, and supporting text.
- **Composition:** Full-width story-led sections with real Al-Bari campus and student photography.
- **Tone:** Established, warm, purposeful, and contemporary; no heavy gradients, stock-style visuals, or unnecessary decoration.
- **Responsive behavior:** The same story should remain clear on mobile, with admissions and contact actions always easy to reach.

## Homepage structure
```text
Utility contact bar
        ↓
Focused navigation with Apply Now
        ↓
Full-bleed campus hero
  school identity + admissions status
  primary Apply Now action + Track Application action
        ↓
Accreditation and trust strip
        ↓
Academic journey
  Nursery → Primary → Junior Secondary → Senior Secondary
        ↓
Admissions pathway
  requirements, key dates, application and tracking actions
        ↓
School story
  principal welcome, character and faith, student experience
        ↓
Results and proof points
  outcomes, achievements, testimonials, and latest campus news
        ↓
Visit/contact invitation
        ↓
Admissions CTA and existing footer
```

## Site-wide refinements
1. Rebalance the header so the school name, crest, navigation, Apply Now, and parent-facing contact actions are immediately legible.
2. Keep the existing public routes and working admission, tracker, portal, news, gallery, and contact links unchanged.
3. Establish reusable visual rules for public sections: consistent spacing, image ratios, section labels, button hierarchy, and accessible contrast.
4. Refine mobile navigation and first-screen layout so the most important action is never hidden or crowded.
5. Keep CMS-driven school information, statistics, hero images, news, testimonials, and gallery content connected to the existing data sources.
6. Retain subtle reveal and hover motion only where it improves orientation, with reduced-motion support.

## Technical implementation
- Update the public website shell and homepage sections rather than changing school, admissions, finance, or portal workflows.
- Use semantic design tokens from the existing Al-Bari theme; do not introduce hardcoded component colors.
- Preserve the current SEO metadata, public URL structure, accessibility labels, and existing reusable website components where they still fit.
- Validate the redesign at desktop and mobile widths, including hero text, navigation, programme imagery, admissions actions, and footer links.

## Acceptance criteria
- The first viewport clearly communicates Al-Bari, the school experience, and the current admissions action.
- The crest and real school imagery are visible without being overpowered by overlays.
- Parents can reach Apply Now and Track Application within one interaction from desktop or mobile.
- Academic levels, trust signals, school story, outcomes, and contact information are scannable without visual clutter.
- Existing public workflows and routes continue to work.
- No dashboard, finance, admissions processing, or backend behavior is changed in this redesign pass.
