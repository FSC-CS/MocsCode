import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from 'next-themes'
import { PanelProvider } from '@/contexts/PanelContext';

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <PanelProvider>
      <App />
    </PanelProvider>
  </ThemeProvider>
)
