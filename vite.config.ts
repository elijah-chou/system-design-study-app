import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-dom/client'],
          icons: ['lucide-react'],
          'data-patterns': ['./src/data/softwarePatterns.ts', './src/data/distributedPatterns.ts'],
          'data-systems': ['./src/data/systemTradeoffs.ts', './src/data/frameworkMatrices.ts'],
          'data-cases-quiz': ['./src/data/caseStudies.ts', './src/data/flashcardsQuizzes.ts'],
          simulators: [
            './src/components/diagrams/PatternSimulators.tsx',
            './src/components/diagrams/TradeoffSimulators.tsx',
            './src/components/diagrams/ArchitectureVisualizer.tsx',
            './src/components/diagrams/TradeoffRadar.tsx',
          ],
          'views-study': [
            './src/components/views/ActiveRecallView.tsx',
            './src/components/views/ContentStudioView.tsx',
            './src/components/views/CaseStudiesView.tsx',
          ],
        },
      },
    },
  },
});
