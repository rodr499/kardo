# How to Clear Cache - Kardo

## ✅ Completed Steps

1. ✅ Removed old `app/` directory (was conflicting with `src/app/`)
2. ✅ Cleared Next.js build cache (`.next/` directory)
3. ✅ Cleared node modules cache

## Additional Steps You Should Do

### 1. Clear Browser Cache

**Chrome/Edge:**
- Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
- Select "Cached images and files"
- Select "All time" or "Last hour"
- Click "Clear data"

**Or Hard Refresh:**
- `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Or `Cmd+Shift+Delete` and select "Cached images and files"

### 2. Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. Verify It's Working

1. Open `http://localhost:3000` (or the port your dev server uses)
2. You should see the NEW homepage with:
   - Large "Kardo" heading with gradient
   - "Your Digital Business Card" subtitle
   - Three feature cards
   - "Ready to Get Started?" CTA section

### 4. If Still Seeing Old Page

**Try these steps:**

1. **Force quit browser and reopen**
2. **Open in Incognito/Private window:**
   - This bypasses all cache
   - Chrome: `Cmd+Shift+N` (Mac) or `Ctrl+Shift+N` (Windows)
3. **Check browser dev tools:**
   - Open DevTools (F12)
   - Right-click refresh button → "Empty Cache and Hard Reload"
4. **Clear service workers:**
   - DevTools → Application tab → Service Workers → Unregister
   - Or: Application → Storage → Clear site data

### 5. Production Build (if deployed)

If you've deployed to production:
1. Clear build cache on your hosting platform
2. Redeploy the application
3. Clear CDN cache if using one (Vercel, Cloudflare, etc.)

## Verification Checklist

- [ ] Old `app/` directory removed
- [ ] `.next/` directory cleared
- [ ] Browser cache cleared
- [ ] Dev server restarted
- [ ] New homepage displays correctly
- [ ] Navigation component appears at top
- [ ] All routes work (/, /login, /claim, etc.)
