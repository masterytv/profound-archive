"use client"

import { Brain, Sparkles, TrendingUp, Search, MessageCircle, Cpu, ExternalLink, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, type FormEvent } from "react"

export default function AboutPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          message: formData.message,
        }),
      })

      if (res.ok) {
        setSubmitStatus("success")
        setFormData({ fullName: "", email: "", message: "" })
      } else {
        setSubmitStatus("error")
      }
    } catch (error) {
      console.error("[contact] submission error:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const projects = [
    {
      title: "NDE Video Researcher",
      status: "available now",
      statusColor: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
      icon: <Search className="w-5 h-5 text-blue-600" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      description: "Explore a vast archive of Near-Death Experience video moments. Our unique search tool allows you to instantly find what you're looking for, whether it's an exact phrase or a related concept.",
      buttonText: "Begin Your Search",
      buttonLink: "/search3",
    },
    {
      title: "NDE Research Chatbot",
      status: "experimental",
      statusColor: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
      icon: <MessageCircle className="w-5 h-5 text-indigo-600" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/30",
      description: "Chat with more than 5500 first person accounts of Near Death Experiences to get a better understanding of the meaning and content of the experience.",
      buttonText: "Chat with NDEs",
      buttonLink: "/chat-2",
    },
    {
      title: "NDE Compassionate Chatbot",
      status: "experimental",
      statusColor: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
      icon: <Sparkles className="w-5 h-5 text-rose-600" />,
      iconBg: "bg-rose-50 dark:bg-rose-900/30",
      description: "Chat with a compassionate companion grounded in real-world NDE accounts. Whether you are a fellow NDEr or a curious observer, you'll speak with someone who understands.",
      buttonText: "Chat with Compassion",
      buttonLink: "/chat-compassionate",
    },
    {
      title: "AI Analysis of NDE Testimonies",
      status: "in development",
      statusColor: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
      icon: <Cpu className="w-5 h-5 text-amber-600" />,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
      description: "Drop in a YouTube URL and our NDE Expert AI model will determine if the video is a first-person NDE account, summarize it, score it on the Greyson Scale and NDE-C Scale, and deliver a detailed report.",
    },
    {
      title: "Contemporary Validation of NDE Scales",
      status: "in development",
      statusColor: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
      icon: <Brain className="w-5 h-5 text-blue-600" />,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      description: "In collaboration with advisors in psychology and neuroscience, this project aims to validate and refine existing scales for measuring Near-Death Experiences.",
    },
    {
      title: "Other Profound Experiences",
      status: "in development",
      statusColor: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
      description: "Expanding beyond NDEs to include UAP encounters, Kundalini awakenings, spiritually transformative events, and more — documenting, organizing, and analyzing the full spectrum of consciousness.",
    },
  ]

  const values = [
    { title: "Scientific Curiosity", description: "We champion rigorous, transparent, and evolving methodologies guided by both qualitative and quantitative research." },
    { title: "Spiritual Inclusivity", description: "We honor all religions, philosophies, and belief systems, acknowledging the sacred and symbolic in all paths." },
    { title: "Compassionate Inquiry", description: "We approach each testimony and each person's story with empathy, humility, and respect." },
    { title: "Unity in Diversity", description: "We celebrate human and cultural differences as essential parts of a shared, interconnected whole." },
    { title: "Courage & Integrity", description: "We explore the unknown with boldness, speak truthfully, and act ethically in all we do." },
    { title: "Lived Experience", description: "We value subjective personal insight as a valid and meaningful source of knowledge." },
    { title: "Accessibility & Equity", description: "We are committed to making our findings and tools available to all, regardless of language, background, or education level." },
    { title: "Collaboration Over Competition", description: "We seek to work with universities, governments, companies, technologists, experiencers, and researchers together." },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="hero-gradient border-b border-slate-200 dark:border-white/10">
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl text-center">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-4 leading-tight"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Project Profound
          </h1>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Explore the frontiers of consciousness and profound experiences through research, data analysis, and compassionate AI.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl">
        {/* Projects */}
        <section id="projects" className="py-16 scroll-mt-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Projects
            </h2>
            <p className="text-slate-500 dark:text-slate-400">Tools and research initiatives we&apos;re building.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project, index) => (
              <div key={index} className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-6 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${project.iconBg} flex items-center justify-center shrink-0`}>
                    {project.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                      {project.title}
                    </h3>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${project.statusColor}`}>
                      {project.status}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">{project.description}</p>
                {project.buttonText && project.buttonLink && (
                  <Link href={project.buttonLink} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                    {project.buttonText}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section id="mission" className="py-16 scroll-mt-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Mission &amp; Vision
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>Our Mission</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Project Profound exists to expand human understanding of consciousness and life beyond physical death. We aim to open the hearts and minds of intellectually curious, open-minded skeptics by applying cutting-edge artificial intelligence to explore the profound personal testimonies of near-death experiences (NDEs).
              </p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                We use scientifically grounded methods and ethically guided AI tools to uncover universal patterns, emotional truths, and spiritual insights across cultures, languages, and beliefs.
              </p>
            </div>

            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>Vision</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                We envision a world where the mystery of death inspires curiosity instead of fear—where people of all backgrounds can access compassionate, evidence-based, and inclusive resources to reflect on what it means to be fully alive.
              </p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                By democratizing access to knowledge, tools, and research, we help individuals and communities find meaning, connection, and a deeper understanding of ourselves and one another.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-8">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>Values</h3>
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
              {values.map((value, index) => (
                <div key={index}>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-1">{value.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Connect */}
        <section id="connect" className="py-16 scroll-mt-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Get In Touch
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              If you&apos;re interested in participating, partnering, or simply learning more, we&apos;d love to hear from you.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-8">
              {isClient && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text" id="fullName" required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                    <input
                      type="email" id="email" required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Your Message</label>
                    <textarea
                      id="message" required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Type your message..."
                      rows={5}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all resize-none"
                    />
                  </div>
                  <button
                    type="submit" disabled={isSubmitting}
                    className="w-full py-3 bg-slate-900 dark:bg-blue-600 text-white font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                  {submitStatus === "success" && (
                    <p className="text-emerald-600 dark:text-emerald-400 text-center text-sm font-medium">Thank you! Your message has been sent successfully.</p>
                  )}
                  {submitStatus === "error" && (
                    <p className="text-red-600 dark:text-red-400 text-center text-sm font-medium">Sorry, there was an error sending your message. Please try again.</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Blog */}
        <section id="blog" className="pb-20 scroll-mt-20">
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Our Blog
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6">
              Explore our latest articles, insights, and stories about near-death experiences and consciousness research.
            </p>
            <a
              href="https://blog.projectprofound.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-blue-600 text-white font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors"
            >
              Visit the Blog
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
