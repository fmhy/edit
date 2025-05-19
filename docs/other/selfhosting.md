---
title: Selfhosting FMHY
description: This guide will help you set up and run your own instance of FMHY locally.
---

# Selfhosting

This guide will help you set up and run your own instance of FMHY locally.

:::warning
Do note that you **must** differentiate your instance from the official site (fmhy.net) to avoid confusion. Steps to do so are given below.
:::

#### Prerequisites

### Docker (Experimental)

You will need to install Docker and Docker Compose run your own instance of FMHY locally.

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

After installing Docker and Docker Compose, run the following commands:

```bash
git clone https://github.com/fmhy/edit.git
cd edit
sudo docker compose up --build
```

It should take a few minutes to build the image and start the container, running at port 4173.

### Manually

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/en/download/) - Use the latest available LTS, doesn't matter much
- [pnpm 9.12.2 or newer](https://pnpm.io/installation)

#### Step 1: Clone the Repository

```bash
git clone https://github.com/fmhy/edit.git
cd edit
```

#### Step 2: Install Dependencies

Install project dependencies using pnpm:

```bash
pnpm install
```

#### Step 3: Development Mode

To run the project in development mode:

```bash
# Start the documentation site in dev mode
pnpm docs:dev

# Start the API in dev mode (if needed)
pnpm api:dev
```

The development server will start at `http://localhost:5173` by default.

#### Step 4: Building for Production

You will need to update:
- the `meta` constant in `docs/.vitepress/constants.ts`
  - `name`: Name of your instance
  - `hostname`: Your domain
  - `description`: Description of your instance
  - `tags`: Opengraph tags
  - `build`: Build options (can be configured with [Environment Variables](/other/selfhosting#environment-variables))
- `docs/index.md`
  - `title`
  - `description`
  - `hero.name`
  - `hero.tagline`


To build the project for production:

```bash
# Build the documentation site
pnpm docs:build

# Build the API (if needed) using the Node.js preset
NITRO_PRESET=node pnpm api:build
```

#### Step 5: Preview Production Build

To preview the production build locally:

```bash
# Preview the documentation site
pnpm docs:preview

# Preview the API (if needed)
pnpm api:preview
```

#### Step 6: Deploy

See the [VitePress deployment guide](https://vitepress.dev/guide/deploy) for more information.

#### Environment Variables

You may want to disable NSFW content (sidebar entry, page contents) and/or the API component for Feedback:

- `FMHY_BUILD_NSFW` - Disables NSFW content (experimental)
- `FMHY_BUILD_API` - Disables the API component

#### Troubleshooting

1. If you encounter Node.js version issues, ensure you're using Node.js 21+
2. For pnpm-related issues, make sure you're using pnpm 9+
3. Clear the cache if you encounter build issues:
   ```bash
   rm -rf docs/.vitepress/cache
   rm -rf docs/.vitepress/dist
   pnpm install
   ```
