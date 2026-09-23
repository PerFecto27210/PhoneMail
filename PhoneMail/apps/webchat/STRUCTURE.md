# Webchat project structure

```text
app/
  _components/
    auth/       Phone sign-in and saved-number suggestions
    chat/       Conversation actions, messages, and composer
    compose/    New-message dialog
    icons/      Shared inline SVG icons and PhoneMail logo
    inbox/      Inbox sidebar and conversation list
    profile/    Contact profile dialog
    settings/   Account settings dialog
  _data/        Seed conversations and inbox filter options
  _lib/         Shared formatting helpers
  _types/       Conversation and message types
  convex-demo/  Convex demo route
  layout.tsx    Root layout and early theme initialization
  page.tsx      Main route and app state orchestration
  globals.css   Shared styles and theme tokens
```

The underscore-prefixed folders are private App Router folders. They organize app code without creating URL segments.
