'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import dynamic from 'next/dynamic';

const ContactForm = dynamic(() => import('./contact-form'), {
  ssr: false,
});

export default function ContactSection() {
  return (
    <section id="contact-form">
      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
          <CardDescription>
            Have a question, feedback, or want to contribute? We'd love to hear
            from you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm />
        </CardContent>
      </Card>
    </section>
  );
}
