import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Pokedex_AlejandroDev/', // 👈 debe ser el nombre del repo en GitHub
})
