# Google Slides MCP Server - Design Document

**Date:** February 15, 2026
**Status:** Approved
**Approach:** Hybrid Foundation + Helpers

---

## Overview

A Model Context Protocol (MCP) server that provides comprehensive Google Slides management capabilities with full DOM-like control over presentations, slides, and elements. Designed to enable Claude to create, read, update, and delete presentations programmatically with fine-grained element manipulation.

### Key Requirements

- **Full CRUD operations** on presentations, slides, and elements
- **Element-level editing** with fine-grained control over positioning, styling, animations, and transitions
- **OAuth 2.0 authentication** with user consent flow
- **Resource-based tool organization** grouped by what they operate on (presentations, slides, elements)
- **TypeScript/Node.js** implementation for type safety and async operation support
- **File-based token storage** in `~/.config/google-slides-mcp/tokens.json`
- **Smart verbosity** - concise for simple operations, detailed for complex ones
- **Auto-open browser** OAuth flow with manual fallback

---

## Architecture

### Project Structure

```
google-slides-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── auth/
│   │   ├── oauth.ts          # OAuth 2.0 flow handler
│   │   ├── token-store.ts    # File-based token persistence
│   │   └── credentials.ts    # Google API credentials loader
│   ├── tools/
│   │   ├── presentation/     # Presentation CRUD tools
│   │   ├── slide/            # Slide management tools
│   │   ├── element/          # Element manipulation tools
│   │   ├── helpers/          # Convenience tools
│   │   └── index.ts          # Tool registry
│   ├── google/
│   │   ├── client.ts         # Google Slides API client wrapper
│   │   └── types.ts          # TypeScript types for API responses
│   └── utils/
│       ├── response.ts       # Smart verbosity formatter
│       └── validation.ts     # Input validation
├── config/
│   └── credentials.json      # OAuth client credentials (user provides)
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests with mocked API
│   └── e2e/                  # End-to-end tests with real API
└── package.json
```

### Architectural Decisions

1. **Stateless tools** - Each tool call is independent; authentication state is loaded from token store on demand
2. **Lazy initialization** - Google API client is created per-request to ensure fresh tokens
3. **Tool isolation** - Each tool category (presentation, slide, element) is a separate module for maintainability
4. **Centralized auth** - Single OAuth manager handles token refresh, storage, and initial consent flow
5. **Type safety** - Full TypeScript types for Google Slides API objects to catch errors at compile time
6. **Hybrid approach** - Core CRUD tools mirror the API, plus strategic helper tools for common workflows

### MCP Server Initialization

```
Server starts
  ↓
Check for valid tokens
  ↓
If missing → Trigger OAuth flow
  ↓
Open browser for consent
  ↓
Capture callback and store tokens
  ↓
Ready for tool calls
```

---

## Components

### OAuth Manager (`src/auth/oauth.ts`)

Handles the complete OAuth 2.0 flow:

- **Initial authentication:**
  - Starts local HTTP server on `http://localhost:3000/callback`
  - Generates auth URL with required scopes (`https://www.googleapis.com/auth/presentations`)
  - Auto-opens browser (with fallback to manual URL display)

- **Token management:**
  - Exchanges auth code for access/refresh tokens
  - Automatically refreshes expired access tokens
  - Persists tokens to `~/.config/google-slides-mcp/tokens.json` with `0600` permissions

- **Error handling:**
  - Detects invalid/revoked tokens
  - Provides clear re-authentication instructions

### Google API Client (`src/google/client.ts`)

Thin wrapper around `@googleapis/slides`:

- **Singleton pattern:** Reuses authenticated client instance per session
- **Automatic retry:** Implements exponential backoff for rate limits (429 errors)
- **Request batching:** Groups multiple operations into single `batchUpdate` calls when possible for efficiency
- **Error translation:** Converts Google API errors into user-friendly messages

### Tool Categories

#### Presentation Tools (`src/tools/presentation/`)

Core CRUD operations for presentations:

- `presentation_create` - Create new presentation with title
- `presentation_get` - Retrieve presentation metadata and structure
- `presentation_list` - List user's recent presentations
- `presentation_delete` - Delete presentation (with confirmation)
- `presentation_copy` - Duplicate presentation

#### Slide Tools (`src/tools/slide/`)

Slide management operations:

- `slide_create` - Add new blank slide at specified index
- `slide_delete` - Remove slide by ID
- `slide_duplicate` - Copy slide within presentation
- `slide_reorder` - Move slide to different position
- `slide_get` - Get slide content and elements

#### Element Tools (`src/tools/element/`)

Generic element manipulation (low-level API access):

- `element_create` - Generic element creation (requires full specification)
- `element_update` - Modify element properties (position, size, style, content)
- `element_delete` - Remove element by ID
- `element_get` - Retrieve element details

#### Helper Tools (`src/tools/helpers/`)

Convenience operations for common workflows:

