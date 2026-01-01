# The American Standard

A daily digital newspaper built with Next.js 15, focusing on American political news. Deployed on Vercel with serverless architecture.

**Tagline:** Clear. Fair. American.

## Features

- 🗞️ **Classic Newspaper Design** - Elegant broadsheet layout with serif typography
- 📱 **PWA Support** - Installable on mobile devices for a native app experience
- ⚡ **Edge-Ready** - Optimized for Vercel Edge Runtime
- 🔄 **Daily Automation** - Automatic content generation via Vercel Cron
- 🗄️ **Serverless Storage** - Vercel KV for edition storage
- 🎨 **Patriotic Theme** - Navy blue and red accents on newsprint background

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4 with @tailwindcss/typography
- **Components:** shadcn/ui
- **Fonts:** Playfair Display (headlines), Source Serif 4 (body)
- **Storage:** Vercel KV
- **AI:** xAI Grok API for content generation
- **Deployment:** Vercel (serverless)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── generate-edition/  # Cron-triggered content generation
│   ├── archives/              # Past editions listing
│   ├── edition/[date]/        # Edition by date
│   │   └── [articleId]/       # Individual article pages
│   ├── about/                 # About page
│   ├── contact/               # Contact page
│   ├── layout.tsx             # Root layout with fonts
│   ├── page.tsx               # Homepage
│   └── not-found.tsx          # 404 page
├── components/
│   ├── newspaper/             # Custom newspaper components
│   │   ├── Masthead.tsx
│   │   ├── LeadStory.tsx
│   │   ├── ArticleCard.tsx
│   │   ├── EditionGrid.tsx
│   │   ├── SectionHeader.tsx
│   │   └── Footer.tsx
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── kv.ts                  # Vercel KV integration
│   ├── sample-data.ts         # Sample edition for development
│   └── utils.ts               # Utility functions
└── types/
    └── edition.ts             # TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Vercel account (for deployment and KV)
- xAI API key (for content generation)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/the-american-standard.git
   cd the-american-standard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your environment variables:
   ```
   XAI_API_KEY=your_xai_api_key
   CRON_SECRET=your_secure_random_string
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Vercel Deployment

1. Push to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Add Vercel KV storage to your project
5. Deploy

The cron job is configured in `vercel.json` to run daily at 6:00 AM UTC.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `XAI_API_KEY` | xAI Grok API key for content generation | Yes |
| `CRON_SECRET` | Secret for securing cron endpoint | Yes |
| `KV_URL` | Vercel KV connection URL | Auto-set |
| `KV_REST_API_URL` | Vercel KV REST API URL | Auto-set |
| `KV_REST_API_TOKEN` | Vercel KV API token | Auto-set |
| `NEXT_PUBLIC_BASE_URL` | Base URL for metadata | Optional |

## API Routes

### POST /api/generate-edition

Generates a new daily edition. Protected by `CRON_SECRET`.

**Headers:**
- `x-cron-secret: YOUR_CRON_SECRET` or
- `Authorization: Bearer YOUR_CRON_SECRET`

**Response:**
```json
{
  "success": true,
  "message": "Edition generated successfully",
  "date": "2024-01-15",
  "articleCount": 8
}
```

### GET /api/generate-edition?health=true

Health check endpoint (no auth required).

## Customization

### Colors

Edit `src/app/globals.css` to customize the color palette:

```css
:root {
  --color-navy: #1e40af;      /* Primary accent */
  --color-red: #dc2626;       /* Secondary accent */
  --color-cream: #faf9f6;     /* Background */
  --color-ink: #1a1a1a;       /* Text */
}
```

### Fonts

Fonts are configured in `src/app/layout.tsx` using `next/font/google`.

### Article Sections

Available sections are defined in `src/types/edition.ts`:
- National Politics
- Washington Briefs
- State & Local
- Opinion

## License

MIT

## Credits

Built with ❤️ for American journalism.

All articles credited to "The American Standard Staff".
