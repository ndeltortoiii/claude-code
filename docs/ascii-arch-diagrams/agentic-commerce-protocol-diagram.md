# Agentic Commerce Protocol (ACP) - Architecture Diagram

This ASCII diagram illustrates the architecture and components of the Agentic Commerce Protocol, an open standard for connecting buyers, AI agents, and businesses to complete purchases seamlessly.

## Overview Architecture

```
                         AGENTIC COMMERCE PROTOCOL (ACP)
                                    
    ┌─────────────────┐         ┌─────────────────────────────┐         ┌─────────────────┐
    │                 │         │                             │         │                 │
    │   AI AGENTS     │         │        MERCHANTS            │         │   BUYERS        │
    │   (ChatGPT)     │         │                             │         │                 │
    │                 │         │                             │         │                 │
    └─────────┬───────┘         └─────────────┬───────────────┘         └────────┬────────┘
              │                               │                                  │
              │                               │                                  │
              │                               │                                  │
    ┌─────────▼───────┐                      │                         ┌────────▼────────┐
    │  CHECKOUT API   │                      │                         │  PAYMENT DATA   │
    │   REQUESTS      │                      │                         │  (Cards, etc.)  │
    │                 │                      │                         │                 │
    │ • Create        │                      │                         └─────────────────┘
    │ • Update        │                      │                                  │
    │ • Retrieve      │◄─────────────────────┼──────────────────────────────────┘
    │ • Complete      │                      │
    │ • Cancel        │                      │
    └─────────┬───────┘                      │
              │                              │
              │                              │
    ┌─────────▼───────┐              ┌───────▼─────────────────────────────────────┐
    │  DELEGATE       │              │         MERCHANT IMPLEMENTATION              │
    │  PAYMENT API    │              │                                             │
    │                 │              │  ┌─────────────────┐  ┌─────────────────┐   │
    │ • Tokenize      │◄─────────────┤  │  AGENTIC        │  │   DELEGATE      │   │
    │   Credentials   │              │  │  CHECKOUT API   │  │   PAYMENT API   │   │
    │ • Allowance     │              │  │                 │  │                 │   │
    │   Constraints   │              │  │ /checkout_      │  │ /agentic_       │   │
    └─────────┬───────┘              │  │  sessions       │  │  commerce/      │   │
              │                      │  │                 │  │  delegate_      │   │
              │                      │  └─────────┬───────┘  │  payment        │   │
              │                      │            │          └─────────────────┘   │
              │                      │            │                                │
    ┌─────────▼───────┐              │  ┌─────────▼───────┐                        │
    │  SECURE TOKENS  │              │  │   WEBHOOK API   │                        │
    │                 │              │  │                 │                        │
    │ • Single Use    │              │  │ • order_create  │                        │
    │ • Time Limited  │              │  │ • order_update  │                        │
    │ • Amount Capped │              │  │                 │                        │
    └─────────┬───────┘              │  └─────────┬───────┘                        │
              │                      └────────────┼────────────────────────────────┘
              │                                   │
              │                      ┌────────────▼────────────┐
              │                      │    PAYMENT PROVIDER     │
              │                      │       (Stripe)          │
              │                      │                         │
              └──────────────────────┤  • Payment Processing   │
                                     │  • Settlement           │
                                     │  • Risk Management      │
                                     │                         │
                                     └─────────────────────────┘
```

## Protocol Layers

```
═══════════════════════════════════════════════════════════════════════════════════

                                PROTOCOL LAYERS
                                
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                           APPLICATION LAYER                                  │
    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
    │  │      RFCs       │  │    Examples     │  │          Changelog          │  │
    │  │                 │  │                 │  │                             │  │
    │  │ • Design Docs   │  │ • Sample Reqs   │  │ • Version History           │  │
    │  │ • Flows         │  │ • Responses     │  │ • Breaking Changes          │  │
    │  │ • Rationale     │  │ • Error Cases   │  │                             │  │
    │  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
    └─────────────────────────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                          SPECIFICATION LAYER                                │
    │  ┌─────────────────┐  ┌─────────────────┐                                  │
    │  │   OpenAPI       │  │  JSON Schema    │                                  │
    │  │                 │  │                 │                                  │
    │  │ • HTTP Specs    │  │ • Data Models   │                                  │
    │  │ • Endpoints     │  │ • Validation    │                                  │
    │  │ • Parameters    │  │ • Structure     │                                  │
    │  └─────────────────┘  └─────────────────┘                                  │
    └─────────────────────────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                          TRANSPORT LAYER                                    │
    │                                                                             │
    │  • HTTPS/TLS 1.2+                    • Authentication (Bearer Token)       │
    │  • JSON Content-Type                 • Request Signing                     │
    │  • API Versioning (2025-09-29)       • Idempotency                        │
    │                                                                             │
    └─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### AI Agents (ChatGPT)
- Initiates checkout sessions on behalf of users
- Manages the complete checkout flow
- Handles user interactions and payment collection

### Merchants
- Implement the Agentic Checkout API
- Maintain existing commerce infrastructure
- Control orders, payments, taxes, and compliance

### Agentic Checkout API
- **POST /checkout_sessions** - Create new session
- **POST /checkout_sessions/{id}** - Update session
- **GET /checkout_sessions/{id}** - Retrieve session
- **POST /checkout_sessions/{id}/complete** - Complete with payment
- **POST /checkout_sessions/{id}/cancel** - Cancel session

### Delegate Payment API
- **POST /agentic_commerce/delegate_payment** - Tokenize payment credentials
- Enforces allowance constraints (amount, time, single-use)
- Maintains security through tokenization

### Security Features
- Bearer token authentication
- Request signing with timestamps
- Idempotency keys for safe retries
- TLS 1.2+ encryption
- PCI DSS compliance

## Data Flow

1. **Buyer** provides payment credentials to **AI Agent**
2. **AI Agent** creates checkout session with **Merchant**
3. **AI Agent** delegates payment credentials with constraints
4. **Merchant** processes payment through existing PSP
5. **Merchant** sends webhooks for order lifecycle events
6. **Payment Provider** handles settlement and risk management

## Benefits

- **For Businesses**: Reach more customers through AI agents
- **For AI Agents**: Embed commerce without being merchant of record  
- **For Payment Providers**: Process agentic transactions with secure tokens
- **For Buyers**: Seamless purchasing through AI assistants

---

*Source: [Agentic Commerce Protocol](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)*  
*Maintained by OpenAI and Stripe*  
*Current Version: 2025-09-29 (Draft)*