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
import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://appraisal.prodg.studio/favicon.png'
const SITE_URL = 'https://appraisal.prodg.studio'
const HUB_URL = `${SITE_URL}/hub?tab=growth`

interface ReviewMilestoneProps {
  name?: string
  reviewCount?: number
}

const ReviewMilestoneEmail = ({ name, reviewCount = 2 }: ReviewMilestoneProps) => {
  const greeting = name ? `Hi ${name.split(' ')[0]},` : 'Hi,'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You've received {reviewCount} new peer reviews on ProDG</Preview>
      <Body style={main}>
        <Container style={outer}>
          <Section style={headerBand}>
            <Img src={LOGO_URL} width="44" height="44" alt="ProDG" style={logoImg} />
            <Text style={brand}>ProDG</Text>
            <Text style={tagline}>360° Peer Review</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>New peer feedback for you</Heading>
            <Text style={lead}>
              {greeting} your teammates have just submitted reviews for you on ProDG 360°.
              You've now received <strong>{reviewCount} reviews</strong> in total.
            </Text>
            <Text style={lead}>
              Take a look at your updated growth insights — see what's resonating
              and where your team thinks you could level up.
            </Text>
            <Section style={btnWrap}>
              <Button style={button} href={HUB_URL}>
                View my growth
              </Button>
            </Section>
            <Text style={muted}>
              All feedback is anonymous. We'll send you another nudge after every
              two new reviews.
            </Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>You're receiving this because you're part of the ProDG 360° peer review program.</Text>
          <Text style={copyright}>© {new Date().getFullYear()} ProDG Studio</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ReviewMilestoneEmail,
  subject: (data: Record<string, any>) => {
    const n = data?.reviewCount ?? 2
    return `You've got ${n} new peer reviews on ProDG`
  },
  displayName: 'Review milestone notification',
  previewData: { name: 'Amina Okafor', reviewCount: 4 },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  margin: 0,
  padding: '32px 16px',
}
const outer = { maxWidth: '520px', margin: '0 auto' }
const headerBand = { textAlign: 'center' as const, padding: '0 0 28px' }
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
  border: '2px solid #0a0a0a',
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
const btnWrap = { textAlign: 'center' as const, margin: '20px 0 24px' }
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
const muted = {
  fontSize: '12px',
  color: '#a3a3a3',
  lineHeight: '1.5',
  margin: '0',
}
const hr = { borderColor: '#e5e5e5', margin: '28px 0 16px' }
const footer = {
  fontSize: '13px',
  color: '#737373',
  lineHeight: '1.55',
  margin: '0 0 12px',
  textAlign: 'center' as const,
}
const copyright = {
  fontSize: '11px',
  color: '#d4d4d4',
  textAlign: 'center' as const,
  margin: '0',
}

export default ReviewMilestoneEmail
