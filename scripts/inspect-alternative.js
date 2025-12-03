import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log('Navigating to https://www.aeropuerto-sevilla.com/...');
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto('https://www.aeropuerto-sevilla.com/', { waitUntil: 'networkidle2', timeout: 30000 });

        console.log('Page loaded. Finding links...');

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => ({ text: a.innerText, href: a.href }))
                .filter(l => l.text.toLowerCase().includes('salida') || l.href.includes('salida'));
        });

        console.log('Links found:', JSON.stringify(links, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
