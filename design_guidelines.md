# SynapseX Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from modern AI/research platforms like Linear (for clean UI), Notion (for collaborative workspace), and Vercel (for minimalist tech aesthetic). The design emphasizes a calm, focused research environment with intelligent visual feedback.

## Core Design Principles
- **Minimalistic Intelligence**: Clean interfaces that don't distract from research work
- **Collaborative Transparency**: Visual indicators showing AI agents and human team members working together
- **Academic Precision**: Professional, credible aesthetic befitting research work
- **Futuristic Sophistication**: Subtle neon accents and smooth animations suggesting advanced AI capabilities

---

## Color Palette

### Light Mode (Primary)
- **Base**: White (bg-white), Light Gray (bg-gray-50)
- **Primary Accent**: Neon Blue `217 91% 60%` (#4F46E5 - Indigo-600)
- **Secondary Accent**: Violet `266 76% 60%` (#7C3AED - Purple-600)
- **Text**: Slate-900 for headings, Slate-700 for body, Slate-500 for muted
- **Borders**: Gray-200, Gray-300 for stronger emphasis

### Dark Mode
- **Base**: Slate-950, Slate-900
- **Primary Accent**: Same neon blue with increased glow effect
- **Secondary Accent**: Same violet with glow
- **Text**: Slate-50 for headings, Slate-200 for body, Slate-400 for muted
- **Borders**: Slate-800, Slate-700

### Semantic Colors
- **Agent Active**: Emerald-500 (green glow)
- **Agent Idle**: Slate-400
- **Agent Reasoning**: Amber-500 (pulsing animation)
- **Success**: Emerald-600
- **Warning**: Amber-600
- **Error**: Red-600

---

## Typography

### Font Families
- **Primary**: Inter (headings, UI elements)
- **Secondary**: IBM Plex Sans (body text, technical content)
- **Monospace**: JetBrains Mono (code, logs, technical data)

### Type Scale
- **H1**: text-4xl font-bold (36px)
- **H2**: text-3xl font-semibold (30px)
- **H3**: text-2xl font-semibold (24px)
- **H4**: text-xl font-medium (20px)
- **Body Large**: text-lg (18px)
- **Body**: text-base (16px)
- **Body Small**: text-sm (14px)
- **Caption**: text-xs (12px)

---

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 3, 4, 6, 8, 12, 16, 20, 24** for consistent rhythm
- Tight spacing: p-2, p-3, p-4
- Standard spacing: p-6, p-8
- Generous spacing: p-12, p-16, p-20, p-24

### Grid Structure
- **Sidebar**: Fixed width 280px (w-70), collapsible to 64px icon-only mode
- **Main Content**: Flex-grow with max-width constraints per feature
- **Feature Panels**: Grid layouts using grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- **Agent Cards**: 2-3 columns on desktop, single column on mobile

### Container Widths
- Full-width features: max-w-7xl
- Content-focused views: max-w-6xl
- Reading content: max-w-4xl
- Forms/Chat: max-w-3xl

---

## Component Library

### Navigation Components

**Sidebar**
- Persistent left-aligned navigation
- Icon + label format with hover tooltips
- Glow effect on hover: `hover:shadow-[0_0_15px_rgba(79,70,229,0.3)]`
- Active state: blue left border (border-l-4) + background (bg-indigo-50 dark:bg-indigo-950)
- Collapsible with smooth transition
- Bottom section for user profile and settings

**Top Bar**
- Height: h-16
- Project title (left), workspace selector (center), user controls (right)
- Subtle bottom border: border-b border-gray-200
- Dark/light mode toggle with smooth icon transition

### Content Components

**Agent Cards**
- White card background with soft shadow: `shadow-lg hover:shadow-xl`
- Border: border border-gray-200
- Rounded corners: rounded-xl
- Padding: p-6
- Status indicator: Colored dot (w-2 h-2 rounded-full) with label
- Glow effect based on status (pulsing for "reasoning")
- Action buttons: "Ping Agent", "Assign Task" (variant="outline")

**Paper Cards (Research Explorer)**
- Compact card design: rounded-lg border p-4
- Title: text-lg font-semibold
- Abstract: text-sm text-slate-600 (line-clamp-3)
- Metadata badges: Pills for tags/year (bg-indigo-100 text-indigo-700 rounded-full px-3 py-1)
- "Add to Lab" button with plus icon

**Chat Interface**
- Message bubbles with role-based styling:
  - User: bg-gray-100 rounded-br-none (right-aligned)
  - AI Agents: bg-indigo-50 rounded-bl-none (left-aligned)
  - Agent tag badge above message ([Reasoning Agent])
- Input area: Fixed bottom with border-t, shadow-lg
- Auto-expanding textarea

**Knowledge Graph**
- Full-screen canvas with React Flow
- Node styling: Rounded rectangles with role-based colors
- Edges: Smooth bezier curves with arrows
- Mini-map in bottom-right corner
- Zoom controls (floating top-right)

**Paper Generator (Split View)**
- 50/50 split: Markdown editor (left) | Preview (right)
- Editor: Monospace font, syntax highlighting
- Preview: Academic paper styling with proper margins
- Floating toolbar: Bold, italic, citations, headings
- Version history sidebar (collapsible right panel)
- Multi-cursor support with color-coded agent cursors

**Team Workspace**
- Shared document area at top
- Chat panel in right sidebar (w-80)
- Live presence indicators: Avatar stack with online dot
- Typing indicators: "Agent is typing..." with animated dots
- Task assignment via @mentions with autocomplete dropdown

### Form Components
- Input fields: Consistent height h-10, rounded-lg, border border-gray-300
- Focus state: ring-2 ring-indigo-500 border-indigo-500
- Labels: text-sm font-medium mb-2
- Helper text: text-xs text-slate-500

### Feedback Components

**Loading States**
- Skeleton loaders with shimmer animation
- Agent activity: Pulsing glow effect
- Progress bars for uploads: Indigo gradient

**Notifications**
- Toast notifications (top-right)
- Icon + message + dismiss button
- Auto-dismiss after 5 seconds
- Color-coded by type (success/warning/error)

**Modal Overlays**
- Dark backdrop: bg-black/50
- Centered modal: max-w-2xl rounded-xl
- Close button (top-right) with X icon

---

## Interactions & Animations

### Motion Principles
- **Subtle and Purposeful**: No distracting animations
- **Agent Activity**: Pulsing glow for active reasoning (2s cycle)
- **Page Transitions**: Smooth fade + slight slide (200ms)
- **Hover States**: Scale-105 transform on cards, buttons
- **Card Reveals**: Staggered fade-in for lists/grids

### Specific Animations
- Agent status changes: Smooth color transition (300ms)
- Sidebar collapse/expand: Width transition (250ms ease-in-out)
- Message send: Slide up + fade in (150ms)
- Graph node creation: Scale from 0 to 1 (400ms elastic)

### Glow Effects
```
Neon Blue Glow: shadow-[0_0_20px_rgba(79,70,229,0.6)]
Violet Glow: shadow-[0_0_20px_rgba(124,58,237,0.6)]
Active Agent Glow: shadow-[0_0_30px_rgba(16,185,129,0.8)]
```

---

## Special Features

### Agent Console (Floating)
- Fixed bottom-right: bottom-6 right-6
- Rounded button with "Agent Logs" label + icon
- Opens overlay panel showing real-time agent communications
- Expandable/collapsible with smooth height transition

### Live Collaboration Indicators
- Colored cursors for each user/agent
- Name tag follows cursor
- Selection highlights with user color
- Presence avatars in top-right with online/away status

### Accessibility
- Consistent dark mode across all components
- High contrast text ratios (WCAG AA minimum)
- Keyboard navigation support for all interactive elements
- Screen reader labels for icons
- Focus visible states with ring-2 ring-offset-2

---

## Images

### Hero Section (Landing/Marketing)
**Large Hero Image**: Yes
- Position: Top of landing page, full-width
- Description: Abstract visualization of neural network connections with glowing blue/violet nodes, suggesting AI collaboration. Gradient overlay from transparent to white at bottom.
- Dimensions: Full viewport width, 60-70vh height
- Overlay: Semi-transparent gradient with centered headline and CTA

### Dashboard/App Images
**No hero images** - Focus on functional UI with data visualization

### Feature Illustrations
- Knowledge Graph: Auto-generated network visualization (no static image needed)
- Paper Cards: Optional thumbnail/preview from PDF first page
- Team Avatars: User profile images (circular, 40x40px)
- Agent Icons: Simple SVG icons from Lucide Icons set

### Placeholder Content
- Empty states: Illustration of document/graph with "No papers yet" message
- Loading states: Animated skeleton loaders, no images