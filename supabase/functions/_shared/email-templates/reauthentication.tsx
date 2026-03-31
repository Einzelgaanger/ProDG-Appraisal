/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for ProDG 360° Review</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={headerSection}>
          <Text style={logoText}>ProDG</Text>
        </Section>
        <Section style={contentSection}>
          <Heading style={h1}>Verification Code</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Section style={codeContainer}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
          <Text style={subtext}>This code will expire shortly. Do not share it with anyone.</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>If you didn't request this code, you can safely ignore this email.</Text>
        <Text style={copyright}>© {new Date().getFullYear()} ProDG. All rights reserved.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f5f5f5', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const outerContainer = { maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }
const headerSection = { textAlign: 'center' as const, padding: '0 0 24px' }
const logoText = { fontSize: '28px', fontWeight: '800' as const, color: '#171717', letterSpacing: '-0.02em', margin: '0' }
const contentSection = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 32px', border: '1px solid #e5e5e5' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#171717', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#525252', lineHeight: '1.6', margin: '0 0 24px' }
const codeContainer = { textAlign: 'center' as const, backgroundColor: '#f5f5f5', borderRadius: '10px', padding: '20px', margin: '0 0 24px', border: '1px solid #e5e5e5' }
const codeStyle = { fontFamily: "'Plus Jakarta Sans', Courier, monospace", fontSize: '32px', fontWeight: '800' as const, color: '#171717', letterSpacing: '6px', margin: '0' }
const subtext = { fontSize: '12px', color: '#a3a3a3', lineHeight: '1.5', margin: '0' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#a3a3a3', textAlign: 'center' as const, margin: '0 0 8px' }
const copyright = { fontSize: '11px', color: '#d4d4d4', textAlign: 'center' as const, margin: '0' }
