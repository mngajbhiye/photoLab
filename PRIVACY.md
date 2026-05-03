# Privacy Notice

**Last Updated:** May 3, 2026

PhotoLab Studio ("we," "us," "our," or "the Service") is committed to protecting your privacy. This Privacy Notice explains how we collect, use, disclose, and process your information when you use our web application, including any related services, content, and features offered by PhotoLab.

---

## 1. Introduction

PhotoLab Studio is a web-based photo editing application that provides features such as image cropping, background removal, adjustment filters, and passport photo generation. This Privacy Notice outlines our data handling practices and your privacy rights.

**Scope:** This notice applies to all users of PhotoLab Studio, whether you create an account or use features as an anonymous visitor.

---

## 2. Information We Collect

### 2.1 Information You Provide

**Google OAuth Account Information:**
- When you sign in with Google, we receive and store:
  - Your Google email address
  - Your Google user ID (uid)
  - Your display name (if available)
  - Your profile picture URL (if available)

We collect this information to:
- Create and maintain your user account
- Authenticate your identity across sessions
- Track your daily quota for background removal requests

**Images You Upload:**
- Photos you upload for editing are processed locally in your browser and on our FastAPI backend
- Images are **NOT stored permanently** in our database or cloud storage
- Images are processed in real-time and deleted after processing completes
- Background-removed images and edited versions are only stored in your browser's memory until you download them

**Contact Form Information:**
- When you submit the contact form, we receive:
  - Your name
  - Your email address
  - Your message content

This information is used to respond to your inquiries and is not used for marketing purposes.

### 2.2 Automatically Collected Information

**Usage Data & Analytics:**
- Firebase Analytics collects anonymized usage statistics:
  - Pages visited and features used
  - Session duration and frequency
  - Device type and browser information
  - Geographic location (country/region level)
  - Crash reports and error logs

**Daily Quota Tracking:**
- We track the number of background removal requests per user per day
- This data is stored in Firestore under `users/{uid}/quota/{YYYY-MM-DD}`
- Quota data is retained for 30 days and then automatically deleted
- Daily limits are enforced to ensure fair resource usage (50 requests per day)

**Log Data:**
- Our FastAPI backend logs:
  - Request timestamps and endpoints accessed
  - HTTP status codes
  - Basic request metadata (not including image content)
  - Error messages and stack traces
  - Backend logs are retained for 7 days for debugging purposes

---

## 3. How We Use Your Information

### 3.1 Primary Uses

Your information is used for the following purposes:

1. **Service Delivery**
   - Processing your photo editing requests
   - Storing and retrieving your account preferences
   - Enabling authentication and account access

2. **Quota Management**
   - Tracking daily background removal requests
   - Enforcing fair usage limits (50 requests per day)
   - Preventing abuse and ensuring service stability

3. **Analytics & Improvement**
   - Understanding how users interact with the service
   - Identifying and fixing bugs
   - Improving feature performance and user experience
   - A/B testing new features

4. **Communication**
   - Responding to support inquiries
   - Notifying you of account-related changes or quota resets
   - Sending security alerts if needed

### 3.2 What We Do NOT Do

We **do not:**
- Sell your personal data to third parties
- Share your images with external services (except rembg for background removal)
- Use your photos for training AI models without explicit consent
- Send unsolicited marketing emails
- Use your data for targeted advertising
- Share quota or usage data with other users

---

## 4. Data Storage & Retention

### 4.1 Where Your Data is Stored

**Firebase (Google Cloud Platform):**
- Firestore database: User account data, quota information
- Firebase Authentication: Login credentials and session tokens
- Firebase Analytics: Anonymized usage statistics
- Location: Data may be stored in multiple regional Google Cloud data centers

**Backend Server:**
- FastAPI application logs
- Temporary image processing cache (cleaned up immediately after processing)
- Location: Depends on deployment region (Railway, Render, AWS, or Azure)

### 4.2 Retention Periods

| Data Type | Retention Period | Purpose |
|-----------|-----------------|---------|
| User Account (email, uid) | Until account deletion | Authentication & quota tracking |
| Daily Quota Records | 30 days | Fair usage enforcement |
| Backend Logs | 7 days | Debugging & error tracking |
| Firebase Analytics | 2 years | Service improvement & analytics |
| Images/Photos | Not stored | Processed in real-time, deleted after use |
| Contact Form Data | 30 days | Support & inquiry response |

