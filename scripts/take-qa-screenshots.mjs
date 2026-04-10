import { chromium } from 'playwright';

(async () => {
    console.log("Starting playwright...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    
    console.log("Navigating to test-dimension-rating...");
    await page.goto('http://localhost:5173/test-dimension-rating', { waitUntil: 'networkidle' });
    
    console.log("Capturing full page: os06_atendimento_rota_teste.png");
    await page.screenshot({ path: 'docs/images/os06_atendimento_rota_teste.png', fullPage: true });
    
    console.log("Capturing picker: os06_atendimento_picker.png");
    const pickerBox = page.locator('.bg-muted.rounded-lg').first();
    await pickerBox.screenshot({ path: 'docs/images/os06_atendimento_picker.png' });
    
    console.log("Hovering star and capturing selected state: os06_atendimento_selecionado.png");
    const buttons = pickerBox.locator('button');
    await buttons.nth(3).hover();
    await page.waitForTimeout(1000); // Wait for transition
    await pickerBox.screenshot({ path: 'docs/images/os06_atendimento_selecionado.png' });

    console.log("Capturing click result as bonus");
    await buttons.nth(3).click();
    await page.waitForTimeout(500); 
    const resultBox = page.locator('.bg-green-50, .bg-green-900\\/20').first();
    await resultBox.screenshot({ path: 'docs/images/os06_atendimento_resultado.png' });

    await browser.close();
    console.log("Screenshots saved successfully in docs/images/");
})();
