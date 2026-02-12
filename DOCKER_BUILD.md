# Docker Build Command

To build only the frontend service using Docker Compose, run the following command in your terminal:

```powershell
docker-compose build frontend
```

### Explanation:
- `docker-compose build`: Tells Docker Compose to build or rebuild services.
- `frontend`: Specifies that only the service named `frontend` (as defined in `docker-compose.yml`) should be built.

### Re-running the UI:
If you want to build and then immediately start the frontend service:

```powershell
docker-compose up -d --build frontend
```
