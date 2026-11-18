// src/lib/email/templates/NdeOfTheWeekEmail.tsx
// The weekly "NDE of the Week" newsletter (src/lib/email/weekly.ts), sent by Tom as a Resend broadcast. Resend fills
// {{{RESEND_UNSUBSCRIBE_URL}}} for each person; an unsubscribe there switches off PP's lists too
// (/api/email/resend-webhook).

import {
  Body, Container, Head, Heading, Html,
  Img, Link, Preview, Section, Text, Hr,
} from "@react-email/components";
import * as React from "react";
import type { WeeklyContent } from "@/lib/email/weekly";
import { firstParagraph, PODCAST_LINKS, sentences, tagged } from "@/lib/email/weekly";

interface Props {
  content: WeeklyContent;
  /** The UTM campaign: the broadcast's name. */
  campaign: string;
}

export function NdeOfTheWeekEmail({ content, campaign }: Props) {
  const { short, story, episode } = content;
  return (
    <Html lang="en">
      <Head />
      <Preview>{content.previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={{ marginBottom: 28 }}>
            <Img src="https://projectprofound.org/logo-new-dark.png" alt="Project Profound" width={192} height={45} style={{ display: "block" }} />
          </Section>

          <Text style={styles.kicker}>NDE of the Week</Text>

          {short && (
            <Section style={styles.section}>
              <Heading as="h1" style={styles.heading}>{short.title}</Heading>
              <Link href={short.url}>
                <Img src={`https://i.ytimg.com/vi/${short.videoId}/hqdefault.jpg`} alt={short.title} width={552} style={styles.thumb} />
              </Link>
              {firstParagraph(short.description) && <Text style={styles.paragraph}>{firstParagraph(short.description)}</Text>}
              <Link href={short.url} style={styles.button}>Watch the Short</Link>
            </Section>
          )}

          {story && (
            <Section style={styles.section}>
              <Text style={styles.label}>From the archive: today&apos;s story</Text>
              <Heading as="h2" style={styles.subheading}>{story.title}</Heading>
              {story.summary && <Text style={styles.paragraph}>{sentences(story.summary, 3)}</Text>}
              <Link href={tagged(`https://projectprofound.org/video/${story.videoId}`, campaign)} style={styles.link}>
                Read and watch it on Project Profound{story.channelName ? ` (from ${story.channelName})` : ""}
              </Link>
            </Section>
          )}

          {episode && (
            <Section style={styles.section}>
              <Text style={styles.label}>New on the Soul Wisdom Collective podcast</Text>
              <Heading as="h2" style={styles.subheading}>{episode.title}</Heading>
              {firstParagraph(episode.description) && <Text style={styles.paragraph}>{firstParagraph(episode.description)}</Text>}
              <Text style={styles.paragraph}>
                Listen on <Link href={PODCAST_LINKS.apple} style={styles.link}>Apple Podcasts</Link> or{" "}
                <Link href={PODCAST_LINKS.spotify} style={styles.link}>Spotify</Link>, or watch at{" "}
                <Link href={tagged("https://soulwisdomcollective.com", campaign)} style={styles.link}>soulwisdomcollective.com</Link>.
              </Text>
            </Section>
          )}

          <Hr style={{ borderColor: "#e2e8f0", margin: "8px 0 24px" }} />
          <Text style={styles.paragraph}>
            Search thousands of near-death experiences at{" "}
            <Link href={tagged("https://projectprofound.org", campaign)} style={styles.link}>projectprofound.org</Link>.
          </Text>
          <Text style={styles.footer}>
            You&apos;re receiving this because you subscribed at projectprofound.org or soulwisdomcollective.com.{" "}
            <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" style={{ color: "#94a3b8" }}>Unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: "#FDFAF6", fontFamily: "Georgia, 'Times New Roman', serif", margin: 0, padding: 0 },
  container: { maxWidth: "600px", margin: "0 auto", padding: "40px 24px", backgroundColor: "#FDFAF6" },
  kicker: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase" as const, color: "#b45309", fontFamily: "Arial, sans-serif", margin: "0 0 8px" },
  section: { marginBottom: 32 },
  heading: { fontSize: 26, fontWeight: 700, color: "#1e293b", margin: "0 0 16px", lineHeight: 1.3, fontFamily: "Georgia, serif" },
  subheading: { fontSize: 20, fontWeight: 700, color: "#1e293b", margin: "0 0 12px", lineHeight: 1.35, fontFamily: "Georgia, serif" },
  label: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase" as const, color: "#64748b", fontFamily: "Arial, sans-serif", margin: "0 0 6px" },
  paragraph: { fontSize: 16, lineHeight: 1.7, color: "#475569", margin: "0 0 16px", fontFamily: "Georgia, 'Times New Roman', serif" },
  thumb: { display: "block", width: "100%", maxWidth: 552, height: "auto", borderRadius: 8, margin: "0 0 16px" },
  button: { display: "inline-block", backgroundColor: "#1e3a5f", color: "#ffffff", fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 8, textDecoration: "none" },
  link: { color: "#1e3a5f", textDecoration: "underline" },
  footer: { fontSize: 12, color: "#94a3b8", fontFamily: "Arial, sans-serif", lineHeight: 1.6 },
};

export default NdeOfTheWeekEmail;
