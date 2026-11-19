// src/lib/email/templates/SwcVideoOfTheWeekEmail.tsx
// "Soul Wisdom Video of the Week" (src/lib/email/weekly.ts; Tom, 2026-11-19), sent by Tom as a Resend broadcast to
// the people who signed up on soulwisdomcollective.com: the week's most-watched Soul Wisdom video and the newest
// podcast episode, with one line about Project Profound. In the Soul Wisdom site's colours (deep purple, amber).
// Resend fills {{{RESEND_UNSUBSCRIBE_URL}}}; an unsubscribe there switches off PP's lists too (/api/email/resend-webhook).

import {
  Body, Container, Head, Heading, Html,
  Img, Link, Preview, Section, Text, Hr,
} from "@react-email/components";
import * as React from "react";
import type { SwcWeekly } from "@/lib/email/weekly";
import { firstParagraph, PODCAST_LINKS, tagged } from "@/lib/email/weekly";

interface Props {
  content: SwcWeekly;
  /** The UTM campaign: the broadcast's name. */
  campaign: string;
}

export function SwcVideoOfTheWeekEmail({ content, campaign }: Props) {
  const { video, episode } = content;
  const site = tagged("https://soulwisdomcollective.com", campaign);
  return (
    <Html lang="en">
      <Head />
      <Preview>{content.previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={{ marginBottom: 24, textAlign: "center" as const }}>
            <Link href={site}>
              <Img src="https://soulwisdomcollective.com/logo-trimmed.png" alt="Soul Wisdom Collective" width={140} height={100} style={{ display: "inline-block" }} />
            </Link>
          </Section>

          <Text style={styles.kicker}>Soul Wisdom Video of the Week</Text>

          {video && (
            <Section style={styles.section}>
              <Heading as="h1" style={styles.heading}>{video.title}</Heading>
              <Link href={video.url}>
                <Img src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`} alt={video.title} width={552} style={styles.thumb} />
              </Link>
              {firstParagraph(video.description) && <Text style={styles.paragraph}>{firstParagraph(video.description)}</Text>}
              <Link href={video.url} style={styles.button}>Watch it on YouTube</Link>
            </Section>
          )}

          {episode && (
            <Section style={styles.section}>
              <Text style={styles.label}>Our newest episode</Text>
              <Heading as="h2" style={styles.subheading}>{episode.title}</Heading>
              {firstParagraph(episode.description) && <Text style={styles.paragraph}>{firstParagraph(episode.description)}</Text>}
              <Text style={styles.paragraph}>
                Listen on <Link href={PODCAST_LINKS.apple} style={styles.link}>Apple Podcasts</Link> or{" "}
                <Link href={PODCAST_LINKS.spotify} style={styles.link}>Spotify</Link>, or watch every episode at{" "}
                <Link href={tagged("https://soulwisdomcollective.com/videos", campaign)} style={styles.link}>soulwisdomcollective.com</Link>.
              </Text>
            </Section>
          )}

          <Hr style={{ borderColor: "#3b2d5c", margin: "8px 0 24px" }} />
          <Text style={styles.paragraph}>
            Curious about other people&apos;s near-death experiences? Search thousands of first-hand accounts at{" "}
            <Link href={tagged("https://projectprofound.org", campaign)} style={styles.link}>Project Profound</Link>, our sister site.
          </Text>
          <Text style={styles.footer}>
            You&apos;re receiving this because you signed up at soulwisdomcollective.com.{" "}
            <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" style={{ color: "#9a8fb5" }}>Unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: "#140c24", fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: 0 },
  container: { maxWidth: "600px", margin: "0 auto", padding: "40px 24px", backgroundColor: "#140c24" },
  kicker: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase" as const, color: "#fbbf24", margin: "0 0 8px", textAlign: "center" as const },
  section: { marginBottom: 32 },
  heading: { fontSize: 26, fontWeight: 700, color: "#ffffff", margin: "0 0 16px", lineHeight: 1.3 },
  subheading: { fontSize: 20, fontWeight: 700, color: "#ffffff", margin: "0 0 12px", lineHeight: 1.35 },
  label: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase" as const, color: "#c4b5fd", margin: "0 0 6px" },
  paragraph: { fontSize: 16, lineHeight: 1.65, color: "#d6d0e6", margin: "0 0 16px" },
  thumb: { display: "block", width: "100%", maxWidth: 552, height: "auto", borderRadius: 10, margin: "0 0 16px" },
  button: { display: "inline-block", backgroundColor: "#f59e0b", color: "#140c24", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 999, textDecoration: "none" },
  link: { color: "#fbbf24", textDecoration: "underline" },
  footer: { fontSize: 12, color: "#9a8fb5", lineHeight: 1.6 },
};

export default SwcVideoOfTheWeekEmail;
