# PreDev Frontend Architecture

## 🏗️ Project Structure

```
predev-app/
├── app/                          # Next.js App Directory
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Home page (combines leftSidebar + mainApp)
│   └── globals.css              # Global styles
│
├── components/                   # All React components
│   ├── leftSidebar/             # Left sidebar panel
│   │   └── LeftSidebar.tsx      # Sidebar with logo and future features
│   │
│   └── mainApp/                 # Main application workspace
│       └── MainApp.tsx          # Input field and assemble button
│
├── public/                      # Static assets
│   ├── AssembleIcon.png         # Assemble button icon
│   └── ...                      # Other static files
│
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 📐 Component Architecture

### Simple Two-Component Layout

```
Home Page (app/page.tsx)
├── LeftSidebar (280px fixed width)
│   ├── Logo/Title: "PreDev"
│   └── Future: Chat History, Account, etc.
│
└── MainApp (flex: 1, fills remaining space)
    ├── Background Pattern
    └── Centered Container
        ├── Input Field (address input)
        └── Assemble Button (with icon)
```

### Visual Layout

```
┌─────────────────────────────────────────────────┐
│  ┌──────────┬───────────────────────────────┐   │
│  │          │                               │   │
│  │  Left    │                               │   │
│  │ Sidebar  │         MainApp               │   │
│  │          │  ┌─────────────────────┐      │   │
│  │ PreDev   │  │  Input   [Assemble] │      │   │
│  │          │  └─────────────────────┘      │   │
│  │          │                               │   │
│  │          │    (background pattern)       │   │
│  └──────────┴───────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Design System

### Layout
- **LeftSidebar**: Fixed 280px width, full viewport height
- **MainApp**: Flexes to fill remaining space
- **Input Container**: Max 700px width, centered
- **Viewport**: 100vw × 100vh, no scroll on container

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Background | `#f5f5f5` | MainApp background |
| White | `#ffffff` | Sidebar, input, button backgrounds |
| Black | `#000000` | Text, logo |
| Border | `#e5e5e5` | Separators, input/button borders |
| Hover | `#fafafa` | Button hover state |

### Typography
- **Logo**: 20px, 600 weight
- **Input text**: 15px, 400 weight
- **Button text**: 14px, 500 weight
- **Font**: System font stack (Geist Sans/Mono)

### Spacing & Borders
- **Border radius**: 8px (buttons), 12px (inputs)
- **Button padding**: 12px 24px
- **Input padding**: 14px 20px
- **Component gap**: 16px between input and button

---

## 🔧 Key Features

### LeftSidebar Component
- **Branding**: PreDev logo at top
- **Responsive**: Fixed width, scrollable content area
- **Future-ready**: Prepared for chat history and account features
- **Separation**: Right border to separate from main content

### MainApp Component
- **Centered layout**: Content centered both horizontally and vertically
- **Background**: Decorative pattern overlay (40% opacity)
- **Address input**: Full-width text field with placeholder
- **Assemble button**: Icon + text, hover states
- **Keyboard support**: Enter key triggers assembly

---

## 📝 Component Details

### LeftSidebar (`leftSidebar/LeftSidebar.tsx`)
**Props**: None (currently)

**Structure**:
- Header section with logo
- Flex container for future content
- Scrollable overflow

**Future additions**:
- Chat history list items
- User account dropdown
- Settings/preferences

### MainApp (`mainApp/MainApp.tsx`)
**Props**: None (self-contained state)

**State**:
- `address`: String for input value

**Functions**:
- `handleAssemble()`: Processes address (console.log placeholder)
- `handleKeyDown()`: Enter key handler

**Features**:
- Inline hover states on button
- Keyboard navigation
- SVG icon (placeholder for AssembleIcon.png)

---

## 🎯 Design Principles

1. **Simplicity**: Two main components, clear separation of concerns
2. **Inline Styling**: All styles in component files for isolation
3. **Future-Proof**: Structure ready for chat history and additional features
4. **Clean Architecture**: No unnecessary nesting or abstraction
5. **Type Safety**: Full TypeScript support

---

## 🚀 Getting Started

### Run Development Server
```bash
cd /Users/aidanmckenzie/PreDev/predev-app
npm run dev
```

Visit: `http://localhost:3000`

### File Organization
- Keep `leftSidebar/` for sidebar-related features
- Keep `mainApp/` for primary application functionality
- Don't create unnecessary subdirectories
- Use inline styles consistently

---

## 🔄 State Management

Currently using **local component state** (`useState` in MainApp).

**Future considerations**:
- Context API for shared state (user data, chat history)
- Zustand or Redux for complex state
- Server state management with React Query

---

## 📱 Responsive Considerations

Current layout is **desktop-focused**. For mobile:
- Collapse sidebar or make it toggleable
- Stack layout vertically
- Adjust input container width
- Touch-friendly button sizes

---

## 🧪 Testing Strategy

**Component Tests**:
- LeftSidebar: Renders logo correctly
- MainApp: Input handles text, button triggers assembly
- MainApp: Enter key calls handleAssemble

**Integration Tests**:
- Full page renders both components
- Layout doesn't overflow viewport
- Sidebar stays fixed width

---

## 📊 Performance

**Optimizations**:
- Inline styles (no CSS parsing overhead)
- Single state value in MainApp
- Minimal re-renders
- Static sidebar (no dynamic content yet)

**Future optimizations**:
- Memoize button hover handlers
- Virtual scrolling for chat history (when added)
- Code splitting for future features

---

## 🎨 Customization Guide

### Changing Sidebar Width
```tsx
// In LeftSidebar.tsx
width: '280px' → width: '320px'
```

### Changing Input Width
```tsx
// In MainApp.tsx
maxWidth: '700px' → maxWidth: '800px'
```

### Changing Colors
Update inline style objects with new hex values

### Adding Icons
Place in `public/` directory and reference with `/filename.ext`

---

## 📝 Notes

- **Inline styling preferred** (per user preference)
- **No CSS modules** or separate stylesheets
- **Simple architecture**: Two components only
- **Chat history removed** (for now) - focus on getting input right
- **AssembleIcon.png** already in `/public/` directory
