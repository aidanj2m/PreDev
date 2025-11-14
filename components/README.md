# Components Directory

Clean component architecture with two main sections: **leftSidebar** and **mainApp**.

## Directory Structure

```
components/
├── leftSidebar/          # Left sidebar panel
│   └── LeftSidebar.tsx   # Sidebar with logo and future features
│
└── mainApp/              # Main application area
    └── MainApp.tsx       # Centered input and assemble button
```

---

## 📂 `leftSidebar/`

**Purpose**: Left sidebar panel containing branding and future navigation/account features

**Components**:
- `LeftSidebar.tsx` - Fixed-width sidebar (280px) with PreDev logo and placeholder for future features like chat history and account settings

**Future Features**:
- Chat history list
- Account settings
- User profile
- Navigation menu

---

## 📂 `mainApp/`

**Purpose**: Main application workspace with centered input and functionality

**Components**:
- `MainApp.tsx` - Main content area with:
  - Background pattern overlay
  - Centered address input field
  - Assemble button with icon
  - Enter key support for submission

**Features**:
- Responsive input field that grows to fill available space
- Assemble button with hover states
- Background decorative pattern
- Centered layout

---

## Component Architecture

### Top Level Structure (app/page.tsx)
```tsx
<div> // Full viewport container
  <LeftSidebar />
  <MainApp />
</div>
```

### LeftSidebar
- Fixed width: 280px
- Full height viewport
- White background
- Right border for separation
- Logo at top
- Scrollable content area for future features

### MainApp
- Flexes to fill remaining space
- Centered content with background pattern
- Max-width input container (700px)
- Input field + Assemble button layout

---

## Styling Approach

All components use **inline styling** for:
- Component isolation
- State-based dynamic styles
- No CSS conflicts
- Easy maintenance

### Design Tokens

**Colors**:
- Background: `#f5f5f5`
- White: `#ffffff`
- Black: `#000000`
- Border: `#e5e5e5`
- Hover: `#fafafa`

**Spacing**:
- Sidebar width: `280px`
- Input max-width: `700px`
- Border radius: `8px` (buttons), `12px` (inputs)
- Padding: `12-24px` (buttons), `14-20px` (inputs)

**Typography**:
- Logo: `20px`, `600` weight
- Input: `15px`
- Button: `14px`, `500` weight

---

## Adding New Features

### To LeftSidebar:
1. Keep existing logo section at top
2. Add new components in the flex container below
3. Maintain scrollable behavior for overflow

### To MainApp:
1. Keep centered layout structure
2. Add new UI elements inside the centered container
3. Maintain max-width constraints for readability

---

## Usage Examples

### LeftSidebar
```tsx
import LeftSidebar from '@/components/leftSidebar/LeftSidebar';

// In your page
<LeftSidebar />
```

### MainApp
```tsx
import MainApp from '@/components/mainApp/MainApp';

// In your page
<MainApp />
```

---

## Best Practices

✅ **DO**:
- Keep leftSidebar for navigation and branding
- Keep mainApp for primary user interactions
- Use inline styles consistently
- Add hover/focus states for interactive elements
- Maintain the two-component structure

❌ **DON'T**:
- Mix CSS modules with inline styles
- Create nested component folders
- Break the sidebar/main split
- Hardcode values that might change
- Remove the background pattern without replacing it

---

## Future Enhancements

### LeftSidebar:
- [ ] Chat history component
- [ ] User account dropdown
- [ ] Settings menu
- [ ] Navigation links

### MainApp:
- [ ] Results display area
- [ ] Loading states
- [ ] Error messages
- [ ] Success feedback
- [ ] Additional input fields as needed
