# Design Guidelines: AI-Powered Inbox & Calendar Assistant

## Design Approach

**Selected Approach**: Design System + Reference Hybrid
- **Primary System**: Linear Design System (productivity-focused, clean, efficient)
- **Reference Inspiration**: ChatGPT (conversational interface patterns)
- **Rationale**: This is a utility-focused productivity tool requiring information density, clear hierarchy, and efficient workflows. Linear's design principles excel at data-heavy applications while ChatGPT provides proven patterns for AI conversation interfaces.

## Core Design Principles

1. **Clarity Over Decoration**: Every element serves a functional purpose
2. **Information Hierarchy**: Critical data (urgent emails, today's meetings) prominently featured
3. **Breathing Room**: Strategic whitespace despite information density
4. **Contextual Intelligence**: AI insights integrated naturally into the interface

## Typography System

**Font Family**: Inter (Google Fonts) - excellent for UI and data display
- **Primary**: Inter for all interface text
- **Monospace**: JetBrains Mono for email addresses, timestamps

**Type Scale**:
- Hero/Page Titles: text-2xl md:text-3xl, font-semibold
- Section Headers: text-lg md:text-xl, font-semibold
- Card Titles: text-base, font-medium
- Body Text: text-sm, font-normal
- Metadata/Timestamps: text-xs, font-normal
- Button Text: text-sm, font-medium

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: p-2, gap-2 (within components)
- Standard spacing: p-4, gap-4, mb-6 (between related elements)
- Section spacing: p-8, mb-12, gap-8 (major sections)
- Page margins: px-6 md:px-8, py-6

**Grid Structure**:
- Main Layout: Sidebar + Content (two-column)
- Sidebar: Fixed w-64 on desktop, collapsible on mobile
- Content Area: flex-1 with max-w-7xl container
- Chat Interface: Single column, max-w-3xl centered

## Component Library

### Navigation & Layout

**Sidebar Navigation**:
- Fixed left sidebar (w-64) with sections:
  - Logo/Brand area (h-16)
  - Main navigation items (gap-1, py-2)
  - Secondary actions at bottom
- Navigation items: Rounded rectangles (rounded-lg), px-3 py-2
- Active state: Subtle background treatment
- Icons: 20px (Heroicons outline style)

**Top Bar**:
- h-16, border bottom
- Contains: Breadcrumbs, search, user profile
- Sticky positioning (sticky top-0)

### Chat Interface (Primary Interaction)

**Chat Container**:
- Centered column: max-w-3xl mx-auto
- Conversation area: flex flex-col gap-6, py-8
- Input area: Fixed bottom, w-full, p-4

**Message Bubbles**:
- User messages: Align right, max-w-2xl
- AI responses: Align left, max-w-2xl
- Padding: px-4 py-3
- Rounded: rounded-2xl
- Typography: text-sm leading-relaxed

**Input Field**:
- Multi-line textarea with auto-expand
- Min height: h-12
- Border: rounded-xl, border
- Padding: px-4 py-3
- Send button: Positioned absolute right, icon-only, rounded-lg

### Email Components

**Email List View**:
- Card-based layout: Stack of email cards (gap-2)
- Each card: p-4, rounded-lg, border
- Hover state: Subtle elevation change
- Structure per card:
  - Sender + timestamp row (flex justify-between)
  - Subject line (font-medium, truncate)
  - Preview text (text-sm, line-clamp-2)
  - Category badges + urgency flags (flex gap-2, mt-2)

**Category Badges**:
- Small pills: px-2 py-1, rounded-full, text-xs
- Types: Urgent, Important, Promotional, Social, Updates
- Icon + label combination

**Email Detail View**:
- Full-width container with max-w-4xl
- Header section: Sender, recipient, timestamp (grid layout)
- Action buttons: Reply, Forward, Archive (flex gap-2)
- Email body: Proper email rendering with max-w-prose
- AI Summary panel: Border-left accent, pl-4, italic, text-sm

### Calendar Components

**Calendar Grid View**:
- Week view: 7-column grid (grid-cols-7)
- Day headers: Sticky, font-medium, text-center
- Time slots: Grid rows with hourly divisions
- Event blocks: Absolute positioned, rounded-md, p-2
- Event content: text-xs, truncate

**Mini Calendar Sidebar**:
- Month view: Compact grid (w-64)
- Date cells: Square aspect ratio, text-center
- Today indicator: Border treatment
- Selected date: Background treatment

**Event Cards (List View)**:
- Compact cards: px-3 py-2, border-left-4 (time-based accent)
- Time + title: flex items-center gap-2
- Attendees: Small avatar stack
- Duration badge: text-xs

### Dashboard & Visualizations

**Stats Cards**:
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-4, gap-4
- Each card: p-6, rounded-lg, border
- Structure: Large number (text-3xl font-bold) + label (text-sm) + trend indicator

**Email Category Breakdown**:
- Horizontal bar chart representation
- Each category: flex items-center justify-between, py-3
- Category label + count + visual bar (h-2, rounded-full)

**Timeline View (Combined Inbox + Calendar)**:
- Vertical timeline: border-left accent on container
- Items chronologically ordered: gap-6
- Each item: pl-6, relative (with timeline dot)
- Alternating email cards and calendar events
- Time markers: Sticky positioned, text-xs

### Forms & Inputs

**Search Bar**:
- Full-width on mobile, w-96 on desktop
- Height: h-10
- Icon prefix: Search icon, pl-10
- Rounded: rounded-lg
- Placeholder: "Search emails, events, or ask AI..."

**AI Prompt Suggestions**:
- Horizontal scroll on mobile: flex gap-2, overflow-x-auto
- Suggestion pills: px-4 py-2, rounded-full, border, text-sm
- Examples: "Summarize today's emails", "Find free time this week"

### Data Displays

**Empty States**:
- Centered container: max-w-sm mx-auto, text-center, py-12
- Icon: Large (h-16 w-16), mx-auto, mb-4
- Heading: text-lg font-medium
- Description: text-sm, mb-6
- CTA button if applicable

**Loading States**:
- Skeleton screens matching component structure
- Animated pulse: animate-pulse
- Preserve layout dimensions

## Animations

**Minimal, Purposeful Animations**:
- Page transitions: None (instant navigation)
- Modal/overlay entry: Fade in (duration-200)
- Hover states: Subtle opacity or background shift (transition-colors duration-150)
- Chat messages: Slide up fade in (duration-300)
- Avoid: Complex scroll animations, parallax effects, excessive micro-interactions

## Icons

**Library**: Heroicons (outline style for navigation, solid for actions)
- Sizes: 16px (badges), 20px (navigation), 24px (primary actions)
- Consistent stroke width throughout

## Images

**No Hero Image**: This is a utility application, not a marketing site
**Avatar Images**: User profile, email senders - small circular (h-8 w-8, rounded-full)
**Empty State Illustrations**: Simple, minimal line illustrations for empty inbox/calendar states

## Accessibility

- Focus states: ring-2 ring-offset-2 on all interactive elements
- Semantic HTML: Proper heading hierarchy, ARIA labels
- Keyboard navigation: Full keyboard support for chat, email list, calendar
- Form labels: Always visible, properly associated
- Interactive element sizing: Minimum h-10 for touch targets