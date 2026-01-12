import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { importPKCS8, SignJWT } from 'https://deno.land/x/jose@v4.14.4/index.ts'

interface NotificationPayload {
  record: {
    user_id: string
    title: string
    body: string
    data?: any
  }
}

const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}')

const getAccessToken = async () => {
  const algorithm = 'RS256'
  const privateKey = await importPKCS8(serviceAccount.private_key, algorithm)

  const jwt = await new SignJWT({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: algorithm })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(privateKey)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  return data.access_token
}

serve(async (req) => {
  try {
    const { record } = await req.json() as NotificationPayload
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get all tokens for the user
    const { data: rawTokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', record.user_id)

    if (!rawTokens || rawTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No devices found' }), { 
        headers: { 'Content-Type': 'application/json' } 
      })
    }

    // 2. THE FIX: Remove duplicates using a Set
    // This converts the list to a Set (which only allows unique values) and back to a list
    const uniqueTokens = [...new Set(rawTokens.map(t => t.token))]

    const accessToken = await getAccessToken()

    const promises = uniqueTokens.map(async (token) => {
      const cleanData = record.data ? {
        link: String(record.data.link || '/'),
        event_id: String(record.data.event_id || '')
      } : { link: '/', event_id: '' };

      const message = {
        message: {
          token: token, // Using the unique token
          notification: {
            title: record.title,
            body: record.body,
          },
          data: cleanData, 
        },
      }

      return fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })
    })

    await Promise.all(promises)

    return new Response(JSON.stringify({ message: 'Notifications sent' }), { 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})