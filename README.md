# PDF Entity Labeling

## Quickstart

1. Install [Node.js v22](https://nodejs.org/en/download/), [Git](https://git-scm.com/downloads), and [VS Code](https://code.visualstudio.com/download)
2. Clone repo and install dependencies:

```cmd
git clone https://github.com/optimalcharb/dokumen.git
npm install
```

3. Install the recommended VS Code Extensions. Then setup .env according to .env.local.example.
4. To setup playwright:

```cmd
npx playwright install
```

5. To setup Bun on Windows, open Command Prompt or Powershell with admin privileges and run:

```cmd
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Development Tools

### Core Frontend

- Frontend framework: [Next.js 15](https://nextjs.org/) App Router + [React](https://react.dev/)
- Language: [TypeScript](https://www.typescriptlang.org/) with [ts-reset](https://github.com/total-typescript/ts-reset), config by tsconfig.json
- Environment variable management: no environment variables, for now all variables should be hard-coded, loaded from an annotations file, or user provided
- Containerization: none, no Docker or Kubernetes allowed
- Styles: [Tailwind CSS v4](https://tailwindcss.com/) with [CVA](http://cva.style/) (Class Variance Authority) for CSS integration and [PostCSS](https://postcss.org/) for JavaScript integration
- Linting: [ESlint 9](https://eslint.org/), config by eslint.config.mjs
- Formatting: [Prettier](https://prettier.io/), config by .prettierignore, .prettierrc
- Testing: [React Testing Library](https://testing-library.com/react) + [Bun Test Runner](https://bun.com/docs/test/writing) which is based on Jest, name files as ".{spec,test}.{ts,tsx}"
- End-to-End Testing: [Playwright](https://playwright.dev/), name files as ".e2e.ts"

### Backend for Frontend (BFF)

- Storage: must get PDF from local storage or URL
- Database and API: avoid creating database tables or API routes. Try to do everything with React and in-memory. Do not add authentication, authorization, Lambda functions, HTTP, caching, observability, security, etc.

### Core Backend

- None

### Scripts

| Script | Description |
|--------|-------------|
| dev | run site locally |
| build | build for prod |
| start | start prod server |
| lint | check for linting errors |
| lint:fix | fix some linting errors automatically |
| prettier | check format |
| prettier:fix | fix format (.vscode/settings.json does this on every save) |
| prepare | automatically called by install |
| postinstall | automatically called by install |
| depcheck | check for unused dependencies |
| analyze | analyze the bundle sizes for Client, Server, and Edge environments |
| storybook | view storybook workshop |
| test | run tests using Bun Test Runner |
| e2e | run playwright end-to-end tests |
| madge | to be added to package.json to run madge |
| others | other scripts can be added to package.json |

### Version Control

- DevOps CI/CD: [GitHub Actions](https://github.com/features/actions) with workflows for check and bundle analyzer - currently disabled
- Changelog generation: [Semantic Release](https://github.com/semantic-release/semantic-release) config by .releaserc and ran by .github/workflows/semantic-release.yml, [Conventional Commits](https://www.conventionalcommits.org/) enforced by [husky](https://github.com/typicode/husky) config by .commitlintrc.json, commit messages must start with one of these for pull requests or push to master

| commit prefix | version bump | definition |
|---------------|--------------|------------|
| type!: | major (0.0.0 -> 1.0.0) | breaking changes (`feat!:`, `perf!:`, ...) |
| feat: | minor (0.0.0 -> 0.1.0) | new feature |
| perf: | patch (0.0.0 -> 0.0.1) | performance improvement |
| fix: | patch (0.0.0 -> 0.0.1) | bug fix |
| docs: | none | documentation changes |
| test: | none | adding or updating tests |
| ci: | none | CI/CD configuration changes |
| revert: | none | reverting previous commits |
| style: | none | formatting without code changes |
| refactor: | none | reorganizing code without changes |
| chore: | none | maintenance tasks |
| build: | none | build system or dependencies |

### Dependency Control

- Package manager: [npm](https://docs.npmjs.com/about-npm) to ensure compatability with all serverless hosting
- Package management: [Corepack](https://github.com/nodejs/corepack)
- Package fixes: [Patch-package](https://www.npmjs.com/package/patch-package)
- Bundle management: [Bundle analyzer](https://www.npmjs.com/package/@next/bundle-analyzer) - currently disabled
- Import management: [Absolute imports](https://nextjs.org/docs/advanced-features/module-path-aliases) so imports from same module are alphabetically ordered

### Component Development

- State management: currently React only
- Component workshop: [Storybook](https://storybook.js.org/) using .stories.tsx files
- Component dependency grapher: [Madge](https://github.com/pahen/madge) - not yet setup, can fix later, here is my draft cmd: npx madge --extensions=js,jsx,ts,tsx ./ --exclude ".*\.config\.(ts|js|mjs)|.next/|.storybook/|node_modules/|storybook-static/|reset\.d\.ts|next-env\.d\.ts" --image graph.svg (need to install gvpr graphviz)

## Features

### UI Libraries

- Current site uses [shadcn/ui](https://ui.shadcn.com/) stored in components/shadcn-ui and config by components.json
- Avoid using other UI libraries as the PDF container functionality should be locally coded

### PDF Rendering

- EmbedPDF: [GitHub](https://github.com/embedpdf/embed-pdf-viewer), [docs for @embedpdf/pdfium](https://www.embedpdf.com/docs/pdfium/introduction) the JS library to wrap the C++ engine, [docs for @embedpdf/core](https://www.embedpdf.com/docs/react/introduction) which I have modified
- Currently PDFs are rendered by URL only, later I want to fix the BufferStrategy in plugin-loader to load PDFs from local storage
- Plugins are built in Redux style and must have commented sections following plugin-template/
- Refer to GitHub Issues for ideas

### Forms

- Defer to .components/shadcn-ui/form.tsx based on react-hook-form

### Icons

- Try to stick to [Lucide Icons](https://lucide.dev/icons/), icons are not necessary at first since functionality needs to be built before appearance

### Colors

- You can pick TailwindCSS colors on [tailcolors](https://tailcolors.com/)

### In-site tables

- Maybe try [x-spreadsheet](https://github.com/myliang/x-spreadsheet) or other packages on npm

### Other components

- Check [billout](https://github.com/brillout/awesome-react-components?tab=readme-ov-file#ui-components) for a list of some praised React packages
