# Automatic Session Expiry & Logout System

## Overview

This application now includes a comprehensive automatic logout system that ensures users are logged out when their JWT tokens or sessions expire. The system operates on multiple levels to provide robust session management.

## Features

### 1. **Client-Side JWT Expiry Detection**
- Decodes JWT tokens on the client side to check expiration times
- Monitors token expiration every minute
- Automatically logs out users when tokens expire
- Located in: `src/lib/jwt-client.ts`

### 2. **Fetch Interceptor**
- Intercepts all API calls to detect 401 (Unauthorized) responses
- Automatically triggers logout when session expires
- Prevents API calls with expired tokens
- Located in: `src/lib/fetch-interceptor.ts`

### 3. **AuthContext Enhancements**
- Periodic session checks every 5 minutes
- Token expiry checks every 1 minute
- Automatic token refresh for tokens nearing expiration
- Centralized logout callback registration
- Located in: `src/context/AuthContext.tsx`

### 4. **Session Expiry Monitor Component**
- Visual warning when session is about to expire (< 5 minutes)
- Shows countdown timer
- Allows users to refresh their session
- Located in: `src/components/SessionExpiryMonitor.tsx`

### 5. **Protected Route Hook**
- `useRequireAuth` hook for components requiring authentication
- Automatically redirects to login when session expires
- Supports admin-only routes
- Located in: `src/lib/hooks/useRequireAuth.ts`

## How It Works

### Multi-Layer Protection

1. **Client-Side Token Check**
   - Every minute, the system checks if the JWT token in cookies is expired
   - If expired, immediately triggers logout

2. **API Response Monitoring**
   - All API calls using `authenticatedFetch` are monitored
   - 401 responses automatically trigger logout
   - Prevents infinite logout loops on auth endpoints

3. **Periodic Session Validation**
   - Every 5 minutes, the system checks session validity with the server
   - Refreshes tokens that are close to expiration (within 7 days)
   - Maintains session continuity for active users

4. **Visual Feedback**
   - Warning appears 5 minutes before session expiration
   - Users can refresh their session by clicking a button
   - Prevents unexpected logouts during active use

## Usage Examples

### Using Authenticated Fetch in Components

```tsx
import { useAuthenticatedFetch } from '@/lib/hooks/useAuthenticatedFetch';

function MyComponent() {
  const authFetch = useAuthenticatedFetch();
  
  const fetchData = async () => {
    // This will automatically handle session expiry
    const response = await authFetch('/api/data');
    if (response.ok) {
      const data = await response.json();
      // Process data
    }
  };
}
```

### Protecting Routes with useRequireAuth

```tsx
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

function ProtectedPage() {
  const { user, isLoading } = useRequireAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      Welcome, {user?.firstName}!
    </div>
  );
}
```

### Admin-Only Routes

```tsx
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

function AdminPage() {
  const { user, isLoading } = useRequireAuth({ adminOnly: true });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      Admin Dashboard
    </div>
  );
}
```

### Manual Session Check

```tsx
import { isCurrentSessionExpired } from '@/lib/jwt-client';
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { logout } = useAuth();
  
  const handleAction = () => {
    if (isCurrentSessionExpired()) {
      alert('Your session has expired');
      logout();
      return;
    }
    // Perform action
  };
}
```

## Token Expiration Times

- **Admin Users**: 8 hours
- **Regular Users**: 30 days
- **Refresh Threshold**: 7 days (tokens are refreshed when within 7 days of expiration)

## Session Monitoring Intervals

- **Auth Check**: Every 5 minutes
- **Token Expiry Check**: Every 1 minute
- **Session Monitor**: Every 30 seconds (in components using `useSessionCheck`)
- **Expiry Warning**: Appears when < 5 minutes remaining

## API Endpoints

### Check Authentication
```
GET /api/auth/me
```
Returns current user info or 401 if session expired

### Refresh Token
```
POST /api/auth/refresh
```
Refreshes the JWT token if within the refresh threshold

### Logout
```
POST /api/auth/logout
```
Invalidates the session and clears cookies

## Security Features

1. **HttpOnly Cookies**: JWT tokens stored in HttpOnly cookies (not accessible via JavaScript)
2. **Secure Flag**: Cookies marked secure in production
3. **SameSite Protection**: CSRF protection via SameSite cookie attribute
4. **Token Verification**: Server-side JWT verification on every request
5. **Automatic Cleanup**: Expired sessions automatically cleaned up
6. **No Token Exposure**: Client-side code never has access to raw tokens (except for expiry checking)

## Troubleshooting

### User Gets Logged Out Unexpectedly
- Check if token expiration times are appropriate for your use case
- Verify system clock is synchronized
- Check browser console for session expiry warnings

### Session Doesn't Expire When Expected
- Verify JWT_SECRET is properly configured
- Check server-side token verification is working
- Ensure client-side intervals are running

### Warning Doesn't Appear
- Verify SessionExpiryMonitor is included in layout
- Check browser console for errors
- Ensure user is authenticated

## Files Modified/Created

### New Files
- `src/lib/fetch-interceptor.ts` - Fetch wrapper for automatic logout
- `src/lib/jwt-client.ts` - Client-side JWT utilities
- `src/lib/session-validation.ts` - Session validation utilities
- `src/lib/hooks/useAuthenticatedFetch.ts` - Hook for authenticated API calls
- `src/lib/hooks/useRequireAuth.ts` - Hook for protecting routes
- `src/components/SessionExpiryMonitor.tsx` - Visual session expiry warning

### Modified Files
- `src/context/AuthContext.tsx` - Enhanced with automatic logout logic
- `src/app/layout.tsx` - Added SessionExpiryMonitor component

## Best Practices

1. **Always use `authenticatedFetch`** for API calls in authenticated contexts
2. **Use `useRequireAuth`** hook in protected pages/components
3. **Handle 401 responses** gracefully in all API calls
4. **Don't store tokens** in localStorage (use HttpOnly cookies only)
5. **Set appropriate expiration times** based on security requirements
6. **Monitor session expiry warnings** in development for debugging

## Future Enhancements

Possible improvements:
- Remember me functionality (longer token expiration)
- Session activity tracking
- Multiple device session management
- Force logout on password change
- Session hijacking detection
