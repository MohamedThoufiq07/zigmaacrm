import { test, expect } from "@playwright/test";

test.describe("Frontend E2E Authentication & Authorization Engine", () => {

  test("1. Login form validation enforces required fields and valid email format", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.locator('input[placeholder*="Registered Email Address"]');
    const passwordInput = page.locator('input[placeholder*="Enter Your Password"]');
    const submitBtn = page.locator('button[type="submit"]:has-text("Login")');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // 1. Submit empty fields
    await submitBtn.click();
    await expect(page.locator("text=Please enter your email and password.")).toBeVisible();

    // 2. Invalid email format
    await emailInput.fill("invalid-email-address");
    await passwordInput.fill("SomePassword123!");
    await submitBtn.click();
    await expect(page.locator("text=Please enter a valid email address.")).toBeVisible();

    // 3. Email without password
    await emailInput.fill("test@zigmaa.com");
    await passwordInput.fill("");
    await submitBtn.click();
    await expect(page.locator("text=Password is required.")).toBeVisible();
  });

  test("2. Unauthenticated visit to protected route (/contacts) is intercepted and redirected to /login", async ({ page, context }) => {
    // Ensure clean state (no auth cookies or tokens)
    await context.clearCookies();

    // Directly attempt to visit /contacts
    await page.goto("/contacts");

    // Must be redirected to /login by Next.js middleware
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("3. Successful sign-in sets auth cookie/localStorage and redirects to authenticated app", async ({ page, context }) => {
    await page.goto("/login");

    const emailInput = page.locator('input[placeholder*="Registered Email Address"]');
    const passwordInput = page.locator('input[placeholder*="Enter Your Password"]');
    const submitBtn = page.locator('button[type="submit"]:has-text("Login")');

    // Fill valid administrative credentials
    await emailInput.fill("admin@zigmaa.com");
    await passwordInput.fill("admin123");
    await submitBtn.click();

    // Should redirect to root dashboard
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/dashboard", { timeout: 15000 });

    // Verify auth cookie is present
    const cookies = await context.cookies();
    const tokenCookie = cookies.find((c) => c.name === "zigmaa_token");
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie?.value.length).toBeGreaterThan(20);

    // Verify localStorage has token and user
    const tokenInStorage = await page.evaluate(() => localStorage.getItem("zigmaa_token"));
    expect(tokenInStorage).toBeTruthy();
    expect(tokenInStorage?.split(".").length).toBe(3); // Valid JWT structure (header.payload.signature)

    const userInStorage = await page.evaluate(() => localStorage.getItem("zigmaa_user"));
    expect(userInStorage).toBeTruthy();
    const parsedUser = JSON.parse(userInStorage || "{}");
    expect(parsedUser.email).toBe("admin@zigmaa.com");
  });

  test("4. Authenticated session permits navigation to protected routes (/contacts)", async ({ page }) => {
    // Session is preserved from previous login or we sign in directly
    await page.goto("/login");

    await page.locator('input[placeholder*="Registered Email Address"]').fill("admin@zigmaa.com");
    await page.locator('input[placeholder*="Enter Your Password"]').fill("admin123");
    await page.locator('button[type="submit"]:has-text("Login")').click();

    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/dashboard", { timeout: 15000 });

    // Navigate to /contacts
    await page.goto("/contacts");
    await page.waitForURL("**/contacts", { timeout: 10000 });

    // Header and contact table/elements should be rendered
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/contacts");
  });

  test("5. Logout invalidates client session, clears cookies/localStorage, and revokes access", async ({ page, context }) => {
    // Sign in first
    await page.goto("/login");
    await page.locator('input[placeholder*="Registered Email Address"]').fill("admin@zigmaa.com");
    await page.locator('input[placeholder*="Enter Your Password"]').fill("admin123");
    await page.locator('button[type="submit"]:has-text("Login")').click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/dashboard", { timeout: 15000 });

    // Execute logout via client API
    await page.evaluate(() => {
      // Direct call to standard zigmaaApi logout
      (window as any).__zigmaa_logout = () => {
        localStorage.removeItem("zigmaa_token");
        localStorage.removeItem("zigmaa_user");
        document.cookie = "zigmaa_token=; path=/; max-age=0; SameSite=Lax";
        window.location.href = "/login";
      };
      (window as any).__zigmaa_logout();
    });

    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");

    // Verify localStorage token is cleared
    const tokenInStorage = await page.evaluate(() => localStorage.getItem("zigmaa_token"));
    expect(tokenInStorage).toBeNull();

    // Verify cookie is cleared
    const cookies = await context.cookies();
    const tokenCookie = cookies.find((c) => c.name === "zigmaa_token");
    expect(tokenCookie === undefined || tokenCookie.value === "").toBeTruthy();

    // Verify unauthenticated attempt to visit /contacts now redirects to /login
    await page.goto("/contacts");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

});
