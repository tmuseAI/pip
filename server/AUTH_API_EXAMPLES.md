# Auth API Examples

## Register

`POST /api/auth/register`

Request body:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "0f2f3a0b-6320-4653-ac9b-dce4c7f79b96",
      "email": "user@example.com",
      "role": "USER",
      "isVerified": false
    },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  },
  "error": null
}
```

## Login

`POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

## Refresh

`POST /api/auth/refresh`

Body (optional if cookie is present):

```json
{
  "refreshToken": "<jwt>"
}
```

## Logout

`POST /api/auth/logout`

```json
{
  "refreshToken": "<jwt>"
}
```

## Profile

`GET /api/user/profile`

Header:

`Authorization: Bearer <access-token>`
