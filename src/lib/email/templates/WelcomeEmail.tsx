// src/lib/email/templates/WelcomeEmail.tsx
// Welcome email for new Newsletter subscribers.

import {
  Body, Container, Head, Heading, Html,
  Img, Link, Preview, Section, Text, Hr,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  introText?: string;
  ctaText?: string;
  ctaHref?: string;
  unsubscribeUrl?: string;
}

export function WelcomeEmail({
  introText = "Welcome to Project Profound — a living archive of 5,000+ first-person near-death experiences. We'll send you occasional updates on research, new features, and insights from the archive.",
  ctaText = "Explore the Archive →",
  ctaHref = "https://projectprofound.org",
  unsubscribeUrl = "https://projectprofound.org/unsubscribe",
}: WelcomeEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to Project Profound</Preview>
      <Body style={{ backgroundColor: "#FDFAF6", fontFamily: "Georgia, serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>

          {/* Logo / Brand — matches VideoEmail header */}
          <Section style={{ marginBottom: 32 }}>
            <Img
              src="https://projectprofound.org/logo-transparent.png"
              alt="Project Profound"
              width={36}
              height={36}
              style={{ display: "inline-block", verticalAlign: "middle" }}
            />
            <Text style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 10, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 0 10px" }}>
              Project Profound
            </Text>
          </Section>

          {/* Headline */}
          <Heading style={{ fontSize: 32, fontWeight: 700, color: "#1e293b", margin: "0 0 16px", lineHeight: 1.25 }}>
            Welcome.
          </Heading>

          {/* Intro — split on blank lines so each paragraph is its own block */}
          {introText.split(/\n\n+/).filter(Boolean).map((para, i) => (
            <Text key={i} style={{ fontSize: 16, lineHeight: 1.75, color: "#475569", margin: "0 0 16px" }}>
              {para.trim()}
            </Text>
          ))}

          {/* CTA */}
          <Link
            href={ctaHref}
            style={{
              display: "inline-block", backgroundColor: "#1e3a5f", color: "#ffffff",
              fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 8,
              textDecoration: "none", marginBottom: 36,
            }}
          >
            {ctaText}
          </Link>

          <Hr style={{ borderColor: "#e2e8f0", marginBottom: 24 }} />

          {/* Footer */}
          <Text style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            You're receiving this because you signed up at projectprofound.org.{" "}
            <Link href={unsubscribeUrl} style={{ color: "#94a3b8" }}>Unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
