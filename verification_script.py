from playwright.sync_api import sync_playwright, expect
import re
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # 1280x800 is a good size
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to Dashboard...")
        try:
            page.goto("http://localhost:8080/index.html", timeout=30000)
        except Exception as e:
            print(f"Error navigating: {e}")
            return

        # Wait for tiles
        print("Waiting for tiles...")
        # Processing Time
        processing_tile = page.get_by_text("Processing Time", exact=True)
        try:
             expect(processing_tile).to_be_visible(timeout=10000)
        except Exception as e:
             print(f"Could not find Processing Time tile: {e}")
             page.screenshot(path="error_dashboard.png")
             return

        # Check tooltip? UI5 usually puts it on the outer container.
        # We can try to locate the container of the text "Processing Time".
        # processing_tile_container = processing_tile.locator("xpath=../..")
        # But UI5 structure is complex. Let's rely on interactivity.

        print("Clicking Processing Time tile...")
        processing_tile.click()

        print("Verifying navigation to Logs...")
        try:
            expect(page).to_have_url(re.compile(".*#/logs.*"), timeout=10000)
            print("Successfully navigated to Logs page via Processing Time tile.")
        except Exception as e:
            print(f"Navigation failed: {e}")
            page.screenshot(path="error_logs_nav.png")
            return

        # Go back
        page.go_back()

        # Blocked % Tile
        print("Testing Blocked % tile...")
        blocked_pct_tile = page.get_by_text("Blocked %", exact=True)
        expect(blocked_pct_tile).to_be_visible()
        blocked_pct_tile.click()

        print("Verifying navigation to Blocked Logs...")
        try:
            # The URL parameter for status=Blocked is usually encoded
            # e.g. ?query={"status":"Blocked"} -> %7B%22status%22%3A%22Blocked%22%7D
            # checking for "Blocked" in URL is safer
            expect(page).to_have_url(re.compile(".*Blocked.*"), timeout=10000)
            print("Successfully navigated to Blocked Logs via Blocked % tile.")
        except Exception as e:
             print(f"Navigation to Blocked Logs failed: {e}")
             page.screenshot(path="error_blocked_nav.png")

        # Go back
        page.go_back()

        # Check "Slowest Queries" table row
        # This table might be empty if no data, so we can't always verify it click.
        # But we can check if the code runs without error.

        # Take a final screenshot of the dashboard
        print("Taking final dashboard screenshot...")
        time.sleep(2) # ensure render
        page.screenshot(path="dashboard_verification.png")

        browser.close()

if __name__ == "__main__":
    run()
