import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Pokedex_AlejandroDev/', // 👈 cambia esto al nombre real del repo
})
