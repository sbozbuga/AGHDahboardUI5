# 🚀 Pi 5 Lab-Monitor & Network Gateway

This repository manages a high-performance network gateway, DNS security stack, and system monitoring hub running on a Raspberry Pi 5. The system is optimized for an external SSK 512GB SSD and uses a centralized Docker/Git-based infrastructure.

| Component | Responsibility | Technology |
| :--- | :--- | :--- |
| **OS** | Raspberry Pi OS (64-bit) | Linux Kernel 6.12+ |
| **Primary Storage** | 512GB External SSD | `/dev/sda` (USB 3.0, SAT protocol) |
| **Gateway** | Nginx Reverse Proxy | Port 80/443 (The "Lab-Gateway") |
| **DNS Stack** | AdGuard Home + Unbound | Recursive DNS with Cache Warmup |
| **Monitoring** | Grafana + Prometheus | Node-Exporter & Unbound-Exporter |
| **Management UI** | Custom Toolbox Dashboard | Flask-based UI (Port 5005) |

## 📂 Directory Structure (`~/lab-mon`)

The system follows a strict centralized structure for easy backup and portability:

```plaintext
~/lab-mon/
├── dashboard/          # Custom Flask Dashboard source code
├── docker/             # Docker Compose stacks
│   ├── adguardhome/    # DNS Blocking & Filtering
│   ├── grafana-stack/  # Monitoring (Grafana, Prometheus, Exporters)
│   └── nginx/          # Lab-Gateway configuration
├── scripts/            # Automation tools (ub-warmup, ssd-health,..)
│   └── dns/            # Unbound warmup & static lists
├── lib/                # Shared Python libraries for the dashboard
└── README.md           # This documentation
```

## 🛠️ Critical Services & Ports

### 1. Networking & DNS
- **AdGuard Home**: 53/udp (DNS), 3000/tcp (Admin UI)
- **Unbound**: 5351/udp (Recursive Upstream for AGH)
- **Nginx**: 80/443 (Global entry point for all web UIs)

### 2. Monitoring (Grafana Stack)
- **Grafana**: 3000/tcp (Accessible via `/grafana`)
- **Prometheus**: 9090/tcp (Data scraping & storage)
- **Unbound Exporter**: 9168/tcp (Custom built image with `wget` support)

### 3. Management
- **Toolbox UI**: 5005/tcp (Systemd service: `aghd-dashboard.service`)
  - Bound to `0.0.0.0` for network accessibility.

## 🌐 URL Paths & Nginx Proxy Rules

The Nginx gateway (`80/443`) serves as the single entry point for all web interfaces.

| Service | URL Path | Backend Target |
| :--- | :--- | :--- |
| **Grafana** | `/grafana/` | `http://127.0.0.1:3000/` |
| **Toolbox** | `/toolbox/` | `http://127.0.0.1:5005/` |
| **AdGuard Home** | `/` | `http://127.0.0.1:3000/` |

### Configuration Examples

```nginx
# Grafana (Monitoring)
# Note: Ensure Grafana `root_url` is set to serve from /grafana/
location /grafana/ {
    proxy_pass http://127.0.0.1:3000/;
    rewrite  ^/grafana/(.*)  /$1 break;
    proxy_set_header Host $http_host;
}

# Toolbox (Management UI)
location /toolbox/ {
    proxy_pass http://127.0.0.1:5005/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# AdGuard Home (DNS Admin)
location / {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## ⚙️ Hardware Specs (Pi 5 SSD)

Important hardware identifiers for troubleshooting:
- **SSD Device Path**: `/dev/sda`
- **Smartctl Protocol**: `-d sat` (Required for USB-to-SATA bridge communication).
- **Thermal Profile**: Idle ~27°C. Critical threshold set at 55°C.

## 🔄 Maintenance & Syncing

The entire `~/lab-mon` folder is a Git repository. A global sync alias is used to push all local changes (configs, scripts, dashboard updates) to the remote backup.

### DNS Cache Warmup (`ub-warmup`)
Automated nightly at 04:00. This script:
1. Analyzes AdGuard Home query logs.
2. Identifies the top 500 most-queried domains.
3. Pre-loads (warms) the Unbound cache to ensure sub-1ms response times for high-traffic sites.

## 🚦 Troubleshooting Cheat Sheet

```bash
# View Priority Errors Only
sudo journalctl -p 3 -f

# Restart the Dashboard Service
sudo systemctl restart aghd-dashboard.service

# Check Docker Container Health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test SSD Health Manually
sudo smartctl -d sat -H /dev/sda

# Force Cache Warmup
sudo ~/lab-mon/scripts/ub-warmup skip
```

---
**Last Updated:** February 13, 2026
**Reference:** Use this file as the primary context when starting a new AI session.