### 4.3 Image Processing

**Important:** Photos you upload for editing are:
- **NOT permanently stored** on our servers
- Processed in real-time in your browser or our backend
- Deleted immediately after processing
- Never used for any purpose other than editing
- Never analyzed for training machine learning models without consent

Images remain in your browser's memory until:
- You navigate away from the page
- You refresh the browser
- You clear your browser's cache
- Your session ends

---

## 5. Third-Party Services & Integrations

### 5.1 Firebase (Google)

**What Firebase Does:**
- **Authentication:** Manages your Google Sign-in securely
- **Firestore:** Stores your account data and quota information
- **Analytics:** Collects anonymized usage statistics

**Data Shared:** Email address, user ID, usage patterns

**Firebase Privacy Policy:** https://policies.google.com/privacy

**Data Protection:** Firebase implements encryption in transit and at rest. Data is subject to Google Cloud's security standards.

### 5.2 Rembg (Background Removal)

**What Rembg Does:**
- Processes images to remove backgrounds using AI

**Data Shared:** Only the image you're processing (temporarily)

**Data Retention:** Images are processed and discarded immediately; not retained

**Rembg Privacy:** If using cloud-based rembg, refer to the provider's privacy policy. Local rembg installation retains no data.

### 5.3 Google AdSense

**What AdSense Does:**
- Displays contextual advertisements on the PhotoLab website
- Collects data about ad interactions

**Data Shared:** Browser information, cookie data, general location data

**AdSense Privacy:** https://policies.google.com/privacy

---

## 6. Security Measures

We implement the following security practices:

### 6.1 Data Protection

- **Encryption in Transit:** All communications use HTTPS/SSL encryption
- **Encryption at Rest:** Sensitive data in Firestore is encrypted by Google Cloud
- **Authentication:** Firebase Authentication with OAuth 2.0
- **Password Security:** We do not store passwords (Google handles authentication)

### 6.2 Access Controls

- Only authorized personnel can access user data
- Data access is logged and monitored
- Principle of least privilege: staff access only data necessary for their role

### 6.3 Image Security

- Images are processed server-side in isolated environments
- No image data is logged or stored
- Processing happens in secure, temporary containers

### 6.4 Regular Updates

- Dependencies are regularly updated for security patches
- Security vulnerabilities are addressed promptly
- Code is reviewed for common security issues

---

## 7. Your Privacy Rights

Depending on your location, you may have the following rights:

### 7.1 GDPR Rights (EU/EEA Users)

- **Right to Access:** Request a copy of your personal data
- **Right to Rectification:** Correct inaccurate information
- **Right to Erasure:** Request deletion of your data ("Right to be Forgotten")
- **Right to Restrict Processing:** Limit how we use your data
- **Right to Data Portability:** Receive your data in a machine-readable format
- **Right to Object:** Oppose certain uses of your data
- **Right to Lodge a Complaint:** File a complaint with your local data protection authority

### 7.2 CCPA Rights (California Users)

- **Right to Know:** What personal information is collected
- **Right to Delete:** Request deletion of collected data
- **Right to Opt-Out:** Opt out of the sale of personal information
- **Right to Non-Discrimination:** No discriminatory treatment for exercising privacy rights

### 7.3 How to Exercise Your Rights

To exercise any privacy right, please contact us at: **privacy@photolab.com**

Include the following in your request:
- Your email address or user ID
- The specific right you're requesting
- Proof of identity (for sensitive requests)

We will respond to requests within 30 days.

---

## 8. Account Deletion

To delete your PhotoLab account and all associated data:

1. Sign in to your PhotoLab account
2. Go to Account Settings
3. Select "Delete Account"
4. Confirm deletion

Upon deletion, we will:
- Remove your email and user ID from Firestore
- Delete all quota records
- Remove your Firebase Authentication account
- Retain no personal information (except as required by law)

**Note:** Deletion is permanent and cannot be undone.

---

## 9. Children's Privacy

PhotoLab Studio is **not intended for children under 13** (or the applicable age of digital consent in your jurisdiction).

