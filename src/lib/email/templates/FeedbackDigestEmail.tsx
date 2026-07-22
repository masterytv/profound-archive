// src/lib/email/templates/FeedbackDigestEmail.tsx
// Weekly admin digest of user feedback from the ces_feedback table.

import {
  Body, Container, Head, Heading, Html,
  Img, Link, Preview, Section, Text, Hr, Row, Column,
} from "@react-email/components";
import * as React from "react";

export interface FeedbackEntry {
  created_at: string;
  score: number;
  reason: string | null;
  path: string | null;
  source: string | null;
  feature: string | null;
  context_id: string | null;
}

interface FeedbackDigestEmailProps {
  entries: FeedbackEntry[];
  periodLabel: string;       // e.g., "Mar 18 - Mar 25, 2026"
  totalCount: number;        // total entries this period (including those without comments)
  avgScore: number | null;   // average CES score (excluding score=0 open-ended)
}

// Source label mapping
function sourceLabel(source: string | null): string {
  switch (source) {
    case "welcome_button": return "Welcome Button";
    case "micro_feedback": return "Micro Feedback";
    case "ces_widget":     return "CES Widget";
    default:               return source ?? "Unknown";
  }
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FeedbackDigestEmail({
  entries,
  periodLabel,
  totalCount,
  avgScore,
}: FeedbackDigestEmailProps) {
  const withComments = entries.filter((e) => e.reason);
  const withoutComments = totalCount - withComments.length;

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`${totalCount} feedback entries this week — Project Profound`}
      </Preview>
      <Body style={{ backgroundColor: "#FDFAF6", fontFamily: "Georgia, serif", margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px" }}>

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

          {/* Headline */}
          <Heading style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: "0 0 8px", lineHeight: 1.25 }}>
            Weekly Feedback Digest
          </Heading>

          <Text style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>
            {periodLabel}
          </Text>

          {/* Stats summary */}
          <Section style={{
            backgroundColor: "#f8fafc",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 32,
            border: "1px solid #e2e8f0",
          }}>
            <Row>
              <Column style={{ textAlign: "center", width: "33%" }}>
                <Text style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: "0 0 4px" }}>
                  {totalCount}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Total Entries
                </Text>
              </Column>
              <Column style={{ textAlign: "center", width: "33%" }}>
                <Text style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: "0 0 4px" }}>
                  {withComments.length}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  With Comments
                </Text>
              </Column>
              <Column style={{ textAlign: "center", width: "33%" }}>
                <Text style={{ fontSize: 28, fontWeight: 700, color: avgScore !== null && avgScore >= 5 ? "#16a34a" : avgScore !== null && avgScore <= 3 ? "#dc2626" : "#1e293b", margin: "0 0 4px" }}>
                  {avgScore !== null ? avgScore.toFixed(1) : "N/A"}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Avg CES Score
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Comments section */}
          {withComments.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", margin: "0 0 16px" }}>
                Comments
              </Heading>

              {withComments.map((entry, i) => (
                <Section
                  key={i}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 10,
                    padding: "16px 20px",
                    marginBottom: 12,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {/* Comment text */}
                  <Text style={{ fontSize: 15, lineHeight: 1.6, color: "#334155", margin: "0 0 10px", fontStyle: "italic" }}>
                    &ldquo;{entry.reason}&rdquo;
                  </Text>

                  {/* Metadata row */}
                  <Text style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
                    {formatDate(entry.created_at)}
                    {entry.score > 0 && ` · CES: ${entry.score}/7`}
                    {` · Source: ${sourceLabel(entry.source)}`}
                    {entry.path && (
                      <>
                        {" · Page: "}
                        <Link
                          href={`https://projectprofound.org${entry.path}`}
                          style={{ color: "#2563eb", textDecoration: "underline" }}
                        >
                          {entry.path}
                        </Link>
                      </>
                    )}
                    {entry.feature && ` · Feature: ${entry.feature}`}
                  </Text>
                </Section>
              ))}
            </>
          )}

          {/* No-comment summary */}
          {withoutComments > 0 && (
            <Text style={{ fontSize: 13, color: "#94a3b8", margin: "16px 0 0" }}>
              + {withoutComments} additional score-only {withoutComments === 1 ? "entry" : "entries"} without comments.
            </Text>
          )}

          {/* No feedback at all */}
          {totalCount === 0 && (
            <Text style={{ fontSize: 15, color: "#64748b", textAlign: "center", padding: "32px 0" }}>
              No feedback was submitted this week. The welcome modal and feedback button are live and collecting.
            </Text>
          )}

          <Hr style={{ borderColor: "#e2e8f0", marginTop: 32, marginBottom: 24 }} />

          {/* CTA to view in admin */}
          <Link
            href="https://projectprofound.org/admin"
            style={{
              display: "inline-block", backgroundColor: "#1e3a5f", color: "#ffffff",
              fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 8,
              textDecoration: "none", marginBottom: 24,
            }}
          >
            View Full Admin Dashboard →
          </Link>

          {/* Footer */}
          <Text style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            This is an automated weekly digest sent to all Project Profound admins.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
