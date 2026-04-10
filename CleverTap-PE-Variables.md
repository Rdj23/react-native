# CleverTap Product Experiences - Variables Reference

Docs: https://developer.clevertap.com/docs/react-native-remote-config

## Required SDK

```
clevertap-react-native >= v1.1.0
```

## API Flow (in order)

```
1. defineVariables()   -- register variables with defaults
2. syncVariables()     -- upload definitions to server (debug builds, test profile required)
3. onVariablesChanged() -- listen for value updates
4. onValueChanged()    -- listen for individual variable changes
5. fetchVariables()    -- pull latest values from dashboard
```

## Minimal Working Example

```javascript
import CleverTap from 'clevertap-react-native';

// 1. Define variables (nested object = dashboard folder)
CleverTap.defineVariables({
  movie: {
    primary_color: '#5E35B1',
    background_color: '#0D0D0D',
    allow_free_trailers: true,
    trailer_preview_duration: 15,
    paywall_cta_text: 'Upgrade to Premium',
  },
});

// 2. Sync to server (debug only, user must be test profile on dashboard)
CleverTap.syncVariables();

// 3. Listen for all variable changes
CleverTap.onVariablesChanged((variables) => {
  console.log('All variables:', variables);
  // variables.movie.primary_color, variables.movie.background_color, etc.
});

// 4. Listen for a single variable change (key format: "folder.variable_name")
CleverTap.onValueChanged('movie.primary_color', (value) => {
  console.log('primary_color changed to:', value);
});

// 5. Fetch latest values from dashboard
CleverTap.fetchVariables((err, success) => {
  console.log('Fetch result:', success, err);
});
```

## Segment Re-evaluation (after user property change)

```javascript
// Update user property first
CleverTap.profileSet({ 'Subscription Tier': 'Premium' });

// Then immediately fetch to re-evaluate segments
CleverTap.fetchVariables((err, success) => {
  console.log('Re-evaluated segments:', success);
});
```

## Read Variables On-Demand

```javascript
// Get all variables
CleverTap.getVariables((err, variables) => {
  console.log('All:', variables);
});

// Get a single variable
CleverTap.getVariable('movie.primary_color', (err, value) => {
  console.log('Value:', value);
});
```

## Variables Used in This Project

Dashboard folder: **movie**

### Paywall

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `allow_free_trailers` | Boolean | `true` | Show trailers to free users |
| `trailer_preview_duration` | Number | `15` | Seconds before paywall appears |
| `paywall_cta_text` | String | `Upgrade to Premium` | CTA button text |

### Theme Colors

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `primary_color` | String | `#5E35B1` | Primary brand color |
| `accent_color` | String | `#7C4DFF` | Accent/highlight color |
| `background_color` | String | `#0D0D0D` | App background |
| `surface_color` | String | `#161618` | Card/surface background |
| `header_color` | String | `#111114` | Header background |
| `text_color` | String | `#FFFFFF` | Primary text |
| `text_secondary_color` | String | `#AAA` | Secondary/muted text |
| `border_color` | String | `#1E1E22` | Border/divider color |
| `cta_text_color` | String | `#FFFFFF` | CTA button text color |

### Strings

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `hero_tag_text` | String | `FEATURED` | Hero section tag |
| `watch_cta_text` | String | `Watch Now` | Watch button label |
| `buy_cta_text` | String | `Buy Now` | Buy button label |
| `browse_cta_text` | String | `Browse Content` | Empty state CTA |
| `trending_movies_title` | String | `Trending Movies` | Section title |
| `trending_tv_title` | String | `Trending TV Series` | Section title |
| `cart_title` | String | `My Cart` | Cart screen title |
| `greeting_text` | String | `Hey there` | User greeting |

## Dashboard Segments (example)

| Segment | Condition | primary_color |
|---------|-----------|---------------|
| Moviefree | Subscription Tier = Free | `#5E35B1` |
| MoviePremiUm | Subscription Tier = premium | `#FFD700` |
| All Users | (default) | `#5E35B1` |

## Prerequisites

1. User profile must be marked as **test profile** on dashboard for `syncVariables` to work
2. Variables must be created on the dashboard inside the **movie** folder
3. Segments must use user properties (e.g., `Subscription Tier`) set via `profileSet`
