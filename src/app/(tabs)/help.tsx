import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Page, Card, Heading, Body, Badge, Muted, Button, Field } from "../../components/ui";
import { Hero } from "../../components/studio";
import { answerAppQuestion, helpTopics, type HelpTopic } from "../../ai/app-help";
export default function Help() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<HelpTopic | null>(null);
  const [asked, setAsked] = useState(false);
  return <Page title="A little help, right here" subtitle="Your guide to getting things done in Lauda.">
    <Hero eyebrow="LAUDA GUIDE · AVAILABLE OFFLINE" title="Find your way. Get back to business."><Text style={{ color: "#E6E0F6", fontSize: 15, lineHeight: 23 }}>Ask about reviews, replies, bookings or your business settings.</Text></Hero>
    <Card><Heading>What would you like to do?</Heading><Field label="Your question" value={question} onChange={setQuestion} /><Button label="Find an answer" disabled={!question.trim()} onPress={() => { setAnswer(answerAppQuestion(question)); setAsked(true); }} /><Muted>Answers come from Lauda’s built-in guide. This is offline app help, not a generative chatbot.</Muted></Card>
    {asked && <Card><Badge label={answer ? "FROM THE LAUDA GUIDE" : "LET’S NARROW IT DOWN"} /><Heading>{answer?.title ?? "Choose a topic below"}</Heading><Body>{answer?.answer ?? "I couldn’t find a reliable answer in the app guide. Try ‘save draft’, ‘change language’ or ‘offline’, or choose one of the topics below."}</Body>{answer && <Button label={answer.action} onPress={() => router.push(answer.link)} />}</Card>}
    <View style={{ gap: 4 }}><Heading>Quick answers</Heading><Muted>Tap a question for steps and a shortcut.</Muted></View>
    {helpTopics.map(topic => <Card key={topic.id} onPress={() => { setQuestion(topic.title); setAnswer(topic); setAsked(true); }}><Heading>{topic.title}</Heading><Muted>See how →</Muted></Card>)}
  </Page>;
}
