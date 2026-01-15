# NFC Tag Setup Guide

## ✅ Correct NFC Tag URL Format

**Use this format for all NFC tags:**
```
https://yourdomain.com/c/{CARD_CODE}
```

### Examples:
- `https://kardo.com/c/AB7K9Q2M`
- `https://kardo.com/c/XYZ12345`

## How It Works

The `/c/[code]` route intelligently handles card lookup and redirects:

1. **Card is unclaimed** → Redirects to `/claim?code={code}`
   - User can enter their card code and sign in to claim it

2. **Card is claimed** → Redirects to `/u/{handle}`
   - Shows the card owner's profile page

3. **Card doesn't exist** → Redirects to `/unknown-card`
   - Shows error message that card wasn't found

4. **Card is disabled** → Redirects to `/card-disabled`
   - Shows message that card has been deactivated

## Benefits

✅ **Single URL format** - One URL works for life of the card
✅ **Dynamic routing** - Automatically shows claim page or profile based on status
✅ **No updates needed** - NFC tag never needs to be reprogrammed
✅ **Better UX** - Users see the right page automatically

## Migration from Old Format

If you've already programmed NFC tags with the old format (`/claim?code=...`):

**Old format (still works, but not ideal):**
- `https://yourdomain.com/claim?code=AB7K9Q2M`

**New format (recommended):**
- `https://yourdomain.com/c/AB7K9Q2M`

### Why switch?

The old format will always send users to the claim page, even after the card is claimed. The new `/c/` route automatically redirects to the profile once claimed.

## Setting Up NFC Tags

1. **Get your card code** (e.g., `AB7K9Q2M`)

2. **Create the URL:**
   ```
   https://yourdomain.com/c/AB7K9Q2M
   ```

3. **Program your NFC tag:**
   - Use an NFC writing app (iOS: Shortcuts, Android: NFC Tools)
   - Write the URL as an "URL" or "Web" record
   - Test the tag after programming

4. **Test the flow:**
   - Before claiming: Should redirect to claim page
   - After claiming: Should redirect to profile page

## Technical Details

The `/c/[code]` route (`src/app/c/[code]/route.ts`):
- Validates card code format
- Looks up card in database
- Checks card status
- Redirects appropriately based on state

## Troubleshooting

**Tag doesn't work:**
- Ensure URL is correct format: `/c/{CODE}`
- Check card code is uppercase (route handles this automatically)
- Verify card exists in database

**Always shows claim page:**
- Check card status in database
- Verify `profile_id` is set after claiming
- Check `/c/{code}` route is being used (not `/claim?code=...`)
