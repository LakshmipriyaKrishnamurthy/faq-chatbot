# FAQ Chatbot -- Agent Architecture

## Overview

This chatbot uses a small agentic network built with Neuro-SAN.

The idea is simple: instead of asking one AI agent to handle every kind
of message, we have a **main agent that decides who should handle the
message**.

For example:

-   **"Hi"** → Greeting Agent
-   **"How do I make a partial withdrawal?"** → FAQ Specialist
-   **"What's the weather today?"** → Out-of-Scope Agent

This keeps each agent focused on one responsibility and makes the
chatbot easier to understand and maintain.

## High-Level Architecture

## 1. Orchestrator Agent

The **Orchestrator** is the main decision-maker.

It receives every user message and decides which specialist agent should
handle it.

It does not answer FAQ questions itself. Instead, it considers:

-   The current user message
-   The previous conversation context
-   Whether the user is continuing an existing topic
-   Whether the user has changed to a new topic

### Example

User:

> How do I make a partial withdrawal?

The orchestrator identifies this as an FAQ question and sends it to the
**FAQ Specialist**.

If the next message is:

> What documents do I need?

The orchestrator uses the conversation context to understand that the
user means **documents for partial withdrawal**, even though the second
message does not mention partial withdrawal again.

## 2. FAQ Specialist Agent

The **FAQ Specialist** answers questions related to the bank's supported
FAQ information.

Its factual source is:

``` text
data/faqs.json
```

It uses the `read_file` tool to access the FAQ dataset and find the
information relevant to the user's question.

It is instructed not to:

-   Make up information
-   Use outside knowledge
-   Search the web
-   Invent banking policies or procedures

If the requested information is not available in the FAQ dataset, it
tells the user that the information is not available in the knowledge
base.

### Example

User:

> How do I make a partial withdrawal?

The FAQ Specialist looks at the FAQ dataset and returns the relevant
information.

If the user then asks:

> Which photo IDs are accepted?

The agent uses the previous conversation context to understand that the
question is still about partial withdrawal.

## 3. Greeting Agent

The **Greeting Agent** handles simple conversational messages such as:

-   Hi
-   Hello
-   Good morning
-   Thanks
-   Thank you
-   Bye
-   Goodbye

It responds briefly and naturally.

It does not handle substantive banking questions.

For example:

> User: Hi

The Greeting Agent can respond:

> Hello! How can I help you with your XYZ Bank questions today?

## 4. Out-of-Scope Agent

The **Out-of-Scope Agent** handles questions that are unrelated to the
supported FAQ knowledge base.

For example:

> What's the weather today?

or:

> Explain Python decorators.

The chatbot is designed for XYZ Bank FAQ questions, so this agent
politely explains what the chatbot can help with instead of trying to
answer the unrelated question using general AI knowledge.

## How Multi-Turn Conversation Works

Multi-turn conversation is an important part of the architecture.

The chatbot does not treat every message as a completely separate
question.

For example:

``` text
User: How do I make a partial withdrawal?
Bot:  [Partial withdrawal information]

User: What documents do I need?
Bot:  [Documents required for partial withdrawal]

User: Which IDs are accepted?
Bot:  [Accepted photo IDs]
```

The second and third questions are short, but the chatbot understands
them because the conversation context is carried forward.

The **session ID** identifies the conversation, while the Neuro-SAN
`chat_context` provides the context needed to understand follow-up
questions.

## Switching Topics

The same conversation can move to a different FAQ topic.

For example:

``` text
User: How do I make a partial withdrawal?
Bot:  [Partial withdrawal information]

User: What is a top-up?
Bot:  [Top-up information]

User: Can I do it online?
Bot:  [Top-up-related information]
```

The orchestrator recognizes that the user has moved from one supported
FAQ topic to another and continues routing the messages to the FAQ
Specialist.

The user does not need to manually select a topic or agent.

## Why Use Multiple Agents?

The chatbot could technically be built with one large prompt, but
separating responsibilities makes the architecture clearer.

  -----------------------------------------------------------------------
  Agent                               Responsibility
  ----------------------------------- -----------------------------------
  **Orchestrator**                    Understand the message and decide
                                      which agent should handle it

  **FAQ Specialist**                  Find answers in `data/faqs.json`

  **Greeting Agent**                  Handle greetings, thanks, and
                                      simple conversation

  **Out-of-Scope Agent**              Handle questions outside the FAQ
                                      knowledge base
  -----------------------------------------------------------------------

This separation also makes it easier to add another specialist later if
the chatbot grows.

## End-to-End Flow

``` text
1. User enters a message
          |
          v
2. React sends the message to FastAPI
          |
          v
3. FastAPI sends the message and conversation context
   to the Neuro-SAN agent network
          |
          v
4. Orchestrator decides which specialist should handle it
          |
          v
5. Specialist processes the request
          |
          v
6. FAQ Specialist reads data/faqs.json when required
          |
          v
7. Response is returned through Neuro-SAN
          |
          v
8. FastAPI streams the response back to React
          |
          v
9. Conversation history and Neuro-SAN context are persisted
```

The frontend does not need to know which agent handled the question. It
simply sends the message and displays the response.

## In Simple Terms

Think of the agent network like a small help desk.

The **Orchestrator** is the receptionist. It listens to the customer's
question and sends the customer to the right person.

The **FAQ Specialist** is the person who has access to the bank's FAQ
document.

The **Greeting Agent** handles simple greetings and closing
conversations.

The **Out-of-Scope Agent** handles questions that the help desk was not
designed to answer.

This keeps the chatbot simple, focused, and easy to extend.
