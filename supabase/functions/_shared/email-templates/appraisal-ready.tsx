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

const LOGO_URL = 'https://appraisal.prodg.studio/favicon.png'

interface AppraisalReadyEmailProps {
  siteName: string
  recipientName?: string
  resultsUrl: string
}

export const AppraisalReadyEmail = ({
  siteName,
  recipientName,
  resultsUrl,
}: AppraisalReadyEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your performance appraisal results are ready to view</Preview>
    <Body style={main}>
      <Container style={outer}>
        <Section style={headerBand}>
          <Img src={LOGO_URL} width="44" height="44" alt="ProDG" style={logoImg} />
          <Text style={brand}>ProDG</Text>
          <Text style={tagline}>Performance Appraisal</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>Your appraisal is ready</Heading>
          <Text style={lead}>
            {recipientName ? `Hi ${recipientName}, ` : 'Hi, '}
            your manager has completed your performance appraisal on <strong>{siteName}</strong>.
            You can now log in to view your results — your scores across each area and the written feedback.
          </Text>
          <Section style={btnWrap}>
            <Button style={button} href={resultsUrl}>
              View my results
            </Button>
          </Section>
          <Text style={muted}>
            If the button does not work, copy this URL into your browser:
          </Text>
          <Text style={linkBox}>{resultsUrl}</Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          This is a private summary intended only for you. Use it as a guide for your growth.
        </Text>
        <Text style={finePrint}>
          Transactional message from ProDG · do not reply to this address
        </Text>
        <Text style={copyright}>© {new Date().getFullYear()} ProDG Studio</Text>
      </Container>
    </Body>
  </Html>
)

export default AppraisalReadyEmail

const main = {
  backgroundColor: '#f4f4f0',
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
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '36px 28px',
  border: '1px solid #e5e5e5',
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
  margin: '0 0 28px',
}
const btnWrap = { textAlign: 'center' as const, margin: '0 0 28px' }
const button = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
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
  backgroundColor: '#fafafa',
  borderRadius: '6px',
  border: '1px solid #eee',
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
