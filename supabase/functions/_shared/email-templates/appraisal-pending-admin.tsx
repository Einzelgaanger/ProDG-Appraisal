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

interface AppraisalPendingAdminEmailProps {
  developerName: string
  projectName?: string
  pmName?: string
  completedAt: string
  adminUrl: string
}

export const AppraisalPendingAdminEmail = ({
  developerName,
  projectName,
  pmName,
  completedAt,
  adminUrl,
}: AppraisalPendingAdminEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New appraisal ready for admin review — {developerName}</Preview>
    <Body style={main}>
      <Container style={outer}>
        <Section style={headerBand}>
          <Img src={LOGO_URL} width="44" height="44" alt="ProDG" style={logoImg} />
          <Text style={brand}>ProDG</Text>
          <Text style={tagline}>Performance Appraisal · Admin</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>Appraisal submitted — review required</Heading>
          <Text style={lead}>
            {pmName ? <><strong>{pmName}</strong> has </> : 'A PM has '}
            completed an appraisal for <strong>{developerName}</strong>
            {projectName ? <> on project <strong>{projectName}</strong></> : null} ({completedAt}).
          </Text>
          <Text style={lead}>
            Review the responses in the admin dashboard. When you are ready, click <strong>Release report</strong> to send the developer their PDF by email.
          </Text>
          <Section style={btnWrap}>
            <Button style={button} href={adminUrl}>
              Review in admin dashboard
            </Button>
          </Section>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>Developers are not notified until you release the report.</Text>
      </Container>
    </Body>
  </Html>
)

export default AppraisalPendingAdminEmail

const main = { backgroundColor: '#f4f4f0', fontFamily: "ui-sans-serif, system-ui, sans-serif", margin: 0, padding: '32px 16px' }
const outer = { maxWidth: '520px', margin: '0 auto' }
const headerBand = { textAlign: 'center' as const, padding: '0 0 28px' }
const logoImg = { margin: '0 auto 8px', display: 'block' as const }
const brand = { fontSize: '22px', fontWeight: '800' as const, color: '#0a0a0a', margin: '0' }
const tagline = { fontSize: '11px', color: '#737373', margin: '4px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }
const card = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '36px 28px', border: '1px solid #e5e5e5' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#171717', margin: '0 0 16px' }
const lead = { fontSize: '15px', color: '#404040', lineHeight: '1.65', margin: '0 0 16px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0 0' }
const button = { backgroundColor: '#0a0a0a', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e5e5', margin: '28px 0 16px' }
const footer = { fontSize: '13px', color: '#737373', textAlign: 'center' as const }
