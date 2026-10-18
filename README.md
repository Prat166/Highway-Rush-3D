# HIGHWAY RUSH 3D

An endless 3D highway racing game. Built with Three.js and Vite. No paid assets, APIs or backend. All models are procedural, so there are no third-party asset licences to track.

## Controls
Desktop: W / Up accelerate, S / Down brake, A / Left and D / Right steer, P or Esc pause.
Mobile: on-screen steer, Go and Brake buttons, plus the pause button.

## Run it locally
1. Install Node.js (LTS) from https://nodejs.org, then check with `node -v`.
2. Open a terminal in the `highway-rush-3d` folder.
3. `npm install`
4. `npm run dev` and open the address shown (usually http://localhost:5173).
5. To test on a phone, connect it to the same Wi-Fi and open the "Network" address Vite prints.
6. `npm run build` creates the production site in `dist/`. `npm run preview` serves it locally.

## Publish with GitHub and Vercel
1. Create a free account at github.com and click New repository (name: `highway-rush-3d`).
2. In the project folder run:
   ```
   git init
   git add .
   git commit -m "First version"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/highway-rush-3d.git
   git push -u origin main
   ```
   (Or use GitHub's "uploading an existing file" link and drag in the files, but not `node_modules` or `dist`.)
3. Create a free account at vercel.com, click Add New > Project, and import the repository.
4. Vercel reads `vercel.json`. Check these settings: Framework Vite, Build Command `npm run build`, Output Directory `dist`.
5. Click Deploy. Open the URL it gives you and test the menu, driving, pause, game over and mobile controls.

## Common problems
- `npm: command not found`: install Node.js, then reopen the terminal.
- Blank page after deploy: confirm the output directory is `dist`, and that `index.html` is in the repository root.
- Build fails on Vercel: read the build log, run `npm run build` locally, and fix the first error shown.
- "3D graphics unavailable": enable hardware acceleration in your browser or try another browser.
- No sound: browsers only allow audio after a click, so press Play. Check the Sound toggle.

## Future monetization
Game code is separate from any ad code. The empty `#ad-slot` in `index.html` sits on the menu screen, away from the gameplay controls. No ad scripts are included. Add them only after the relevant ad account and site are approved, and never place them over the controls. Approval and earnings are not guaranteed. Vercel's Hobby plan is not intended for commercial use, so check Vercel's current terms before monetizing.
