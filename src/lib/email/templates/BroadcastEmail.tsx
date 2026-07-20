// src/lib/email/templates/BroadcastEmail.tsx
// Generic broadcast/campaign email using the Project Profound brand theme.
// Renders admin-composed content within the standard email chrome.

import {
  Body, Container, Head, Heading, Html,
  Img, Link, Preview, Section, Text, Hr,
} from "@react-email/components";
import * as React from "react";

interface BroadcastEmailProps {
  subject: string;
  bodyText: string;            // plain text body — paragraphs split on \n\n
  ctaText?: string;            // optional CTA button
  ctaHref?: string;
  unsubscribeUrl?: string;
}

export function BroadcastEmail({
  subject,
  bodyText,
  ctaText,
  ctaHref,
  unsubscribeUrl = "https://projectprofound.org/unsubscribe",
}: BroadcastEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* Logo / Brand — dark wordmark on the light background; 192×45 keeps the 1024×240 source ratio */}
          <Section style={{ marginBottom: 32 }}>
            <Img
              src="https://projectprofound.org/logo-new-dark.png"
              alt="Project Profound"
              width={192}
              height={45}
              style={{ display: "block" }}
            />
          </Section>

          {/* Subject as headline */}
          <Heading style={styles.heading}>
            {subject}
          </Heading>

          {/* Body — each double-newline becomes a paragraph */}
          {bodyText.split(/\n\n+/).filter(Boolean).map((para, i) => (
            <Text key={i} style={styles.paragraph}>
              {para.trim()}
            </Text>
          ))}

          {/* Optional CTA */}
          {ctaText && ctaHref && (
            <Section style={{ textAlign: "center", margin: "28px 0" }}>
              <Link
                href={ctaHref}
                style={styles.button}
              >
                {ctaText}
              </Link>
            </Section>
          )}

          <Hr style={{ borderColor: "#e2e8f0", marginBottom: 24 }} />

          {/* Footer */}
          <Text style={styles.footer}>
            You&apos;re receiving this because you subscribed at projectprofound.org.{" "}
            <Link href={unsubscribeUrl} style={{ color: "#94a3b8" }}>Unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#FDFAF6",
    fontFamily: "Georgia, 'Times New Roman', serif",
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "48px 24px",
    backgroundColor: "#FDFAF6",
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: "#1e293b",
    margin: "0 0 20px",
    lineHeight: 1.3,
    fontFamily: "Georgia, serif",
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 1.75,
    color: "#475569",
    margin: "0 0 16px",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  button: {
    display: "inline-block",
    backgroundColor: "#1e3a5f",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
    padding: "12px 24px",
    borderRadius: 8,
    textDecoration: "none",
  },
  footer: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "Arial, sans-serif",
    lineHeight: 1.6,
  },
};

export default BroadcastEmail;
