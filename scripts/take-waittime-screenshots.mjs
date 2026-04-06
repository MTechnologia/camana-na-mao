import { chromium } from 'playwright';

(async () => {
    console.log("Starting playwright for Wait Time...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    
    console.log("Navigating to test-wait-time...");
    await page.goto('http://localhost:5173/test-wait-time', { waitUntil: 'networkidle' });
    
    console.log("Capturing full page: os06_wait_time_rota.png");
    await page.screenshot({ path: 'docs/images/os06_wait_time_rota.png', fullPage: true });
    
    console.log("Capturing picker: os06_wait_time_picker.png");
    const pickerBox = page.locator('.bg-muted.rounded-lg').first();
    await pickerBox.screenshot({ path: 'docs/images/os06_wait_time_picker.png' });
    
    console.log("Clicking the first button (< 15 min) to capture result: os06_wait_time_click.png");
    const buttons = pickerBox.locator('button');
    await buttons.nth(0).click();
    await page.waitForTimeout(500); // Wait for transition
    const resultBox = page.locator('.bg-green-50, .bg-green-900\\/20').first();
    await resultBox.screenshot({ path: 'docs/images/os06_wait_time_click.png' });

    await browser.close();
    console.log("Screenshots saved successfully in docs/images/");
})();
