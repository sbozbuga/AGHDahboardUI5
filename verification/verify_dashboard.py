from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})

    # Mock API responses
    page.route("**/control/stats", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='''{
            "num_dns_queries": 1234,
            "num_blocked_filtering": 42,
            "avg_processing_time": 0.045,
            "top_queried_domains": [],
            "top_blocked_domains": [],
            "top_clients": []
        }'''
    ))

    page.route("**/control/querylog**", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='''{
            "data": [
                {
                    "question": {"name": "example.com", "type": "A"},
                    "client": "192.168.1.10",
                    "status": "OK",
                    "reason": "Rewrite",
                    "time": "2023-10-27T10:00:00Z",
                    "elapsedMs": "45.0"
                }
            ]
        }'''
    ))

    # Navigate to the app
    # UI5 serve might redirect / to listing, so go to index.html
    page.goto("http://localhost:8080/index.html")

    # Wait for the dashboard to load (look for "AdGuard Home Dashboard" title)
    page.wait_for_selector("text=AdGuard Home Dashboard")

    # Wait for the "Updated:" text to appear in the footer
    try:
        page.wait_for_selector("text=Updated:", timeout=5000)
        print("Found 'Updated:' text!")
    except:
        print("Timeout waiting for 'Updated:' text.")

    # Take screenshot
    page.screenshot(path="dashboard_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
