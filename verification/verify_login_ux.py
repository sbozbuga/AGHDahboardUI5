from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to login page...")
        url = "http://localhost:8080/index.html#/login"

        for i in range(5):
            try:
                page.goto(url)
                break
            except Exception as e:
                print(f"Attempt {i+1} failed: {e}")
                time.sleep(2)

        # Wait for UI5 to load Login content
        print("Waiting for Login content...")
        try:
            # Look for the username input
            username_input = page.locator("input[placeholder='Enter your username']")
            expect(username_input).to_be_visible(timeout=15000)
        except Exception as e:
            print(f"Timed out waiting for input: {e}")
            page.screenshot(path="verification/timeout_login.png")
            browser.close()
            return

        time.sleep(1) # Allow focus animation

        # Take screenshot
        page.screenshot(path="verification/login_screen_check.png")
        print("Screenshot taken: verification/login_screen_check.png")

        # Check focus
        print("Verifying autofocus...")
        try:
            expect(username_input).to_be_focused()
            print("SUCCESS: Username input is focused.")
        except AssertionError:
            print("FAILURE: Username input is NOT focused.")
            focused_tag = page.evaluate("document.activeElement.tagName")
            focused_id = page.evaluate("document.activeElement.id")
            print(f"Focused element: {focused_tag}#{focused_id}")

        # Check for required class on Label
        # We find the label associated with 'usernameInput'
        # Since I added required="true" to the Label, it should have the visual indicator.
        # I'll rely on the screenshot to verify the asterisk.

        browser.close()

if __name__ == "__main__":
    run()
