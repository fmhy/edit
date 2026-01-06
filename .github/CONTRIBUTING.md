# Contribute Guide

> [!INFO] NOTE
> Some of these steps are easier if you're in our [Discord](https://github.com/fmhy/FMHY/wiki/FMHY-Discord). It opens every Friday.

Here you'll find some general guidelines for those who would like to start contributing. There are multiple ways to do this: 

- [Link Submissions](#submissions)
- [Reporting an Existing Site](#reporting-a-site)
- [How to Edit and Preview Changes](#making-changes)
- [Finding New Sites](https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/find-new-sites/)

## Submissions

> [!INFO] NOTE
> For bigger changes to the wiki, such as debloating efforts or the restructuring of a page/section, you must first discuss these with us via [Discord](https://github.com/fmhy/FMHY/wiki/FMHY-Discord) before opening a [Pull Request](https://github.com/fmhy/edit/pulls).

**Don't submit any of the following:**

- **💰️ Paid / Trial Sites** - We don't accept any paid or free trial only entries, with the exception of select paid [VPNs](/privacy#vpn) and [Debrid](/downloading#debrid-leeches).
- **🕹️ Emulators** - Already listed on [Index Sites](/gaming#emulators).
- **🌐 Web Browsers** - Good open-source browsers are already listed, so we just accept [indexes](/internet-tools#browser-tools), privacy-focused, and good mobile ones.
- **🔻 Leeches** - Unless it's not already listed on existing [Leech Lists](/downloading#debrid-leeches), don't submit these.
- **🐧 Linux Distros** - Already listed on [Index Sites](/linux-macos#linux-distros).
- **🌍 Non-english Software** - We don't add non-english software sites (APKs, games, torrents, etc.) unless they have a very good reputation.
- **🗂️ Coding Libraries** - There's too many of them and there are better places to find them.
- **🎲 Mining / Betting Sites** - Don't submit anything related to betting, mining, BINs, CCs, etc.
- **🎮 Multiplayer Hacks** - Don't submit any hacks or exploits that give an unfair advantage in multiplayer games.
- **🖥️ Custom OSs** - We don't recommend people use these.

### Adding a Site

For submitting new links, follow these steps:

- Make sure it's not already in the wiki. The easiest way to do this is to check our [Single Page](https://api.fmhy.net/single-page) using `ctrl+f`.
- Don't spam a bunch of un-tested links at once. Try to only send things you genuinely feel might be worth adding.
- Reach out via the feedback system, [GitHub](https://github.com/fmhy/edit), or join our [Discord](https://github.com/fmhy/FMHY/wiki/FMHY-Discord). Note that we have to check sites ourselves, so using a issue, rather than pull request is easier.
- You can optionally include socials, tools, or any other additional info alongside the entry.

### Reporting a Site

> [!INFO] NOTE
> If it's urgent, you're allowed to request an invite via our feedback system.

For changes to existing entries, follow these steps:

- Reach out via the feedback system, [GitHub](https://github.com/fmhy/edit), or join our [Discord](https://github.com/fmhy/FMHY/wiki/FMHY-Discord).
- Feel free to leave contact info when using the feedback system, if needed. Only trusted staff can view this.
- If you'd like to report a site removal or star change, you must include details as to why your changes should be accepted.

### Link Testing

All additions have to first go through our testing process on [Discord](https://github.com/fmhy/FMHY/wiki/FMHY-Discord).

You can help us test new sites to figure out their use-case, safety, and whether they'd be a good fit for the wiki.

Keep in mind certain sites (such as piracy sites) require more testing/vetting before they can be added.

### Formatting Rules

The wiki will always have some variation either due to exceptions being made, the layout/structure, or the flexible nature of markdown itself.

For these reasons, there are too many conditions and nuances to satisfy to make an easy-to-follow guide. However, you can generally get an idea by looking at how existing links are structured.

Note that we do try to order sections from best to worst, and if multiple links are on the same line, only the **bold** ones are considered stars.

If you're unsure, ask in the wiki channels on [Discord](https://github.com/fmhy/FMHY/wiki/FMHY-Discord) and wait for a staff member to reply.

## Making Changes

Instructions on various ways to edit the wiki and preview changes. 

### GitHub Editor

You can use the built-in web editor in two ways:

1. Find the file you want to edit, look for the edit icon (of a pencil) and click on it, then make your changes.

    ![Edit Button](https://files.catbox.moe/7w3hnm.png)

2. When you're done, click "Commit Changes..." then "Propose changes". Optionally add a commit description.

3. You should now see a comparison page showing all your edits. Click "Create pull request", fill in the box describing your changes, then hit submit.

**OR**

1. Fork the repository by clicking the "Fork" button in the top right.

2. Navigate to your fork's homepage and press the `.` (period) key on your keyboard. This will open the repository in a VSCode-like environment on `github.dev`.

3. Make your changes, then commit via the source control tab.
    
    ![Source Control](https://files.catbox.moe/pa571v.png)

4. Back on your fork's homepage, click "Contribute" then "Open pull request".

5. You should now see a comparison page showing all your edits. Click "Create pull request", fill in the box describing your changes, then hit submit.

### Dev Environment

If you're going to work on the site itself, or simply want to preview the site and any changes, you can do so by setting up a development environment.

#### GitHub Codespaces

This creates an environment in the browser [(with 60h/month free quota)](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces#free-and-billed-use-by-personal-accounts). To use Codespaces, follow these steps:

1. Fork the repository by clicking the "Fork" button in the top right.

2. Navigate to your fork's homepage and click on the green "Code" button above your repository, open "Codespaces" tab and click "Create codespace".

3. You may have to wait ~5-10 minutes for the codespace to load.

    ![Codespace Status](https://files.catbox.moe/5bp38f.png)

4. Once it has loaded, run `pnpm i && pnpm docs:dev` to start the preview. Then when it appears, click "Open in Browser" in the bottom right.

5. Make your changes and commit.

6. To shut it down, click the "Code" button again and look for the `...` dropdown next to your codespace, then click "Stop codespace".

#### Local Instance

Making changes on a local repository may require a basic understanding of Git. You can find learning resources [here](/educational#developer-learning).

More info on manual setup can be found [here](/other/selfhosting).
