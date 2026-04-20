/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://sfwltphcerfsfyrtiwwk.supabase.co/storage/v1/object/public/email-assets/prodg-logo.png'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  recipient?: string
}

/**
 * Used for both first-time activation AND password reset flows.
 * The single Supabase auth recovery link drives both.
 */
export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  recipient,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Set your ProDG password — link expires soon</Preview>
    <Body style={main}>
      <Container style={outer}>
        <Section style={headerBand}>
          <Img src={LOGO_URL} width="44" height="44" alt="ProDG" style={logoImg} />
          <Text style={brand}>ProDG</Text>
          <Text style={tagline}>360° Peer Review</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>Set your password</Heading>
          <Text style={lead}>
            {recipient ? <>Hi <strong>{recipient}</strong>, </> : null}
            tap the button below to choose a password for your <strong>{siteName}</strong> account.
            New here? This is also how you activate your account for the first time.
          </Text>
          <Section style={btnWrap}>
            <Button style={button} href={confirmationUrl}>
              Set my password
            </Button>
          </Section>
          <Text style={note}>
            For your security, this link expires in <strong>30 minutes</strong> and can only be used once.
          </Text>
          <Text style={muted}>
            If the button does not work, copy this URL into your browser:
          </Text>
          <Text style={linkBox}>{confirmationUrl}</Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Didn't request this? You can safely ignore this email — your account stays the same.
        </Text>
        <Text style={finePrint}>
          Transactional message from ProDG · do not reply to this address
        </Text>
        <Text style={copyright}>© {new Date().getFullYear()} ProDG Studio</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  margin: 0,
  padding: '32px 16px',
}
const outer = { maxWidth: '520px', margin: '0 auto' }
const headerBand = {
  textAlign: 'center' as const,
  padding: '0 0 28px',
}
const logoImg = { margin: '0 auto 8px', display: 'block' as const }
const brand = {
  fontSize: '22px',
  fontWeight: '800' as const,
  color: '#0a0a0a',
  margin: '0',
  letterSpacing: '-0.03em',
}
const tagline = {
  fontSize: '11px',
  color: '#737373',
  margin: '4px 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
}
const card = {
  backgroundColor: '#fafafa',
  borderRadius: '0',
  padding: '36px 28px',
  border: '2px solid #171717',
}
const h1 = {
  fontSize: '22px',
  fontWeight: '700' as const,
  color: '#171717',
  margin: '0 0 16px',
  lineHeight: '1.3',
}
const lead = {
  fontSize: '15px',
  color: '#404040',
  lineHeight: '1.65',
  margin: '0 0 20px',
}
const btnWrap = { textAlign: 'center' as const, margin: '0 0 16px' }
const button = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '0',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const note = {
  fontSize: '13px',
  color: '#525252',
  lineHeight: '1.5',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}
const muted = {
  fontSize: '12px',
  color: '#a3a3a3',
  lineHeight: '1.5',
  margin: '0 0 6px',
}
const linkBox = {
  fontSize: '11px',
  color: '#525252',
  wordBreak: 'break-all' as const,
  margin: '0',
  padding: '12px',
  backgroundColor: '#ffffff',
  borderRadius: '0',
  border: '2px solid #171717',
}
const hr = { borderColor: '#e5e5e5', margin: '28px 0 16px' }
const footer = {
  fontSize: '13px',
  color: '#737373',
  lineHeight: '1.55',
  margin: '0 0 12px',
  textAlign: 'center' as const,
}
const finePrint = {
  fontSize: '11px',
  color: '#a3a3a3',
  textAlign: 'center' as const,
  margin: '0 0 8px',
}
const copyright = {
  fontSize: '11px',
  color: '#d4d4d4',
  textAlign: 'center' as const,
  margin: '0',
}
