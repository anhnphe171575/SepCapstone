const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
require('chromedriver');

async function buildDriver(headless = true) {
  const options = new chrome.Options();
  if (headless) {
    options.headless();
    options.addArguments('--window-size=1280,800');
  }

  const service = new chrome.ServiceBuilder(
    'C:\\Users\\phuan\\Downloads\\chromedriver-win64\\chromedriver-win64\\chromedriver.exe'
  );

  try {
    return await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .setChromeService(service)
      .build();
  } catch (error) {
    console.error(
      'Failed to build Selenium driver:',
      error && error.message ? error.message : error
    );
    throw error;
  }
}

module.exports = { buildDriver, By, until };