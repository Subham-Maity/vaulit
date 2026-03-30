# API Documentation

## Table of Contents

### App

- **GET** `/xam` - [/xam](#get--xam)

### Auth

- **POST** `/xam/auth/admin/setup` - [One-time admin account creation](#post--xam-auth-admin-setup)
- **POST** `/xam/auth/admin/login` - [Admin login – exchange Firebase ID token for session cookie](#post--xam-auth-admin-login)
- **POST** `/xam/auth/admin/logout` - [Admin logout – revoke tokens and clear session cookie](#post--xam-auth-admin-logout)
- **GET** `/xam/auth/admin/me` - [Get current session admin](#get--xam-auth-admin-me)

### News

- **GET** `/xam/news/search` - [Search global news via GDELT](#get--xam-news-search)

---

## Endpoints

## App

### /xam

**GET** `/xam`

**Responses:**

**200** - 

---

## Auth

### One-time admin account creation

**POST** `/xam/auth/admin/setup`

Creates the single admin user in Firebase Auth and the database. Requires the `x-setup-key` header. Throws 409 if an admin already exists.

**Parameters:**

- `x-setup-key` (header) - Secret key from ADMIN_SETUP_SECRET_KEY env var

**Request Body:**

```json
{
  "email": "admin@portfolio.dev",
  "password": "string"
}
```

**Responses:**

**201** - 

```json
{
  "message": "Admin account setup correctly",
  "admin": {
    "id": "cuid...",
    "email": "admin@portfolio.dev"
  }
}
```

**403** - Invalid or missing setup key

**409** - Admin already exists

---

### Admin login – exchange Firebase ID token for session cookie

**POST** `/xam/auth/admin/login`

The client signs in with email/password via the Firebase JS SDK, retrieves the ID token via `getIdToken()`, and sends it here. On success a `admin_session` httpOnly cookie is set.

**Request Body:**

```json
{
  "email": "admin@portfolio.dev",
  "idToken": "string"
}
```

**Responses:**

**200** - 

```json
{
  "message": "Admin login successful",
  "admin": {
    "id": "cuid...",
    "email": "admin@portfolio.dev"
  }
}
```

**401** - Authentication failed

---

### Admin logout – revoke tokens and clear session cookie

**POST** `/xam/auth/admin/logout`

Revokes all Firebase refresh tokens for the admin (invalidates all sessions across devices), then clears the browser cookie.

**Responses:**

**200** - Logged out successfully

**401** - No active session

---

### Get current session admin

**GET** `/xam/auth/admin/me`

Returns the admin info for the current session. Used by the frontend to validate the session cookie.

**Responses:**

**200** - Current admin info

**401** - No active session

---

## News

### Search global news via GDELT

**GET** `/xam/news/search`

Fetches articles from the GDELT DOC 2.0 API (100+ languages, 200+ countries).
Supports filtering by keyword, country (FIPS code), domain, language, GKG theme,
and a date range. Results are paginated in-memory from up to 250 GDELT records.

**Note:** GDELT's rolling search window covers the last ~3 months.

**Parameters:**

- `keyword` (query) - Keywords to search for in article titles and content.
- `countries` (query) - Comma-separated FIPS country codes
- `domains` (query) - Comma-separated source domains
- `languages` (query) - Comma-separated language names
- `theme` (query) - GKG theme filter
- `startDate` (query) - ISO 8601 start date (GDELT 3-month window applies)
- `endDate` (query) - ISO 8601 end date
- `sort` (query) - Sort order
- `page` (query) - Page number (1-indexed)
- `limit` (query) - Articles per page (max 50)

**Responses:**

**200** - Paginated list of matched news articles.

```json
{
  "articles": [],
  "pagination": null,
  "gdeltQueryUrl": "https://api.gdeltproject.org/api/v2/doc/doc?query=..."
}
```

**400** - Invalid query parameters.

**500** - GDELT service unreachable.

---

