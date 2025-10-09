import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ChatUI from './chat-ui';

export default function ChatPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            NDE Compassionate Chatbot
          </CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            Answers Grounded in More than 5000 NDEs
            <Badge variant="outline">experimental</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatUI />
        </CardContent>
      </Card>
    </div>
  );
}
