# **Product Requirements Document (PRD)**

**Project Name:** LABSYNk

**Version:** 1.0

**Status:** Draft

**Target Audience:** Engineering Colleges, Lab Instructors, Students, Administrators

## **1\. Executive Summary**

**LABSYNk** is a comprehensive laboratory resource management and academic assistance platform tailored for engineering institutions. It aims to bridge the gap between physical lab inventory, academic schedules, and digital learning resources.

The platform resolves common issues such as equipment shortages, scheduling conflicts, and lack of access to simulation tools. It leverages AI to map syllabus PDFs to relevant virtual labs (like vLabs IIT Bombay) and provides an automated escalation system for inventory procurement.

## **2\. User Personas & Roles**

| Role | Access Level | Primary Goals |
| ----- | ----- | ----- |
| **Student** | **Public/No Login Required** | Check component availability, view schedules, access virtual lab links, report broken equipment, ask AI for STEM help. |
| **Lab Assistant / Instructor** | **Secure Login** | Manage inventory, schedule labs, upload syllabus PDFs, receive stock warnings. |
| **HOD (Head of Dept)** | **Secure Login** | Oversee department inventory, receive monthly procurement emails. |
| **Principal** | **Secure Login** | High-level oversight, receive escalation emails for long-term unresolved issues. |

## **3\. Functional Requirements**

### **3.1. Inventory & Stock Management**

* **Public Stock View:** Students must be able to search for components (e.g., "Arduino Uno", "Oscilloscope") and see real-time availability without logging in.  
* **Inventory CRUD:** Lab Assistants can Add, Update, or Delete equipment records.  
* **Fault Reporting:** Students can flag specific equipment as "Faulty/Broken." This flags the item in the dashboard for the Assistant to review.  
* **Low Stock Logic:**  
  * The system monitors quantity levels.  
  * **Immediate Action:** If stock drops below a defined threshold, an in-app warning is sent to the Lab Assistant.

### **3.2. Intelligent Scheduling System**

* **Conflict-Free Booking:** Assistants can create lab schedules. The system must prevent double-booking of physical rooms or overlapping batches.  
* **Student View:** Students can view the timetable based on their semester and branch.

### **3.3. AI Syllabus Parser & Simulation Mapping (Core Feature)**

* **PDF Upload:** Lab Assistants upload the semester syllabus PDF.  
* **AI Parsing:** An AI model processes the PDF to identify:  
  * Subject Names  
  * List of Experiments per Subject  
* **Simulation Scraper:**  
  * The system scrapes trusted educational repositories (specifically **vLabs IIT Bombay**, **Spoken Tutorial**, and similar open-source platforms).  
  * It maps specific syllabus experiments to the corresponding free virtual simulation links.  
* **Output:** When a student views a specific lab in the app, they see a direct "Launch Simulation" button next to the experiment name.

### **3.4. Automated Email Escalation System**

The system acts as an automated watchdog for procurement and maintenance.

* **Level 1 (Assistant):** Real-time dashboard warnings for low stock.  
* **Level 2 (HOD):**  
  * **Trigger:** End of Month.  
  * **Action:** Automated email compiling all "Low Stock" and "Faulty Equipment" reports sent to the HOD.  
* **Level 3 (Principal):**  
  * **Trigger:** If a low-stock/faulty item remains unresolved (no status change) for **6 months**.  
  * **Action:** Automated escalation email sent to the Principal regarding administrative negligence or funding issues.

### **3.5. AI Student Companion (Chatbot)**

* **Context:** The chatbot is STEM-focused.  
* **Navigation Logic:**  
  * **Input:** "I am a CSE 3rd Sem student looking for the Database Lab."  
  * **Action:** The bot should parse the intent and generate a dynamic button/link: *\[Go to CSE 3rd Sem DB Lab\]*.  
* **Educational Support:** The bot answers conceptual questions related to the experiments (e.g., "Explain normalization in DBMS" or "How does a 555 timer work?").

## **4\. User Stories**

**Story 1: The Student**

"As a student, I realized I need a 10k resistor for my project. I open LABSYNk on my phone (without logging in), search '10k resistor', and see that Lab 3 has 50 in stock. I also see that Lab 3 is free right now, so I go there."

**Story 2: The Simulation**

"As a student, I missed my fluid mechanics lab. I tell the chatbot 'Show me the Venturimeter experiment.' The bot identifies my syllabus and provides a link to the vLabs IIT Bombay simulation for that specific experiment."

**Story 3: The Neglected Lab**

