# AdGuard Home Dashboard (UI5 + Gemini AI)

A generic, modern Dashboard for AdGuard Home, built with **SAP UI5** (TypeScript) and integrated with **Google Gemini AI** for intelligent log analysis.

## Features

- **📊 Dashboard Stats**: Real-time overview of DNS queries, blocked domains, and client activity.
- **🤖 Smart Analysis**: Uses **Gemini 1.5** (Flash/Pro) to analyze your query logs and provide actionable security and privacy insights.
- **📝 Query Logs**: Advanced log viewer with filtering, pagination, and multi-column sorting.
- **🔐 Native Login**: Direct authentication with your AdGuard Home instance.
- **⚙️ Configurable**: Set your API Key, choose your preferred AI model, and provide custom network context for better insights.

## Tech Stack

- **Frontend**: SAP UI5 (OpenUI5) with TypeScript
- **AI**: Google Gemini API via `@google/generative-ai`
- **Build**: UI5 Tooling + `ui5-tooling-modules` for bundling NPM packages

## Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/sbozbuga/AGHDahboardUI5.git
    cd AGHDahboardUI5
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Locally (Dev Mode)**:
    ```bash
    npm start
    ```
    Acces at `http://localhost:8080`.
    *Note: You may need to configure a proxy or CORS in `ui5.yaml` if connecting to a remote AdGuard instance.*

## Deployment to AdGuard Home

To deploy this dashboard directly to your AdGuard Home server (e.g., Raspberry Pi):

1.  **Build the project**:
    ```bash
    npm run build
    ```

2.  **Upload `dist` folder**:
    Copy the contents of the `dist/` folder to your web server hosting the dashboard.
    ```bash
    scp -r dist/* user@your-adguard-server:/var/www/adguard-dashboard/
    ```

## AI Configuration

1.  Go to the **Logs** tab.
2.  Open **Settings** (⚙️).
3.  Enter your **Gemini API Key** (Get one at [aistudio.google.com](https://aistudio.google.com/)).
4.  Select a Model (e.g., `gemini-1.5-flash`).
5.  (Optional) Enter **System Context** to describe your network for better AI accuracy.

## License

Apache-2.0
