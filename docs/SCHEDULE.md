# BrowseShield — Development Schedule & Testing Plan

---

## Testing Plan

The purpose of the BrowseShield testing plan is to ensure the system works accurately, securely, and as intended while remaining user-friendly. Since BrowseShield focuses on phishing detection and awareness, testing will concentrate on **detection accuracy, functionality, security, and usability**. Performance stress testing is deprioritized; the primary goal is to confirm that the system correctly identifies threats and clearly explains risks to the user. Testing will take place throughout development rather than only at the end — by testing in phases, we can identify issues early, communicate them quickly, and stay aligned with established milestones.

### Unit Testing

- Phishing detection features: URL structure checks, domain analysis, suspicious form behavior, risk score calculations
- Verify feature weights produce accurate classifications
- Password strength checker
- Backend API endpoints
- Authentication logic for Account Holders and sub-users

### Integration Testing

- Browser extension ↔ backend API secure communication
- Backend properly handles required data
- Risk scores accurately displayed in extension pop-up and web portal dashboard
- Account creation, login, and sub-user management consistency across the system

### Functional Testing

- End-to-end evaluation using authorized public phishing datasets and known legitimate websites
- Measure detection accuracy across Low, Medium, and High classifications
- Confirm classifications align with expected outcomes
- Verify warnings clearly explain which features contributed to the risk score

### Security Testing

- Confirm no credentials or PII are stored unnecessarily
- API authentication properly enforced
- Input validation prevents misuse
- Controlled phishing simulations to observe realistic system behavior
- All testing uses authorized or synthetic data — never live user information

### Usability Testing

- External testers (outside the development team) evaluate:
  - Clarity of warnings
  - Comprehensibility of explanations
  - Overall user experience

### Release Criteria

BrowseShield will be considered ready for final demonstration when:

1. Detection accuracy consistently meets the agreed threshold of **90%**
2. External testers have reviewed the system and confirmed clarity and usability
3. No customer data is stored or transmitted insecurely

---

## Development Timeline

### Week 4 — Planning & Kickoff *(Completed)*

- Brainstorming, concept planning, and role delegation completed
- Met with mentor
- Finished proposal draft
- Met with instructor and TAs to discuss the project

### Weeks 5–7 — Core Infrastructure

| Deliverable | Details |
|-------------|---------|
| **Browser Extension** | Created using Manifest V3 — core responsibilities include interacting with web pages and running inside a browser |
| **Backend Server** | Created to receive data from the extension |
| **Web Portal** | Created with basic page layout and navigation completed by end of week 6 |
| **Integration** | By end of phase, extension, backend, and web portal communicate securely with one another |

### Weeks 8–11 — Feature Implementation

| Deliverable | Details |
|-------------|---------|
| **Extension — Real-Time Analysis** | Analyzes websites in real time; displays pop-up with confidence score and explanation (minimizable/expandable) |
| **Extension — Password Checker** | Provides feedback on password strength and security |
| **Portal — User Management** | Account creation, login, sub-user creation |
| **Portal — Dashboard** | View recent website scores with confidence score explanations; no browsing history log (privacy) |
| **Backend** | Supports extension and website functionality while maintaining user privacy |

**End of phase:** A functional BrowseShield is created.

### Weeks 12–14 — Testing & Refinement

- In-depth testing to identify faults and errors
- Corrections and fine-tuning
- External user testing to verify usability and privacy
- All final feature changes completed during this phase

### Weeks 15–16 — Final Presentation & Documentation

- Prepare for live demonstration
- Compile final project documentation
- Optionally publish BrowseShield for public use
- Final presentation delivered

---

## Work Delegation

### Dane — Team Lead & Web Portal Engineer

- Design and implementation of the web portal architecture and dashboard UI
- Development of authentication workflows for Account Holders and sub-user accounts
- Implementation of data visualization components for historical activity and user safety ratings
- Design and management of user-facing features such as parental controls and content management tools *(stretch goals)*
- Team coordination, sprint planning, and oversight of system integration efforts

### Andy — Security Engineer

- Implementation of threat detection services for identifying malicious or suspicious content
- Design and maintenance of heuristic-based phishing and malware detection rules
- Development and integration of URL and domain reputation checking
- Security architecture review and penetration testing
- Compliance with privacy requirements and contribution to user-facing security guidance documentation

### Jackson — Extension Engineer

- Design and implementation of the browser extension architecture, including manifest configuration and event-driven hooks
- Development of the extension UI: risk assessment pop-ups, color-coded indicators, and confidence score displays
- Implementation of secure communication between the browser extension and backend APIs
- Integration of client-side security features: password strength detection and insecure input warnings
- Extension quality assurance through testing, sandboxing, and cross-browser compatibility validation

### Mike — Data & Backend Engineer

- Design and implementation of backend API architecture and service endpoints
- Development of database schemas and efficient data access patterns
- Construction and maintenance of risk scoring and confidence calculation models
- Implementation of analytics pipelines for safety rating aggregation and anomaly detection
- Management of data ingestion workflows, model evaluation, and backend performance optimization

---

*Last Updated: February 2026*