"As a Principal, I receive an email stating that 'Oscilloscopes in the EEE Department have been marked broken for 6 months without replacement.' I can now take administrative action."

## **5\. Technical Recommendations (For Antigravity Team)**

### **5.1. Tech Stack**

* **Frontend:** React Native (Mobile) or React.js (Web) for a responsive experience.  
* **Backend:** Node.js/Python (Django or FastAPI). Python is preferred for scraping and AI integration.  
* **Database:** PostgreSQL (Relational data for inventory) \+ Vector Database (for storing syllabus contexts).  
* **AI Models:**  
  * **LLM:** Gemini API or OpenAI API (for Chatbot and Syllabus Parsing).  
  * **Scraping:** BeautifulSoup/Selenium (for fetching simulation links).

### **5.2. Security**

* **Authentication:** JWT or Firebase Auth for Assistants, HODs, and Principals.  
* **Rate Limiting:** Prevent students from spamming the "Report Faulty" feature.

---

### **3.6. Git & GitHub CI Workflow**

* **Repository Initialization:** Project code is hosted on the developer's GitHub profile.
* **Continuous Push:** After each complete development step/phase, all changes are committed and pushed to the remote repository, keeping a clear audit trail.

### **3.7. Resource Hub**

A curated collection of external tools and platforms organized into three domains to support lab work, civic-tech projects, and entrepreneurship.

#### 3.7.1 Internet of Things (IoT) Hub
* **PCB Design:** EasyEDA (web-based), KiCad (open-source), PCBWay / JLCPCB (manufacturing).
* **Simulation:** Wokwi (Arduino/ESP32/RPi Pico browser simulator), Tinkercad Circuits (beginner-friendly).
* **Programming:** Arduino IDE Web Editor, PlatformIO (VS Code), MicroPython / Programiz.

#### 3.7.2 E-Governance & Civic Tech
* **Open Data & Analytics:** OGD Platform (data.gov.in), Kaggle civic datasets, Metabase / Apache Superset.
* **Service Prototyping & Workflow:** Draw.io (Diagrams.net), Postman (API Setu testing).
* **Security & Identity:** OWASP guidelines, Hyperledger (blockchain for governance).

#### 3.7.3 Innovation & Entrepreneurship
* **Business Modeling & Planning:** Lean Canvas / Strategyzer templates, Notion Startup Templates.
* **Pitching & Prototyping:** Canva / Figma (UI prototypes, pitch decks), Framer (landing pages).
* **Ecosystem & Validation:** Startup India Portal (DPIIT), Y Combinator Startup Library.

### **3.8. Inventory Classification & Bug Fix**

* **Classification Hierarchy:** Inventory items are classified by **College → Department → Subject**.
* **Bug Fix:** Fix the current inventory registration issue (items not registering after UI changes). Investigate and resolve within the "Low Stock Alerts & Email" phase.

### **3.9. Lab Manual Support (VLabs)**

* **Student View:** Add an option to view/download a Lab Manual PDF for each subject in the Virtual Labs page (no AI involvement, purely a file link).
* **Admin Dashboard:** Add an option in the Labs dashboard for admins to upload a Lab Manual PDF per subject.

### **3.10. Department-Scoped Role Access**

* **User Model Update:** HODs and Lab Assistants have a `department` field associated with their account.
* **Access Control:** HODs and Lab Assistants can only view and edit data belonging to their own department. Enforced at both API and UI level.

### **3.11. Revamped Schedule Booking Form**

The existing schedule booking form is replaced with a cascading-dropdown form that pulls all options from the database:

1. **College** — dropdown (from `colleges` table).
2. **Department** — dropdown (filtered by selected college, from `departments` table).
3. **Semester** — dropdown (filtered by selected department, from available semesters in `vlab_subjects`).
4. **Lab Subject** — dropdown (filtered by department + semester, from `vlab_subjects`). Includes an **"Other"** option at the end; selecting it reveals a free-text input.
5. **Date** — date picker (separate from time).
6. **Time** — time picker (separate from date).
7. **Lab Instructor** — dropdown (from `users` table where `role = 'assistant'` and matching department). Includes an **"Other"** option with a free-text fallback.
8. **Lab Room** — dropdown (from a rooms list or existing `location` values in the system).

---

## **6\. Success Metrics**

* Reduction in lab scheduling conflicts.  
* Increase in student usage of virtual simulations (vLabs).  
* Reduction in time taken to replace faulty equipment (due to the escalation system).
* Student engagement with Resource Hub tools.
* Adoption of lab manual downloads.
* Accuracy of department-scoped access enforcement.

