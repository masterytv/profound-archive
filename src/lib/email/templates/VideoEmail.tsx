// src/lib/email/templates/VideoEmail.tsx
// React Email template for the "Your NDE Story" email.
// Renders cross-client–safe HTML. Uses Resend's recommended patterns.

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
} from "@react-email/components";

export interface VideoEmailProps {
  archetypeLabel: string;   // "The Griever", "The Skeptic / Researcher", etc.
  archetypeIcon:  string;   // emoji icon
  videoId:        string;
  videoTitle:     string;
  channelName:    string;
  thumbnailUrl:   string | null;
  viewCount:      number | null;
  frequency:      string;   // "weekly", "daily", etc.
  unsubscribeUrl: string;
}

const BASE_URL = "https://projectprofound.org";

export function VideoEmail({
  archetypeLabel,
  archetypeIcon,
  videoId,
  videoTitle,
  channelName,
  thumbnailUrl,
  viewCount,
  frequency,
  unsubscribeUrl,
}: VideoEmailProps) {
  const videoUrl = `${BASE_URL}/video/${videoId}`;
  const formattedViews = viewCount
    ? new Intl.NumberFormat("en").format(viewCount)
    : null;

  const freqLabel: Record<string, string> = {
    daily:   "every day",
    "3day":  "every 3 days",
    weekly:  "every week",
    monthly: "every month",
  };

  return (
    <Html lang="en">
      <Head />
      <Preview>A near-death story for {archetypeLabel} — {videoTitle}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* Logo / Brand */}
          <Section style={styles.headerSection}>
            <Img
              src={`${BASE_URL}/logo-transparent.png`}
              alt="Project Profound"
              width={36}
              height={36}
              style={{ display: "inline-block", verticalAlign: "middle" }}
            />
            <Text style={styles.brandName}>Project Profound</Text>
          </Section>

          {/* Archetype label */}
          <Section>
            <Text style={styles.archetypeLabel}>
              {archetypeIcon} A story for {archetypeLabel}
            </Text>
          </Section>

          {/* Video Title */}
          <Heading style={styles.heading}>{videoTitle}</Heading>
          <Text style={styles.channel}>by {channelName}</Text>
          {formattedViews && (
            <Text style={styles.meta}>{formattedViews} views</Text>
          )}

          {/* Thumbnail */}
          {thumbnailUrl && (
            <Section style={{ margin: "24px 0" }}>
              <Link href={videoUrl}>
                <Img
                  src={thumbnailUrl}
                  alt={videoTitle}
                  width={560}
                  style={styles.thumbnail}
                />
              </Link>
            </Section>
          )}

          {/* CTA */}
          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Button href={videoUrl} style={styles.button}>
              Watch this story →
            </Button>
          </Section>

          <Hr style={styles.divider} />

          {/* Footer */}
          <Text style={styles.footer}>
            You&apos;re receiving this because you signed up as{" "}
            <strong>{archetypeLabel}</strong> on Project Profound and chose{" "}
            <strong>{freqLabel[frequency] ?? frequency}</strong> delivery.
          </Text>
          <Text style={styles.footer}>
            <Link href={unsubscribeUrl} style={styles.unsub}>
              Unsubscribe
            </Link>{" "}
            · <Link href={BASE_URL} style={styles.unsub}>projectprofound.org</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles (inline — required for email client compatibility) ──────────────
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
    padding: "32px 24px",
    backgroundColor: "#FDFAF6",
  },
  headerSection: {
    marginBottom: "8px",
  },
  brandName: {
    display: "inline",
    verticalAlign: "middle",
    fontSize: "18px",
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: "8px",
    fontFamily: "Georgia, serif",
  },
  archetypeLabel: {
    fontSize: "13px",
    color: "#6B5B8B",
    fontFamily: "Arial, sans-serif",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: "4px",
  },
  heading: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: "1.3",
    margin: "8px 0 4px",
    fontFamily: "Georgia, serif",
  },
  channel: {
    fontSize: "14px",
    color: "#64748B",
    fontFamily: "Arial, sans-serif",
    margin: "0 0 2px",
  },
  meta: {
    fontSize: "12px",
    color: "#94A3B8",
    fontFamily: "Arial, sans-serif",
    margin: "0 0 16px",
  },
  thumbnail: {
    borderRadius: "12px",
    width: "100%",
    maxWidth: "560px",
    display: "block",
  },
  button: {
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    borderRadius: "10px",
    padding: "14px 28px",
    fontSize: "15px",
    fontWeight: "600",
    fontFamily: "Arial, sans-serif",
    textDecoration: "none",
    display: "inline-block",
  },
  divider: {
    borderColor: "#E2E8F0",
    margin: "24px 0",
  },
  footer: {
    fontSize: "12px",
    color: "#94A3B8",
    fontFamily: "Arial, sans-serif",
    lineHeight: "1.6",
    margin: "4px 0",
  },
  unsub: {
    color: "#94A3B8",
    textDecoration: "underline",
  },
};

export default VideoEmail;
