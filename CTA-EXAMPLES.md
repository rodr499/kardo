# Dynamic CTA (Primary Action Button) - How It Works

## Overview

Each profile can have a customizable primary action button at the top of their public profile page (`/u/{handle}`). This button is controlled by two database fields:

- `primary_cta_type`: The type of action (default: `'save_contact'`)
- `primary_cta_value`: Optional value needed for some action types

## How to Set Up

### Option 1: Direct Database Update (Quick Test)

Run this SQL in your Supabase SQL editor to set a CTA type:

```sql
-- Set CTA to "Book a Meeting" with a Calendly link
UPDATE profiles
SET
  primary_cta_type = 'book_meeting',
  primary_cta_value = 'https://calendly.com/your-username'
WHERE handle = 'your-handle';

-- Set CTA to "Message on WhatsApp" with phone number
UPDATE profiles
SET
  primary_cta_type = 'message_whatsapp',
  primary_cta_value = '1234567890'  -- Will convert to wa.me link
WHERE handle = 'your-handle';

-- Reset to default "Add to Contacts"
UPDATE profiles
SET
  primary_cta_type = 'save_contact',
  primary_cta_value = NULL
WHERE handle = 'your-handle';
```

### Option 2: Update via Profile Edit Page (Future)

In the future, this will be editable from the profile settings page. For now, use SQL updates.

## Available CTA Types

### 1. `save_contact` (Default)

**Label:** "Add to Contacts"  
**Link:** `/u/{handle}.vcf`  
**Value Required:** No (ignored if provided)

```sql
UPDATE profiles SET primary_cta_type = 'save_contact', primary_cta_value = NULL WHERE handle = 'your-handle';
```

### 2. `book_meeting`

**Label:** "Book a Meeting"  
**Link Priority:**

1. `primary_cta_value` (if set)
2. `calendar_link` field (fallback)
3. `website` field (fallback)
4. Disabled if none available

```sql
-- Using primary_cta_value
UPDATE profiles SET primary_cta_type = 'book_meeting', primary_cta_value = 'https://calendly.com/john' WHERE handle = 'john';

-- Will use calendar_link if primary_cta_value is NULL
UPDATE profiles SET primary_cta_type = 'book_meeting', primary_cta_value = NULL WHERE handle = 'john';
```

### 3. `message_whatsapp`

**Label:** "Message on WhatsApp"  
**Link Priority:**

1. `primary_cta_value` (if full URL, uses as-is; if phone number, converts to `https://wa.me/{digits}`)
2. `phone` + `country_code` from profile (converts to `wa.me` link)
3. `whatsapp` field (if exists)
4. Disabled if none available

```sql
-- Using phone number (will convert to wa.me)
UPDATE profiles SET primary_cta_type = 'message_whatsapp', primary_cta_value = '1234567890' WHERE handle = 'john';

-- Using full wa.me URL
UPDATE profiles SET primary_cta_type = 'message_whatsapp', primary_cta_value = 'https://wa.me/1234567890' WHERE handle = 'john';

-- Will use profile phone if primary_cta_value is NULL
UPDATE profiles SET primary_cta_type = 'message_whatsapp', primary_cta_value = NULL WHERE handle = 'john';
```

### 4. `visit_website`

**Label:** "Visit Website"  
**Link Priority:**

1. `primary_cta_value` (if set)
2. `website` field (fallback)
3. Disabled if none available

```sql
-- Using primary_cta_value
UPDATE profiles SET primary_cta_type = 'visit_website', primary_cta_value = 'https://mycustomsite.com' WHERE handle = 'john';

-- Will use website field if primary_cta_value is NULL
UPDATE profiles SET primary_cta_type = 'visit_website', primary_cta_value = NULL WHERE handle = 'john';
```

### 5. `email_me`

**Label:** "Email Me"  
**Link:** `mailto:{email}`  
**Value Required:** No (uses `email` field from profile)  
**Disabled if:** `email` field is empty

```sql
UPDATE profiles SET primary_cta_type = 'email_me', primary_cta_value = NULL WHERE handle = 'john';
```

### 6. `call_me`

**Label:** "Call Me"  
**Link:** `tel:{country_code}{phone}`  
**Value Required:** No (uses `phone` and `country_code` from profile)  
**Disabled if:** `phone` field is empty

```sql
UPDATE profiles SET primary_cta_type = 'call_me', primary_cta_value = NULL WHERE handle = 'john';
```

## Testing Examples

### Test 1: Book a Meeting with Calendly

```sql
UPDATE profiles
SET primary_cta_type = 'book_meeting',
    primary_cta_value = 'https://calendly.com/johndoe/30min'
WHERE handle = 'johndoe';
```

Result: Button shows "Book a Meeting" and links to the Calendly URL.

### Test 2: WhatsApp with Phone Number

```sql
UPDATE profiles
SET primary_cta_type = 'message_whatsapp',
    primary_cta_value = '15551234567'
WHERE handle = 'johndoe';
```

Result: Button shows "Message on WhatsApp" and links to `https://wa.me/15551234567`.

### Test 3: Custom Website

```sql
UPDATE profiles
SET primary_cta_type = 'visit_website',
    primary_cta_value = 'https://myportfolio.com'
WHERE handle = 'johndoe';
```

Result: Button shows "Visit Website" and links to the custom URL.

### Test 4: Reset to Default

```sql
UPDATE profiles
SET primary_cta_type = 'save_contact',
    primary_cta_value = NULL
WHERE handle = 'johndoe';
```

Result: Button shows "Add to Contacts" and links to `/u/johndoe.vcf`.

## How It Works Behind the Scenes

1. Profile page loads and fetches `primary_cta_type` and `primary_cta_value` from database
2. `buildPrimaryCTA()` function determines:
   - Button label
   - Button link/URL
   - Whether button should be enabled or disabled
3. Primary CTA button is rendered at the top of the actions area
4. Secondary actions (Call, Email, Website, etc.) remain below as outline buttons

## Important Notes

- **Default Behavior**: If `primary_cta_type` is NULL or invalid, defaults to `'save_contact'`
- **Disabled State**: Button is shown but disabled if required data is missing (e.g., `email_me` without email)
- **External Links**: Automatically open in new tab with security attributes
- **Future-Proof**: Ready for tenant-level restrictions in enterprise version

## Next Steps

To make this user-editable:

1. Add CTA type dropdown in profile edit page
2. Add conditional input field for `primary_cta_value` based on selected type
3. Save both fields when profile is updated
