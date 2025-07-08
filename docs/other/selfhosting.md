---
title: Selfhosting FMHY
description: This guide will help you set up and run your own instance of FMHY locally.
---

# Selfhosting

:::warning
Do note that you **must** differentiate your instance from the official site (fmhy.net) to avoid confusion. Steps to do so are given below.
:::

This guide will help you set up and run your own instance of FMHY locally.

### Docker (Experimental)

To run a local instance, you will need to install [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/).

After installing both, run the following commands:

```bash
git clone https://github.com/fmhy/edit.git
cd edit
sudo docker compose up --build
```

It might take a few minutes to build the image and start the container, running at port 4173.

### Nix Flake

You can use [nix](https://nixos.org/) to set up a development environment, we have a [flake](https://nixos.wiki/wiki/Flakes) that setups `nodejs` and `pnpm`.

1. Fork the repository and clone it to your local machine with `git clone https://github.com/fmhy/edit.git`.
2. Run `nix flake update` to update the flake lock file.
3. Run `nix develop` to enter the development environment.
4. Make your changes.
5. Exit the development environment by running `exit`.

### Manually

You will need to install the following:
- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/en/download/) - Use latest available LTS release.
- [pnpm 9.12.2+](https://pnpm.io/installation)

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
- `meta`: Constant in `docs/.vitepress/constants.ts`
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

See the [VitePress deployment guide](https://vitepress.dev/guide/deploy) for more info.

#### Environment Variables

There are a few variables you can change if you wish to disable them:

- `FMHY_BUILD_NSFW` - NSFW sidebar entry (experimental)
- `FMHY_BUILD_API` - API component for feedback system.

#### Troubleshooting

1. If you encounter Node.js version issues, ensure you're using Node.js 21+
2. For pnpm-related issues, ensure you're using pnpm 9+
3. If you encounter build issues, try clearing cache:
    ```bash
    # Linux
    rm -rf docs/.vitepress/cache

    # PowerShell
    rm -r -fo docs/.vitepress/cache
    ```