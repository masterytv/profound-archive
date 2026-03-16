import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

const CATEGORY_LABELS: Record<string, string> = {
    "guide":         "Guide",
    "big-question":  "Big Question",
    "story":         "Story",
    "experiencer":   "Experiencer",
    "researcher":    "Researcher",
};

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const supabase = await createClient();

    // Try blog_posts first, then experiencer_profiles
    let title = "Project Profound";
    let subtitle = "Near-Death Experience Research";
    let category = "";

    const { data: post } = await supabase
        .from("blog_posts")
        .select("title, subtitle, category, author_name, lead_paragraph")
        .eq("slug", slug)
        .single();

    if (post) {
        title = post.title;
        subtitle = post.lead_paragraph ?? post.subtitle ?? "Project Profound";
        category = CATEGORY_LABELS[post.category] ?? post.category;
    } else {
        const { data: experiencer } = await supabase
            .from("experiencer_profiles")
            .select("full_name, summary")
            .eq("slug", slug)
            .single();

        if (experiencer) {
            title = experiencer.full_name;
            subtitle = experiencer.summary ?? "NDE Experiencer Profile";
            category = "Experiencer";
        }
    }

    return new ImageResponse(
        (
            <div
                style={{
                    width: "1200px",
                    height: "630px",
                    display: "flex",
                    flexDirection: "column",
                    background: "linear-gradient(135deg, #0f172a 0%, #1e3a6e 50%, #0f172a 100%)",
                    position: "relative",
                    overflow: "hidden",
                    fontFamily: "Georgia, serif",
                }}
            >
                {/* Subtle grid pattern */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />

                {/* Blue accent glow */}
                <div
                    style={{
                        position: "absolute",
                        top: "-100px",
                        right: "-100px",
                        width: "500px",
                        height: "500px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)",
                    }}
                />

                {/* Content */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        height: "100%",
                        padding: "60px 72px",
                        position: "relative",
                    }}
                >
                    {/* Top: branding + category */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div
                            style={{
                                fontSize: "18px",
                                fontWeight: "700",
                                color: "rgba(255,255,255,0.6)",
                                letterSpacing: "0.05em",
                                textTransform: "uppercase",
                                fontFamily: "Arial, sans-serif",
                            }}
                        >
                            Project Profound
                        </div>
                        {category && (
                            <div
                                style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "#60a5fa",
                                    backgroundColor: "rgba(37,99,235,0.2)",
                                    padding: "6px 16px",
                                    borderRadius: "100px",
                                    fontFamily: "Arial, sans-serif",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                {category}
                            </div>
                        )}
                    </div>

                    {/* Main title + subtitle */}
                    <div>
                        <div
                            style={{
                                fontSize: title.length > 60 ? "42px" : "52px",
                                fontWeight: "700",
                                color: "#f8fafc",
                                lineHeight: "1.15",
                                marginBottom: "20px",
                                maxWidth: "900px",
                            }}
                        >
                            {title}
                        </div>
                        {subtitle && subtitle !== title && (
                            <div
                                style={{
                                    fontSize: "22px",
                                    color: "rgba(255,255,255,0.55)",
                                    lineHeight: "1.5",
                                    maxWidth: "820px",
                                    fontFamily: "Arial, sans-serif",
                                    display: "-webkit-box",
                                    WebkitLineClamp: "2",
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {subtitle}
                            </div>
                        )}
                    </div>

                    {/* Bottom: domain */}
                    <div
                        style={{
                            fontSize: "16px",
                            color: "rgba(255,255,255,0.35)",
                            fontFamily: "Arial, sans-serif",
                        }}
                    >
                        projectprofound.org
                    </div>
                </div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}
