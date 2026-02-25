import { Amplify } from 'aws-amplify'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId:       import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: {
        oauth: {
          domain:          import.meta.env.VITE_COGNITO_DOMAIN,
          scopes:          ['openid', 'email', 'profile'],
          redirectSignIn:  ['http://localhost:5173/auth/callback'],
          redirectSignOut: ['http://localhost:5173/'],
          responseType:    'code',
        },
      },
    },
  },
})
