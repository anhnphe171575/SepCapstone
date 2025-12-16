const { buildDriver, By, until } = require('./seleniumHelper');
jest.setTimeout(200000); // Selenium thường chậm hơn


const UNIT_LOGIN_CASES = {
  missingPassword: {
    email: 'anhnphe171575@fpt.edu.vn',
    password: '',
    expectedMessage: 'Email và mật khẩu là bắt buộc',
  },
  userNotFound: {
    email: 'user@example.com',
    password: 'secret',
    expectedMessage: 'Email hoặc mật khẩu không đúng',
  },
  wrongPassword: {
    email: 'anhnphe171575@fpt.edu.vn',
    password: 'wrongpassword',
    expectedMessage: 'Email hoặc mật khẩu không đúng',
  },
  unverifiedAccount: {
    email: 'vinhnmhe170835@fpt.edu.vn',
    password: '123456',
    expectedMessage: 'Tài khoản chưa được xác thực email',
  },
  googleAccount: {
    email: 'vinhnmhe170835@fpt.edu.vn',
    password: 'secret',
    expectedMessage: 'Tài khoản được tạo qua Google. Vui lòng đăng nhập bằng Google.',
  },
  successStudent: {
    email: 'anhnphe171575@fpt.edu.vn',
    password: '123456',
    expectedRedirectId: 'dashboard',
  },
};

const getUnitLoginCase = (key) => {
  const testCase = UNIT_LOGIN_CASES[key];
  if (!testCase) {
    throw new Error(`Không tìm thấy case unit test: ${key}`);
  }
  return { ...testCase };
};

describe('Login Page - Selenium', () => {
  let driver;
  const pause = (ms = 2000) => driver.sleep(ms);

  beforeAll(async () => {
    driver = await buildDriver(false);
    await pause();
  }, 200000);

  afterAll(async () => {
    if (driver) {
      await pause();
      await driver.quit();
    }
  });

  it('trả về lỗi khi thiếu email hoặc password', async () => {
    await driver.get('http://localhost:3000/login');
    await pause();

    const { email, expectedMessage } = getUnitLoginCase('missingPassword');

    await driver.findElement(By.id('email')).sendKeys(email);
    await pause();

    // Click nút login
    await driver.findElement(By.id('loginButton')).click();
    await pause();

    // Chờ hiển thị lỗi
    const error = await driver.wait(until.elementLocated(By.id('error-message')), 5000);
    const text = await error.getText();

    expect(text).toBe(expectedMessage);
  });

  it('trả về lỗi khi không tìm thấy user', async () => {
    await driver.get('http://localhost:3000/login');

    const { email, password, expectedMessage } = getUnitLoginCase('userNotFound');

    await driver.findElement(By.id('email')).sendKeys(email);
    await pause();
    await driver.findElement(By.id('password')).sendKeys(password);
    await pause();
    await driver.findElement(By.id('loginButton')).click();
    await pause();

    const error = await driver.wait(until.elementLocated(By.id('error-message')), 5000);
    const text = await error.getText();

    expect(text).toBe(expectedMessage);
  });

  it('trả về lỗi khi mật khẩu sai', async () => {
    await driver.get('http://localhost:3000/login');

    const { email, password, expectedMessage } = getUnitLoginCase('wrongPassword');

    await driver.findElement(By.id('email')).sendKeys(email);
    await pause();
    await driver.findElement(By.id('password')).sendKeys(password);
    await pause();
    await driver.findElement(By.id('loginButton')).click();
    await pause();

    const error = await driver.wait(until.elementLocated(By.id('error-message')), 5000);
    const text = await error.getText();

    expect(text).toBe(expectedMessage);
  });

  it('trả về lỗi khi tài khoản Google đăng nhập bằng mật khẩu', async () => {
    await driver.get('http://localhost:3000/login');

    const { email, password, expectedMessage } = getUnitLoginCase('googleAccount');

    await driver.findElement(By.id('email')).sendKeys(email);
    await pause();
    await driver.findElement(By.id('password')).sendKeys(password);
    await pause();
    await driver.findElement(By.id('loginButton')).click();
    await pause();

    const error = await driver.wait(until.elementLocated(By.id('error-message')), 5000);
    const text = await error.getText();

    expect(text).toBe(expectedMessage);
  });

  it('trả về lỗi khi user chưa xác thực email', async () => {
    await driver.get('http://localhost:3000/login');

    const { email, password, expectedMessage } = getUnitLoginCase('unverifiedAccount');

    await driver.findElement(By.id('email')).sendKeys(email);
    await pause();
    await driver.findElement(By.id('password')).sendKeys(password);
    await pause();
    await driver.findElement(By.id('loginButton')).click();
    await pause();

    const error = await driver.wait(until.elementLocated(By.id('error-message')), 5000);
    const text = await error.getText();

    expect(text).toContain(expectedMessage);
  });

  it('đăng nhập thành công', async () => {
    await driver.get('http://localhost:3000/login');

    const { email, password, expectedRedirectId } = getUnitLoginCase('successStudent');

    await driver.findElement(By.id('email')).sendKeys(email);
    await pause();
    await driver.findElement(By.id('password')).sendKeys(password);
    await pause();
    await driver.findElement(By.id('loginButton')).click();
    await pause();

    // Chờ dashboard hiển thị
    const destination = await driver.wait(until.elementLocated(By.id(expectedRedirectId)), 5000);
    expect(await destination.isDisplayed()).toBe(true);
  });
});
   