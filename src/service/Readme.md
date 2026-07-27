# Service Layer

This module is responsible **only for server communication**. Its purpose is to provide a clean and consistent boundary between the frontend and backend.

## Responsibilities

- Define the API contract (Request, Response, Error types).
- Send HTTP requests to the server.
- Validate incoming responses.
- Fail Fast when the server returns unexpected data.
- Return strongly typed data to the rest of the application.

## What Does NOT Belong Here

- Business logic
- UI logic
- React hooks or components
- State management
- Geometry or data calculations
- Data formatting for presentation

The service layer should remain a thin communication layer.

## Structure

```text
services/
├── http/
│   └── httpClient.ts         # Shared HTTP client
│
└── <feature>/
    ├── <feature>.service.ts  # API communication
    ├── <feature>.types.ts    # API Request/Response/Error contracts
    ├── <feature>.validators.ts # Runtime validation
    ├── <feature>.errors.ts   # Service errors
    └── index.ts              # Public exports
```

## Fail Fast

Every API call follows the same flow:

```text
Request
    ↓
HTTP Call
    ↓
Receive Response
    ↓
Validate Response
    ↓
❌ Invalid → Throw Typed Error
✅ Valid   → Return Typed Data
```

If the response does not match the expected API contract, the service throws immediately. Invalid or partially valid data should never propagate into the application.

## Design Principles

- One service per backend feature.
- API types should match the server contract exactly.
- Services should be stateless.
- Keep services small and focused.
- All server communication should go through this layer.