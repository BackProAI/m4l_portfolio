# Implementation Plan: Portfolio Analysis Web Application

## Plan: Portfolio Analysis & Advisory Tool

**TL;DR**: Build a TypeScript/React single-page application that collects investor profile data through five dropdown questions, accepts portfolio documents via drag-and-drop, analyzes them using Claude 3.5 Sonnet API, and delivers comprehensive results both on-screen and via email. The application will be styled to match mlfs.com.au branding (professional blue and white financial theme), optimized for iframe embedding, and deployed to Vercel with full security considerations for API key protection and data privacy.

**Key Decisions**: 
- Claude 3.5 Sonnet chosen for superior document analysis capabilities with multi-modal input
- Next.js 14 with App Router for API route protection and SSR capabilities
- Resend for transactional email with React Email templates
- Tailwind CSS for rapid styling matching mlfs.com.au color palette
- Vercel Blob Storage for temporary file handling with automatic cleanup
- PDF.js, Mammoth, and SheetJS for client-side document parsing before API submission

---

## Steps

### Phase 1: Project Initialization & Structure (Day 1)

**1.1 Create Next.js TypeScript Project**

Initialize a new Next.js project with TypeScript at the root workspace directory portfolio_m4l using create-next-app with the App Router configuration. Select TypeScript, ESLint, Tailwind CSS, and App Router options during setup. This provides the foundation for both client-side React components and secure server-side API routes.

**1.2 Establish Project Structure**

Create the following directory structure:

- `src/app/page.tsx` - Main application page component
- `src/app/layout.tsx` - Root layout with metadata and global styles  
- `src/app/api/analyze/route.ts` - API route for Claude integration
- `src/app/api/email/route.ts` - API route for email sending
- `src/components/QuestionnaireSection.tsx` - Five dropdown questions component
- `src/components/FileUploadZone.tsx` - Drag-and-drop file upload interface
- `src/components/LoadingAnimation.tsx` - Processing state indicator
- `src/components/AnalysisResults.tsx` - Results display component
- `src/components/EmailForm.tsx` - Email capture and send component
- `src/lib/claudeClient.ts` - Claude API integration utilities
- `src/lib/emailClient.ts` - Email service integration
- `src/lib/fileParser.ts` - Document parsing utilities
- `src/lib/promptBuilder.ts` - Dynamic prompt construction for Claude
- `src/types/index.ts` - TypeScript interfaces for questionnaire, analysis results, file types
- `src/styles/theme.ts` - mlfs.com.au color scheme constants
- `public/mlfs-branding/` - Logo and brand assets directory

**1.3 Install Core Dependencies**

Add the following packages to `package.json`:
- `@anthropic-ai/sdk` (version 0.20.0 or latest) - Official Anthropic SDK for Claude API
- `react-dropzone` (version 14.x) - Accessible drag-and-drop file upload
- `pdfjs-dist` (version 4.x) - PDF text and structure extraction
- `mammoth` (version 1.7.x) - Word document (.docx) conversion to HTML/text
- `xlsx` (version 0.18.x) - Excel spreadsheet parsing
- `resend` (version 3.x) - Transactional email API
- `react-email` (version 2.x) and `@react-email/components` - Email template system
- `zod` (version 3.x) - Runtime validation for API inputs
- `clsx` and `tailwind-merge` - Utility for conditional CSS classes
- `@vercel/blob` (if using Vercel Blob Storage) - Temporary file storage
- `react-markdown` - For rendering markdown analysis results

Install all dependencies using npm install.

### Phase 2: Design System & Branding (Day 1-2)

**2.1 Extract mlfs.com.au Color Scheme**

