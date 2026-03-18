# BrowseShield Detection Engine Contract

This document defines the feature interface required by the phishing detection engine.

All features must be supplied in the format described below before the ML model
and heuristic engine are executed.

---

# Feature Encoding

Features use the following encoding:

| Value | Meaning |
|------|------|
| 1 | Legitimate |
| 0 | Suspicious / Neutral |
| -1 | Phishing Indicator |

---

# Required Feature Order

The machine learning model requires features in the following order:

1. having_IP_Address
2. URL_Length
3. Shortining_Service
4. having_At_Symbol
5. double_slash_redirecting
6. Prefix_Suffix
7. having_Sub_Domain
8. SSLfinal_State
9. Domain_registeration_length
10. Favicon
11. port
12. HTTPS_token
13. Request_URL
14. URL_of_Anchor
15. Links_in_tags
16. SFH
17. Submitting_to_email
18. Abnormal_URL
19. Redirect
20. on_mouseover
21. RightClick
22. popUpWidnow
23. Iframe
24. age_of_domain
25. DNSRecord
26. web_traffic
27. Page_Rank
28. Google_Index
29. Links_pointing_to_page
30. Statistical_report

---

# Feature Sources

Features originate from three subsystems.

### URL Features
Extracted by:

- URL_Length
- Prefix_Suffix
- HTTPS_token
- having_IP_Address

### Domain Features
Extracted by:

- age_of_domain
- DNSRecord
- Domain_registeration_length

### DOM / Page Features
Extracted by the browser extension and processed by:

- Iframe
- popUpWidnow
- RightClick
- Request_URL

# Example Feature Payload

The backend should produce a feature vector like:

```json
{
 "having_IP_Address": 1,
 "URL_Length": -1,
 "Shortining_Service": 1,
 "having_At_Symbol": 1,
 "double_slash_redirecting": 1,
 "Prefix_Suffix": -1,
 "having_Sub_Domain": 0,
 "SSLfinal_State": 1,
 "Domain_registeration_length": -1,
 "Favicon": 1,
 "port": 1,
 "HTTPS_token": 1,
 "Request_URL": -1,
 "URL_of_Anchor": -1,
 "Links_in_tags": 0,
 "SFH": -1,
 "Submitting_to_email": 1,
 "Abnormal_URL": 1,
 "Redirect": -1,
 "on_mouseover": 0,
 "RightClick": -1,
 "popUpWidnow": 0,
 "Iframe": 1,
 "age_of_domain": -1,
 "DNSRecord": 1,
 "web_traffic": 0,
 "Page_Rank": 0,
 "Google_Index": 1,
 "Links_pointing_to_page": 0,
 "Statistical_report": 1
}