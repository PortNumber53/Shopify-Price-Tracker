# Deployment Debugging Checklist

## Issue: 404 on /api/auth/me and 500 on /api/urls

### 1. Check if backend service is running
```bash
ssh grimlock@competitor-tracker14.dev.portnumber53.com
sudo systemctl status api-competitor-tracker.service
```

Expected: `Active: active (running)`

If not running, check why:
```bash
sudo journalctl -u api-competitor-tracker.service -n 50 --no-pager
```

### 2. Check backend logs
```bash
tail -100 /var/www/vhosts/api-competitor-tracker.truvis.co/logs/api-err.log
tail -100 /var/www/vhosts/api-competitor-tracker.truvis.co/logs/api-out.log
```

Look for:
- Database connection errors
- Missing JWT_SECRET warnings
- Port binding issues
- Panic/crash traces

### 3. Verify config.ini exists and has JWT_SECRET
```bash
cat /etc/api-competitor-tracker.truvis.co/config.ini
```

Should contain:
```
JWT_SECRET=<some-value>
DATABASE_URL=<postgres-connection-string>
```

### 4. Test backend directly on server
```bash
curl -v http://localhost:20911/api/health
```

Expected: `{"status":"ok"}`

### 5. Test auth endpoint
```bash
curl -v http://localhost:20911/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 6. Check if JWT_SECRET is set in Jenkins

Go to Jenkins → Credentials → Add/Edit:
- ID: `jwt-secret-competitor-tracker`
- Type: Secret text
- Secret: Generate a secure random string (e.g., `openssl rand -hex 32`)

### 7. Re-deploy after adding JWT_SECRET

Trigger a new Jenkins build to regenerate config.ini with the JWT_SECRET.

### 8. Common fixes

**If service won't start:**
```bash
# Check binary permissions
ls -la /var/www/vhosts/api-competitor-tracker.truvis.co/bin/api

# Check config permissions
ls -la /etc/api-competitor-tracker.truvis.co/config.ini

# Restart service
sudo systemctl restart api-competitor-tracker.service
```

**If database connection fails:**
- Verify DATABASE_URL in config.ini
- Test postgres connection: `psql $DATABASE_URL`
- Check if database exists and migrations ran

**If JWT_SECRET is missing:**
- Add credential to Jenkins
- Re-run deployment pipeline
- Verify config.ini was regenerated with JWT_SECRET

### 9. Verify reverse proxy (if applicable)

If using nginx/caddy:
```bash
# Check proxy config
cat /etc/nginx/sites-enabled/api-competitor-tracker
# or
cat /etc/caddy/Caddyfile

# Test proxy
curl -v https://api-competitor-tracker14.dev.portnumber53.com/api/health
```
