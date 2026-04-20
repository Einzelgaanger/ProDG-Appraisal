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
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://sfwltphcerfsfyrtiwwk.supabase.co/storage/v1/object/public/email-assets/prodg-logo.png'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for ProDG 360° Review</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={headerSection}>
          <Img src={LOGO_URL} width="44" height="44" alt="ProDG" style={logoImg} />
          <Text style={logoText}>ProDG</Text>
        </Section>
        <Section style={contentSection}>
          <Heading style={h1}>Welcome to ProDG 360° Review</Heading>
          <Text style={text}>
            Thank you for signing up! Please confirm your email address (
            <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
            ) to get started.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={subtext}>
            If the button doesn't work, copy and paste this link into your browser:
          </Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
        <Text style={copyright}>© {new Date().getFullYear()} ProDG. All rights reserved.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#f5f5f5', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const outerContainer = { maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }
const headerSection = { textAlign: 'center' as const, padding: '0 0 24px' }
const logoImg = { margin: '0 auto 8px', display: 'block' as const }
const logoText = { fontSize: '28px', fontWeight: '800' as const, color: '#171717', letterSpacing: '-0.02em', margin: '0' }
const contentSection = { backgroundColor: '#ffffff', borderRadius: '0', padding: '40px 32px', border: '2px solid #171717' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#171717', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#525252', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#171717', textDecoration: 'underline' }
const buttonContainer = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = { backgroundColor: '#171717', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '0', padding: '14px 32px', textDecoration: 'none' }
const subtext = { fontSize: '12px', color: '#a3a3a3', lineHeight: '1.5', margin: '0 0 4px' }
const urlText = { fontSize: '11px', color: '#171717', wordBreak: 'break-all' as const, margin: '0' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#a3a3a3', textAlign: 'center' as const, margin: '0 0 8px' }
const copyright = { fontSize: '11px', color: '#d4d4d4', textAlign: 'center' as const, margin: '0' }
