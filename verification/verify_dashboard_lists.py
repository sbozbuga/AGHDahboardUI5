from playwright.sync_api import sync_playwright, Page, expect

def verify_dashboard_lists(page: Page):
    # Mock stats
    page.route("**/control/stats", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body="""{
            "num_dns_queries": 12345,
            "num_blocked_filtering": 456,
            "avg_processing_time": 0.123,
            "top_queried_domains": [
                {"domain": "very-long-domain-name-that-should-be-truncated-in-the-dashboard-list-view-because-it-is-too-long.com", "count": 100},
                {"domain": "short.com", "count": 50}
            ],
            "top_blocked_domains": [
                {"domain": "very-long-blocked-domain-name-that-should-also-be-truncated-to-maintain-clean-ui.net", "count": 20}
            ],
            "top_clients": [
                {"ip": "2001:0db8:85a3:0000:0000:8a2e:0370:7334-very-long-ipv6-address-representation", "count": 300},
                {"ip": "192.168.1.1", "count": 150}
            ]
        }"""
    ))

    # Mock query log for slowest queries
    page.route("**/control/querylog**", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body="""{
            "data": [
                {
                    "question": {"name": "very-long-slow-query-domain-name-that-exceeds-typical-column-width-and-should-truncate.org"},
                    "elapsedMs": "600",
                    "client": "192.168.1.10",
                    "reason": "Rewritten",
                    "time": "2023-10-27T10:00:00Z"
                },
                 {
                    "question": {"name": "another-very-long-slow-query-domain-name-that-exceeds-typical-column-width-and-should-truncate.org"},
                    "elapsedMs": "300",
                    "client": "192.168.1.10",
                    "reason": "Rewritten",
                    "time": "2023-10-27T10:00:00Z"
                }
            ]
        }"""
    ))

    # Navigate
    page.goto("http://localhost:8080/index.html")

    # Wait for dashboard content - checking if "Top Clients" card is visible
    page.get_by_text("Top Clients").wait_for()

    # Wait for data to populate (Text elements)
    # Using a part of the text that should be present
    expect(page.get_by_text("very-long-domain-name")).to_be_visible()

    # Allow some time for rendering
    page.wait_for_timeout(2000)

    # Screenshot
    page.screenshot(path="verification/dashboard_lists.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set viewport to a typical desktop size
        page.set_viewport_size({"width": 1280, "height": 800})
        verify_dashboard_lists(page)
        browser.close()
