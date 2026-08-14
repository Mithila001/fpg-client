# Floor Plan Generator Client

React 19, TypeScript, Tailwind CSS, and Konva client for the API described in
[`docs/API.md`](docs/API.md).

## Development

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to the server origin. It defaults to
`http://localhost:8000`; the client appends `/api/v1`.

## Verification

```bash
npm test
npm run lint
npm run build
```

The workspace persists the current parcel, requirements, active job, summarized
event timeline, and latest terminal result in local storage. It reconnects to
active jobs with native `EventSource` after a refresh.
