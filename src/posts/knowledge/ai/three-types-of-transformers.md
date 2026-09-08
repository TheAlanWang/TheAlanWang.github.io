---
layout: layouts/post.njk
title: "Three Types of Transformers"
description: "Encoder, decoder, and seq2seq transformers compared by what they output, an example model, typical use cases, and typical size."
excerpt: "Encoder, decoder, and seq2seq transformers compared by what they output, an example model, typical use cases, and typical size."
date: 2026-09-08T12:00:00-07:00
category: Knowledge
subcategory: AI
topic: LLM
kind: Note
tags:
  - posts
image: /assets/sketches/transformer-architectures.svg
imageFit: contain
permalink: /posts/three-types-of-transformers/index.html
---

![Transformer architectures: encoder, decoder, and seq2seq compared by example, use case, and size](/assets/sketches/transformer-architectures.svg)

1. **Encoders**
   An encoder-based Transformer takes text (or other data) as input and outputs a **dense representation** (or embedding) of that text.
   - Example: **BERT** from Google
   - Use Cases: Text classification, semantic search, Named Entity Recognition
   - Typical Size: Millions of parameters

2. **Decoders**
   A decoder-based Transformer focuses on **generating** new tokens to complete a sequence, one token at a time.
   - Example: Llama from Meta
   - Use Cases: Text generation, chatbots, code generation
   - Typical Size: Billions (in the US sense, i.e., 10^9) of parameters

3. **Seq2Seq (Encoder–Decoder)**
   A sequence-to-sequence Transformer combines an encoder and a decoder. The encoder first processes the input sequence into a context representation, then the decoder generates an output sequence.
   - Example: T5, BART
   - Use Cases: Translation, Summarization, Paraphrasing
   - Typical Size: Millions of parameters
