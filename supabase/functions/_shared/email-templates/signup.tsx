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

const LOGO_URL = 'https://jniqqburulrdwcbjetug.supabase.co/storage/v1/object/public/email-assets/vgg-logo.webp'

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
    <Preview>Confirm your email for VGG 360° Appraisal</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={headerSection}>
          <Img src={LOGO_URL} alt="Venture Garden Group" width="160" height="auto" style={logo} />
        </Section>
        <Section style={contentSection}>
          <Heading style={h1}>Welcome to VGG 360° Appraisal</Heading>
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
        <Text style={copyright}>© {new Date().getFullYear()} Venture Garden Group. All rights reserved.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#f4f6f8', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const outerContainer = { maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }
const headerSection = { textAlign: 'center' as const, padding: '0 0 24px' }
const logo = { margin: '0 auto' }
const contentSection = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 32px', border: '1px solid #e8ebe9' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a2e22', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4a5d52', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#2b8a3e', textDecoration: 'underline' }
const buttonContainer = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = { backgroundColor: '#2b8a3e', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 32px', textDecoration: 'none' }
const subtext = { fontSize: '12px', color: '#8a9690', lineHeight: '1.5', margin: '0 0 4px' }
const urlText = { fontSize: '11px', color: '#2b8a3e', wordBreak: 'break-all' as const, margin: '0' }
const hr = { borderColor: '#e8ebe9', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#8a9690', textAlign: 'center' as const, margin: '0 0 8px' }
const copyright = { fontSize: '11px', color: '#b0b8b3', textAlign: 'center' as const, margin: '0' }
