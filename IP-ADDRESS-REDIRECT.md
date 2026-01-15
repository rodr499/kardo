# Fixing IP Address Redirect Issues

## Problem

When accessing the app via IP address (e.g., `http://192.168.68.124:3000`), redirects may go to `localhost` instead of the IP address.

## Solution

The code has been updated to correctly extract the origin from the request URL, which preserves IP addresses, localhost, and domain names correctly.

## What Changed

All redirect routes now use:
```typescript
const requestUrl = new URL(req.url);
const origin = `${requestUrl.protocol}//${requestUrl.host}`;
```

This ensures:
- ✅ `http://192.168.68.124:3000` stays as IP address
- ✅ `http://localhost:3000` stays as localhost  
- ✅ `https://yourdomain.com` stays as domain

## Testing

1. Access via IP: `http://192.168.68.124:3000/c/ABC123`
2. Should redirect to: `http://192.168.68.124:3000/...` (not localhost)

## Supabase Configuration

Make sure Supabase redirect URLs include your IP:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `http://192.168.68.124:3000/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback`

**Note**: IP addresses change, so you may need to update this when your network IP changes.

## Development Tips

- Use `http://localhost:3000` for single-machine development
- Use IP address (`http://192.168.x.x:3000`) when testing on multiple devices on the same network
- Use domain name for production deployments

## Environment Variables

For production, set:
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

For development with IP, you can also set:
```env
NEXT_PUBLIC_SITE_URL=http://192.168.68.124:3000
```

But it's usually not necessary since the code now automatically detects the origin from the request.
