# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the root directory with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site URL (for production - optional but recommended)
# This ensures email redirects work correctly in production
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Environment Variable Details

### NEXT_PUBLIC_SUPABASE_URL
- **Required**: Yes
- **Description**: Your Supabase project URL
- **Where to find**: Supabase Dashboard → Project Settings → API → Project URL

### NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Required**: Yes
- **Description**: Your Supabase anonymous/public key
- **Where to find**: Supabase Dashboard → Project Settings → API → anon public key

### NEXT_PUBLIC_SITE_URL
- **Required**: No (but recommended for production)
- **Description**: Your production domain URL
- **Usage**: Used for email redirect URLs in authentication
- **Example**: `https://kardo.com` or `https://www.kardo.com`
- **Development**: If not set, uses `window.location.origin` (localhost:3000)

## Fixing Localhost Redirect Issues

If you're seeing localhost redirects in production:

1. **Set NEXT_PUBLIC_SITE_URL in production:**
   ```env
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   ```

2. **Configure Supabase Redirect URLs:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add to "Redirect URLs":
     - `https://yourdomain.com/auth/callback`
     - `http://localhost:3000/auth/callback` (for development)

3. **Set Site URL in Supabase:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Set "Site URL" to: `https://yourdomain.com`

## Deployment Platforms

### Vercel
Add environment variables in:
- Project Settings → Environment Variables

### Netlify
Add in:
- Site Settings → Environment Variables

### Other Platforms
Set environment variables according to your platform's documentation.

## Security Notes

- ✅ `NEXT_PUBLIC_*` variables are safe to expose (they're public)
- ❌ Never commit `.env.local` to git (it's already in `.gitignore`)
- ✅ These are client-side variables, visible in browser code
