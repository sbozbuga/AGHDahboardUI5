import os
import json
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Use a large viewport to see full content
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()

    # Mock the API responses
    # 1. Stats (for dashboard) - Return empty or minimal to avoid errors
    def handle_stats(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "num_dns_queries": 100,
                "num_blocked_filtering": 10,
                "avg_processing_time": 0.05,
                "block_percentage": 10,
                "top_queried_domains": [],
                "top_blocked_domains": [],
                "top_clients": []
            })
        )

    # 2. Query Log - Return specific data to verify our optimization works
    query_log_response = {
        "data": [
            {
                "answer": [],
                "original_answer": [],
                "upstream": "1.1.1.1",
                "status": "OK",
                "question": { "type": "A", "name": "example.com", "class": "IN" },
                "client": "192.168.1.100",
                "time": "2023-10-27T10:00:00Z",
                "elapsedMs": 123.45,  # Raw API sends numbers or strings, let's send number here to simulate pre-parsed? No, usually strings
                "reason": "NotFilteredNotFound",
                "filterId": 0,
                "rule": ""
            },
            {
                "answer": [],
                "original_answer": [],
                "upstream": "1.1.1.1",
                "status": "OK",
                "question": { "type": "A", "name": "blocked.com", "class": "IN" },
                "client": "192.168.1.100",
                "time": "2023-10-27T10:05:00Z",
                "elapsedMs": 50,
                "reason": "FilteredBlackList",
                "filterId": 0,
                "rule": ""
            }
        ]
    }

    # Send string for elapsedMs for one entry to test robust parsing (though mock usually sends consistent types)
    query_log_response["data"][0]["elapsedMs"] = "123.45"

    def handle_querylog(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(query_log_response)
        )

    # Intercept requests
    # Note: URL pattern matching in playwright is strict. Use wildcards.
    page.route("**/control/stats", handle_stats)
    page.route("**/control/querylog*", handle_querylog)

    # Navigate to the app (using the served URL)
    # The root URL might serve a directory listing, so go to index.html
    try:
        page.goto("http://localhost:8080/index.html")

        # Wait for app to load. The dashboard view usually appears.
        # If login is required, we might see login dialog.
        # But we mocked stats, so hopefully it bypasses login check if it relies on 401 from stats.

        # Wait for something recognizable
        page.wait_for_timeout(2000) # Give it a moment to initialize

        # Navigate explicitly to logs route
        page.goto("http://localhost:8080/index.html#/logs")

        # Wait for the table to load. Look for our mock data.
        # The table should render "example.com"
        page.wait_for_selector("text=example.com", timeout=10000)

        # Take screenshot
        screenshot_path = "verification/logs_page.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"Error: {e}")
        # Take screenshot anyway if possible
        page.screenshot(path="verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
