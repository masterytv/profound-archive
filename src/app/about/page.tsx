import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Heart, Lightbulb, Sun } from 'lucide-react';
import Link from 'next/link';
import ContactForm from './contact-form';

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="flex items-center gap-4 mb-4 text-primary">
          <Sun className="h-8 w-8" />
          <Brain className="h-8 w-8" />
          <Heart className="h-8 w-8" />
          <Lightbulb className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Project Profound
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Explore the frontiers of consciousness and profound experiences.
        </p>
      </div>

      <section className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Our Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                NDE Video Researcher
                <Badge variant="secondary">Available Now</Badge>
              </CardTitle>
              <CardDescription>
                Search for specific terms and concepts within thousands of NDE video testimonies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/search">Begin Your Search</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                NDE Research Chatbot
                <Badge variant="outline">Experimental</Badge>
              </CardTitle>
              <CardDescription>
                Ask questions and get answers grounded in our extensive database of NDE accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/chat">Chat with NDEs</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                NDE Compassionate Chatbot
                <Badge variant="outline">Experimental</Badge>
              </CardTitle>
              <CardDescription>
                A chatbot designed to provide supportive and understanding conversations about NDEs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/chat">Chat with Compassion</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-16">
        <Card>
          <CardHeader>
            <CardTitle>Mission and Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Our mission is to provide an accessible, evidence-based platform for exploring near-death experiences, fostering understanding and open inquiry.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <span className="font-semibold">Open Access:</span> Freely available data for researchers, experiencers, and the curious.
              </li>
              <li>
                <span className="font-semibold">Evidence-Based:</span> Grounding our tools and information in verifiable accounts.
              </li>
              <li>
                <span className="font-semibold">Compassionate Inquiry:</span> Approaching this profound subject with respect and sensitivity.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section id="contact-form">
        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
            <CardDescription>
              Have a question, feedback, or want to contribute? We'd love to hear from you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContactForm />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
