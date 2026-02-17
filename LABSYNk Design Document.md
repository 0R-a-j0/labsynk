# **LABSYNk Design Document**

**Prepared for:** Antigravity Development Team **Version:** 1.0 **Date:** January 22, 2026

## **1\. Project Overview**

LABSYNk is a dual-layer academic platform designed to modernize engineering education. It combines **physical inventory management** with **digital learning resources (AI & Simulations)**.

* **Core Philosophy:** "The Smart Lab Ecosystem" – moving from manual registers to a digitized, intelligent environment.  
* **Key Value Prop:** Maximizing ROI on equipment and integrating virtual labs (vLabs IIT Bombay) directly into the student workflow.

---

## **2\. Visual System & UI Specifications (From Screenshot)**

The UI should reflect the "future of engineering" aesthetic seen in the provided visual reference.

### **2.1. Color Palette**

* **Primary Background:** Deep Indigo/Violet Gradient (Hex approx: `#2A1B75` to `#4834A6`).  
* **Secondary Background:** Soft Periwinkle/Ice Blue (Hex approx: `#DCE8FF` for header/contrast sections).  
* **Accent/Highlights:** Cyan/Teal (Hex approx: `#00D4FF`) – Used for grid lines, active states, and call-to-action buttons.  
* **Typography:** White (Primary text) and Dark Blue (Text on light backgrounds).

### **2.2. Layout Structure**

* **The "Grid" Aesthetic:** The design uses distinct cyan grid lines to separate content blocks. This should be implemented using CSS borders or a grid system to maintain the "blueprint/technical" feel.  
* **Split View:** The interface frequently contrasts light and dark sections (as seen in the header vs. the hero section).  
* **Imagery:** Use high-quality engineering imagery (servers, circuit boards) with rounded corners (`border-radius: 12px` or similar) to soften the industrial look.

---

## **3\. System Architecture**

### **3.1.**

High-Level Stack

* **Frontend:** React.js (Web Dashboard for Admin) \+ React Native (Mobile App for Students).  
* **Backend:** Python (FastAPI or Django) – *Selected for superior scraping and AI libraries.*  
* **Database:**  
  * **PostgreSQL:** For relational data (Users, Inventory, Schedules).  
  * **Vector DB (e.g., Pinecone/Chroma):** For storing embeddings of syllabus PDFs to enable AI context.  
* **AI/ML:** Google Gemini API (Chatbot & Parsing) \+ BeautifulSoup (Scraping vLabs).

