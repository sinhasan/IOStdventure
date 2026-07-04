# Data Model

## Core Business Objects

- User
- Startup Profile
- Investor Profile
- AI Match
- Opportunity
- Timeline Event
- Notification
- Email Queue
- Payment
- Meeting
- Document
- Portfolio Company

## Current Important Tables

- users
- startups
- investors
- matches
- deal_flow
- deal_events
- email_queue
- opportunity_sequence

## Naming Direction

Over time, deal_flow should conceptually become Opportunity.
Deal Flow is a view. Opportunity is the business object.
