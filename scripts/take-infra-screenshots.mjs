import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to a nice size
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('Navigating to /test-infra-rating...');
  await page.goto('http://localhost:5173/test-infra-rating');

  // Wait for the component to be visible
  await page.waitForSelector('h1:has-text("Teste: Pergunta de Infraestrutura")');
  
  // Take screenshot of initial state
  await page.screenshot({ path: path.join(__dirname, '../artifacts/infra_initial.png') });
  console.log('Captured infra_initial.png');

  // Click on the 4th star (score 4)
  console.log('Clicking 4th star (data-star="4")...');
  const star4 = page.locator('button[data-star="4"]');
  await star4.click();

  // Wait for result card to appear
  await page.waitForSelector('h3:has-text("Resultado da Seleção:")');
  
  // Take screenshot of selected state
  await page.screenshot({ path: path.join(__dirname, '../artifacts/infra_selected.png') });
  console.log('Captured infra_selected.png');

  await browser.close();
})();
