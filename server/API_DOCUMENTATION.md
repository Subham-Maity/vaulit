# API Documentation

## Table of Contents

### App

- **GET** `/xam` - [/xam](#get--xam)

### Auth

- **POST** `/xam/auth/admin/setup` - [One-time admin account creation](#post--xam-auth-admin-setup)
- **POST** `/xam/auth/admin/login` - [Admin login – exchange Firebase ID token for session cookie](#post--xam-auth-admin-login)
- **POST** `/xam/auth/admin/logout` - [Admin logout – revoke tokens and clear session cookie](#post--xam-auth-admin-logout)
- **GET** `/xam/auth/admin/me` - [Get current session admin](#get--xam-auth-admin-me)

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

