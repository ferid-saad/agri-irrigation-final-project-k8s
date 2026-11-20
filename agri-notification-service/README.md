# agri-notification-service

A Node.js/Express microservice for storing and retrieving alert and notification logs related to irrigation events.

## Overview

This is **MS3** of the AgriIrrigation platform. It uses **MongoDB** (via Mongoose) as its data store and exposes a REST API secured by JWT authentication.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/notifications` | Yes | Create a new notification |
| GET | `/notifications` | Yes | List all notifications for the authenticated user |
| PATCH | `/notifications/:id/lu` | Yes | Mark a notification as read |
| DELETE | `/notifications/:id` | Yes | Delete a notification |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | HTTP listen port |
| `MONGODB_URI` | `mongodb://localhost:27017/notifications_db` | MongoDB connection string |
| `JWT_SECRET` | `dev-secret-change-me` | Secret used to verify JWT tokens |

## Notification Schema

```json
{
  "userId": 1,
  "type": "alerte | info | succes",
  "message": "Irrigation threshold exceeded",
  "parcelleId": 42,
  "lu": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Running Locally

```bash
npm install
MONGODB_URI=mongodb://localhost:27017/notifications_db JWT_SECRET=mysecret npm start
```

## Running Tests

```bash
npm test
```

## Docker

```bash
docker build -t agri-notification-service .
docker run -p 3002:3002 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/notifications_db \
  -e JWT_SECRET=mysecret \
  agri-notification-service
```
