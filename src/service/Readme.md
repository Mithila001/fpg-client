# Service Layer

This module is responsible **only for server communication**. It provides a clean and consistent boundary between the frontend and backend.

## Responsibilities

- Define API request, response, and error contracts.
- Send HTTP requests to the server.
- Validate outgoing requests and incoming responses.
- Fail fast when data does not match the API contract.
- Return strongly typed data to the application.

## What Does Not Belong Here

- Business logic
- UI logic
- React hooks or components
- State management
- Geometry or drawing calculations
- Presentation formatting

## Structure

```text
service/
├── http/
│   ├── httpClient.ts
│   └── index.ts
│
├── validation/
│   ├── validation.types.ts  # Shared validation contracts
│   ├── validators.ts        # Reusable primitive validators
│   └── index.ts
│
└── <feature>/
    ├── <feature>.service.ts
    ├── <feature>.api.types.ts
    ├── <feature>.validators.ts
    ├── <feature>.errors.ts
    └── index.ts
```

## Validation Design

The shared `validation` module validates generic JavaScript values such as objects, arrays, strings, numbers, enums, nullable values, keys, and array lengths.

Each feature creates its own validator instance and supplies a feature-specific failure function. This keeps reusable validation logic independent from feature error classes and error messages.

```ts
const validators = createPrimitiveValidators(featureValidationFailure);
```

Feature validators remain responsible for API-specific rules such as allowed enum values, coordinate limits, required item counts, and relationships between fields.

## Fail Fast Flow

```text
Request
  -> Validate request
  -> HTTP call
  -> Validate response
  -> Invalid: throw typed service error
  -> Valid: return typed data
```

Invalid or partially valid server data must never propagate into the application.
