# How to Edit FMHY

There are multiple ways you can contribute to this repository:
- [Link submissions](#submitting-a-link)
- [Reporting a site](#reporting-a-site)
- [Changes to the website itself](#making-changes)
- [Finding new sites](https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/find-new-sites/)

## Submitting a Link

> [!NOTE]
> If you haven't tested the link you'd like to submit, especially if it's a DDL site, please open an **[Issue](https://github.com/fmhy/edit/issues)** or reach out to us on **[Discord](https://rentry.co/fmhy-invite)** rather than making a Pull Request.

1. Before submitting a link, please **[search](https://redd.it/105xraz)** to make sure it's not already in the wiki.

2. The order of priority is: **Site > Git Repository > Store Link**
Please only use the store link if there's neither a site nor a Git repository available for the app/extension you'd like to submit.

3. Always check to see if the site you'd like to submit has a Discord / Telegram server you can link with it.

4. Find a suitable category for the link and then submit it by making a **[Pull Request](https://github.com/fmhy/edit/pulls)**. 

#### Don't Submit:

**🕹️ Emulators**
They're already on the **[Game Tech Wiki](https://emulation.gametechwiki.com/index.php/Main_Page)**.

**🔻 Leeches**
They're already on the **[File Hosting Wiki](https://filehostlist.miraheze.org/wiki/Free_Premium_Leeches)**.

**🐧 Distros**
They're already on **[DistroWatch](https://distrowatch.com/)**.

**🎲 Mining / Betting Sites**
Don't post anything related to betting, mining, BINs, CCs, etc.

**🎮 Multiplayer Game Hacks**
Don't post any hacks/exploits that give unfair advantages in multiplayer games.

## Reporting a Site

> [!TIP]
> If you want to make bigger changes to the wiki, such as debloating or restructuring a page/section, please discuss those changes with us via **[Discord](https://rentry.co/fmhy-invite)** before making a **[Pull Request](https://github.com/fmhy/edit/pulls)**.

You can do one of the following:

- Open an **[Issue](https://github.com/fmhy/edit/issues)** or a **[Pull Request](https://github.com/fmhy/edit/pulls)** and don't forget to explain why you think the site(s) in question should be removed, unstarred, and/or changed.

- Alternatively, you can reach out to us on **[Discord](https://rentry.co/fmhy-invite)** if you're unsure whether the site should be reported or if you'd like to discuss your report with more people.

## Making changes

If you want to make changes with instant site feedback, or are simply going to work with the site, you can do so with these 3 ways:

- [Using gitpod.io or GitHub Codespaces (recommended)](#using-gitpod-or-github-codespaces)
- [Using the GitHub editor](#using-the-github-editor)
- [Manually setting up a development environment](#manually-setting-up-a-development-environment)

> [!TIP]
> You can just use our [💬 Discord](https://rentry.co/fmhy-invite) to send us sites or any changes.

### Using Gitpod or GitHub Codespaces

You can use either [gitpod.io](https://gitpod.io/) or [GitHub Codespaces](https://github.com/features/codespaces) to edit the wiki.

Follow these steps:

1. Fork the repository by clicking the "Fork" button in the top right corner.

2. Now, to make changes, you can either use gitpod.io or GitHub Codespaces.

#### Gitpod.io

Login to your GitHub account and click on the "New Workspace" button. Then select your fork and you should be in your gitpod workspace.

To close the workspace, click on the "Gitpod" button at the bottom left corner then type "Stop Workspace" and hit enter.

#### GitHub Codespaces

Click on the "Code" button on the top right corner of the page and select "Codespaces" from the dropdown menu.

To close the workspace, click on the "Code" button at the top right corner then click on "Stop Codespace" and hit enter.

### Using the GitHub editor

1. Fork the repository by clicking the "Fork" button in the top right corner. You can open your repository in a VSCode-like environment by pressing `.` (dot) in your fork's homepage which will take you to `github.dev`.

2. Find the file you want to edit. Find the "Edit" icon (of a pencil) and click on it.
Select edit button and make your changes.
![Select edit button](https://i.imgur.com/lnQfeo3.png)

3. Scroll down and select "Propose changes", and "Create Pull Request" on the next page, and don't forget to explain why you think the site(s) in question should be removed, unstarred, and/or changed.

![propose changes](https://i.imgur.com/IaSJvnO.png)
![create pull request](https://i.imgur.com/z5Za72l.png)

### Manually setting up a development environment

#### Manually

1. Fork the repository by clicking the "Fork" button in the top right corner.

2. Make sure you have [Node.js](https://nodejs.org/en/), [pnpm](https://pnpm.io/), [git](https://git-scm.com/), and [VSCode](https://code.visualstudio.com/) or any other editor installed.

3. Clone your forked repository to your local machine.

4. Open the cloned repository in your editor of choice. Find the file you want to work on, make changes.

5. Add your changes with git (`git add <file>`) and commit (`git commit -m "commit message"`), then push them (`git push`).

6. Create a pull request by clicking the "New Pull Request" button in your forked repository, and don't forget to explain why you think the site(s) in question should be removed, unstarred, and/or changed.

#### Nix

You can use [nix](https://nixos.org/) to set up a development environment, we have a [flake](https://nixos.wiki/wiki/Flakes) that setups `nodejs` and `pnpm`.

1. Fork the repository by clicking the "Fork" button in the top right corner and clone your forked repository to your local machine.

2. Run `nix flake update` to update the flake lock file.

3. Run `nix develop` to enter the development environment.

4. Make changes. 

5. Exit the development environment by running `exit`.

6. Commit your changes and push them to your forked repository.

7. Create a pull request by clicking the "New Pull Request" button in your forked repository, and don't forget to explain why you think the site(s) in question should be removed, unstarred, and/or changed.
