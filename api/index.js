import puppeteer from 'puppeteer-core'; // Use puppeteer-core
import express from 'express';
import cors from 'cors';
import chromium from 'chrome-aws-lambda'; // Import chrome-aws-lambda

const port = 3004;
const app = express();

app.use(cors());

app.get("/", (req, res) => {
  res.send("server is working");
});

app.post("/api/scrap-website", async (req, res) => {
  try {
    // Launch the browser using chrome-aws-lambda's executablePath
    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath, // Use the Chromium binary from chrome-aws-lambda
      headless: chromium.headless, // Use headless mode
      args: chromium.args, // Pass necessary arguments for serverless environments
      defaultViewport: chromium.defaultViewport, // Use the default viewport size
    });
    
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    await page.goto('https://projects.worldbank.org/en/projects-operations/project-detail/P163742', {
        waitUntil: 'networkidle2'
    });

    await page.waitForSelector('.intro_paragraph ._loop_lead_paragraph_sm'); 

    const clickableElement = await page.$('.intro_paragraph ._loop_lead_paragraph_sm a.ng-tns-c2-0');
    if (clickableElement) {
        await page.evaluate((el) => el.scrollIntoView(), clickableElement); 
        await clickableElement.click();
    } else {
        console.error('Element not found or not clickable');
        await browser.close();
        return;
    }

    await page.evaluate(() => {
        const styles = `
            .ng-trigger{
                display: block !important;
            }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);

        const unwantedSelectors = ['header', 'footer', 'nav', '.sidebar', '.ads', '.breadcrumbs', '.breadcrumb-section', '#f03v1-social-sharing', '#newsletters'];
        unwantedSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove());
        });
    });

    const mainContent = await page.evaluate(() => {
        return document.body.innerText.trim();
    });

    console.log(mainContent); 
    await browser.close(); 

    if (mainContent) {
        res.json({ content: mainContent });
    } else {
        res.status(500).send('No content extracted');
    }

  } catch (error) {
    console.error("Error processing file:", error);
    res
      .status(500)
      .send(
        "Error processing file. Please check your file format and API setup."
      );
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