- `add_text_box` - Create text box with content, position, and styling
- `add_image` - Insert image from URL with automatic sizing
- `add_shape` - Create shape (rectangle, circle, arrow, etc.)
- `add_table` - Create table with specified rows/columns
- `find_elements` - Search for elements by type, content, or position
- `create_from_template` - Start presentation from predefined layouts (title slide, content slide, comparison, etc.)

### Response Formatter (`src/utils/response.ts`)

Implements smart verbosity:

- **Simple operations** → `"Created slide with ID: xyz"`
- **Complex operations** → Summary with key details
  Example: `"Created presentation 'Q4 Review' with 5 slides: Title, Agenda, Revenue, Challenges, Next Steps"`
- **Errors** → Full context (what failed, why, how to fix)
- **Batch operations** → Aggregated results with success/failure counts

---

## Data Flow

### Request Flow: Tool Call → Google API

```
1. Claude calls MCP tool
   ↓
2. MCP server validates input parameters
   ↓
3. Check authentication status
   ├─ No valid token? → Trigger OAuth flow → Wait for auth → Continue
   └─ Valid token? → Continue
   ↓
4. Load Google API client with fresh access token
   ↓
5. Translate tool parameters to Google Slides API request
   ↓
6. Execute API call (with retry logic)
   ↓
7. Receive API response
   ↓
8. Format response using smart verbosity
   ↓
9. Return to Claude
```

### OAuth Flow (First-time Setup)

```
1. User runs MCP tool → No tokens found
   ↓
2. Server starts local callback server (localhost:3000)
   ↓
3. Generate OAuth URL with scopes
   ↓
4. Auto-open browser (fallback: display URL)
   ↓
5. User consents in Google OAuth screen
   ↓
6. Google redirects to localhost:3000/callback?code=xxx
   ↓
7. Exchange code for access + refresh tokens
   ↓
8. Store tokens in ~/.config/google-slides-mcp/tokens.json
   ↓
9. Close callback server
   ↓
10. Return success → Original tool call proceeds
```

### Token Refresh Flow

```
1. Tool call needs API access
   ↓
2. Load tokens from file
   ↓
3. Check access token expiration
   ├─ Expired? → Use refresh token to get new access token → Update file → Continue
   └─ Valid? → Continue
   ↓
4. Make API call
```

### Batch Operations

For efficiency, when multiple element operations target the same presentation:

```
1. Helper tool receives high-level request
   ↓
2. Build array of Google API requests
   ↓
3. Group into single batchUpdate call
   ↓
4. Execute atomically (all succeed or all fail)
   ↓
5. Return aggregated result
```

**Example:** `create_from_template('title-slide')` internally creates:
- 1 slide
- 1 title text box
- 1 subtitle text box
- Applied layout

All in a single `batchUpdate` call instead of 4 separate API calls.

---

## Error Handling

### Error Categories & Responses

#### 1. Authentication Errors

| Error | Cause | Response |
|-------|-------|----------|
| No tokens found | First-time use | Trigger OAuth flow automatically, guide user through setup |
| Invalid/expired refresh token | Token revoked or expired | Clear stored tokens, re-trigger OAuth flow with explanation |
| Insufficient scopes | Credentials don't have required permissions | Display required scopes, prompt re-authentication |

#### 2. API Errors

| Error | Cause | Response |
|-------|-------|----------|
| 400 Bad Request | Invalid parameters | "Invalid request: [specific field] is [problem]. Expected: [format]" |
| 403 Forbidden | No permission to access presentation | "You don't have permission to access presentation ID: xyz. Check sharing settings." |
| 404 Not Found | Presentation/slide/element doesn't exist | "Presentation/Slide/Element ID 'xyz' not found. It may have been deleted." |
| 429 Rate Limit | Too many requests | Auto-retry with exponential backoff (3 attempts), then return "Rate limited. Try again in [X] seconds." |
| 500 Server Error | Google API issue | "Google Slides API is temporarily unavailable. Try again in a moment." |

#### 3. Validation Errors

Caught before making API calls:

```typescript
// Element position validation
if (x < 0 || y < 0) {
  return "Position coordinates must be non-negative"
}

// Slide index validation
if (index < 0 || index > totalSlides) {
  return `Invalid slide index ${index}. Presentation has ${totalSlides} slides (0-${totalSlides-1})`
}

// Required field validation
if (!presentationId) {
  return "presentationId is required"
}
```

#### 4. Network Errors

| Error | Cause | Response |
|-------|-------|----------|
| Connection timeout | Network issue | "Network timeout. Check your connection and try again." |
| DNS resolution failed | No internet | "Cannot reach Google APIs. Check your internet connection." |

### Error Response Format

All errors follow consistent structure:

```typescript
{
  success: false,
  error: {
    type: 'authentication' | 'api' | 'validation' | 'network',
    message: "Human-readable error message",
    details?: "Additional context or remediation steps",
    retryable: boolean
  }
}
```