We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete such information promptly.

**For parents/guardians:** If you believe your child has created an account, please contact us at privacy@photolab.com, and we will investigate and delete the account if appropriate.

---

## 10. International Data Transfers

PhotoLab uses Firebase (Google Cloud Platform), which stores data in multiple geographic regions. When you use PhotoLab, your data may be transferred to, stored in, or processed in countries other than your country of residence.

These countries may have data protection laws that differ from your country. By using PhotoLab, you consent to:
- Transfer of your information internationally
- Processing of your information according to this Privacy Notice
- Application of U.S. and other applicable laws

**Google Cloud Data Residency:** For more information, see https://cloud.google.com/architecture/multi-region-data-residency

---

## 11. Cookies & Tracking Technologies

### 11.1 Session Cookies

We use session cookies to:
- Maintain your login session
- Remember your editing preferences
- Track your session activity for security

These cookies are:
- Non-persistent (deleted when you close your browser)
- Essential for service functionality
- Not shared with third parties

### 11.2 Third-Party Cookies

Firebase Analytics and Google AdSense may set cookies to:
- Track usage patterns
- Serve personalized advertisements
- Measure ad performance

You can control cookies through:
- Your browser settings
- Google's ad preferences: https://adssettings.google.com
- Opt-out tools for specific services

---

## 12. Changes to This Privacy Notice

We may update this Privacy Notice periodically to reflect:
- Changes in our data practices
- New features or services
- Legal or regulatory requirements

**What we will do:**
- Post the updated notice on this page
- Update the "Last Updated" date
- For material changes, provide prominent notice (email or banner)

**Your responsibility:** Review this notice periodically for updates. Continued use of PhotoLab after changes constitutes acceptance of the updated Privacy Notice.

---

## 13. Contact Us

If you have questions, concerns, or requests regarding this Privacy Notice or our privacy practices, please contact us:

**Email:** privacy@photolab.com

**Response Time:** We aim to respond to privacy inquiries within 30 days.

---

## 14. Data Protection Officer (DPO)

If you are in the EU or have questions about GDPR compliance, you may contact our Data Protection Officer:

**Email:** dpo@photolab.com

---

## 15. Regulatory Compliance

### 15.1 Applicable Laws

- **GDPR (General Data Protection Regulation):** EU/EEA users
- **CCPA (California Consumer Privacy Act):** California residents
- **LGPD (Lei Geral de Proteção de Dados):** Brazil
- **Other Regional Privacy Laws:** As applicable

### 15.2 Lawful Basis for Processing

We process your data under the following lawful bases:
- **Consent:** You have given explicit permission (e.g., Google Sign-in)
- **Contract:** Processing is necessary to provide the service
- **Legal Obligation:** We are required by law
- **Legitimate Interests:** We have a valid business reason (e.g., service improvement)

---

## 16. Supplementary Information

### 16.1 Image Quality & Cloud Processing

PhotoLab may use cloud services (Firebase, Google Cloud) for:
- Authenticating your identity
- Storing your quota information
- Logging and debugging

Images are processed on your local machine or our backend but are **never permanently retained** in cloud storage.

### 16.2 Backup & Disaster Recovery

For business continuity, we maintain encrypted backups of:
- User account data
- Quota records
- Application logs

Backups are retained for 30 days and are subject to the same privacy protections as live data.

### 16.3 Law Enforcement & Legal Requests

We may disclose your information if:
- Required by law or legal process
- Necessary to protect our legal rights
- Needed to prevent fraud or security threats
- Required to protect user safety

We will notify you of legal requests unless prohibited by law.

---

## 17. Disclaimer

This Privacy Notice is provided for informational purposes. While we strive for accuracy, this notice should not be construed as legal advice. For specific legal questions, please consult with a qualified attorney.

---

## 18. Acknowledgment

By using PhotoLab Studio, you acknowledge that you have read, understood, and agree to this Privacy Notice. If you do not agree with our privacy practices, please do not use our service.

---

**PhotoLab Studio Privacy Notice**  
Effective Date: May 3, 2026  
Last Updated: May 3, 2026

---

*For the most current version of this Privacy Notice, visit: [photolab.com/privacy]()*
