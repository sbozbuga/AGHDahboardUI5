from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Wait for UI5 to load
    page.goto("http://localhost:8080/index.html")

    # Wait for the dashboard to be visible
    # We look for "Total Queries" tile header
    page.get_by_text("Total Queries").wait_for()

    # Screenshot the dashboard
    page.screenshot(path="verification/dashboard.png")
    print("Dashboard screenshot saved.")

    # Find the "Copy All" buttons.
    # They have class "floatingCopyBtn" in Dashboard.view.xml
    # We need to wait for them to be rendered.
    # UI5 renders buttons with classes like sapMBtn.
    # But we added a custom class "floatingCopyBtn".
    buttons = page.locator(".floatingCopyBtn")

    count = buttons.count()
    print(f"Found {count} copy buttons.")

    for i in range(count):
        btn = buttons.nth(i)
        # Get the title attribute
        title = btn.get_attribute("title")
        print(f"Button {i} tooltip: {title}")

        # Verify it contains the count format "(0)" or similar
        # Since no data is loaded, it should be (0)
        if title and "(0)" in title:
            print(f"✅ Button {i} has correct tooltip format: {title}")
        else:
            print(f"❌ Button {i} has unexpected tooltip: {title}")

    # Also check Logs view
    # Click "View Logs" button in footer
    page.get_by_role("button", name="View Logs").click()

    # Wait for Logs view
    page.get_by_text("AdGuard Home Logs").wait_for()

    # Screenshot logs view
    page.screenshot(path="verification/logs.png")
    print("Logs screenshot saved.")

    # Find the "Copy All" button in Logs view
    # It has icon "sap-icon://copy" and tooltip "Copy All List..."
    # UI5 buttons often render the icon inside.
    # We can search by icon name? No.
    # We can search by title/tooltip.
    # But the tooltip is what we changed!
    # Let's find all buttons and check their titles.
    log_buttons = page.locator("button")
    log_btn_count = log_buttons.count()
    found_log_copy = False

    for i in range(log_btn_count):
        btn = log_buttons.nth(i)
        title = btn.get_attribute("title")
        if title and "Copy All List" in title:
            print(f"Found Log Copy Button: {title}")
            found_log_copy = True
            if "(0)" in title:
                print("✅ Log Copy Button has correct tooltip format.")
            else:
                print("❌ Log Copy Button has unexpected tooltip format.")
            break

    if not found_log_copy:
        print("❌ Could not find Log Copy Button.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
