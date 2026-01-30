# JayReddin

## Overview

This is a client-side React application that runs entirely in the browser without a build step. It uses Babel standalone for JSX transpilation, Tailwind CSS for styling, and Fireproof for local-first data persistence. The app integrates with AI services (Puter and Pollinations) for text and image generation capabilities.

The application appears to be a personal utility tool with settings management, provider switching between different AI services, and export/import functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Browser-Only React Setup**
- React components are written in JSX and transpiled at runtime using Babel standalone
- No build process or bundler - all dependencies loaded via ESM imports from CDN (esm.sh)
- Tailwind CSS loaded via browser script for utility-first styling
- Single-page application with all logic in `script.js`

**Component Structure**
- Functional React components with hooks (useState, useEffect, useRef, useMemo, useCallback)
- Neumorphic UI design pattern with shadow-based styling
- Modal-based settings and export/import interfaces

**Layout Structure (3-Panel Design with Resizable Panels)**
- Left Panel: AI Generate panel with Create/Apps tabs, template selector, provider buttons, model dropdown, description textarea, app name/title inputs, and Create & Deploy button
- Middle Panel: Code editor with file tabs (Monaco Editor for syntax highlighting) - always visible for code pasting
- Right Panel: Live preview with Run button and app details
- Header: App title, provider info, usage bar, settings/analytics/export icons, and user info with stats

**Panel Features (Added Jan 2026)**
- Collapsible panels: Each panel has a hide/show button to collapse/expand
- Resizable panels: Drag dividers between panels to resize widths
- Hidden scrollbars: All scrollbars are invisible across the app for cleaner UI
- Editor always visible: Code editor shows on launch for pasting code
- New file creation: Clicking + in code editor opens a file name popup

**Usage Bar Features (Added Jan 2026)**
- Layout: Left (used tokens), center (progress bar with % overlay), right (total tokens)
- Blue color scheme (#0010d9) for progress bar
- Green pulse animation on usage refresh
- Refresh completion indicator: Shows green checkmark and "Updated!" when refresh completes

**AI Generation Indicators (Added Jan 2026)**
- Pulsing green border on Create & Deploy button while generating
- Loading overlay with spinner in code editor during generation

**Settings Panel (Added Jan 2026)**
- Theme selection with clickable theme buttons (light, dark, grey, multicoloured)
- Themes use CSS variables for neumorphic styling that adapts across all components
- App Layout selector with preview icons: Side by Side, Stacked, Custom layouts
- Layout preferences saved to localStorage and applied immediately to the panel structure

**Multi-file Editor (Added Jan 2026)**
- File tabs in code editor for switching between multiple files
- Click + button to create new files with custom names
- Hover over file tab to show delete button (X)
- Each file's content is tracked separately and persists in editor state

**State Management**
- Local component state using React hooks
- Fireproof (via use-vibes package) for persistent local-first data storage
- localStorage for panel widths, settings, favorites, API keys, and model preferences
- Custom debounce hook for optimized input handling

### Data Storage

**Fireproof Integration**
- Uses `use-fireproof` hook (aliased through `use-vibes`) for document storage
- Local-first database that syncs - no backend required for basic persistence
- Stores user settings, API keys, and app data

### External Service Integration

**AI Provider Architecture**
- Multi-provider support planned: Puter, Pollinations (with placeholders for Google, Github, OpenRouter, Custom)
- Provider selection stored in settings with active provider displayed in header
- Each provider has unique configuration (Puter: auth-based, Pollinations: API key-based)

**Puter Integration**
- Authentication via Puter ecosystem
- Monthly usage tracking via `puter.auth.getMonthlyUsage()`
- User account features (username, saved apps, sign in/out)

**Pollinations Integration**
- API key authentication
- Dynamic model fetching from Pollinations API
- Endpoints at `gen.pollinations.ai` for image and text generation

### API Configuration

- Global API configuration via `window.CALLAI_API_KEY`, `window.CALLAI_CHAT_URL`, `window.CALLAI_IMG_URL`
- Uses `call-ai` package for AI service communication

## External Dependencies

### CDN-Loaded Libraries
- **React/React-DOM**: UI framework (loaded from esm.sh)
- **Babel Standalone**: Runtime JSX transpilation
- **Tailwind CSS**: Utility-first CSS framework (browser version)
- **use-vibes/use-fireproof**: Local-first database hooks (v0.18.9)
- **call-ai**: AI service communication (v0.18.9)
- **lucide-react**: Icon library (v0.563.0, npm dependency)

### AI Service Providers
- **Puter** (`puter.auth`): Authentication and usage tracking
- **Pollinations** (`gen.pollinations.ai`): Image and text generation API
- **vibes-diy-api.com**: Default AI gateway for chat and image generation

### Data Persistence
- **Fireproof**: Local-first document database with optional sync capabilities