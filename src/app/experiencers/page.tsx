"use client"

import { Sun, Brain, Heart, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect, type FormEvent } from "react"

export default function AboutUsPage() {
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

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-extrabold text-foreground mb-4">Have you had an experience that changed the way you see the world?</h1>
          <p className="text-xl text-muted-foreground">
            You are not alone. And you are in the right place. Project Profound is a place of compassionate understanding for people who have had a profound encounter. We are here to help you connect, explore, and make sense of your experience without judgment.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">

        {/* A Place for Your Experience Section */}
        <section>
            <h2 className="text-3xl font-extrabold text-foreground mb-4 text-center">A Place for Your Experience</h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
                Find Understanding & Connection. It can be isolating to have an experience that few people understand. We are here to provide a safe harbor for your story.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
                {/* Card 1: Community */}
                <div className="bg-white rounded-lg shadow-md p-8">
                    <h3 className="text-xl font-bold text-foreground mb-4">
                        We are building a community dedicated to:
                    </h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li><span className="font-semibold">Compassionate Understanding:</span> A space where your story is met with empathy, not skepticism.</li>
                        <li><span className="font-semibold">Connection:</span> A community where you can connect with others who have had similar encounters.</li>
                        <li><span className="font-semibold">Education:</span> Resources to help you investigate and integrate what you've been through.</li>
                    </ul>
                </div>

                {/* Card 2: Experiences */}
                <div className="bg-white rounded-lg shadow-md p-8">
                    <h3 className="text-xl font-bold text-foreground mb-4">
                        We focus on the full spectrum of profound experiences, including:
                    </h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li>Near-Death Experiences (NDEs)</li>
                        <li>Out of Body Experiences (OBEs)</li>
                        <li>UAP / UFO / NHI Experiences</li>
                        <li>Spiritual or Etheric Experiences</li>
                        <li>After-Death Communication</li>
                        <li>Psychic Experiences (like telepathy)</li>
                    </ul>
                </div>
            </div>
        </section>

        {/* Resources for Your Journey Section */}
        <section>
            <h2 className="text-3xl font-extrabold text-foreground mb-6 text-center">Resources for Your Journey</h2>
            <p className="text-center text-muted-foreground mb-8">
                We build tools and create conversations to help you explore consciousness, expanded awareness, and anomalous events.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* For Those Seeking Answers */}
                <div className="bg-white rounded-lg shadow-md p-8 flex flex-col">
                    <h3 className="text-xl font-bold text-foreground mb-2">For Those Seeking Answers in Other Stories:</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">Find specific answers, patterns, and insights from thousands of people who have been there.</p>
                    <p className="text-muted-foreground leading-relaxed">Our <Link href="/search" className="text-primary hover:underline">Near Death Experience Database</Link> is a searchable library of more than 5,000 NDE video accounts from YouTube, paired with an <Link href="/chat-2" className="text-primary hover:underline">NDE Research Chatbot</Link> to help you query the data.</p>
                </div>
                {/* For Those Needing to Talk */}
                <div className="bg-white rounded-lg shadow-md p-8 flex flex-col">
                    <h3 className="text-xl font-bold text-foreground mb-2">For Those Needing to Talk:</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">Have a compassionate, interactive conversation, any time of day or night.</p>
                    <p className="text-muted-foreground leading-relaxed">Our <Link href="/chat" className="text-primary hover:underline">NDE Compassionate Chatbot</Link> is a supportive, AI-driven companion grounded in 5,000 first-person accounts, offering a safe, non-judgmental space to explore your feelings.</p>
                </div>
                {/* For Those Who Want to Go Deeper */}
                <div className="bg-white rounded-lg shadow-md p-8 flex flex-col">
                    <h3 className="text-xl font-bold text-foreground mb-2">For Those Who Want to Go Deeper:</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">Join a larger conversation on spirituality, consciousness, and the transcendent.</p>
                    <p className="text-muted-foreground leading-relaxed">
                        <a href="https://www.youtube.com/@soulwisdomcollective" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">The Soul Wisdom Collective</a> is our exploratory and educational podcast, diving into the lived, human experience of these profound events.
                    </p>
                </div>
            </div>
        </section>

        {/* What's Coming Next Section */}
        <section>
            <h2 className="text-3xl font-extrabold text-foreground mb-6 text-center">What's Coming Next</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <p className="text-muted-foreground leading-relaxed mb-4">Our work is always expanding. We are currently building new tools to serve more communities:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li><span className="font-semibold">UAP Encounter Database:</span> We're developing a searchable database for people who have had encounters with UAP/UFO/NHI, allowing you to find patterns and connect with similar accounts.</li>
                        <li><span className="font-semibold">The Experience Event:</span> An upcoming in-person event for experiencers and the curious to meet, connect, share, and learn from one another.</li>
                    </ul>
                </div>
            </div>
        </section>

        {/* Our Approach Section */}
        <section>
            <h2 className="text-3xl font-extrabold text-foreground mb-6 text-center">Our Approach: Compassion & Curiosity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <p className="text-muted-foreground leading-relaxed">
                        Your experiences deserve to be taken seriously. Our methodology is built on a foundation of compassionate investigation, rigorous study, and empathic curiosity. We use ethically guided AI tools to analyze, interact with, and build connections for experiencers.
                    </p>
                </div>
            </div>
        </section>

        {/* Connect Section */}
        <section id="connect" className="scroll-mt-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-foreground mb-4">Connect with Project Profound</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Join Us in Exploring the Frontiers of Consciousness. Project Profound is a grassroots, volunteer-driven initiative...
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8">
              {isClient && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="fullName" className="block text-lg font-medium text-foreground mb-2">Full Name</label>
                    <input type="text" id="fullName" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="John Doe" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"/>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-lg font-medium text-foreground mb-2">Email Address</label>
                    <input type="email" id="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john.doe@example.com" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"/>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-lg font-medium text-foreground mb-2">Your Message</label>
                    <textarea id="message" required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Type your message..." rows={6} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"/>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                  {submitStatus === "success" && <p className="text-green-600 text-center font-medium">Thank you! Your message has been sent successfully.</p>}
                  {submitStatus === "error" && <p className="text-red-600 text-center font-medium">Sorry, there was an error. Please try again.</p>}
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
