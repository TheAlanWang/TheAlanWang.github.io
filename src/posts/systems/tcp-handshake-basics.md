---
layout: layouts/post.njk
title: TCP Handshake Basics
description: A simple poster explaining TCP three-way connection setup, SYN, ACK, FIN, and four-way connection teardown.
excerpt: A compact note on how TCP opens with SYN, SYN-ACK, ACK and closes with FIN, ACK, FIN, ACK.
date: 2026-05-07T12:00:00-07:00
category: Knowledge
subcategory: Networking
topic: Protocols
kind: Note
tags:
  - posts
image: /assets/notes/tcp-handshake-basics.svg
imageFit: contain
permalink: /posts/tcp-handshake-basics/index.html
---
This poster summarizes the TCP connection lifecycle: the three-way handshake used to establish a connection, the meaning of common TCP control flags, and the four-way handshake usually used to close a connection.

![TCP Handshake Basics](/assets/notes/tcp-handshake-basics.svg)

## 1. TCP Three-Way Handshake

TCP uses a **three-way handshake** to establish a connection before data transmission.

### Steps

1. **SYN**  
   The client sends a request to the server:  
   "I want to connect."

2. **SYN-ACK**  
   The server replies with **SYN + ACK**:
   - **ACK**: "I received your request."
   - **SYN**: "I am also ready to establish the connection."

3. **ACK**  
   The client replies:  
   "I received your confirmation."

After these three steps, the TCP connection is established.

## 2. TCP Four-Way Handshake

TCP usually uses a **four-way handshake** to close a connection.

### Steps

1. **FIN**  
   Client says:  
   "I am done sending data. I want to close."

2. **ACK**  
   Server says:  
   "I received your close request."

3. **FIN**  
   Server says:  
   "I am also done. I want to close."

4. **ACK**  
   Client says:  
   "I received your close confirmation."

After these steps, the TCP connection is closed.

## 3. Key Terms

### SYN

**SYN** means **synchronize**.

It is used to start a TCP connection.

### ACK

**ACK** means **acknowledgment**.

It means:
"I received your message."

### FIN

**FIN** means **finish**.

It is used when one side wants to close the TCP connection.

## 4. Simple Summary

- **Three-way handshake** = open a TCP connection
- **Four-way handshake** = close a TCP connection
- **SYN** = start
- **ACK** = received
- **FIN** = finish / close
