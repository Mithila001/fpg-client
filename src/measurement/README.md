# Measurement module

The application stores all geometry in canonical project units:

- `10 project units = 1 meter`
- `100 project area units = 1 square meter`

Use `length.ts` only for length or coordinate values. Use `area.ts` only for
area values. Never convert an area with a length conversion function.

UI display and input should use `formatProjectLength`, `formatProjectArea`,
`parseDisplayLength`, and `parseDisplayArea`.

API conversion is separate and lives in `src/service/measurement`. This keeps
server-unit changes from affecting application state or UI code.