### Graceful Degradation

- **Browser open fails** → Fall back to manual URL copy-paste
- **Token file corrupted** → Delete and re-authenticate
- **Partial batch failure** → Return which operations succeeded/failed
- **Missing optional parameters** → Use sensible defaults (e.g., position defaults to top-left)

---

## Testing Strategy

### Testing Layers

#### 1. Unit Tests (`src/**/*.test.ts`)

Test individual components in isolation:

**Token storage:**
- ✓ Store tokens with correct file permissions (0600)
- ✓ Load tokens from file
- ✓ Handle corrupted token file gracefully
- ✓ Refresh expired access tokens

**Input validation:**
- ✓ Validate presentation IDs (correct format)
- ✓ Validate coordinates (non-negative numbers)
- ✓ Validate required fields (throw clear errors)
- ✓ Sanitize user input (prevent injection)

**Response formatting:**
- ✓ Simple operation returns concise message
- ✓ Complex operation returns detailed summary
- ✓ Error includes type, message, and remediation

#### 2. Integration Tests (`tests/integration/`)

Test with **mocked** Google API:

**Presentation operations:**
- ✓ Create presentation → Returns ID and title
- ✓ Get non-existent presentation → Returns 404 error
- ✓ Delete presentation → Confirms deletion

**Slide operations:**
- ✓ Add slide at specific index → Updates presentation
- ✓ Reorder slides → Correct final order
- ✓ Duplicate slide → Creates identical copy

**Element operations:**
- ✓ Add text box → Correct position and content
- ✓ Update element style → Changes applied
- ✓ Delete element → Removed from slide

**Batch operations:**
- ✓ Create template slide → All elements created atomically
- ✓ Partial batch failure → Returns which operations failed

#### 3. End-to-End Tests (`tests/e2e/`)

Test with **real** Google API (test account):

**OAuth flow:**
- ✓ First-time authentication completes successfully
- ✓ Token refresh works after expiration
- ✓ Invalid token triggers re-authentication

**Real API operations:**
- ✓ Create presentation → Visible in Google Drive
- ✓ Add content → Appears in Google Slides UI
- ✓ Delete presentation → Actually deleted

**Error scenarios:**
- ✓ Access forbidden presentation → Correct error
- ✓ Rate limiting → Retry logic works

### Testing Tools

- **Framework:** Jest (TypeScript support, mocking, coverage)
- **API Mocking:** `nock` for HTTP interception
- **Test Account:** Dedicated Google account for E2E tests
- **CI/CD:** GitHub Actions runs all tests on PR

### Manual Testing Checklist

Before release:

- [ ] OAuth flow works on macOS, Linux, Windows
- [ ] Browser auto-open works (and fallback works when it doesn't)
- [ ] Token storage permissions are correct (`0600`)
- [ ] All helper tools create expected output
- [ ] Error messages are clear and actionable
- [ ] Works with Claude in real MCP session

### Coverage Goals

- **Unit tests:** >90% code coverage
- **Integration tests:** All tools, all error paths
- **E2E tests:** Critical user journeys (auth, create, edit, delete)

---

## Implementation Phases

### Phase 1: Foundation (MVP)

**Goal:** Basic working MCP server with core CRUD operations

- OAuth 2.0 authentication flow
- Token storage and refresh
- Core presentation tools (create, get, list, delete)
- Core slide tools (create, delete, reorder)
- Basic element tools (create, update, delete)
- Error handling framework
- Unit tests for core components

**Deliverable:** Can create presentations, add/remove slides, and manipulate basic elements

### Phase 2: Helper Tools

**Goal:** Make common operations easier

- `add_text_box`, `add_image`, `add_shape`, `add_table`
- `create_from_template` with common layouts
- `find_elements` search functionality
- Batch operation support
- Integration tests

**Deliverable:** Significantly improved UX for common tasks

### Phase 3: Advanced Features

**Goal:** Full feature parity with Google Slides UI

- Advanced styling (gradients, shadows, reflections)
- Animations and transitions
- Master slide / theme management
- Charts and diagrams
- Collaboration features (comments, suggestions)
- E2E tests

**Deliverable:** Production-ready MCP server with comprehensive capabilities

---

## Success Metrics

- **Authentication:** Users can authenticate in <2 minutes
- **Tool discovery:** Claude can find and use correct tool without errors
- **Performance:** Most operations complete in <2 seconds
- **Reliability:** >99% success rate for valid operations
- **Error clarity:** Users can resolve errors without documentation
- **Test coverage:** >90% code coverage, all critical paths tested

---

## Next Steps

1. ✅ Design approved
2. → Create implementation plan
3. → Set up TypeScript project structure
4. → Implement OAuth flow
5. → Build core tools
6. → Add helper tools
7. → Write tests
8. → Deploy and iterate
