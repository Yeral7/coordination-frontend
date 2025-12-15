# Coordination Frontend

A clean, modern frontend application for the Casanova coordination system, built with Next.js 14 and Tailwind CSS.

## Overview

This frontend replaces the original ui-reference with a cleaner architecture and significantly reduced dependencies. It follows the design patterns from preconstruction-frontend while maintaining the layout structure from ui-reference.

## Key Improvements

- **Reduced Dependencies**: From 25+ Radix UI packages to a focused set of essential dependencies
- **Next.js Architecture**: Built on Next.js 14 with App Router for better performance and SEO
- **Clean Component Structure**: Custom UI components built with Tailwind CSS and Headless UI
- **TypeScript Support**: Full TypeScript implementation for better developer experience
- **Responsive Design**: Mobile-first approach with responsive layouts

## Tech Stack

- **Framework**: Next.js 14.2.3
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: Headless UI + Custom Components
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Notifications**: React Hot Toast
- **Animations**: Framer Motion

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3002](http://localhost:3002) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── equipment/         # Equipment management
│   ├── orders/           # Order management
│   ├── schedule/         # Scheduling
│   ├── crew/             # Crew management
│   ├── proposals/        # Proposal tracking
│   ├── vendors/          # Vendor management
│   ├── maintenance/      # Maintenance tracking
│   ├── settings/         # Settings page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── layout/           # Layout components
│   │   ├── dashboard-layout.tsx
│   │   ├── app-sidebar.tsx
│   │   └── top-bar.tsx
│   └── ui/               # Reusable UI components
│       ├── button.tsx
│       └── card.tsx
├── lib/                  # Utility functions
│   ├── utils.ts
│   └── api.ts
├── hooks/                # Custom React hooks
└── types/                # TypeScript type definitions
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Available Scripts

- `npm run dev` - Start development server on port 3002
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Backend Integration

The frontend is configured to work with the Casanova backend. Update the `NEXT_PUBLIC_API_URL` environment variable to point to your backend instance.

## Features

- Dashboard with real-time statistics
- Equipment management and tracking
- Order processing and management
- Crew scheduling and management
- Proposal tracking and approval
- Vendor management
- Maintenance scheduling
- Settings and preferences

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Ensure responsive design for all components
4. Test thoroughly before submitting changes