Create `src/styles/theme.ts` with color constants extracted from mlfs.com.au website:
- Primary Blue: Use deep professional blue (approximately #1B4F7B or similar from their headers)
- Secondary Blue: Lighter blue for accents and hover states  
- White/Off-White: #FFFFFF and #F8F9FA for backgrounds
- Text Colors: Dark gray (#2C3E50) for body text, lighter gray (#6C757D) for secondary text
- Accent Color: Gold/orange for call-to-action buttons (approximately #E67E22 or their CTA color)
- Success Green: For confirmations and positive indicators
- Border Colors: Light gray (#E0E0E0) for subtle separations

Define spacing scale, typography (likely professional sans-serif like Inter or similar), border radius values, and shadow utilities matching the professional financial advisory aesthetic.

**2.2 Configure Tailwind Theme**

Extend `tailwind.config.ts` to use the color palette from `theme.ts`. Map mlfs primary blue to primary, accent colors appropriately, and ensure all custom colors are accessible. Configure the content paths to include all source files. Add custom font family if matching mlfs typography exactly.

**2.3 Create Reusable UI Components**

Build foundational components in `src/components/ui/`:
- `Button.tsx` - Primary, secondary, and ghost button variants with loading states
- `Select.tsx` - Styled dropdown component for questionnaire
- `Card.tsx` - Container component for sections with proper shadows and borders
- `Badge.tsx` - For fund type indicators and status labels
- `Alert.tsx` - Success/error message display component

All components should use the mlfs.com.au color scheme and support disabled and loading states.

### Phase 3: Questionnaire Interface (Day 2)

**3.1 Define TypeScript Types**

In `src/types/index.ts`, create interfaces for:
- `InvestorProfile` with fields: `investorType` (union type of 'High Growth' | 'Growth' | 'Balanced' | 'Conservative' | 'Defensive'), `phase` ('Accumulation' | 'Investment' | 'Non-super' | 'Pension'), `ageRange` ('Under 40' | '40-60' | '60-80' | '80+'), `fundCommentary` (boolean), `valueForMoney` (boolean)
- `UploadedFile` with properties: `file` (File object), `type` (FileType enum), `status` (UploadStatus enum), `parsedContent` (optional string)
- `AnalysisResult` interface with nested objects for each analysis section

**3.2 Build QuestionnaireSection Component**

Create `src/components/QuestionnaireSection.tsx` as a controlled form component that:
- Renders five Select dropdowns in a grid layout (responsive: single column mobile, two columns tablet, two columns desktop with fifth spanning)
- Question 1: "What type of investor are you?" with options listed in requirements
- Question 2: "What phase are you in?" with four phase options  
- Question 3: "How old are you?" with four age ranges
- Question 4: "Give me commentary on each managed fund?" with Yes/No
- Question 5: "Are these funds value for money?" with Yes/No
- Maintains state via useState hook or form management library
- Validates that all questions are answered before enabling file upload section
- Uses consistent spacing and the mlfs.com.au blue theme for active states

**3.3 Implement Form Validation**

Add validation logic to ensure all five questions are answered before proceeding. Display a subtle indicator (checkmark or count like "3/5 completed") to guide users. Disable the file upload zone until questionnaire is complete. Use Zod schema for runtime validation.

### Phase 4: File Upload System (Day 2-3)

**4.1 Create FileUploadZone Component**

Build `src/components/FileUploadZone.tsx` using react-dropzone that:
- Displays a prominent drop zone with dashed border in mlfs.com.au accent blue when active
- Shows "Drag & drop your portfolio documents here, or click to browse" with file type indicators
- Accepts PDF (.pdf), Word (.docx), and Excel (.xlsx, .xls) files only
- Supports multiple file uploads (allow 1-5 files typical for portfolios)
- Validates file types and sizes (limit to 10MB per file for reasonable API processing)
- Shows upload progress and file list with remove option
- Displays file preview cards with icon, name, size, and status

**4.2 Implement Client-Side File Parsing**

Create `src/lib/fileParser.ts` with async functions:
- `parsePDF`: Use pdfjs-dist to extract text content from PDF files page by page, maintaining structure
- `parseDocx`: Use Mammoth to convert Word documents to clean text, preserving formatting hints
- `parseExcel`: Use xlsx (SheetJS) to read Excel files, converting sheets to CSV or JSON representation of cells

Each parser should return a structured object with filename, type, raw content, and optional metadata (page count, sheet names, etc.). Handle parsing errors gracefully and return error status if file is corrupted or password-protected.

**4.3 File State Management**

Manage uploaded files in component state as an array of `UploadedFile` objects. Track parsing status for each file (pending, processing, completed, error). Aggregate all parsed content to pass to the analysis API once user initiates analysis.

### Phase 5: Claude API Integration (Day 3-4)

**5.1 Set Up API Route**

Create `src/app/api/analyze/route.ts` as a Next.js API route (POST handler) that:
- Receives questionnaire data and parsed file content in request body
- Validates inputs using Zod schema to prevent malformed requests
- Constructs the Claude API request using @anthropic-ai/sdk
- Returns analysis results as JSON

Store the `ANTHROPIC_API_KEY` in environment variables (.env.local for development, Vercel environment variables for production). Never expose the API key to client-side code.

**5.2 Build Prompt Engineering System**

Create `src/lib/promptBuilder.ts` with a function `buildAnalysisPrompt` that:
- Takes `InvestorProfile` and parsed document content as inputs
- Constructs a comprehensive system prompt defining Claude's role as an expert financial portfolio analyst
- Includes the investor profile context (type, phase, age) to tailor advice
- Embeds the document content (portfolio statements, fund details) with clear delimiters
- Specifies the analysis structure required: current portfolio overview, risk profile assessment, alignment with investor type, fund-by-fund commentary (if requested), value-for-money assessment (if requested), diversification analysis, stress test scenarios, comparison to relevant index benchmarks, simplification suggestions, and actionable recommendations
- Uses XML tags for structure (similar to Anthropic's recommended practices for complex outputs)
- Explicitly requests JSON output format for programmatic parsing or markdown for display

Example prompt structure: The system message should establish Claude as a certified financial analyst. The user message should provide investor context in a structured format, followed by portfolio documents with clear section headers. The task specification should enumerate all required analysis sections and request specific formatting.

**5.3 Implement Claude API Call**

In `src/lib/claudeClient.ts`, create an `analyzePortfolio` function that:
- Instantiates Anthropic SDK client with API key from environment
- Calls `messages.create` with model `claude-3-5-sonnet-20241022` (latest Claude 3.5 Sonnet)
- Uses high max_tokens (4096-8000) to accommodate comprehensive analysis output
- Sets temperature to 0.3 for consistent, factual analysis (not creative)
- Passes the constructed prompt from `promptBuilder`
- Handles API errors gracefully (rate limits, authentication, network issues) and returns structured error response
- Extracts the analysis text from Claude's response

Rationale for Claude 3.5 Sonnet: Research indicates Claude 3.5 Sonnet provides superior performance for document analysis tasks, with better comprehension of financial terminology, stronger reasoning for portfolio recommendations, and ability to process multi-page documents effectively. The 200K context window easily handles multiple portfolio documents.

**5.4 Parse and Structure Results**

After receiving Claude's response, parse the output into the `AnalysisResult` TypeScript interface. If Claude returns markdown, store as-is. If JSON, validate and map to the interface. Include metadata like analysis timestamp, model version used, and token usage for debugging.

### Phase 6: Results Display (Day 4-5)

**6.1 Create AnalysisResults Component**

Build `src/components/AnalysisResults.tsx` that:
- Receives the `AnalysisResult` object as props
- Renders results in a clean, scannable layout using Card components
- Displays sections in logical order: Executive Summary, Current Portfolio Overview, Risk Profile Assessment, Alignment Analysis, Fund Commentary (if requested), Value Assessment (if requested), Diversification Analysis, Stress Test Scenarios, Benchmark Comparison, Simplification Suggestions, Recommendations
- Uses appropriate formatting for tables (fund allocations, stress tests), charts (if implementing visualization), and lists
- Includes visual indicators like risk rating badges, color-coded alignment status
- Renders markdown content from Claude using a markdown renderer (react-markdown) with custom styling
- Adds expand/collapse functionality for longer sections to improve UX
- Provides a "Email Results" button prominently at top and bottom

**6.2 Implement Data Visualization (Optional Enhancement)**

Consider adding recharts or Chart.js for visualizing:
- Portfolio allocation pie chart by asset class or fund
- Risk profile comparison (target vs. actual)
- Performance comparison charts if historical data available

Use mlfs.com.au color scheme for chart colors. This can be Phase 2 enhancement if timeline is tight.

**6.3 Loading State**

Create `src/components/LoadingAnimation.tsx` with:
- Animated spinner or skeleton loader using mlfs.com.au brand colors
- Progress indicator or estimated time ("Analyzing your portfolio... This may take 30-60 seconds")
- Motivational messages that rotate during processing ("Evaluating asset allocation...", "Comparing to market benchmarks...", "Generating recommendations...")

Display this component while the analyze API route is processing and hide when results arrive.

### Phase 7: Email Functionality (Day 5)

**7.1 Set Up Email Service**

Choose Resend for email delivery due to:
- Simple API and generous free tier (3000 emails/month)
- Excellent deliverability rates
- React Email template support
- Easy Vercel integration

Sign up for Resend, verify domain (or use sandbox for development), and add `RESEND_API_KEY` to environment variables.

**7.2 Create Email Templates**

Create `src/emails/AnalysisReportEmail.tsx` using React Email components:
- Design a professional HTML email template matching mlfs.com.au branding
- Include mlfs.com.au logo and colors
- Embed the full analysis results with proper formatting
- Add disclaimer footer about financial advice
- Keep total size reasonable for email clients (compress/optimize images)
- Create both HTML and plain text versions

The template should accept the `AnalysisResult` data and `InvestorProfile` as props to generate personalized content.

**7.3 Build Email API Route**

Create `src/app/api/email/route.ts` that:
- Receives email address, analysis results, and investor profile in POST body
- Validates email format using Zod validator
- Generates email HTML using React Email's render function with `AnalysisReportEmail` template
- Sends email via Resend API to the provided address
- Returns success/failure status to the client
- Implements rate limiting (1-2 emails per session) to prevent abuse
- Logs email sends for debugging (without storing personal data long-term)

**7.4 Create EmailForm Component**

Build `src/components/EmailForm.tsx` that:
- Displays an email input field with validation
- Shows a "Send to Email" button in mlfs.com.au accent color
- Handles form submission by calling the email API route
- Displays success message ("Analysis sent to your@email.com! Check your inbox.") or error message
- Disables re-sending for a cooldown period to prevent spam
- Includes checkbox for consent to receive email (optional, depending on privacy requirements)

### Phase 8: Iframe Optimization (Day 5-6)

**8.1 Configure Iframe-Friendly Settings**

In `src/app/layout.tsx`, ensure:
- No X-Frame-Options header that would block iframe embedding (or set to ALLOW-FROM mlfs.com.au)
- Include meta viewport tag for responsive rendering
- Remove any navigation or external links that would break out of iframe (or configure to open in new tab)
- Test that all functionality works within iframe context

**8.2 Communication with Parent Page**

Implement postMessage API in `src/app/page.tsx` to:
- Send height updates to parent page for responsive iframe sizing (window.parent.postMessage with height payload)
- Optionally receive configuration from parent (like pre-filled data or theme overrides)
- Handle completion events (notify parent when analysis is done)

Create clear documentation for iframe embedding with example HTML snippet and JavaScript for parent page.

**8.3 Testing in Iframe Context**

Create a test HTML page (`public/iframe-test.html`) that embeds the application in an iframe to verify:
- All interactive elements work correctly
- File upload functions properly
- No console errors related to cross-origin restrictions
- Responsive sizing works
- No visual cutoffs or scroll issues

### Phase 9: Security & Privacy (Day 6)

**9.1 API Key Protection**

Ensure all sensitive API keys (Anthropic, Resend) are:
- Stored in environment variables only
- Never exposed in client-side code or version control
- Accessed only in API routes (server-side)
- Rotated periodically and documented in team password manager

Add `.env.local` to `.gitignore` and create `.env.example` with placeholder values for documentation.

**9.2 Data Privacy Measures**

Implement privacy protections:
- Do not store uploaded portfolio documents persistently (process in memory or use temporary storage with automatic deletion)
- Clear parsed content from state after analysis completes
- If using file storage (Vercel Blob), set automatic expiration (1 hour)
- Do not log sensitive financial data in application logs
- Include privacy policy link in footer explaining data handling
- Comply with GDPR if applicable (consent mechanisms, right to data deletion)

**9.3 Input Validation & Sanitization**

Use Zod schemas in all API routes to:
- Validate request body structure
- Enforce file size limits
- Sanitize text inputs to prevent injection attacks
- Validate email format before sending
- Limit request rate to prevent abuse (implement rate limiting middleware or use Vercel's built-in protections)

**9.4 HTTPS & CORS Configuration**

Ensure:
- Application only runs over HTTPS in production (Vercel default)
- CORS headers allow mlfs.com.au domain if needed
- Content Security Policy headers restrict script sources

### Phase 10: Testing (Day 6-7)

**10.1 Unit Testing**

Create test files alongside components using Jest and React Testing Library:
- Test `QuestionnaireSection` dropdown selections and validation
- Test `FileUploadZone` accepts correct file types and rejects others
- Test `fileParser` functions with sample PDF, DOCX, XLSX files
- Test `promptBuilder` generates correct prompt structure
- Test email template renders correctly with sample data

Place tests in __tests__ directories or co-locate as ComponentName.test.tsx files.

**10.2 Integration Testing**

Test the full flow:
- Complete questionnaire → Upload files → Receive analysis → Email results
- Use mock Claude API responses for predictable testing
- Verify error handling paths (invalid files, API errors, network failures)
- Test with multiple file upload scenarios

**10.3 Manual Testing Checklist**

Test scenarios:
1. Mobile responsiveness (iOS Safari, Android Chrome)
2. Different file types (PDF-only, mixed files, Excel-only)
3. Questionnaire permutations (different investor types and preferences)
4. Large file handling (near 10MB limit)
5. Slow network conditions
6. Email delivery to various providers (Gmail, Outlook, Apple Mail)
7. Iframe embedding on mlfs.com.au staging site
8. Browser compatibility (Chrome, Firefox, Safari, Edge)

Document results in a testing spreadsheet or issue tracker.

### Phase 11: Deployment (Day 7)

**11.1 Vercel Configuration**

Create `vercel.json` or use Vercel dashboard to configure:
- Environment variables (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`)
- Build settings (Next.js framework auto-detected)
- Custom domain if applicable (portfolio.mlfs.com.au or similar)
- Function regions (deploy API routes to region closest to target audience)

**11.2 Deploy to Vercel**

Steps:
1. Push code to GitHub repository
2. Connect repository to Vercel project
3. Configure environment variables in Vercel dashboard
4. Trigger deployment (automatic on git push to main)
5. Verify deployment succeeds and application loads
6. Test all functionality in production environment

Vercel provides automatic HTTPS, CDN distribution, and edge functions for optimal performance.

**11.3 Set Up Monitoring**

Configure:
- Vercel Analytics for usage tracking and performance monitoring
- Error tracking (Sentry or Vercel's built-in error reporting)
- API route logging for debugging Claude and email service issues
- Uptime monitoring (optional, UptimeRobot or similar)

**11.4 Documentation for mlfs.com.au Team**

Create a `README.md` with:
- How to embed the application via iframe (complete code snippet)
- Environment variable requirements
- How to update branding/content
- Support contact information
- Usage limits and costs (Claude API, Resend, Vercel)

---

## Verification

### Testing the Complete Application

**Local Development Testing:**
1. Run npm run dev and navigate to the localhost address shown in the terminal output
2. Complete all five questionnaire dropdowns and verify validation works
3. Drag-and-drop or select a sample portfolio PDF file
4. Verify file parsing completes successfully (check browser console for parsed content)
5. Click "Analyze Portfolio" and observe loading animation
6. Confirm analysis results display with all sections populated
7. Enter email address and click "Send to Email"
8. Check inbox for properly formatted email with full analysis

**Iframe Integration Testing:**
1. Create test HTML file with iframe pointing to deployed Vercel URL
2. Verify application renders correctly within iframe constraints
3. Test all interactions work (dropdowns, file upload, buttons)
4. Confirm iframe height adjusts appropriately or scrolling works

**Production Deployment Testing:**
1. Deploy to Vercel and access via production URL
2. Test from multiple devices (mobile phone, tablet, desktop)
3. Verify HTTPS connection and no mixed content warnings
4. Submit real portfolio documents and validate Claude analysis quality
5. Confirm emails deliver successfully with correct formatting
6. Check Vercel dashboard for any errors or performance issues

**Claude API Quality Verification:**
1. Test with various investor profiles to ensure recommendations adapt appropriately
2. Verify fund commentary appears only when "Yes" is selected for question 4
3. Verify value-for-money analysis appears only when "Yes" is selected for question 5
4. Check that stress test scenarios are realistic and informative
5. Confirm benchmark comparisons are accurate and relevant

**Security Testing:**
1. Inspect client-side code and verify no API keys are exposed
2. Test file upload limits (try uploading 11MB file, wrong file type)
3. Attempt SQL injection or XSS attacks on input fields (should be sanitized)
4. Verify uploaded files are not accessible via predictable URLs
5. Test CORS by attempting API calls from unauthorized domains

---

## Decisions

### Technology Stack Decisions

**Next.js 14 with App Router (rather than Create React App)**
- Rationale: Provides secure API routes for handling Anthropic and Resend API calls without exposing keys to client. Built-in optimizations for production. Simpler deployment to Vercel. SSR capabilities if needed for SEO.

**Claude 3.5 Sonnet (rather than GPT-4, Gemini, or other models)**
- Rationale: Research demonstrates Claude 3.5 Sonnet excels at document analysis tasks with superior comprehension of financial terminology. The 200K token context window easily accommodates multiple portfolio documents. Strong reasoning capabilities for synthesizing recommendations. Anthropic API provides reliable multi-modal input handling.

**Resend (rather than SendGrid, AWS SES, or Mailgun)**
- Rationale: Modern API design, excellent deliverability rates, React Email template support for maintainable HTML emails, generous free tier sufficient for expected usage, simple Vercel integration.

**Client-Side File Parsing (rather than server-side)**
- Rationale: Reduces server load and processing time. Keeps sensitive financial documents in user's browser rather than uploading full files to server. Enables immediate feedback on file contents. PDF.js, Mammoth, and SheetJS are mature, well-tested libraries.

**Tailwind CSS (rather than styled-components or CSS Modules)**
- Rationale: Rapid development with utility classes, easy theme customization to match mlfs.com.au colors, excellent responsive design utilities, reduced CSS bundle size with purging, strong ecosystem.

**TypeScript (rather than JavaScript)**
- Rationale: Type safety prevents runtime errors, improved IDE intellisense for faster development, better documentation through type definitions, easier refactoring, matches modern best practices.

**Vercel Deployment (rather than AWS, Netlify, or self-hosted)**
- Rationale: Seamless Next.js integration, automatic HTTPS and CDN, environment variable management, preview deployments for testing, serverless functions for API routes scale automatically, excellent developer experience.

### Architecture Decisions

**Single-Page Application (rather than multi-step wizard)**
- Rationale: All information visible at once improves completion rates. Users can review and change answers easily. Simpler state management. Better for iframe embedding with predictable height.

**Results Display on Page AND Email (rather than email-only)**
- Rationale: Immediate gratification with on-page results. Email serves as permanent record and allows users to share with advisors. Reduces perceived wait time.

**Temporary File Storage (rather than persistent database)**
- Rationale: Privacy-first approach minimizes data retention liability. No sensitive portfolio data stored long-term. Reduces infrastructure complexity and costs. Complies with data protection best practices.

**API Routes for Third-Party Services (rather than client-side calls)**
- Rationale: Protects API keys from exposure. Allows request validation and rate limiting. Enables logging and monitoring. Prevents CORS issues with external services.

### Security Decisions

**No User Authentication (based on iframe embedding context)**
- Rationale: Application accessed via mlfs.com.au where users are presumably authenticated. Adding auth would complicate iframe integration. Stateless operation per request. Consider adding token-based verification if mlfs.com.au wants to restrict access.

**No Long-Term Data Storage**
- Rationale: Minimizes privacy risks and regulatory compliance burden. Users can re-run analysis if needed. Reduces infrastructure costs and complexity.

**Server-Side API Key Management**
- Rationale: Standard security practice. Next.js API routes run server-side only. Environment variables never exposed to browser.

### Design Decisions

**Match mlfs.com.au Branding (rather than custom design)**
- Rationale: Creates cohesive experience when embedded. Builds trust through consistent visual identity. Users perceive tool as official mlfs.com.au service.

**Questionnaire First, Then Upload (rather than either order)**
- Rationale: Logical flow mirrors consultation process. Ensures context is gathered before document analysis. Enables dynamic prompt customization. Prevents analysis without necessary context.

**Comprehensive Single Analysis (rather than iterative Q&A)**
- Rationale: More efficient use of Claude API (single large request vs. many small ones). Provides complete overview user can share with advisor. Reduces waiting time.

---

## Additional Considerations

### Cost Management

**Claude API Usage:**
- Claude 3.5 Sonnet costs approximately $3 per million input tokens, $15 per million output tokens
- Estimated token usage per analysis: 50K input tokens (documents + prompt), 8K output tokens = ~$0.27 per analysis
- Budget for 100 analyses/month initially = ~$27/month
- Monitor usage via Anthropic dashboard and set alerts

**Resend Email:**
- Free tier provides 3000 emails/month
- Unlikely to exceed unless viral adoption
- Monitor sending patterns and upgrade if needed

**Vercel Hosting:**
- Hobby plan free for personal projects, Pro plan $20/month for commercial
- Serverless function invocations and bandwidth included in reasonable amounts
- Consider Pro plan if embedding on commercial site

### Future Enhancements

**Phase 2 Features:**
- Interactive charts for portfolio visualization (recharts integration)
- Historical performance tracking if user saves results
- Ability to compare multiple scenarios (rerun with different questionnaire answers)
- PDF export of analysis report with professional formatting
- Integration with real-time market data APIs for current fund valuations
- Multi-language support if mlfs.com.au serves non-English clients

**Advanced Analytics:**
- Monte Carlo simulations for retirement projections
- Tax optimization suggestions based on phase and structure
- Estate planning considerations based on age and phase
- Insurance gap analysis if policy documents uploaded

### Maintenance Plan

**Regular Updates:**
- Monitor Anthropic for Claude API updates and new model versions
- Update dependencies monthly for security patches
- Review and refine Claude prompts based on user feedback
- Refresh mlfs.com.au branding if their site redesigns

**Performance Monitoring:**
- Track API response times and optimize if degrading
- Monitor Vercel function execution times
- Review email delivery rates and adjust templates if bouncing
- Analyze user drop-off points and optimize UX

### Compliance Notes

**Financial Advice Disclaimer:**
- Include prominent disclaimer that tool provides educational analysis, not personalized financial advice
- Recommend users consult with mlfs.com.au advisors before making decisions
- Add disclaimer to both on-page results and email footer

**Privacy Policy:**
- Document what data is collected (questionnaire responses, email address)
- Explain how documents are processed (not stored permanently)
- Provide contact for data deletion requests
- Link privacy policy in footer

**Accessibility:**
- Ensure dropdowns are keyboard navigable
- Add ARIA labels to file upload zones
- Maintain sufficient color contrast ratios (check mlfs.com.au colors meet WCAG AA)
- Test with screen readers

---

## Project Timeline

**Day 1:** Project setup, dependencies, design system, questionnaire  
**Day 2-3:** File upload, parsing, and validation  
**Day 3-4:** Claude API integration and prompt engineering  
**Day 4-5:** Results display and UI polish  
**Day 5:** Email functionality and templates  
**Day 5-6:** Iframe optimization and security hardening  
**Day 6-7:** Testing and deployment  

**Total Estimated Time:** 7 days for MVP with single developer  

**Post-Launch:** 2-3 days for user feedback incorporation and refinements

---

## Quick Reference: Key File Locations

### Core Application Files
- `src/app/page.tsx` - Main page
- `src/app/layout.tsx` - Root layout
- `src/app/api/analyze/route.ts` - Portfolio analysis endpoint
- `src/app/api/email/route.ts` - Email sending endpoint

### Components
- `src/components/QuestionnaireSection.tsx` - Five questions
- `src/components/FileUploadZone.tsx` - File upload
- `src/components/AnalysisResults.tsx` - Results display
- `src/components/EmailForm.tsx` - Email form
- `src/components/LoadingAnimation.tsx` - Loading state
- `src/components/ui/` - Reusable UI components

### Utilities & Configuration
- `src/lib/claudeClient.ts` - Claude API integration
- `src/lib/fileParser.ts` - Document parsing
- `src/lib/promptBuilder.ts` - Prompt construction
- `src/lib/emailClient.ts` - Email utilities
- `src/types/index.ts` - TypeScript interfaces
- `src/styles/theme.ts` - mlfs.com.au colors
- `tailwind.config.ts` - Tailwind configuration

### Email Templates
- `src/emails/AnalysisReportEmail.tsx` - Email template

### Environment Variables
- `.env.local` - Development environment variables
- `.env.example` - Example environment file

### Required Environment Variables
```
ANTHROPIC_API_KEY=your_anthropic_api_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:PORT
```

*Replace PORT with the port number shown when running the dev server (typically 3000)*

---

This implementation plan provides a complete roadmap from initialization through deployment, with specific technical decisions justified by requirements and research findings. The architecture prioritizes security, privacy, and user experience while maintaining iframe compatibility and mlfs.com.au brand consistency.
