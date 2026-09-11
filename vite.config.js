import { defineConfig } from 'vite'

export default defineConfig({
  // Project page (username.github.io/StimTok/) needs the repo name here.
  // Use '/' instead if this becomes a user/org page or a custom domain.
  base: '/StimTok/',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
