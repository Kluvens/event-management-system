import { Amplify } from 'aws-amplify'

// Guard against unconfigured environments (CI, local preview without .env.local).
// Public pages render correctly without Cognito; auth flows are simply unavailable.
if (import.meta.env.VITE_COGNITO_USER_POOL_ID) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId:       import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
        loginWith: {
          oauth: {
            domain:          import.meta.env.VITE_COGNITO_DOMAIN,
            scopes:          ['openid', 'email', 'profile'],
            // Use the current origin so the redirect works on any port
            // (dev :5173, preview :4173, production domain).
            redirectSignIn:  [`${window.location.origin}/auth/callback`],
            redirectSignOut: [`${window.location.origin}/`],
            responseType:    'code',
          },
        },
      },
    },
  })
}
