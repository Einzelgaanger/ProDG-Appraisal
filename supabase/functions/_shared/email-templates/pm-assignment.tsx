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

interface PmAssignmentEmailProps {
  pmName?: string
  projectName: string
  developerNames: string[]
  hubUrl: string
}

export const PmAssignmentEmail = ({
  pmName,
  projectName,
  developerNames,
  hubUrl,
}: PmAssignmentEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New appraisal assignment — {projectName}</Preview>
    <Body style={main}>
      <Container style={outer}>
        <Section style={headerBand}>
          <Img src={LOGO_URL} width="44" height="44" alt="ProDG" style={logoImg} />
          <Text style={brand}>ProDG</Text>
          <Text style={tagline}>Performance Appraisal · PM</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>You&apos;ve been assigned a project group</Heading>
          <Text style={lead}>
            {pmName ? `Hi ${pmName}, ` : 'Hi, '}
            an admin has locked you in to appraise developers on project <strong>{projectName}</strong>.
          </Text>
          <Text style={lead}>
            <strong>{developerNames.length}</strong> developer{developerNames.length === 1 ? '' : 's'} to review:
          </Text>
          {developerNames.map((name) => (
            <Text key={name} style={listItem}>· {name}</Text>
          ))}
          <Text style={lead}>
            Sign in to the appraisal hub to complete reviews for this group. Admins are notified once every developer in the group is reviewed.
          </Text>
          <Section style={btnWrap}>
            <Button style={button} href={hubUrl}>
              Open appraisal hub
            </Button>
          </Section>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>You may have other project groups assigned separately.</Text>
      </Container>
    </Body>
  </Html>
)

export default PmAssignmentEmail

const main = { backgroundColor: '#f4f4f0', fontFamily: "ui-sans-serif, system-ui, sans-serif", margin: 0, padding: '32px 16px' }
const outer = { maxWidth: '520px', margin: '0 auto' }
const headerBand = { textAlign: 'center' as const, padding: '0 0 28px' }
const logoImg = { margin: '0 auto 8px', display: 'block' as const }
const brand = { fontSize: '22px', fontWeight: '800' as const, color: '#0a0a0a', margin: '0' }
const tagline = { fontSize: '11px', color: '#737373', margin: '4px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }
const card = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '36px 28px', border: '1px solid #e5e5e5' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#171717', margin: '0 0 16px' }
const lead = { fontSize: '15px', color: '#404040', lineHeight: '1.65', margin: '0 0 12px' }
const listItem = { fontSize: '15px', color: '#404040', lineHeight: '1.5', margin: '0 0 4px 8px' }
const btnWrap = { textAlign: 'center' as const, margin: '24px 0 0' }
const button = { backgroundColor: '#0a0a0a', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e5e5', margin: '28px 0 16px' }
const footer = { fontSize: '13px', color: '#737373', textAlign: 'center' as const }
