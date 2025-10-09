"use client"

import { Sun, Brain, Heart, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
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
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL

      if (!webhookUrl || webhookUrl === 'YOUR_N8N_WEBHOOK_URL_HERE') {
        console.error("[v0] Webhook URL not configured")
        setSubmitStatus("error")
        setIsSubmitting(false)
        return
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus("success")
        setFormData({ fullName: "", email: "", message: "" })
      } else {
        setSubmitStatus("error")
      }
    } catch (error) {
      console.error("[v0] Form submission error:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const projects = [
    {
      title: "NDE Video Researcher",
      status: "available now",
      statusColor: "bg-green-100 text-green-700",
      description:
        "Explore a vast archive of Near-Death Experience video moments. Our unique search tool allows you to instantly find what you&apos;re looking for, whether it&apos;s an exact phrase or a related concept. Pinpoint specific discussions or uncover hidden topics within thousands of hours of NDE testimonies.",
      buttonText: "Begin Your Search",
      buttonLink: "/search",
    },
    {
      title: "NDE Research Chatbot",
      status: "experimental",
      statusColor: "bg-blue-100 text-blue-700",
      description:
        "Chat with more than 5500 first person accounts of Near Death Experiences to get a better understanding of the meaning and content of the experience. This experimental chatbot references the videos it found related to your questions so you can go deeper in your understanding.",
      buttonText: "Chat with NDEs",
      buttonLink: "/chat-2",
    },
    {
      title: "NDE Compassionate Chatbot",
      status: "experimental",
      statusColor: "bg-blue-100 text-blue-700",
      description:
        "Chat a compassionate companion who is grounded in real-world NDE accounts from individuals who have experienced a powerful, transformational event. Whether you are a fellow NDEr or a curious observer, you&apos;ll be able to speak with a compassionate companion who understands.",
      buttonText: "Chat with Compassion",
      buttonLink: "/chat",
    },
    {
      title: "AI Analysis of NDE Testimonies",
      status: "in development",
      statusColor: "bg-orange-100 text-orange-700",
      description:
        "Drop in a YouTube URL and our NDE Expert AI model (trained on scientifically validated NDEs) will determine if the video is a first-person NDE account, summarize it, score it on the Greyson Scale and the NDE-C Scale, and deliver you a report of its findings in the format you request (PDF, Doc, Webpage, etc)",
    },
    {
      title: "Contemporary Validation of the Greyson NDE Scale and NDE-C Scale",
      status: "in development",
      statusColor: "bg-orange-100 text-orange-700",
      description:
        "In collaboration with advisors in psychology and neuroscience, this project aims to validate and refine existing scales for measuring Near-Death Experiences, ensuring they are culturally relevant and scientifically robust.",
    },
    {
      title: "Other Profound Experiences",
      status: "in development",
      statusColor: "bg-orange-100 text-orange-700",
      description:
        "While Near-Death Experiences offer a powerful lens into the nature of consciousness, they are one part of a much larger picture. We are expanding our research to include other transformative first-person accounts—such as UAP encounters and abductions, Kundalini awakenings, spiritually transformative events, angelic visitations, and more. Using advanced AI models and automation, we aim to document, organize, and analyze these experiences to uncover patterns and insights across the full spectrum of human consciousness.",
    },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          {/* Icons */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <Sun className="w-12 h-12 text-orange-500" />
            <Brain className="w-12 h-12 text-blue-600" />
            <Heart className="w-12 h-12 text-pink-500" />
            <Lightbulb className="w-12 h-12 text-yellow-500" />
          </div>

          {/* Title */}
          <h1 className="text-5xl font-extrabold text-foreground mb-4">Project Profound</h1>

          {/* Subtitle */}
          <p className="text-xl text-muted-foreground">
            Explore the frontiers of consciousness and profound experiences.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Projects Section */}
        <section id="projects" className="mb-20 scroll-mt-20">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-extrabold text-foreground mb-4">Projects</h1>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold text-foreground mb-3">{project.title}</h2>

                {/* Status badge */}
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${project.statusColor}`}>
                  {project.status}
                </span>

                <p className="text-muted-foreground leading-relaxed mb-6">{project.description}</p>

                {/* Button only for projects that have one */}
                {project.buttonText && project.buttonLink && (
                  <Link href={project.buttonLink}>
                    <Button style={{ backgroundColor: "#2563eb" }} className="hover:opacity-90 text-white">
                      {project.buttonText}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Mission Section */}
        <section id="mission" className="mb-20 scroll-mt-20 -mx-4 px-4 py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="mb-12 text-center">
              <h1 className="text-4xl font-extrabold text-foreground mb-4">Mission</h1>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Project Profound exists to expand human understanding of consciousness and life beyond physical death.
                  We aim to open the hearts and minds of intellectually curious, open-minded skeptics by applying
                  cutting-edge artificial intelligence to explore the profound personal testimonies of near-death
                  experiences (NDEs). We are a small group of like minded individuals in service to humanity.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We use scientifically grounded methods and ethically guided AI tools to uncover universal patterns,
                  emotional truths, and spiritual insights across cultures, languages, and beliefs—inviting people to
                  consider the possibility that consciousness continues beyond the body.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Vision</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We envision a world where the mystery of death inspires curiosity instead of fear—where people of all
                  backgrounds can access compassionate, evidence-based, and inclusive resources to reflect on what it
                  means to be fully alive.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  By democratizing access to knowledge, tools, and research, we help individuals and communities find
                  meaning, connection, and a deeper understanding of ourselves and one another.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-3xl font-bold text-foreground mb-8">Values</h2>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Scientific Curiosity</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We champion rigorous, transparent, and evolving methodologies guided by both qualitative and
                    quantitative research.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Spiritual Inclusivity</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We honor all religions, philosophies, and belief systems, acknowledging the sacred and symbolic in
                    all paths.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Compassionate Inquiry</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We approach each testimony and each person&apos;s story with empathy, humility, and respect.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Unity in Diversity</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We celebrate human and cultural differences as essential parts of a shared, interconnected whole.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Courage & Integrity</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We explore the unknown with boldness, speak truthfully, and act ethically in all we do.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Lived Experience</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We value subjective personal insight as a valid and meaningful source of knowledge.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Accessibility & Equity</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We are committed to making our findings and tools available to all, regardless of language,
                    background, or education level.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Collaboration Over Competition</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We seek to work with universities, governments, companies, technologists, experiencers, and
                    researchers to co-create this new frontier together.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Connect Section */}
        <section id="connect" className="scroll-mt-20">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-extrabold text-foreground mb-4">Get In Touch</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              If you&apos;re interested in participating, partnering, or simply learning more, please fill out the form
              below. We look forward to exploring the unknown together.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8">
              {isClient && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name Field */}
                  <div>
                    <label htmlFor="fullName" className="block text-lg font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Email Address Field */}
                  <div>
                    <label htmlFor="email" className="block text-lg font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john.doe@example.com"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Message Field */}
                  <div>
                    <label htmlFor="message" className="block text-lg font-medium text-foreground mb-2">
                      Your Message
                    </label>
                    <textarea
                      id="message"
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Type your message..."
                      rows={6}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ backgroundColor: "#2563eb" }}
                    className="w-full py-4 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>

                  {/* Status Messages */}
                  {submitStatus === "success" && (
                    <p className="text-green-600 text-center font-medium">
                      Thank you! Your message has been sent successfully.
                    </p>
                  )}
                  {submitStatus === "error" && (
                    <p className="text-red-600 text-center font-medium">
                      Sorry, there was an error sending your message. Please try again.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Blog Section */}
        <section id="blog" className="mt-20 scroll-mt-20">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-extrabold text-foreground mb-4">Our Blog</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Explore our latest articles, insights, and stories.
            </p>
          </div>

          <div className="text-center">
            <a href="https://blog.projectprofound.org/" target="_blank" rel="noopener noreferrer">
              <Button style={{ backgroundColor: "#2563eb" }} className="hover:opacity-90 text-white text-lg px-8 py-6">
                Visit the Blog
              </Button>
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
