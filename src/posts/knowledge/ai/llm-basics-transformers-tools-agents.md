---
layout: layouts/post.njk
title: "LLM Basics: Transformers, Tools, and Agents"
description: "Notes on the three transformer architectures, chat templates and special tokens, tool calling and MCP, and the agent Thought/Action/Observation loop."
excerpt: "Notes on the three transformer architectures, chat templates and special tokens, tool calling and MCP, and the agent Thought/Action/Observation loop."
date: 2026-09-07T12:00:00-07:00
category: Knowledge
subcategory: AI
topic: LLM
kind: Guide
tags:
  - posts
image: /assets/sketches/transformer-architectures.svg
imageFit: contain
permalink: /posts/llm-basics-transformers-tools-agents/index.html
---

LLM (Large Language Model): a type of AI model that excels at **understanding and generating human language**.

## 3 Types of Transformers

![Transformer architectures: encoder, decoder, and seq2seq compared by example, use case, and size](/assets/sketches/transformer-architectures.svg)

1. **Encoders**
   An encoder-based Transformer takes text (or other data) as input and outputs a **dense representation** (or embedding) of that text.
   - Example: BERT from Google
   - Use Cases: Text classification, semantic search, Named Entity Recognition
   - Typical Size: Millions of parameters

2. **Decoders**
   A decoder-based Transformer focuses on **generating** new tokens to complete a sequence, one token at a time.
   - Example: Llama from Meta
   - Use Cases: Text generation, chatbots, code generation
   - Typical Size: Billions (in the US sense, i.e., 10^9) of parameters

3. **Seq2Seq (Encoder-Decoder)**
   A sequence-to-sequence Transformer combines an encoder and a decoder. The encoder first processes the input sequence into a context representation, then the decoder generates an output sequence.
   - Example: T5, BART
   - Use Cases: Translation, Summarization, Paraphrasing
   - Typical Size: Millions of parameters

## Chat With Model

**Message**: While chatting with the model, the previous exchanged messages will be **concatenated** and formatted into a prompt that the model can understand.

### Multimodal Chat Templates

Multimodal chat models accept inputs like images, audio, or video, in addition to text.

- **Multimodal**: one model that handles different types of **input** — text, image, audio, video.
  e.g. GPT-4o takes both images and speech. VLM (vision-language model) is the image+text subset.
- **Multi-model**: a system that uses several **models** together.
  e.g. RAG — an encoder retrieves the documents, a decoder writes the answer.

### Special Tokens

Special tokens are reserved tokens used to communicate structural or control information to a model. Unlike ordinary tokens, they usually do **not** represent words or their normal lexical meanings. They help the tokenizer and model identify boundaries, padding, missing words, speaker roles, or special instructions. Common special tokens include:

- `[BOS]` / `<s>` — Beginning of Sequence. Marks the beginning of the input sequence.
- `[EOS]` / `</s>` — End of Sequence. Marks the end of a sequence. During generation, producing this token may tell the model to stop.

## Tool

**AI Tool**: An **executable** process or external API that allows agents to perform specific tasks and interact with external environments. The framework asks the LLM to generate tool **invocation** code when appropriate, and runs the tools on behalf of the model.

```python
@tool
def calculator(a: int, b: int) -> int:
    """Multiply two integers."""
    return a * b

print(calculator.to_string())
```

### Model Context Protocol (MCP): A Unified Tool Interface

Model Context Protocol (MCP) is an **open protocol** that standardizes how applications provide tools to LLMs.

## Agent Workflow

Cycle: **thinking** (Thought) → **acting** (Act) and **observing** (Observe)

- **Thought**: internal reasoning
- **Action**: tool usage
- **Observation**: receiving tool output

## Types of Agent Actions

| Type of Agent | Description |
|---|---|
| JSON Agent | The Action to take is specified in JSON format. |
| Code Agent | The Agent writes a code block that is interpreted externally. |
| Function-calling Agent | It is a subcategory of the JSON Agent which has been fine-tuned to generate a new message for each action. |

## References

- [Hugging Face Agents Course, Unit 1](https://huggingface.co/learn/agents-course/en/unit1)
