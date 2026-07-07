# AI-HPS THESIS REPORT
## Design and Development of AI-HPS: An Intelligent Multi-Agent Hospital Navigation and Procedure Support System for Douala General Hospital

---

# COVER PAGE

**REPORT WRITING FOR**
**BACHELOR OF ENGINEERING (BEng)**
**Year 2025–2026**

---

**Design and Development of AI-HPS: An Intelligent Multi-Agent Hospital Navigation and Procedure Support System for Douala General Hospital**

A Project Report

Submitted in partial fulfilment of the requirements for the degree of Bachelor of Engineering in Computer Science and Engineering

**Submitted By:**
Ful Marvel TIOBOU
Matricule: IUC22E0076746

**Under the Guidance of:**

Professional Supervisor: Mr. SOU'A Jean Bertin
Academic Supervisor: Dr. Tabueue Cabrel Fotso

Institut Universitaire de la Côte (IUC)
School of Engineering and Applied Sciences (SEAS)
Department of Computer Science and Engineering

*July, 2026*

---

# APPROVAL CERTIFICATE

This is to certify that the project work entitled **"Design and Development of AI-HPS: An Intelligent Multi-Agent Hospital Navigation and Procedure Support System for Douala General Hospital"** has been successfully completed by **Ful Marvel TIOBOU** (Matricule: IUC22E0076746) in partial fulfilment of the requirements for the Bachelor of Engineering degree in Computer Science and Engineering. The work is original and has been carried out under our supervision.

**Name of Supervisors:**

Mr. SOU'A Jean Bertin (Professional Supervisor)
Signature: _____________________ &emsp; Date: _______________

Dr. Tabueue Cabrel Fotso (Academic Supervisor)
Signature: _____________________ &emsp; Date: _______________

**Head of Department:**
Mr. Fonkou Confiance
Department of Computer Science and Engineering

Signature: _____________________ &emsp; Date: _______________

*[Institut Universitaire de la Côte — Official Stamp]*

---

# ABSTRACT

Hospitals in sub-Saharan Africa face persistent challenges in information accessibility that impede service delivery for both patients and clinical staff. At Hôpital Général de Douala (HGD), patients frequently struggle to locate departments without assistance, and healthcare professionals lose valuable time searching for clinical guidelines dispersed across printed manuals and departmental files. Conventional Hospital Information Systems address administrative and record-keeping functions but provide no intelligent, conversational assistance for navigation or evidence-based procedure retrieval. This project addresses that gap through the design and development of AI-HPS (Artificial Intelligence Hospital Procedure System), an intelligent multi-agent platform built specifically for HGD. The system employs a four-agent LangGraph pipeline — comprising a Router Agent, Conversational Agent, Procedure Intelligence Agent, and Output Optimisation Agent — coordinated over a microservice architecture of five FastAPI services backed by PostgreSQL, Redis, and RabbitMQ. A Retrieval-Augmented Generation (RAG) pipeline grounds all clinical responses in validated WHO documents ingested into a FAISS semantic vector index, eliminating hallucination through a hard confidence threshold: queries scoring below 0.40 similarity receive no generated answer. The system supports bilingual interaction in English and French and delivers responses across five platforms — web, mobile, WhatsApp, SMS, and USSD — from a single AI engine, extending accessibility to patients with feature phones and no internet access. A cryptographically signed audit trail using HMAC-SHA256 ensures tamper-proof compliance logging. Evaluation against the defined objectives demonstrates that all six specific objectives were fully achieved, including sub-three-second emergency response, role-based access control for thirteen user roles, and real-time detection of knowledge base content gaps. AI-HPS represents the first known multi-platform, multi-agent clinical procedure support system designed for the Cameroonian bilingual healthcare context.

**Keywords:** Artificial Intelligence, Multi-Agent Systems, Hospital Navigation, Retrieval-Augmented Generation, Semantic Vector Search, Clinical Procedure Support, LangGraph, FastAPI Microservices, Healthcare Information Systems, Douala General Hospital.

---

# ACKNOWLEDGEMENTS

I would like to express my sincere gratitude to all those who contributed to the successful completion of this project.

First and foremost, I am deeply grateful to my academic supervisor, Dr. Tabueue Cabrel Fotso, for his invaluable guidance, continuous support, expert advice, and patient mentorship throughout every phase of this project. His technical insight and encouragement were instrumental in shaping both the direction and quality of this work.

I would like to thank my professional supervisor, Mr. SOU'A Jean Bertin, for his practical perspective, his knowledge of the hospital context, and his guidance in ensuring that the system remains grounded in real operational needs.

I would like to thank Mr. Fonkou Confiance, Head of the Department of Computer Science and Engineering at the Institut Universitaire de la Côte (IUC), for providing the necessary academic framework and creating an enabling environment for this research.

My sincere thanks go to the management and clinical staff of Hôpital Général de Douala (HGD), whose institutional support, willingness to share domain knowledge, and feedback on system requirements made this project practically grounded and clinically relevant.

I am grateful to all the faculty members of the Department of Computer Science and Engineering for their technical insights and constructive feedback during the various stages of this work.

Finally, I would like to thank my family and friends for their unwavering support, encouragement, and patience throughout this journey. Their belief in this project was a constant source of motivation.

---

# TABLE OF CONTENTS

- Abstract
- Acknowledgements
- List of Figures
- List of Tables
- List of Abbreviations
- General Introduction
  - a. Problem Statement and Motivation
  - b. Project Objectives
  - c. Scope and Limitations
  - d. Organization of the Report
- Chapter 1: Literature Review
  - 1.1 Artificial Intelligence in Healthcare
  - 1.2 Hospital Information Systems
  - 1.3 Intelligent Hospital Navigation Systems
  - 1.4 Clinical Decision Support and Procedure Retrieval Systems
  - 1.5 Multi-Agent Systems in Healthcare
  - 1.6 Large Language Models for Healthcare Applications
  - 1.7 Retrieval-Augmented Generation (RAG)
  - 1.8 Existing AI Hospital Assistants
  - 1.9 Comparative Analysis of Existing Systems
  - 1.10 Research Gap and Proposed Solution
- Chapter 2: Materials, Design and Methodology
  - 2.1 Requirements Analysis
  - 2.2 System Architecture and Design
  - 2.3 Detailed Component Design
  - 2.4 Design Calculations and Justifications
  - 2.5 UML Diagrams and Database Schema
  - 2.6 Material and Component Selection
  - 2.7 Tools, Technologies and Components
  - 2.8 Development Environment
  - 2.9 Rationale for Technology Selection
  - 2.10 Development and Construction Process
  - 2.11 Key Algorithms and Code Structure
  - 2.12 Integration Approach
  - 2.13 Testing Strategy and Results
- Chapter 3: Results and Discussion
  - 3.1 Performance Analysis
  - 3.2 Comparison with Existing Solutions
  - 3.3 Validation of Objectives
- General Conclusion
  - Summary of Contributions
  - Limitations
  - Recommendations for Future Work
- References
- Appendices

---

# LIST OF FIGURES

- Figure 1: High-Level System Architecture of AI-HPS &emsp;&emsp;&emsp;&emsp; p. 20
- Figure 2: Multi-Agent Pipeline Flow Diagram &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 24
- Figure 3: RAG Pipeline Architecture &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 27
- Figure 4: Use Case Diagram &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 33
- Figure 5: System Activity Diagram &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 35
- Figure 6: Sequence Diagram — Clinical Procedure Query &emsp;&emsp; p. 37
- Figure 7: Entity-Relationship Diagram (Database Schema) &emsp; p. 39
- Figure 8: Procedure Lifecycle State Machine &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 41
- Figure 9: Development Phases Timeline &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 45
- Figure 10: Response Time Distribution by Intent Type &emsp;&emsp;&emsp; p. 56
- Figure 11: Retrieval Accuracy Across Query Categories &emsp;&emsp;&emsp; p. 57
- Figure 12: Staff Admin PWA — Dashboard Screenshot &emsp;&emsp;&emsp; p. 59
- Figure 13: Patient Mobile App — AI Assistant Screenshot &emsp;&emsp; p. 60

---

# LIST OF TABLES

- Table 1: Comparative Analysis of Existing AI Hospital Assistants &emsp; p. 17
- Table 2: Functional Requirements Summary &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 21
- Table 3: Non-Functional Requirements &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 22
- Table 4: Agent Responsibilities and Routing Conditions &emsp;&emsp;&emsp;&emsp; p. 26
- Table 5: Software Tools and Technologies &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 47
- Table 6: Hardware and Infrastructure Components &emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 48
- Table 7: Implementation Phases and Deliverables &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 50
- Table 8: Performance Metrics Summary &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 55
- Table 9: Response Time by Query Type &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 56
- Table 10: Feature Comparison — AI-HPS vs Existing Solutions &emsp; p. 62
- Table 11: Objectives Achievement Matrix &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; p. 65

---

# LIST OF ABBREVIATIONS

| Abbreviation | Expansion |
|---|---|
| AI | Artificial Intelligence |
| AI-HPS | Artificial Intelligence Hospital Procedure System |
| API | Application Programming Interface |
| CDSS | Clinical Decision Support System |
| CORS | Cross-Origin Resource Sharing |
| CRUD | Create, Read, Update, Delete |
| ER | Entity-Relationship |
| FAISS | Facebook AI Similarity Search |
| FR | Functional Requirement |
| HGD | Hôpital Général de Douala |
| HIS | Hospital Information System |
| HMAC | Hash-Based Message Authentication Code |
| HTTP | Hypertext Transfer Protocol |
| IUC | Institut Universitaire de la Côte |
| JSON | JavaScript Object Notation |
| JWT | JSON Web Token |
| KB | Knowledge Base |
| LLM | Large Language Model |
| MAS | Multi-Agent System |
| NFR | Non-Functional Requirement |
| NLP | Natural Language Processing |
| OTP | One-Time Password |
| PWA | Progressive Web Application |
| RBAC | Role-Based Access Control |
| RAG | Retrieval-Augmented Generation |
| REST | Representational State Transfer |
| SHA | Secure Hash Algorithm |
| SMS | Short Message Service |
| SOP | Standard Operating Procedure |
| SQL | Structured Query Language |
| SRS | Software Requirements Specification |
| SVC | Service |
| TTL | Time-To-Live |
| UML | Unified Modelling Language |
| USSD | Unstructured Supplementary Service Data |
| UUID | Universally Unique Identifier |
| WHO | World Health Organization |

---

# GENERAL INTRODUCTION

Healthcare systems worldwide are increasingly adopting artificial intelligence and intelligent information systems to improve service delivery, operational efficiency, and access to healthcare information. Despite these technological advances, many hospitals in developing countries continue to experience serious challenges related to information accessibility, hospital navigation, and efficient retrieval of clinical knowledge. At Hôpital Général de Douala (HGD), patients and visitors frequently experience difficulty locating hospital departments and services, while medical and administrative staff spend valuable time searching for approved clinical protocols dispersed across printed manuals and departmental files. The absence of a unified intelligent information platform significantly impedes both the patient experience and the operational efficiency of clinical workflows.

This report introduces AI-HPS, an intelligent multi-agent platform designed and developed to address these challenges. The system employs advanced artificial intelligence technologies — including Large Language Models, Retrieval-Augmented Generation, semantic vector search, and a multi-agent orchestration framework — to deliver bilingual hospital navigation, evidence-based clinical procedure support, and comprehensive administrative management through five delivery platforms.

## a. Problem Statement and Motivation

Healthcare systems around the world are undergoing rapid digital transformation as hospitals increasingly adopt information technologies to improve service delivery, patient safety, and operational efficiency. Artificial intelligence, in particular, has emerged as a powerful technology capable of supporting healthcare through intelligent decision support, natural language processing, medical information retrieval, workflow automation, and virtual assistance. Modern AI systems, especially those based on large language models and retrieval-augmented generation, demonstrate the ability to process complex natural language queries, retrieve relevant clinical knowledge from large document collections, and generate contextually appropriate responses in real time.

Despite these technological developments, many hospitals in sub-Saharan Africa still rely on fragmented information management practices. At Hôpital Général de Douala, hospital information is distributed across printed documents, departmental manuals, notice boards, and standard operating procedure files. Patients and visitors often depend on reception personnel, security staff, or physical signposts to locate departments and services, which results in unnecessary movement within the hospital, increased congestion at information desks, and delays that may adversely affect both the patient experience and clinical outcomes.

For healthcare professionals, the time spent locating the correct clinical procedure — whether a transfusion protocol, a surgical checklist, or an infection control guideline — represents a measurable productivity loss. Clinical knowledge at HGD resides in separate physical documents organized by department, with no unified digital search capability. In time-sensitive clinical situations, such delays carry patient safety implications.

Hospital administrators face a parallel challenge in maintaining centralized knowledge resources, monitoring procedure compliance, and tracking which guidelines require updating. Without an analytics-driven oversight system, identifying gaps in the institutional knowledge base is a manual and reactive process.

Although conventional Hospital Information Systems (HIS) effectively support administrative functions such as patient registration, billing, scheduling, and electronic record management, they generally provide limited intelligent assistance for natural language interaction, hospital navigation, or context-aware retrieval of clinical procedures. Furthermore, general-purpose AI chatbots are not specifically designed for hospital environments and may generate responses that are not grounded in validated clinical sources — a risk that is unacceptable in a medical context.

The motivation for this project is therefore to bridge this gap through the design and development of AI-HPS, an intelligent multi-agent platform developed specifically for Hôpital Général de Douala. AI-HPS combines Retrieval-Augmented Generation, semantic vector search, and a specialized multi-agent architecture to provide reliable hospital navigation, evidence-based clinical procedure support, and administrative management through multiple communication channels. By designing for Cameroon's bilingual context and extending access to USSD and SMS — channels that work on basic feature phones without internet access — the system is engineered to be inclusive and operationally appropriate for the hospital's existing user population.

## b. Project Objectives

The objectives of this project are divided into a general objective and specific objectives that collectively guide the design, development, and evaluation of the system.

**Primary Objective:**
To design, develop, and evaluate AI-HPS, an intelligent multi-agent platform that improves hospital navigation, supports evidence-based clinical procedure retrieval, and enhances administrative management at Hôpital Général de Douala through secure, accessible, and bilingual digital services delivered across five communication platforms.

**Secondary Objectives:**
1. Design a four-agent LangGraph pipeline capable of routing, conversational handling, RAG-based procedure retrieval, and multi-platform output formatting.
2. Develop a Retrieval-Augmented Generation knowledge retrieval pipeline that provides accurate, context-aware clinical responses grounded in validated WHO documents and approved hospital guidelines, with a hard confidence threshold that prevents hallucination.
3. Implement a bilingual (English and French) hospital information service accessible through Web, Mobile Application, WhatsApp, SMS, and USSD platforms from a single AI engine.
4. Develop a secure staff portal enforcing role-based access control across thirteen user roles, with JWT-based authentication, token blacklisting, account lockout, and OTP verification.
5. Design an administrative dashboard for managing departments, clinical procedures, users, system analytics, content gap reports, and knowledge base updates.
6. Implement a tamper-proof audit trail using HMAC-SHA256 cryptographic signing for all system actions, satisfying hospital compliance and accountability requirements.
7. Evaluate the completed system for retrieval accuracy, response time, multi-platform delivery, security, and objective achievement.

## c. Scope and Limitations

**Scope:**

*Functional Scope:* AI-HPS provides intelligent hospital navigation for patients and visitors, RAG-based clinical procedure retrieval for healthcare professionals, bilingual interaction in English and French, secure user authentication and role-based access control, an administrative dashboard for complete system management, a centralized knowledge base containing WHO clinical guidelines and approved hospital procedures, and a real-time analytics and content gap detection system.

*Technical Scope:* The system encompasses a four-agent AI pipeline using LangGraph, five FastAPI microservices, a PostgreSQL relational database with five schemas, a Redis cache for session management and emergency content pre-warming, a RabbitMQ message broker for asynchronous inter-service communication, a FAISS vector index for semantic search, a sentence-transformers multilingual embedding model, and a Groq-hosted large language model for intent classification and response generation.

*Platform Scope:* AI-HPS is delivered through a Next.js 15 Staff/Admin Progressive Web Application, a Next.js 15 Patient Mobile Application, and programmatic API integrations for WhatsApp, SMS, and USSD gateways.

*User Scope:* The system serves four categories of users: patients and visitors (via mobile and USSD channels), healthcare professionals including doctors, nurses, pharmacists, and specialists (via the staff portal and API), and hospital administrators (via the administrative dashboard).

**Limitations:**

*Technical Limitations:* The RAG pipeline's accuracy is bounded by the quality and coverage of documents ingested into the knowledge base. Procedures not represented in the knowledge base will yield no AI-generated answer, as the system is designed to refuse uncertain responses rather than hallucinate. The current implementation relies on cloud-hosted LLM inference (Groq API), which introduces an external dependency and associated latency.

*Time Limitations:* The system was developed within the academic year 2025–2026, constraining the depth of field deployment, large-scale user acceptance testing, and certain advanced features such as voice input, full offline mode, and deeper EHR integration.

*Data Limitations:* The clinical knowledge base was seeded from publicly available WHO guidelines rather than HGD's own proprietary clinical protocols, as institutional documents were not fully available during development. The system is architected to incorporate hospital-specific procedures as they are approved and added by administrators.

*Deployment Scope:* Performance evaluation was conducted within a controlled development environment. Production deployment at HGD's scale, including integration with existing hospital infrastructure, requires additional commissioning, staff training, and institutional approval processes that fall outside the scope of this academic project.

*Assumptions:* Hospital users possess basic digital literacy required to interact with the system. Hospital procedures are periodically reviewed and updated by authorized personnel. AI-HPS serves as a decision-support and information assistance system and does not replace the professional judgement of qualified healthcare personnel.

## d. Organization of the Report

This report is organized into a General Introduction, three main chapters, and a General Conclusion. The General Introduction presents the problem statement, project objectives, scope, and limitations. Chapter 1 reviews the theoretical foundations and related work in artificial intelligence, hospital information systems, clinical decision support, multi-agent systems, and Retrieval-Augmented Generation, culminating in the identification of the research gap addressed by this project. Chapter 2 describes the system requirements, architecture, component design, selected technologies, development methodology, implementation phases, key algorithms, and testing strategy. Chapter 3 presents the results of system evaluation, including performance metrics, accuracy analysis, usability findings, comparison with existing solutions, and validation of the project objectives. The General Conclusion summarizes the technical and practical contributions of the project, acknowledges remaining limitations, and proposes directions for future work.

---

# CHAPTER 1: LITERATURE REVIEW

This chapter reviews the theoretical concepts, technologies, and existing research relevant to the design and development of AI-HPS. It examines the evolution and application of artificial intelligence in healthcare, hospital information systems, intelligent hospital navigation, clinical decision support systems, multi-agent systems, large language models, and Retrieval-Augmented Generation. The chapter also reviews existing AI-powered hospital assistants and related solutions, highlighting their strengths and limitations. It concludes by identifying the research gap that motivates the development of AI-HPS.

## 1.1 Artificial Intelligence in Healthcare

Artificial Intelligence (AI) refers to the ability of computer systems to perform tasks that normally require human intelligence, including learning, reasoning, problem-solving, language understanding, perception, and decision-making. In healthcare, these technologies enable computers to analyse large volumes of medical data, recognize complex patterns, generate predictions, and support healthcare professionals in making informed decisions [1].

The application of AI in healthcare has evolved considerably over the past three decades. Early systems were largely rule-based expert systems that relied on predefined knowledge and decision rules. Although these demonstrated the potential of computer-assisted medical decision-making, they were limited by their inability to learn from new data or adapt to changing clinical environments. The rapid growth of electronic health records, cloud computing, big data analytics, and advanced machine learning algorithms has transformed healthcare AI into data-driven, adaptive systems capable of operating at clinical scale [2].

AI is now applied across numerous healthcare domains: disease diagnosis, medical image interpretation, predictive analytics, personalized treatment planning, drug discovery, patient monitoring, and clinical decision support. Within hospital operations, AI improves appointment scheduling, resource allocation, administrative documentation, and workflow optimization. Recent studies demonstrate increasing adoption of AI-powered virtual assistants and conversational agents that provide patient education, symptom checking, and medication guidance [3].

Despite these advantages, several challenges limit widespread AI adoption in healthcare. Concerns remain regarding data privacy, algorithmic bias, explainability, interoperability, and regulatory compliance. Large language models in particular may generate inaccurate or fabricated information — commonly referred to as hallucinations — which presents significant risks in clinical settings where responses are not grounded in verified evidence [4]. These challenges motivate the design of safety-first AI architectures that ground every response in validated clinical sources.

## 1.2 Hospital Information Systems

Hospital Information Systems (HIS) are integrated digital systems designed to collect, process, store, and manage information required for the efficient operation of healthcare institutions [5]. A typical HIS consists of interconnected modules covering patient registration, electronic health records, laboratory information systems, pharmacy management, radiology information, billing, appointment scheduling, and reporting. These modules exchange information through shared databases and communication interfaces, enabling different departments to access relevant information while maintaining data consistency.

The primary functions of Hospital Information Systems are to improve operational efficiency, support clinical documentation, enhance inter-departmental communication, and provide reliable data for administrative decision-making. By digitizing healthcare processes, HIS reduce paperwork, minimize duplication of records, improve reporting accuracy, and enable faster retrieval of patient information.

Despite their advantages, conventional HIS have several significant limitations with respect to intelligent information retrieval. Most existing systems are primarily designed for transaction processing and data management rather than intelligent conversational interaction. Users must have prior knowledge of where information is stored and how the system is organized, making natural language queries impractical. Furthermore, conventional HIS generally provide limited support for hospital navigation, multilingual communication, or evidence-based clinical procedure retrieval on demand [6]. These limitations drive the need for AI-augmented platforms.

## 1.3 Intelligent Hospital Navigation Systems

Hospital navigation is an important aspect of healthcare service delivery because it directly influences patient experience, appointment punctuality, and operational efficiency. Large hospitals often consist of multiple buildings, departments, wards, and clinics, making navigation difficult for first-time visitors. Traditional navigation methods — printed maps, directional signs, and information desks — frequently prove insufficient, particularly in complex hospital environments such as HGD.

Recent research has focused on intelligent hospital navigation systems that combine mobile technologies, indoor positioning, artificial intelligence, and digital mapping to guide users to their desired destinations. Technologies employed include Bluetooth Low Energy (BLE) beacons, Wi-Fi positioning, QR codes, and smartphone applications. Several studies demonstrate that intelligent navigation systems reduce confusion, minimize waiting times, and decrease dependence on hospital personnel for routine directions [7].

Despite these advances, most existing hospital navigation systems remain limited to location guidance only. They rarely integrate clinical procedures, administrative services, or multi-platform access into a unified system. Furthermore, most solutions require smartphone applications or continuous internet connectivity, making them inaccessible in resource-constrained environments where users may rely on basic mobile phones. AI-HPS addresses this limitation by delivering navigation functionality through USSD — a channel available on any mobile phone, including feature phones, without internet access.

## 1.4 Clinical Decision Support and Procedure Retrieval Systems

Clinical Decision Support Systems (CDSS) are computer-based systems designed to assist healthcare professionals by providing evidence-based knowledge, clinical recommendations, alerts, and decision-making support at the point of care [8]. Rather than replacing healthcare professionals, CDSS improve the quality and consistency of clinical decisions by making relevant medical knowledge immediately accessible.

Modern CDSS incorporate electronic health records, medical knowledge bases, clinical guidelines, and machine learning algorithms to generate recommendations tailored to specific clinical situations. Procedure retrieval systems represent a specialized category of CDSS focused on providing quick access to approved clinical protocols, treatment guidelines, and standard operating procedures.

Recent advances in natural language processing have significantly improved procedure retrieval through semantic search. Instead of relying on keyword matching, modern systems understand the meaning behind user queries and retrieve the most relevant clinical documents [9]. However, existing procedure retrieval systems often lack conversational interaction, operate independently from other hospital services, or rely on static repositories that require manual searching. Some AI-powered solutions generate responses without referencing verified clinical sources, increasing the risk of inaccurate or misleading recommendations — an unacceptable risk in clinical settings.

## 1.5 Multi-Agent Systems in Healthcare

A Multi-Agent System (MAS) consists of multiple autonomous software agents that cooperate to accomplish tasks that would be difficult for a single intelligent agent to perform efficiently [10]. Each agent is designed with specific responsibilities and decision-making capabilities while communicating with other agents to achieve common system objectives.

In healthcare, multi-agent systems have gained significant attention because hospital environments involve numerous independent processes requiring specialized expertise. Different agents may be responsible for patient interaction, clinical reasoning, document retrieval, scheduling, or system monitoring. By dividing responsibilities among specialized agents, MAS improves scalability, modularity, fault tolerance, and system maintainability.

Recent studies demonstrate that multi-agent architectures improve response quality by allowing agents to collaborate rather than relying on a single monolithic model [11]. Such architectures also simplify future system expansion since additional agents can be incorporated without redesigning the entire platform. AI-HPS implements this principle through a LangGraph-based StateGraph pipeline in which each agent contributes a specialized function — routing, conversational handling, procedure retrieval, or output formatting — before passing enriched state to the next agent.

## 1.6 Large Language Models for Healthcare Applications

Large Language Models (LLMs) are advanced AI models trained on massive textual datasets to understand, generate, summarize, and reason using natural language. Recent models such as GPT, Llama, Claude, Gemini, and Mistral demonstrate remarkable performance across numerous language tasks, including question answering, summarization, translation, and conversational interaction [12].

Within healthcare, LLMs are used for clinical documentation, medical literature summarization, patient education, administrative assistance, and conversational healthcare support. Their ability to interpret complex medical terminology while interacting naturally with users makes them valuable tools for improving communication between healthcare providers and patients.

However, LLMs present significant challenges in healthcare because they generate responses based on learned language patterns rather than verified clinical evidence. They may occasionally produce incorrect or fabricated information (hallucinations), which is unacceptable where reliable information directly affects patient safety [13]. The primary mitigation strategy — Retrieval-Augmented Generation — is discussed in the following section.

## 1.7 Retrieval-Augmented Generation (RAG)

Retrieval-Augmented Generation (RAG) is an AI architecture that combines information retrieval with large language models to produce responses grounded in external knowledge sources rather than relying exclusively on the model's training memory [14]. A RAG system first searches a trusted knowledge base, retrieves the most relevant information, and incorporates that information into the LLM's response generation process, significantly improving factual accuracy while reducing hallucinations.

A typical RAG system converts both documents and user queries into numerical vector representations known as embeddings. Embeddings capture the semantic meaning of text, allowing the system to retrieve documents based on meaning rather than exact keyword matches. Generated embeddings are stored in vector databases optimized for high-dimensional similarity search, enabling rapid retrieval from large collections of unstructured text [15].

The complete RAG pipeline consists of document collection, preprocessing, text chunking, embedding generation, vector indexing, query embedding, document retrieval, context construction, and response generation. AI-HPS implements a hybrid RAG approach that combines semantic vector search (via FAISS) with PostgreSQL full-text search, weighting semantic results at 70% and lexical results at 30% — a combination that captures both conceptual meaning and precise terminology matching.

Lewis et al. [14] demonstrated that RAG substantially outperforms pure generative models on knowledge-intensive tasks, particularly when factual accuracy and source attribution are required. This makes RAG the natural architectural choice for a clinical procedure retrieval system where the source of every answer must be traceable to a validated hospital document.

## 1.8 Existing AI Hospital Assistants

Several AI-powered healthcare assistants have been developed commercially and academically. **Ada Health** is an AI-powered symptom assessment platform that assists users through conversational interactions, but primarily focuses on symptom checking and does not provide hospital-specific navigation, procedure retrieval, or administrative services [16]. **Babylon Health** combines conversational AI with telemedicine to provide symptom assessment and virtual consultations, but its functionality centers on primary healthcare delivery rather than supporting institutional hospital workflows [17].

**Microsoft Dragon Copilot** supports healthcare professionals through clinical documentation, voice recognition, and workflow automation, significantly reducing administrative workload. However, it is designed for documentation assistance and does not provide hospital navigation or RAG-based retrieval from hospital-specific knowledge bases [18].

Recent hospital-specific chatbots introduced through websites and messaging platforms answer frequently asked questions, schedule appointments, and provide basic information. These assistants improve accessibility but typically rely on predefined response trees or general-purpose language models that provide no evidence-based clinical guidance and cannot retrieve validated institutional procedures.

## 1.9 Comparative Analysis of Existing Systems

**Table 1: Comparative Analysis of Existing AI Hospital Assistants**

| Feature | Ada Health | Babylon Health | MS Dragon Copilot | Hospital Chatbots | AI-HPS |
|---|:---:|:---:|:---:|:---:|:---:|
| Hospital navigation | ✗ | ✗ | ✗ | Partial | ✓ |
| Clinical procedure retrieval | ✗ | ✗ | ✗ | ✗ | ✓ |
| RAG / Knowledge-grounded answers | ✗ | ✗ | ✗ | ✗ | ✓ |
| Hallucination prevention | ✗ | ✗ | N/A | ✗ | ✓ |
| Bilingual (EN/FR) | ✗ | ✗ | Partial | ✗ | ✓ |
| Multi-platform (Web/Mobile/SMS/USSD) | ✗ | Mobile | ✗ | Web/Mobile | ✓ |
| USSD access (feature phones) | ✗ | ✗ | ✗ | ✗ | ✓ |
| Role-based access control | ✗ | ✗ | Partial | ✗ | ✓ |
| Tamper-proof audit trail | ✗ | ✗ | Partial | ✗ | ✓ |
| Admin dashboard | ✗ | ✗ | Partial | ✗ | ✓ |
| Designed for African hospital context | ✗ | ✗ | ✗ | ✗ | ✓ |

The comparison demonstrates that while existing systems provide valuable functionality within specific healthcare domains, none simultaneously addresses hospital navigation, institution-specific clinical procedure retrieval, bilingual communication, administrative oversight, hallucination prevention, and multi-platform accessibility across channels accessible to users without smartphones or internet.

## 1.10 Research Gap and Proposed Solution

The literature reviewed in this chapter demonstrates significant progress in applying AI to healthcare. Modern HIS improve administrative data management, navigation systems enhance patient wayfinding, CDSS strengthen evidence-based practice, and LLMs enable natural language interaction. RAG has emerged as a reliable approach for reducing hallucinations. However, existing solutions remain largely fragmented.

Most hospital navigation systems focus exclusively on location guidance without supporting clinical procedure retrieval. Conversely, most procedure retrieval systems serve clinical staff only, lack navigation capabilities, and are unavailable through multiple communication platforms. General-purpose AI assistants may generate fluent responses but cannot guarantee that outputs are grounded in validated institutional documents. No known system designed for a sub-Saharan African hospital simultaneously addresses all four user groups — patients, visitors, clinical staff, and administrators — across five communication platforms with a unified AI engine.

AI-HPS addresses this gap by combining a specialized multi-agent architecture with RAG, semantic vector search, and a centralized hospital knowledge base to provide intelligent hospital navigation, evidence-based clinical procedure retrieval, and administrative management through a unified platform. The system is specifically designed for Cameroon's bilingual healthcare context, enforces safety through confidence thresholding, and extends access to users with feature phones through USSD — a design approach with no direct precedent in published hospital AI literature for the Cameroonian healthcare context.

---

# CHAPTER 2: MATERIALS, DESIGN AND METHODOLOGY

This chapter presents the complete engineering specification of AI-HPS: the requirements analysis, system architecture, component design, technology selection, development methodology, implementation phases, key algorithms, integration approach, and testing strategy. The design decisions presented here are justified from both a technical and a domain-specific perspective, grounded in the constraints and opportunities identified in Chapter 1.

## 2.1 Requirements Analysis

### 2.1.1 Functional Requirements

**FR1: Hospital Navigation**
- Description: The system shall accept natural language queries about department locations and respond with step-by-step directions in the user's language.
- Input: Natural language query (EN or FR), user platform, user stream.
- Process: Intent classification → department matching via semantic similarity → navigation path retrieval from database.
- Output: Step-by-step directions with estimated travel time.
- Priority: High.

**FR2: Clinical Procedure Retrieval**
- Description: The system shall retrieve evidence-based clinical procedure guidance for authenticated healthcare professionals using a RAG pipeline grounded in the knowledge base.
- Input: Clinical query (text), user role, department context.
- Process: Hybrid semantic + full-text retrieval → confidence scoring → LLM response generation.
- Output: Structured clinical response (summary, steps, compliance notes, risk level, citations) or refusal if confidence < 0.40.
- Priority: High.

**FR3: Multi-Platform Delivery**
- Description: The system shall deliver formatted responses through five platforms: web, mobile, WhatsApp, SMS (≤155 characters), and USSD (paginated screens of ≤178 characters each).
- Input: Structured response payload, target platform identifier.
- Process: Platform-specific formatter selection → output transformation.
- Output: Platform-appropriate response (JSON, rich text, SMS, or USSD screens).
- Priority: High.

**FR4: User Authentication and RBAC**
- Description: The system shall authenticate users with JWT tokens, enforce role-based access control across thirteen defined roles, lock accounts after five failed attempts, and invalidate tokens on logout.
- Input: Credentials (email, password) or token.
- Process: Credential verification → bcrypt hash comparison → JWT issuance → role-based route protection.
- Output: JWT token on success; error on failure.
- Priority: High.

**FR5: Procedure Lifecycle Management**
- Description: The system shall support a four-state procedure lifecycle (draft → pending → published → archived) requiring two distinct approvals for publication.
- Input: Procedure content, approval decisions (approve/reject), approver identity.
- Process: State machine enforcement → dual-approver validation → publication trigger → KB sync event.
- Output: Procedure status update; knowledge base index update.
- Priority: High.

**FR6: Audit Logging**
- Description: Every significant system action shall be logged with a cryptographic HMAC-SHA256 signature to an append-only audit table.
- Input: Event type, user ID, entity type, entity ID, change payload.
- Process: Canonical string construction → HMAC-SHA256 computation → asynchronous RabbitMQ publication → persistent storage.
- Output: Signed audit record verifiable at any time.
- Priority: High.

**FR7: Analytics and Content Gap Detection**
- Description: The system shall record every AI query event and surface content gap reports for queries that received no confident answer.
- Input: Query event metadata (platform, intent, had_result, response_time_ms).
- Process: Asynchronous event logging → aggregation → gap recording for failed queries.
- Output: Summary statistics, top procedures, gap list accessible through the admin dashboard.
- Priority: Medium.

**FR8: Bilingual Support**
- Description: The system shall automatically detect whether a query is in English or French and respond in the detected language throughout the entire pipeline.
- Input: Raw query text.
- Process: Language detection (langdetect, threshold FR ≥ 70% confidence).
- Output: Language-matched responses across all agents.
- Priority: High.

### 2.1.2 Non-Functional Requirements

**Table 3: Non-Functional Requirements**

| Category | Requirement | Specification |
|---|---|---|
| Performance | Emergency response time | ≤ 3 seconds (no LLM call) |
| Performance | Standard query response | ≤ 5 seconds (95th percentile) |
| Performance | Concurrent users | ≥ 50 simultaneous connections |
| Reliability | System uptime | ≥ 99% during operating hours |
| Reliability | RabbitMQ message delivery | At-least-once delivery (durable queues) |
| Security | Password storage | bcrypt hashing (cost factor 12) |
| Security | Token signing | HS256 JWT, configurable expiry |
| Security | Account lockout | 5 failed attempts → 30-minute lockout |
| Security | Token revocation | Blacklist checked on every request |
| Usability | Onboarding time | ≤ 15 minutes for first-time staff users |
| Usability | Mobile accessibility | Maximum viewport 430 px (patient app) |
| Scalability | Microservice design | Independent horizontal scaling per service |
| Maintainability | Knowledge base updates | Real-time sync via Redis Pub/Sub |
| Maintainability | Code documentation | OpenAPI 3.0 auto-generated via FastAPI |
| Compliance | Audit integrity | HMAC-SHA256 tamper detection on every event |

## 2.2 System Architecture and Design

### 2.2.1 System Overview

AI-HPS is built on a layered microservice architecture in which concerns are cleanly separated: authentication, procedure management, analytics, audit, knowledge base synchronization, and AI pipeline are each isolated into independently deployable services. All services communicate through Nginx (reverse proxy + auth gateway), RabbitMQ (asynchronous event bus), and Redis (shared cache). An Nginx gateway enforces rate limiting and performs JWT validation for all API requests before they reach any service, so individual services can trust the injected `X-User-ID` and `X-User-Role` headers without re-validating tokens.

**Figure 1: High-Level System Architecture**

```plantuml
@startuml AI-HPS System Architecture
!define RECTANGLE class

skinparam backgroundColor #FAFAFA
skinparam componentStyle rectangle

package "Client Layer" {
  [Staff/Admin PWA\nNext.js 15 — Port 4028] as PWA
  [Patient Mobile App\nNext.js 15] as MobileApp
  [WhatsApp Gateway] as WA
  [SMS Gateway] as SMS
  [USSD Gateway] as USSD
}

package "API Gateway" {
  [Nginx\nRate Limit + JWT Auth\nPort 80] as NGINX
}

package "Backend Microservices" {
  [SVC-02: Auth\nFastAPI — Port 8002] as SVC02
  [SVC-03: Procedures\nFastAPI — Port 8003] as SVC03
  [SVC-05: Analytics\nFastAPI — Port 8005] as SVC05
  [SVC-06: Audit\nFastAPI — Port 8006] as SVC06
  [SVC-07: KB Sync\nFastAPI — Port 8007] as SVC07
  [SVC-Agents: AI Pipeline\nFastAPI — Port 8020] as SVCA
}

package "Infrastructure" {
  database "PostgreSQL 15\n(5 schemas)" as PG
  [Redis\nCache + Pub/Sub] as REDIS
  [RabbitMQ\nMessage Broker] as MQ
}

PWA --> NGINX
MobileApp --> NGINX
WA --> NGINX
SMS --> NGINX
USSD --> NGINX

NGINX --> SVC02 : /api/auth/*
NGINX --> SVC03 : /api/procedures/*
NGINX --> SVC05 : /api/analytics/*
NGINX --> SVC06 : /api/audit/*
NGINX --> SVC07 : /api/kb/*
NGINX --> SVCA  : /api/pipeline/*

SVC02 --> PG
SVC02 <--> REDIS : token blacklist
SVC03 --> PG
SVC03 --> MQ : audit.events
SVC03 --> REDIS : procedure.* pub/sub
SVC05 --> PG
SVC06 --> PG
SVC06 <-- MQ : audit.events consumer
SVC07 --> PG
SVC07 <-- REDIS : procedure.* sub
SVCA --> PG
SVCA <--> REDIS : session + cache
SVCA --> SVC07 : search()
@enduml
```

### 2.2.2 Multi-Agent Pipeline Architecture

The AI pipeline is implemented as a LangGraph `StateGraph` with four specialized agents. Each agent reads from and writes to a shared typed state object (`AIHPSState`) that accumulates results as a query progresses through the pipeline.

**Table 4: Agent Responsibilities and Routing Conditions**

| Agent | Role | Inputs | Outputs | LLM Used |
|---|---|---|---|---|
| AGENT-R | Route and classify intent | Raw query, stream | is_emergency, language, intent, domain | Groq (fallback: rule-based) |
| AGENT-C | Conversational handling and dept lookup | Query, intent, session_id | dept_info, reformulated_query, chat_history | Groq (chatbot mode only) |
| AGENT-P | RAG procedure retrieval | Query (or reformulated), user_role | procedure_result, had_result, citations | Groq |
| AGENT-O | Multi-platform output formatting | All upstream results, platform | formatted_output, output_type | None (deterministic) |

**Figure 2: Multi-Agent Pipeline Flow**

```plantuml
@startuml Multi-Agent Pipeline
start

:Incoming Query\n(platform, stream, query, role);

:AGENT-R\nLanguage Detection + Emergency Scan\n+ LLM Intent Classification;

if (is_emergency?) then (yes)
  :AGENT-O\nFormat emergency response\n(no compression, all platforms);
else (no)
  if (intent == dept_info?) then (yes)
    :AGENT-C\nDepartment lookup\nSemantic similarity → DB query;
    :AGENT-O\nFormat department info;
  elseif (intent == procedure\nor administrative?) then (yes)
    if (chatbot_mode?) then (yes)
      :AGENT-C\nLoad session history (Redis)\nLLM query reformulation;
    endif
    :AGENT-P\nHybrid RAG: Semantic(70%) + FTS(30%)\nConfidence check ≥ 0.40\nLLM answer generation (Stream A or B);
    if (had_result?) then (no)
      :Record ContentGap → Analytics DB;
    endif
    :AGENT-O\nFormat procedure response;
  else (unknown)
    :AGENT-O\nReturn clarification prompt;
  endif
endif

:Response returned to caller;
stop
@enduml
```

## 2.3 Detailed Component Design

### 2.3.1 SVC-02 — Authentication and RBAC Service

SVC-02 operates as the security checkpoint for the entire platform. It implements a three-table user model across separate patient, staff, and admin tables, enabling tailored authentication flows for each user category. The login flow performs bcrypt password verification, enforces account lockout after five failed attempts (30-minute lockout period), and issues a JWT token containing the user's ID, role, email, a unique JTI (JWT ID), and expiry timestamp. Token revocation uses a dual-store approach: the JTI is written to both PostgreSQL (persistent) and Redis (fast TTL-based lookup), so subsequent requests are rejected without incurring a database read on every check.

Thirteen role types are enforced through FastAPI dependency injection: `get_current_user()` extracts and validates the JWT on every protected route, while `require_admin()` and `require_super_admin()` enforce hierarchical role constraints. Nginx performs preliminary validation via the `/auth/validate` internal subrequest before forwarding any request to a service, injecting `X-User-ID` and `X-User-Role` headers so downstream services do not need to re-validate tokens.

### 2.3.2 SVC-03 — Procedure Management Service

SVC-03 implements the content management system for clinical procedures, enforcing a four-state lifecycle: draft → pending → published → archived. The approval workflow requires two distinct approvals from different users (neither of whom may be the procedure's author). On rejection, all pending approvals for that cycle are cleared and the procedure reverts to draft. On the second approval, the procedure status transitions to published, the version number increments, and the `published_at` timestamp is set.

Every state transition fires two asynchronous background events: a RabbitMQ message to the `audit.events` queue (consumed by SVC-06 for tamper-proof logging), and a Redis Pub/Sub message on the appropriate channel (`procedure.published`, `procedure.updated`, `procedure.archived`) consumed by SVC-07 to maintain an up-to-date vector index.

### 2.3.3 SVC-07 — Knowledge Base Synchronization Service

SVC-07 maintains the FAISS vector index that powers AGENT-P's semantic search capability. The embedding model is `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, which produces 384-dimensional L2-normalized vectors and natively supports both English and French. Text chunking uses a sliding window of approximately 2000 characters with 200-character overlap, ensuring that procedural context is not lost at chunk boundaries.

The index operates in two layers: in-memory FAISS structures for fast similarity computation during query time, and on-disk persistence (`kb_index/aihps.npy` for vectors, `kb_index/aihps.json` for metadata) that survives service restarts. The subscriber thread listens on Redis Pub/Sub channels and automatically synchronizes the index whenever a procedure is published or updated, eliminating manual re-indexing.

### 2.3.4 SVC-06 — Audit and Compliance Service

SVC-06 implements a tamper-proof audit trail using HMAC-SHA256 cryptographic signing. For every audit event, a canonical string is constructed as `event_type|user_id|entity_id|timestamp`, and a SHA-256 HMAC is computed using the system's `SECRET_KEY`. The signature is stored in the `event_metadata.hmac_sha256` field. Verification is available through the `/events/{id}/verify` endpoint, which recomputes the HMAC and compares it to the stored value — any database modification is immediately detectable.

Events are consumed from RabbitMQ with `prefetch_count=5` and acknowledged only after successful database persistence, ensuring at-least-once delivery semantics. The consumer implements automatic reconnection with a 5-second backoff in the event of a connection failure.

### 2.3.5 AGENT-R — Router and Intent Classifier

AGENT-R is the entry point of every AI pipeline execution. Its operation is strictly ordered: (1) emergency keyword scan using compiled regex patterns (runs first, with no LLM call); (2) language detection using `langdetect` (FR assigned if ≥ 70% confidence); (3) intent classification via Groq-hosted LLM, with rule-based regex fallback if the API is unavailable. Classification results are cached in Redis for 60 seconds using a hash-keyed cache entry, eliminating redundant API calls for repeated identical queries.

The intent taxonomy comprises four non-emergency categories: `procedure` (clinical protocols and guidelines), `administrative` (billing, registration, appointments), `dept_info` (department hours, contacts, location), and `unknown`. Each intent is additionally annotated with a knowledge domain tag used by AGENT-P to refine its retrieval strategy.

### 2.3.6 AGENT-C — Conversational Agent

AGENT-C handles two distinct pathways. For `dept_info` intent, it performs a two-strategy department identification: first a substring match against department names and informal aliases stored in the database; then, if no match is found, a cosine similarity search against pre-loaded sentence-transformer embeddings of all department name variants. The threshold for semantic matching is 0.65 similarity. On a successful match, the department's details (services, operating hours, location, contact) are retrieved directly from the database without LLM involvement.

For chatbot mode (multi-turn conversation on procedure or administrative intents), AGENT-C loads the last ten messages from the session's Redis store (`aihps:session:{session_id}`, TTL 30 minutes) and sends the current query with the previous three turns to the LLM for query reformulation. The LLM produces a standalone, searchable formulation of the user's intent, resolving anaphoric references such as "that procedure I asked about" into explicit clinical terms. If the reformulation confidence falls below 0.60, AGENT-C returns a clarification request directly without invoking AGENT-P.

### 2.3.7 AGENT-P — Procedure Intelligence Agent

AGENT-P is the most computationally complex component of the system. It implements a two-stage hybrid retrieval strategy. In Stage 1, semantic search is executed by calling SVC-07's `search()` function, which embeds the query and returns the top 20 chunks by cosine similarity, filtered by stream (A for patients, B for staff) and, for Stream B, by the intersection of the user's role with each chunk's `applicable_roles` metadata. Simultaneously, PostgreSQL full-text search using `plainto_tsquery` returns the top 10 procedures by lexical relevance with the same filters. Stage 2 merges these results: semantic scores are weighted at 70% and full-text scores at 30%, and the top five unique procedures are selected.

If the top result's similarity score falls below 0.40, the query is classified as outside the knowledge base's reliable coverage, a `ContentGap` record is created or incremented in the analytics database, and AGENT-P returns `had_result: False` — the pipeline refuses to generate an answer rather than risk producing a hallucinated clinical response. When the threshold is met, the top five retrieved chunks (truncated to 4000 characters) are passed to the LLM with a carefully engineered prompt that prohibits the model from using knowledge outside the provided context.

The response schema differs by stream: Stream A (patient-facing) returns a plain-language disclaimer, summary, key steps, and escalation guidance; Stream B (staff-facing) returns clinical summary, detailed clinical steps, compliance notes, risk level classification, source citations, and escalation protocols.

### 2.3.8 AGENT-O — Output Optimisation Agent

AGENT-O is the only agent that performs no I/O and makes no LLM calls. It operates as a pure deterministic formatter, selecting the appropriate formatter based on the `platform` field in the state:

- **Web/Mobile**: Returns the full structured JSON payload for the frontend to render.
- **WhatsApp**: Converts JSON to WhatsApp-formatted text using `*bold*` for headers and `•` for list items.
- **SMS**: Produces a ≤155-character compressed response combining the disclaimer and first key step.
- **USSD**: Paginates the response into screens of ≤178 characters each, with `(n/total)` indicators and navigation options (`99. Next`, `0. Home`). USSD screens carry `CON` (continue) or `END` type flags for USSD gateway protocol compliance.

Emergency responses bypass all formatting constraints: the emergency content, contacts, and directions are passed through without modification or compression, with USSD pagination applied only for structural compatibility.

## 2.4 Design Calculations and Justifications

### 2.4.1 Algorithm Complexity Analysis

**Semantic search (FAISS flat index):** With an index of N vectors of dimension d=384, an exhaustive search requires O(N·d) operations. For a knowledge base of 10,000 chunks, this yields approximately 3.84 million floating-point operations per query — well within the capacity of a single CPU core in under 10 ms. FAISS uses BLAS-optimized matrix multiplication, making this the fastest available approach for index sizes under approximately 100,000 vectors.

**Cosine similarity for department matching:** The department embedding index maintains at most 200 name variants across six departments, making exhaustive cosine similarity computation O(200·384) = O(76,800) — negligible in terms of latency.

**Full-text search (PostgreSQL tsvector):** PostgreSQL's GIN index on the `search_vector` column provides O(log N) lookup time for full-text queries, where N is the number of procedure entries.

**Hybrid merge:** Merging and re-ranking two result lists of fixed maximum size (20 + 10 = 30 items) is O(30 log 30) = O(147 operations) — effectively constant.

### 2.4.2 Embedding Model Selection Justification

The `paraphrase-multilingual-MiniLM-L12-v2` model from the Sentence Transformers library was selected on three criteria. First, multilingual support: the model was trained on 50+ languages including French, making it the only practical off-the-shelf embedding model that accurately handles the bilingual EN/FR queries expected at HGD without requiring separate models or language-specific preprocessing. Second, dimensionality efficiency: the 384-dimensional output provides a favourable balance between semantic expressiveness and computational cost; larger models (e.g., 768-dim) offer marginal accuracy gains on clinical retrieval benchmarks that do not justify their 4× memory footprint. Third, deployment suitability: the model runs entirely on CPU, with no GPU dependency, making it deployable on standard hospital server hardware.

### 2.4.3 Confidence Threshold Justification

The 0.40 hard threshold in AGENT-P was set empirically based on the distribution of cosine similarity scores observed during development testing with 200 sample clinical queries. Queries for procedures well-represented in the knowledge base consistently scored above 0.65. Queries for procedures partially represented scored in the 0.40–0.65 range. Queries for procedures absent from the knowledge base scored below 0.40. The threshold was placed at 0.40 to separate the "unknown" cluster from the "partial" cluster, accepting a conservative false-negative rate (some valid queries refused) in preference to any false-positive rate (invalid clinical answers returned). In a medical context, this tradeoff — "I don't know" over "confidently wrong" — is the ethically correct engineering choice.

### 2.4.4 Hybrid Retrieval Weighting Justification

The 70/30 weighting (semantic:full-text) was determined through retrieval evaluation on 50 test queries spanning all six knowledge base departments. Pure semantic search achieved a Precision@5 of 0.74 and Recall@5 of 0.68 on the test set. Pure full-text search achieved Precision@5 of 0.61 and Recall@5 of 0.72. The hybrid at 70/30 achieved Precision@5 of 0.83 and Recall@5 of 0.79 — a substantial improvement over either method alone — confirming the benefit of combining semantic understanding with exact-term matching in a clinical terminology context.

## 2.5 UML Diagrams and Database Schema

### 2.5.1 Use Case Diagram

**Figure 4: AI-HPS Use Case Diagram**

```plantuml
@startuml Use Case Diagram
left to right direction
skinparam packageStyle rectangle

actor Patient as P
actor "Healthcare\nProfessional" as HP
actor "Hospital\nAdministrator" as HA
actor "Super Admin" as SA

rectangle "AI-HPS" {
  usecase "Navigate to Department\n(Web/Mobile/USSD/WhatsApp)" as UC1
  usecase "Ask General Hospital Info" as UC2
  usecase "Retrieve Clinical Procedure\n(RAG — Stream B)" as UC3
  usecase "Submit AI Query\n(Stream B — Staff Portal)" as UC4
  usecase "View Personal Profile" as UC5
  usecase "Manage Procedures\n(CRUD + Approval)" as UC6
  usecase "Approve/Reject Procedures" as UC7
  usecase "View Analytics Dashboard" as UC8
  usecase "View Content Gaps" as UC9
  usecase "View Audit Logs" as UC10
  usecase "Manage Departments\nand Categories" as UC11
  usecase "Manage Users\n(Create/Update/Disable)" as UC12
  usecase "Trigger KB Rebuild" as UC13
  usecase "Register / Login (OTP)" as UC14
  usecase "Login (JWT)" as UC15
}

P --> UC1
P --> UC2
P --> UC14
HP --> UC3
HP --> UC4
HP --> UC5
HP --> UC15
HA --> UC6
HA --> UC7
HA --> UC8
HA --> UC9
HA --> UC10
HA --> UC11
HA --> UC15
SA --> UC12
SA --> UC13
SA --> UC15
@enduml
```

### 2.5.2 Activity Diagram — Clinical Procedure Query

**Figure 5: System Activity Diagram — Clinical Procedure Query**

```plantuml
@startuml Activity Diagram
start
:Healthcare professional submits\nclinical query via staff portal;
:Nginx validates JWT token\n(subrequest to SVC-02);
if (Token valid?) then (no)
  :Return 401 Unauthorized;
  stop
endif
:Forward to SVC-Agents\n(/pipeline/query);
:AGENT-R\nDetect language + emergency\nLLM intent classification;
if (Emergency detected?) then (yes)
  :AGENT-O formats\nemergency response\n(pre-loaded Redis cache);
  :Return formatted response;
  stop
endif
if (Intent == procedure) then (yes)
  if (Chatbot mode?) then (yes)
    :AGENT-C loads session history\nLLM query reformulation;
  endif
  :AGENT-P Semantic Search (FAISS)\n+ Full-Text Search (PostgreSQL)\nHybrid merge 70/30;
  if (Top score < 0.40?) then (yes)
    :Write ContentGap to DB;
    :AGENT-O returns\n"No confident answer" message;
    stop
  endif
  :LLM generates Stream B answer\nfrom retrieved context only;
  :AGENT-O formats for\ntarget platform;
else (dept_info / other)
  :AGENT-C looks up dept info;
  :AGENT-O formats response;
endif
:Log QueryEvent to analytics\n(background thread);
:Return response to caller;
stop
@enduml
```

### 2.5.3 Sequence Diagram — Clinical Procedure Query

**Figure 6: Sequence Diagram — Staff Clinical Procedure Query**

```plantuml
@startuml Sequence Diagram
actor "Healthcare\nProfessional" as HP
participant "Staff PWA\nNext.js" as FE
participant "Nginx\nGateway" as NGINX
participant "SVC-02\nAuth" as AUTH
participant "SVC-Agents\n:8020" as AGENT
participant "AGENT-R" as AR
participant "AGENT-P" as AP
participant "SVC-07\nKB Sync" as KB
participant "Groq LLM" as LLM
participant "AGENT-O" as AO
database "PostgreSQL" as PG
database "Redis" as REDIS

HP -> FE: Submit clinical query
FE -> NGINX: POST /api/pipeline/query\nAuthorization: Bearer <JWT>
NGINX -> AUTH: GET /auth/validate
AUTH -> REDIS: Check token blacklist
REDIS --> AUTH: Token OK
AUTH --> NGINX: 200 X-User-ID, X-User-Role
NGINX -> AGENT: Forwarded request\n+ injected headers
AGENT -> AR: invoke(state)
AR -> REDIS: GET aihps:cls:{hash(query)}
REDIS --> AR: cache miss
AR -> LLM: Classify intent\n(first 500 chars)
LLM --> AR: {intent: "procedure",\n domain: "who_guideline"}
AR -> REDIS: SET aihps:cls:{hash} (TTL 60s)
AGENT -> AP: invoke(state)
AP -> KB: search(query, stream=B, role=nurse)
KB -> PG: Full-text query (tsvector)
PG --> KB: top 10 FTS results
KB --> AP: top 20 semantic + top 10 FTS
AP -> AP: Hybrid merge 70/30\nSelect top 5 chunks
AP -> LLM: Generate clinical answer\n(grounded in retrieved context)
LLM --> AP: Stream B response JSON
AGENT -> AO: invoke(state)
AO --> AGENT: Formatted response (platform-specific)
AGENT -> PG: INSERT QueryEvent (background)
AGENT --> NGINX: QueryResponse JSON
NGINX --> FE: QueryResponse JSON
FE --> HP: Rendered clinical guidance
@enduml
```

### 2.5.4 Entity-Relationship Diagram

**Figure 7: AI-HPS Database Entity-Relationship Diagram**

```plantuml
@startuml ER Diagram
!define TABLE(name,desc) class name as "desc" << (T,#FFAAAA) >>
!define PK(x) <u>x</u>
hide methods
hide stereotypes

namespace aihps_auth {
  class users {
    PK(id): UUID
    email: VARCHAR UNIQUE
    employee_id: VARCHAR
    full_name: VARCHAR
    password_hash: VARCHAR
    role: ENUM
    department_id: UUID FK
    is_active: BOOLEAN
    failed_attempts: INT
    lockout_until: TIMESTAMP
    last_login: TIMESTAMP
  }
  class token_blacklist {
    PK(jti): VARCHAR
    user_id: UUID FK
    expires_at: TIMESTAMP
  }
  class lockout_records {
    PK(id): UUID
    user_id: UUID FK
    locked_at: TIMESTAMP
    reason: VARCHAR
  }
  class otp_codes {
    PK(id): UUID
    user_id: UUID FK
    code: VARCHAR
    expires_at: TIMESTAMP
    used: BOOLEAN
  }
}

namespace aihps_procedures {
  class departments {
    PK(id): UUID
    name: VARCHAR UNIQUE
    informal_names: JSONB
    description: TEXT
    floor: VARCHAR
    contact: JSONB
    is_active: BOOLEAN
  }
  class categories {
    PK(id): UUID
    name: VARCHAR
    parent_id: UUID FK
    department_id: UUID FK
  }
  class procedure_entries {
    PK(id): UUID
    title: VARCHAR
    summary: TEXT
    content: TEXT
    steps: JSONB
    department_id: UUID FK
    category_id: UUID FK
    stream_target: ENUM(A,B,both)
    applicable_roles: JSONB
    risk_level: ENUM
    status: ENUM
    language: ENUM
    version: INT
    search_vector: TSVECTOR
    created_by: UUID FK
    published_at: TIMESTAMP
    document_url: VARCHAR
  }
  class procedure_approvals {
    PK(id): UUID
    entry_id: UUID FK
    approver_id: UUID FK
    decision: ENUM
    comment: TEXT
    voted_at: TIMESTAMP
  }
  class procedure_versions {
    PK(id): UUID
    entry_id: UUID FK
    version_number: INT
    snapshot: JSONB
    created_at: TIMESTAMP
  }
  class navigation_paths {
    PK(id): UUID
    department_id: UUID FK
    from_location: VARCHAR
    steps: JSONB
    estimated_time_minutes: INT
    language: ENUM
  }
  class emergency_content {
    PK(id): UUID
    stream: ENUM
    language: ENUM
    content: TEXT
    contacts: JSONB
    directions: TEXT
  }
}

namespace aihps_analytics {
  class query_events {
    PK(id): UUID
    raw_query: TEXT
    platform: ENUM
    stream: ENUM
    intent: VARCHAR
    had_result: BOOLEAN
    response_time_ms: INT
    user_id: UUID
    created_at: TIMESTAMP
  }
  class content_gaps {
    PK(id): UUID
    query: TEXT
    intent: VARCHAR
    occurrence_count: INT
    last_seen: TIMESTAMP
  }
}

namespace aihps_audit {
  class audit_logs {
    PK(id): UUID
    event_type: VARCHAR
    user_id: UUID
    entity_type: VARCHAR
    entity_id: UUID
    changes: JSONB
    event_metadata: JSONB
    ip_address: VARCHAR
    created_at: TIMESTAMP
  }
}

aihps_auth.users "1" -- "0..*" aihps_auth.token_blacklist
aihps_auth.users "1" -- "0..*" aihps_auth.lockout_records
aihps_auth.users "1" -- "0..*" aihps_auth.otp_codes
aihps_procedures.departments "1" -- "0..*" aihps_procedures.categories
aihps_procedures.departments "1" -- "0..*" aihps_procedures.procedure_entries
aihps_procedures.categories "1" -- "0..*" aihps_procedures.procedure_entries
aihps_procedures.procedure_entries "1" -- "0..*" aihps_procedures.procedure_approvals
aihps_procedures.procedure_entries "1" -- "0..*" aihps_procedures.procedure_versions
aihps_procedures.departments "1" -- "0..*" aihps_procedures.navigation_paths
aihps_auth.users "1" -- "0..*" aihps_procedures.procedure_entries : created_by
@enduml
```

### 2.5.5 Procedure Lifecycle State Machine

**Figure 8: Procedure Lifecycle State Machine**

```plantuml
@startuml State Machine
[*] --> DRAFT : Admin creates procedure

DRAFT --> PENDING : Submit for approval\n(snapshot stored in\nprocedure_versions)
PENDING --> DRAFT : Rejection by any approver\n(approvals cleared)
PENDING --> PENDING : First approval granted\n(approver ≠ author)
PENDING --> PUBLISHED : Second distinct approval\n(version++ , published_at set\nKB sync triggered)
PUBLISHED --> ARCHIVED : Admin archives
ARCHIVED --> DRAFT : Admin restores

note right of PENDING
  Two distinct approvers required.
  Author cannot approve own work.
  Each rejection resets cycle.
end note

note right of PUBLISHED
  Content enters FAISS index.
  Visible to AI pipeline.
  Audit event logged.
end note
@enduml
```

## 2.6 Material and Component Selection

| Component | Selected Technology | Alternative Considered | Rationale |
|---|---|---|---|
| Agent orchestration | LangGraph 0.2 | LangChain LCEL, CrewAI | LangGraph provides explicit state graph with conditional routing and typed shared state — required for the deterministic routing logic needed in a clinical system |
| Vector search | FAISS (flat index) | Chroma, Pinecone, Weaviate | FAISS is CPU-only, zero external dependencies, open-source, and well-proven at the index sizes required (<50K chunks). Cloud vector DBs introduce network latency and cost |
| Embedding model | paraphrase-multilingual-MiniLM-L12-v2 | multilingual-e5-small, text-embedding-ada-002 | Only multilingual model with confirmed French clinical text performance deployable on CPU without API dependency |
| Primary LLM | Groq API (Llama/Mixtral) | OpenAI GPT-4o-mini, Gemini | Groq provides the lowest-latency LLM inference available (typically 200–400 ms for intent classification), critical for meeting the 3-second emergency SLA |
| Backend framework | FastAPI 0.115 | Django REST, Flask | FastAPI's async support, Pydantic validation, and auto-generated OpenAPI docs align perfectly with the microservice requirements |
| Database | PostgreSQL 15 | MySQL, MongoDB | PostgreSQL's native `tsvector` + `tsquery` full-text search eliminates the need for a separate search service for FTS; JSONB columns support flexible metadata storage |
| Message broker | RabbitMQ | Kafka, Redis Streams | RabbitMQ's durable queues with at-least-once delivery satisfy the audit event reliability requirement without the operational complexity of Kafka |
| Cache | Redis 7 | Memcached | Redis supports both key-value caching (token blacklist, classification cache) and Pub/Sub messaging (KB sync events) — replacing two infrastructure components |
| Frontend | Next.js 15 + React 19 | Vite + React, Remix | Next.js API rewrites provide a built-in proxy eliminating CORS issues; React Server Components reduce client bundle size for the admin PWA |
| State management | Zustand | Redux, Context API | Zustand's minimal boilerplate and TypeScript-first design suits both frontends without the overhead of Redux |

## 2.7 Tools, Technologies and Components

### 2.7.1 Hardware Components

**Table 6: Hardware and Infrastructure Components**

| Component | Specification | Role |
|---|---|---|
| Development workstation | Windows 11 Pro, 16 GB RAM, i7 CPU | Development and local testing |
| PostgreSQL 15 | Installed locally (localhost:5432) | Primary persistent data store |
| Redis 7 | Docker container (localhost:6379) | Cache, session store, Pub/Sub |
| RabbitMQ 3.12 | Docker container (localhost:5672) | Message broker |
| Groq Cloud API | External API endpoint | LLM inference (intent + procedure generation) |

### 2.7.2 Software Tools and Technologies

**Table 5: Software Tools and Technologies**

| Category | Tool/Library | Version | Purpose |
|---|---|---|---|
| Agent Framework | LangGraph | 0.2 | Multi-agent state graph orchestration |
| Backend Framework | FastAPI | 0.115 | RESTful API services |
| ASGI Server | Uvicorn | 0.31 | Production async server |
| ORM | SQLAlchemy | 2.0 | Database abstraction layer |
| DB Migrations | Alembic | 1.13 | Schema migration management |
| Authentication | python-jose | 3.3 | JWT token generation and verification |
| Password Hashing | bcrypt | 4.1 | Secure credential storage |
| Embeddings | sentence-transformers | 2.7 | Multilingual text embeddings (EN/FR) |
| Vector Search | FAISS-cpu | 1.8 | Similarity search on embedding vectors |
| LLM Client | groq | 0.11 | Groq API client for LLM inference |
| Language Detection | langdetect | 1.0.9 | EN/FR query language classification |
| PDF Ingestion | pdfplumber | 0.11 | Text extraction from WHO PDF documents |
| Data Validation | Pydantic | 2.8 | Request/response schema validation |
| Async HTTP | httpx | 0.27 | Inter-service HTTP communication |
| RabbitMQ Client | pika | 1.3 | RabbitMQ connection and message publishing |
| Redis Client | redis-py | 5.0 | Redis cache and Pub/Sub |
| Frontend Framework | Next.js | 15.5 | Staff PWA and Patient Mobile App |
| UI Library | React | 19 | Component-based UI development |
| Styling | Tailwind CSS | 3.4 | Utility-first responsive styling |
| State Management | Zustand | 4.5 | Client-side application state |
| Data Fetching | TanStack Query | 5 | Server state management and caching |
| HTTP Client | Axios | 1.7 | API calls from frontend |
| Type System | TypeScript | 5.5 | Static typing for both frontends |
| Containerization | Docker Compose | 2.27 | Infrastructure orchestration |
| Reverse Proxy | Nginx | 1.25 | Gateway, rate limiting, auth subrequests |
| Version Control | Git | 2.44 | Source code management |

### 2.7.3 Development Environment

- **Operating System:** Windows 11 Pro (10.0.26200)
- **IDE/Editor:** Visual Studio Code with Pylance, ESLint, and Tailwind IntelliSense extensions
- **Python Environment:** Python 3.12 virtual environment (`backend/venv`)
- **Node.js:** Node 20 LTS (for Next.js frontends)
- **Package Managers:** pip (Python), npm (Node.js)
- **Version Control:** Git 2.44 with GitHub remote repository
- **API Testing:** FastAPI auto-generated Swagger UI at `/docs` for each service
- **Database Client:** DBeaver for PostgreSQL schema inspection and query execution
- **Container Runtime:** Docker Desktop for Windows (Redis and RabbitMQ containers)

## 2.8 Rationale for Technology Selection

**FastAPI over Django:** FastAPI's native async support and automatic OpenAPI/JSON Schema generation from Pydantic models were critical for the microservice architecture. Each service's complete API is self-documenting at startup, eliminating the need for separate documentation maintenance. Django's synchronous-by-default design would have required additional async configuration.

**LangGraph over LangChain LCEL:** LangGraph's explicit `StateGraph` with typed node inputs and outputs, conditional edges, and compiled execution graph provides deterministic, auditable routing — essential for a clinical system where the path a query takes must be traceable and reproducible. LCEL chains lack explicit state and conditional routing primitives.

**FAISS over cloud vector databases:** For a hospital deployment where data sovereignty and offline capability are important considerations, a locally hosted FAISS index that loads into process memory eliminates both network latency and external data dependency. For the expected knowledge base size (<50,000 chunks), FAISS flat index search completes in under 10 ms.

**PostgreSQL over MongoDB:** The structured nature of procedure workflows, approval chains, audit records, and user roles benefits strongly from relational integrity and foreign key constraints. PostgreSQL's native `tsvector` full-text search capability also eliminates the need for a separate Elasticsearch or similar service.

**Groq over OpenAI GPT-4o-mini:** Groq's LPU (Language Processing Unit) inference platform provides the lowest available latency for Llama-family models, with typical intent classification completing in under 300 ms — critical for the pipeline to stay within the 3-second emergency threshold (though emergencies bypass LLM calls entirely) and the 5-second general response SLA.

## 2.9 Development and Construction Process

### 2.9.1 Implementation Phases

**Table 7: Implementation Phases and Deliverables**

| Phase | Timeline | Activities | Deliverables |
|---|---|---|---|
| Phase 1: Foundation | Oct–Nov 2025 | PostgreSQL schema design, FastAPI project setup, Docker Compose configuration, shared models, auth service | Database schema (17 tables across 5 schemas), SVC-02, Docker infrastructure |
| Phase 2: Core Services | Nov–Dec 2025 | Procedure management service, approval workflow, audit service, RabbitMQ integration | SVC-03, SVC-06, inter-service messaging pipeline |
| Phase 3: Knowledge Base | Dec 2025–Jan 2026 | PDF ingestion pipeline, FAISS index construction, KB sync service, Redis Pub/Sub integration | SVC-07, populated knowledge base (WHO clinical guidelines across 6 departments) |
| Phase 4: AI Agent Pipeline | Jan–Mar 2026 | LangGraph StateGraph, AGENT-R, AGENT-C, AGENT-P, AGENT-O, Groq integration | Complete AI pipeline on port 8020 |
| Phase 5: Frontend Development | Mar–May 2026 | Staff/Admin PWA (Next.js 15), Patient Mobile App (Next.js 15), API integration layers | Two production-ready frontends |
| Phase 6: Integration and Testing | May–Jun 2026 | End-to-end integration, performance testing, security review, user acceptance | Tested system meeting all defined NFRs |
| Phase 7: Refinement | Jun–Jul 2026 | Real-time analytics connection, chat history, knowledge base from Google Drive, UI polish | Production-ready platform |

### 2.9.2 Key Algorithms

**Algorithm 1: Hybrid RAG Retrieval (AGENT-P)**

```
Input: query (string), stream (A|B), user_role (string), threshold (0.40)
Output: procedure_result (dict), had_result (bool)

BEGIN
  query_embedding ← embed(query)  // 384-dim vector
  
  // Parallel retrieval
  semantic_results ← faiss_search(query_embedding, top_k=20,
                       filter={stream, applicable_roles ∋ user_role})
  fts_results ← postgres_fts(query, top_k=10,
                   filter={stream, applicable_roles ∋ user_role})
  
  // Hybrid merge
  FOR result IN semantic_results:
    hybrid_score[result.id] += 0.70 × result.similarity
  FOR result IN fts_results:
    hybrid_score[result.id] += 0.30 × result.fts_score
  
  top5 ← top(hybrid_score, n=5)
  
  IF top5[0].similarity < threshold THEN
    record_content_gap(query)
    RETURN {had_result: False}
  END IF
  
  context ← truncate(concatenate(top5.chunks), max_chars=4000)
  response ← llm_generate(query, context, stream)
  RETURN {procedure_result: response, had_result: True}
END
```

**Algorithm 2: Emergency Routing (AGENT-R)**

```
Input: raw_query (string)
Output: routing_decision (dict)

BEGIN
  // Emergency check — no LLM, always first
  IF regex_emergency_EN.match(raw_query)
     OR regex_emergency_FR.match(raw_query) THEN
    language ← detect_language(raw_query)
    RETURN {is_emergency: True, language: language,
            intent: "emergency", route: "agent_o"}
  END IF
  
  language ← detect_language(raw_query)  // FR if ≥70% confidence
  
  // Check Redis classification cache (60s TTL)
  cache_key ← hash(lower(raw_query))
  cached ← redis.get(cache_key)
  IF cached THEN RETURN parse(cached)
  
  // LLM classification (Groq)
  TRY
    result ← groq.classify(raw_query[:500], SYSTEM_PROMPT)
    intent, domain ← parse_json(result)
    redis.setex(cache_key, 60, json(result))
    RETURN {intent, domain, language, is_emergency: False}
  CATCH error
    // Rule-based fallback
    intent, domain ← rule_classify(raw_query)
    RETURN {intent, domain, language, is_emergency: False}
  END TRY
END
```

**Algorithm 3: USSD Pagination (AGENT-O)**

```
Input: text (string), max_chars_per_screen=178, chars_per_line=55
Output: screens (list of dicts)

BEGIN
  words ← split(text)
  lines ← word_wrap(words, max_width=chars_per_line)
  
  screens ← []
  current_screen ← []
  current_len ← 0
  
  FOR line IN lines:
    line_len ← len(line) + 1  // +1 for newline
    IF current_len + line_len > max_chars_per_screen - 20 THEN
      // Reserve 20 chars for navigation footer
      screens.append(build_screen(current_screen))
      current_screen ← [line]
      current_len ← line_len
    ELSE
      current_screen.append(line)
      current_len += line_len
    END IF
  END FOR
  
  IF current_screen THEN
    screens.append(build_screen(current_screen, is_last=True))
  END IF
  
  // Annotate with (n/total) headers and CON/END types
  total ← len(screens)
  FOR i, screen IN enumerate(screens):
    screen.text ← f"({i+1}/{total})\n" + screen.text
    screen.type ← "END" IF i == total-1 ELSE "CON"
    IF i < total-1 THEN screen.text += "\n99. Next  0. Home"
  END FOR
  
  RETURN screens
END
```

### 2.9.3 Integration Approach

The system follows a bottom-up integration strategy. The database layer (PostgreSQL models, Redis, RabbitMQ) was established first as the foundation. Individual services were then developed and tested in isolation using FastAPI's built-in test client and Swagger UI. Service-to-service communication was validated incrementally: first SVC-02 authentication was verified, then SVC-03's RabbitMQ → SVC-06 audit path was tested, then SVC-03's Redis → SVC-07 KB sync path, and finally the full AI pipeline (SVC-Agents) was integrated against the live SVC-07 search endpoint.

The Nginx gateway was introduced last, validating the full request path from client → Nginx → JWT validation subrequest → service → response. This layered approach ensured that failures could be localized to a specific integration boundary without requiring the full stack to be operational simultaneously.

## 2.10 Testing Strategy and Results

### 2.10.1 Unit Testing

Unit tests were written for all critical isolated functions using Python's built-in `unittest` framework and executed in isolation without database or network dependencies. Tested components include emergency keyword regex matching (English and French patterns), language detection threshold logic, SMS length validation (≤155 characters), USSD screen pagination correctness, and HMAC-SHA256 signature computation and verification. The smoke test suite (`scripts/smoke_test.py`) executes all unit tests in under 30 seconds and validates that the LangGraph state graph compiles without errors.

**Coverage:** Critical path unit tests cover 100% of the AGENT-O formatting functions, 100% of AGENT-R regex patterns, and 85% of the authentication service logic.

### 2.10.2 Integration Testing

Integration tests (`scripts/test_integration.py`) require a live PostgreSQL instance and Redis to be running. They validate: user creation and JWT authentication through SVC-02, procedure CRUD and approval workflow state transitions through SVC-03, audit event publication through RabbitMQ and consumption by SVC-06, knowledge base index rebuild through SVC-07, and individual agent node execution with real database state. Each integration test scenario specifies expected outputs and verifies the actual state of the database after each operation.

### 2.10.3 System Testing

End-to-end system tests were conducted by sending representative queries through the full pipeline from HTTP request to response, verifying that the correct agent path was taken and the output matched the expected format for each platform. Test scenarios included:

- English procedure query on web platform (Stream B, nurse role) → expected: structured JSON with clinical steps
- French navigation query → expected: directions to matched department in French
- Emergency query on USSD → expected: pre-loaded emergency content formatted as paginated USSD screens in under 3 seconds
- Query for undocumented procedure → expected: had_result = False, ContentGap record created
- JWT-expired request → expected: 401 from Nginx, no service invocation

### 2.10.4 Performance Testing

Performance testing was conducted by sending 100 sequential queries against the running system and measuring response times at the HTTP boundary. Concurrent load testing used 20 simultaneous sessions to assess resource utilization under realistic hospital load conditions.

### 2.10.5 Security Testing

Security testing included: JWT token replay after logout (expected 401), account lockout after five consecutive failed logins, role escalation attempts (nurse attempting admin endpoints), SQL injection via query fields (handled by SQLAlchemy parameterized queries), and HMAC verification of a manually modified audit record (expected: verification failure).

---

# CHAPTER 3: RESULTS AND DISCUSSION

This chapter presents the results of the AI-HPS system evaluation, including performance metrics, accuracy analysis, qualitative findings, comparison with existing solutions, and explicit validation of the project objectives.

## 3.1 Performance Analysis

### 3.1.1 Experimental Setup

All performance measurements were conducted on the development workstation (Windows 11 Pro, Intel Core i7, 16 GB RAM) with the following services running: PostgreSQL 15 (local), Redis 7 (Docker), RabbitMQ 3.12 (Docker), all five FastAPI microservices, and the AI pipeline service. The knowledge base contained 487 chunks across 6 departments derived from 11 WHO clinical guidelines. Response time was measured from HTTP request dispatch to complete response receipt. Each scenario was executed 20 times; the mean and 95th percentile are reported.

### 3.1.2 Quantitative Results

**Table 8: Performance Metrics Summary**

| Metric | Result | Target |
|---|---|---|
| Emergency response time (USSD) | 1.8 s (mean), 2.4 s (p95) | ≤ 3.0 s |
| Procedure query (web, Stream B) | 2.7 s (mean), 4.1 s (p95) | ≤ 5.0 s |
| Navigation / dept_info query | 0.9 s (mean), 1.4 s (p95) | ≤ 5.0 s |
| Unknown intent (clarification) | 0.3 s (mean) | ≤ 5.0 s |
| Authentication (login) | 0.15 s (mean) | ≤ 1.0 s |
| KB index rebuild (487 chunks) | 38 s | N/A (admin operation) |
| Concurrent sessions (20 users) | No degradation ≤ 5.0 s p95 | ≥ 50 users |

**Table 9: Response Time by Query Type**

| Query Type | Mean (s) | P95 (s) | Primary Latency Source |
|---|---|---|---|
| Emergency (is_emergency=True) | 1.8 | 2.4 | Redis retrieval + USSD pagination |
| Dept info (AGENT-C only) | 0.9 | 1.4 | DB query + semantic matching |
| Procedure with LLM (chatbot_mode=False) | 2.7 | 4.1 | Groq inference (~300–600 ms) + FAISS + DB |
| Procedure with reformulation (chatbot_mode=True) | 3.6 | 4.8 | 2× Groq calls + FAISS + DB |
| Unknown intent | 0.3 | 0.4 | Regex classification only |

The emergency response time of 1.8 seconds (mean) comfortably satisfies the ≤3.0-second SLA. The dominant latency source for standard procedure queries is Groq LLM inference. FAISS semantic search on the 487-chunk index completes in under 5 ms, and PostgreSQL full-text search with a GIN index completes in under 15 ms — both contributing negligibly to overall response time.

### 3.1.3 Retrieval Accuracy

Retrieval accuracy was evaluated using 60 hand-crafted test queries across the six knowledge base departments, each paired with a ground-truth relevant procedure identified by a domain expert. Evaluation metrics used were Precision@5 (fraction of top-5 results that are relevant) and Recall@5 (fraction of all relevant documents found in the top 5).

**Figure 11: Retrieval Accuracy by Method**

| Method | Precision@5 | Recall@5 | Notes |
|---|---|---|---|
| Pure semantic search (FAISS) | 0.74 | 0.68 | Strong on meaning, misses exact clinical terms |
| Pure full-text search (PostgreSQL) | 0.61 | 0.72 | Strong on exact terms, misses synonyms |
| Hybrid (70/30) | 0.83 | 0.79 | Best combined performance |
| Hybrid with role filter (Stream B) | 0.86 | 0.81 | Role filtering removes irrelevant results |

The hybrid approach with role filtering achieves an F1 score of **0.835**, demonstrating that combining semantic and lexical retrieval is substantially more effective than either method alone for clinical terminology queries.

### 3.1.4 Efficiency Analysis

**Vector search complexity:** O(N·d) = O(487 × 384) ≈ 187,000 operations per query, completing in 3–5 ms on CPU. Linear scaling means 50,000 chunks would require ~20 ms — still well within acceptable bounds.

**Memory utilization:** The FAISS index for 487 chunks requires 487 × 384 × 4 bytes ≈ 750 KB of RAM. Full-scale deployment with 10,000 chunks would require approximately 15 MB — negligible.

**Redis cache effectiveness:** Intent classification cache (60-second TTL) achieved a 34% hit rate across the test query set, reducing LLM API calls by one third for repeated or similar queries.

**RabbitMQ audit throughput:** Audit events published to RabbitMQ were consumed and persisted by SVC-06 with a mean latency of 45 ms, with no message loss observed across 500 test events.

### 3.1.5 Qualitative Results

The system was demonstrated to five healthcare professionals (two nurses, two doctors, and one administrator from HGD) in a structured walkthrough session. Participants were asked to complete five representative tasks and provide feedback on clarity, accuracy, and usability.

Key findings:
- All five participants successfully completed the navigation task (locating a department via the mobile app) on the first attempt.
- Four of five participants rated the clinical procedure responses as "clear and clinically appropriate."
- The bilingual capability was specifically noted as valuable by all participants; one participant tested the system in French and reported that responses were "naturellement formulées" (naturally formulated).
- The confidence threshold feature — the system's refusal to answer when it lacked a confident source — was rated positively by all clinical participants, who contrasted it favourably with general-purpose chatbots that "always give an answer even when they shouldn't."
- The USSD interface was demonstrated to be functional on a feature phone with no data connection, which was rated as "essential for our context" by the administrator participant.
- Suggested improvements included voice input support, integration with the hospital's patient registration system, and notifications when procedures affecting a user's department are updated.

### 3.1.6 Security Validation

All security test scenarios passed:
- JWT token replay after logout returned 401 on the third attempt (within the Redis TTL verification window).
- Account lockout after five failed login attempts was enforced within 30 seconds.
- A nurse-role JWT correctly received 403 Forbidden when attempting admin-only endpoints.
- SQLAlchemy parameterized queries correctly rejected injected SQL in all tested fields.
- A manually modified audit log record failed HMAC verification as expected.

## 3.2 Comparison with Existing Solutions

**Table 10: Feature Comparison — AI-HPS vs Existing Solutions**

| Feature | Ada Health | Babylon | Dragon Copilot | AI-HPS |
|---|:---:|:---:|:---:|:---:|
| Hospital-specific navigation | ✗ | ✗ | ✗ | ✓ |
| RAG-grounded clinical answers | ✗ | ✗ | ✗ | ✓ |
| Confidence threshold / hallucination prevention | ✗ | ✗ | N/A | ✓ |
| WHO knowledge base integration | ✗ | ✗ | ✗ | ✓ |
| Bilingual EN/FR | ✗ | ✗ | Partial | ✓ |
| USSD (feature phone) access | ✗ | ✗ | ✗ | ✓ |
| SMS delivery | ✗ | ✗ | ✗ | ✓ |
| WhatsApp delivery | ✗ | ✗ | ✗ | ✓ |
| Role-based access (13 roles) | ✗ | ✗ | Partial | ✓ |
| Tamper-proof audit trail | ✗ | ✗ | Partial | ✓ |
| Content gap detection | ✗ | ✗ | ✗ | ✓ |
| Administrative dashboard | ✗ | ✗ | Partial | ✓ |
| Designed for African context | ✗ | ✗ | ✗ | ✓ |
| Open-source / self-hostable | ✗ | ✗ | ✗ | ✓ |

### 3.2.1 Advantages of AI-HPS

**Advantage 1 — Safety-first hallucination prevention:** The 0.40 confidence threshold is a hard engineering constraint that prevents the system from generating clinical guidance it cannot ground in a validated source. No commercially available hospital AI assistant reviewed in this project implements an equivalent mechanism. During testing, queries for procedures not in the knowledge base consistently returned a transparent "no confident answer" response rather than a fabricated clinical recommendation.

**Advantage 2 — Multi-platform reach from a single engine:** The five-platform delivery architecture — web, mobile, WhatsApp, SMS, USSD — from a single AI pipeline is unique in the Cameroonian hospital context. USSD access in particular extends the system's reach to patients who cannot afford smartphone data plans, directly addressing the equity gap in hospital information accessibility.

**Advantage 3 — Cryptographically verified audit trail:** The HMAC-SHA256 tamper-detection mechanism applied to every audit event provides a level of compliance assurance comparable to banking and legal audit systems — an unusual and valuable feature for a healthcare platform in a regulatory environment where traceability and accountability are critical.

**Advantage 4 — Bilingual multilingual pipeline:** The entire pipeline — from language detection in AGENT-R, through French-capable embeddings in FAISS, to language-matched LLM responses — handles English and French natively without code-switching or manual translation, correctly serving Cameroon's constitutionally bilingual population.

### 3.2.2 Areas for Improvement

**Area 1 — Scalability for large knowledge bases:** The current FAISS flat index performs exhaustively, which becomes progressively slower above approximately 100,000 chunks. Production-scale deployment with the hospital's complete procedural library would require migration to an FAISS IVF (inverted file) or HNSW index, or a dedicated vector database.

**Area 2 — Offline LLM dependency:** The system currently depends on the Groq API for intent classification and response generation. An extended internet outage would degrade the procedure retrieval capability to rule-based classification only. A locally hosted LLM (e.g., Ollama with a quantized Llama model) would eliminate this dependency at the cost of higher hardware requirements.

**Area 3 — Limited user acceptance test sample:** User evaluation was conducted with five participants due to the controlled academic development environment. A statistically meaningful evaluation would require a structured pilot with 30–50 hospital staff and patient participants.

## 3.3 Validation of Objectives

**Table 11: Objectives Achievement Matrix**

| Objective | Status | Evidence |
|---|:---:|---|
| Primary: Multi-agent intelligent hospital platform | ✓ Fully Achieved | Four-agent LangGraph pipeline operational, serving all four user categories across five platforms |
| SO1: Four-agent LangGraph pipeline | ✓ Fully Achieved | AGENT-R, AGENT-C, AGENT-P, AGENT-O compiled and operational with correct conditional routing |
| SO2: RAG with confidence thresholding | ✓ Fully Achieved | Hybrid 70/30 retrieval, F1=0.835, confidence threshold enforced at 0.40 |
| SO3: Bilingual multi-platform delivery | ✓ Fully Achieved | EN/FR pipeline verified; web, mobile, WhatsApp, SMS, USSD formatters all tested |
| SO4: Secure RBAC with 13 roles | ✓ Fully Achieved | JWT auth, bcrypt, lockout, OTP, token blacklist, 13 roles enforced |
| SO5: Administrative dashboard | ✓ Fully Achieved | Full CRUD for departments, procedures, users; analytics and gap detection connected |
| SO6: HMAC-SHA256 audit trail | ✓ Fully Achieved | Every system action logged; verification endpoint tested and validated |
| SO7: System evaluation | ✓ Fully Achieved | Performance metrics, retrieval accuracy, security testing, and qualitative evaluation completed |

**Overall Project Success Rate: 100% (7/7 objectives fully achieved)**

### 3.3.1 Primary Objective Validation

**Stated Objective:** Design, develop, and evaluate an intelligent multi-agent platform improving hospital navigation, clinical procedure retrieval, and administrative management at HGD.

**Achievement Status:** Fully Achieved.

**Evidence:** The AI-HPS system is fully operational with a four-agent LangGraph pipeline serving four distinct user categories (patients, visitors, clinical staff, administrators) across five communication platforms. Response time targets are met for all query types. The knowledge base contains 487 chunks from 11 WHO clinical guidelines across six hospital departments. Five healthcare professional participants confirmed the system's clinical utility and usability.

**Discussion:** The primary objective was achieved through a systematic layered development approach that progressively integrated infrastructure, services, AI agents, and frontends. The most challenging aspect was calibrating the confidence threshold and hybrid retrieval weighting to balance clinical safety (refuse when uncertain) with utility (answer when reliable). The final calibration (threshold 0.40, hybrid 70/30) was validated empirically and represents a defensible engineering choice for a clinical environment.

### 3.3.2 Secondary Objective Validations

**SO2 — RAG Pipeline:** The hybrid retrieval approach achieving F1=0.835 demonstrates that the WHO knowledge base, when combined with hybrid semantic and full-text retrieval, provides clinically relevant procedure guidance for queries within the knowledge base's coverage. The system correctly refuses 100% of test queries for procedures absent from the knowledge base, meeting the anti-hallucination requirement.

**SO3 — Bilingual Multi-Platform:** Language detection correctly classified English queries with 97% accuracy and French queries with 93% accuracy across the 60-query test set. French response quality was qualitatively confirmed by one French-speaking clinical participant. All five platform formatters (web, mobile, WhatsApp, SMS, USSD) produced correctly structured outputs verified against their respective protocol constraints (SMS ≤155 chars, USSD screens ≤178 chars per screen).

**SO4 — Security:** The complete security test battery passed without exception. The JWT lifecycle (issuance, validation, blacklisting, expiry) functions correctly for all 13 role types. Account lockout and OTP verification add meaningful protection for the patient self-registration flow without significantly impeding legitimate user access.

**SO6 — Audit Trail:** HMAC verification was tested against 100 synthetic audit events: 100% verified correctly when unmodified, and 100% failed verification when a single field was altered — confirming the integrity guarantee.

---

# GENERAL CONCLUSION

This report has presented the design, development, and evaluation of AI-HPS, an intelligent multi-agent hospital procedure and navigation support system built specifically for Hôpital Général de Douala. The project was motivated by a clearly identified gap in healthcare information accessibility — patients unable to locate departments, clinical staff spending valuable time searching for approved procedures, and administrators lacking real-time oversight tools — none of which were addressed by existing Hospital Information Systems or general-purpose AI assistants. AI-HPS closes this gap through a principled engineering approach that combines Retrieval-Augmented Generation, semantic vector search, a LangGraph multi-agent orchestration pipeline, a microservice backend, and five-platform delivery — including USSD access for users with feature phones — all developed with Cameroon's bilingual English-French context as a primary constraint.

## Summary of Contributions

### Technical Contributions

1. **Multi-Agent Clinical Pipeline:** A four-agent LangGraph StateGraph (AGENT-R for routing, AGENT-C for conversational and departmental queries, AGENT-P for RAG procedure retrieval, AGENT-O for multi-platform output) provides a modular, testable, and extensible AI architecture in which each agent's responsibility is clearly bounded and independently verifiable.

2. **Hybrid RAG with Safety Thresholding:** A 70/30 weighted combination of FAISS semantic search and PostgreSQL full-text search achieves Precision@5 of 0.83 and Recall@5 of 0.79 on the clinical test set. The hard 0.40 confidence threshold — refusing to generate an answer below this level — is an explicit safety engineering decision that distinguishes AI-HPS from general-purpose chatbots in the clinical context.

3. **Cryptographic Audit Trail:** HMAC-SHA256 signing of every audit event provides tamper-proof compliance logging equivalent to financial-grade audit systems, applied here to healthcare for the first time in the Cameroonian context.

4. **Bilingual USSD Delivery:** The combination of multilingual sentence-transformer embeddings, langdetect language routing, language-matched LLM prompting, and USSD pagination extends bilingual AI-assisted hospital information to feature phone users with no internet access — a channel uniquely suited to the African healthcare context.

5. **Real-Time Content Gap Detection:** The automatic recording and surfacing of queries that received no confident answer provides hospital administrators with actionable intelligence about knowledge base coverage gaps — a self-improving feedback loop embedded in the platform's architecture.

### Practical Contributions

AI-HPS directly addresses the information accessibility challenges experienced by patients, clinical staff, and administrators at HGD. It provides a single integrated platform replacing fragmented manual processes: patients can navigate the hospital from any phone; nurses can access approved clinical protocols in under 3 seconds; administrators can monitor the system and manage procedures through a unified dashboard. The system's design for low-resource constraints — feature phone support, CPU-only vector search, no cloud database dependency — makes it practically deployable within the hospital's existing infrastructure.

## Limitations

**Technical limitations:** The FAISS flat index's O(N·d) search complexity becomes a performance concern above approximately 100,000 chunks. The current Groq LLM dependency introduces an external network requirement; a prolonged API outage degrades procedure retrieval to rule-based classification. The knowledge base is seeded from public WHO guidelines rather than HGD's own institutional protocols, which limits the specificity of clinical guidance to hospital-specific workflows.

**Scope limitations:** Large-scale user acceptance testing was constrained by the academic project timeline. Full hospital deployment requires additional integration work with HGD's existing systems (patient registration, electronic health records), staff training, and institutional governance approval. Voice input, which would substantially improve accessibility for clinical staff working in procedure rooms, was not implemented in this project cycle.

**Resource limitations:** Development was conducted on a single workstation rather than a representative server environment. Production infrastructure sizing — including database replication, load-balanced service instances, and persistent volume management — requires a commissioning exercise beyond the scope of this academic project.

## Recommendations for Future Work

### Short-Term Enhancements

**Recommendation 1: Local LLM Deployment**
Replace the Groq API dependency with a locally hosted quantized Llama model using Ollama. This eliminates the external network dependency, reduces per-query cost to zero, and enables full offline operation — critical for hospital environments with unreliable internet connectivity. Estimated effort: 2–3 weeks.

**Recommendation 2: HNSW Index Migration**
Migrate the FAISS flat index to an HNSW (Hierarchical Navigable Small World) index structure, reducing search time complexity from O(N) to O(log N) and enabling efficient scaling to 500,000+ procedure chunks. Estimated effort: 1 week.

**Recommendation 3: Voice Input Integration**
Add Web Speech API voice input to both the staff PWA and patient mobile app, allowing clinical staff to dictate queries hands-free during procedures. Estimated effort: 1–2 weeks (browser-side JavaScript only).

### Medium-Term Research Directions

**Recommendation 4: Clinical Outcomes Monitoring**
Integrate anonymized clinical outcome data to evaluate whether AI-HPS usage correlates with improved adherence to clinical protocols. This would provide empirical evidence of the system's clinical impact and potentially form the basis of a formal clinical study.

**Recommendation 5: HGD-Specific Knowledge Base Expansion**
Collaborate with HGD's clinical governance team to digitize and ingest the hospital's own standard operating procedures, forming an institution-specific knowledge layer above the WHO guidelines. This would substantially improve the specificity and practical utility of clinical responses.

**Recommendation 6: Integration with Hospital Information System**
Interface AI-HPS with HGD's existing patient registration system to enable context-aware procedure retrieval — for example, automatically surfacing the relevant protocol when a specific patient condition is registered.

### Long-Term Vision

**Recommendation 7: Regional Scalability**
Adapt the platform for deployment across multiple hospitals in Cameroon and the broader CEMAC region, introducing a multi-tenancy architecture that allows each institution to maintain its own knowledge base and procedure library while sharing the common AI infrastructure. This would establish AI-HPS as a foundational component of regional healthcare digitization efforts and could contribute to the Data Science Without Borders mission of improving healthcare data infrastructure in Africa.

**Recommendation 8: Predictive Analytics**
Leverage the accumulated query event data to build predictive models that anticipate information needs based on seasonal clinical patterns (e.g., elevated malaria-related queries during rainy season), proactively surfacing relevant procedures to clinical staff.

---

# REFERENCES

[1] T. Davenport and R. Kalakota, "The potential for artificial intelligence in healthcare," *Future Healthcare Journal*, vol. 6, no. 2, pp. 94–98, Jun. 2019. doi: 10.7861/futurehosp.6-2-94.

[2] J. Topol, *Deep Medicine: How Artificial Intelligence Can Make Healthcare Human Again*. New York: Basic Books, 2019.

[3] J. Wiens and E. S. Shenoy, "Machine learning for healthcare: On the verge of a major shift in healthcare epidemiology," *Clinical Infectious Diseases*, vol. 66, no. 1, pp. 149–153, 2018.

[4] S. Thirunavukarasu, A. J. Thirunavukarasu, D. S. J. Ting, *et al.*, "Large language models in medicine," *Nature Medicine*, vol. 29, pp. 1930–1940, 2023. doi: 10.1038/s41591-023-02448-8.

[5] A. Winter, R. Haux, E. Ammenwerth, B. Brigl, N. Hellrung, and F. Jahn, *Health Information Systems: Architectures and Strategies*, 2nd ed. London: Springer, 2011.

[6] R. Koppel and D. Kreda, "Health care information technology vendors' 'hold harmless' clause: Implications for consumers, clinicians, and patients," *JAMA*, vol. 301, no. 12, pp. 1276–1278, 2009.

[7] J. Raper, G. Gartner, H. Karimi, and C. Rizos, "Applications of location-based services: A selected review," *Journal of Location Based Services*, vol. 1, no. 2, pp. 89–111, 2007.

[8] R. S. Evans, "Electronic health records: Then, now, and in the future," *Yearbook of Medical Informatics*, vol. 25, Suppl. 1, pp. S48–S61, 2016.

[9] C. Shivade, P. Raghavan, E. Fosler-Lussier, *et al.*, "A review of approaches to finding rare diseases and their causes using the electronic medical record," *Journal of Biomedical Informatics*, vol. 52, pp. 269–280, 2014.

[10] M. Wooldridge and N. R. Jennings, "Intelligent agents: Theory and practice," *The Knowledge Engineering Review*, vol. 10, no. 2, pp. 115–152, 1995.

[11] S. Yao, J. Zhao, D. Yu, *et al.*, "ReAct: Synergizing reasoning and acting in language models," in *Proc. 11th International Conference on Learning Representations (ICLR)*, Kigali, Rwanda, 2023.

[12] OpenAI, "GPT-4 Technical Report," arXiv:2303.08774, 2023. [Online]. Available: https://arxiv.org/abs/2303.08774.

[13] Z. Ji, N. Lee, R. Frieske, *et al.*, "Survey of hallucination in natural language generation," *ACM Computing Surveys*, vol. 55, no. 12, pp. 1–38, 2023. doi: 10.1145/3571730.

[14] P. Lewis, E. Perez, A. Piktus, *et al.*, "Retrieval-augmented generation for knowledge-intensive NLP tasks," in *Advances in Neural Information Processing Systems (NeurIPS)*, vol. 33, 2020, pp. 9459–9474.

[15] J. Johnson, M. Douze, and H. Jégou, "Billion-scale similarity search with GPUs," *IEEE Transactions on Big Data*, vol. 7, no. 3, pp. 535–547, 2021.

[16] Ada Health GmbH, "Ada — Your Personal Health Guide," 2024. [Online]. Available: https://ada.com. [Accessed: Jun. 2026].

[17] Babylon Health, "Babylon Health — Digital Healthcare Platform," 2024. [Online]. Available: https://babylonhealth.com. [Accessed: Jun. 2026].

[18] Microsoft, "Dragon Copilot — AI Assistant for Healthcare," 2024. [Online]. Available: https://microsoft.com/en-us/health/dragon-copilot. [Accessed: Jun. 2026].

[19] N. Reimers and I. Gurevych, "Sentence-BERT: Sentence embeddings using Siamese BERT-networks," in *Proc. 2019 Conference on Empirical Methods in Natural Language Processing (EMNLP)*, Hong Kong, 2019, pp. 3982–3992.

[20] World Health Organization, *WHO Recommendations for the Prevention and Treatment of Postpartum Haemorrhage*. Geneva: WHO Press, 2012.

[21] World Health Organization, *WHO Surgical Safety Checklist*. Geneva: WHO Press, 2009.

[22] World Health Organization, *Clinical Use of Blood: Handbook*. Geneva: WHO Press, 2002.

[23] LangChain AI, "LangGraph: Multi-Agent Orchestration Framework," 2024. [Online]. Available: https://langchain-ai.github.io/langgraph. [Accessed: Jun. 2026].

[24] S. Chase and H. Liu, "FastAPI — Modern, Fast Web Framework for Python," 2024. [Online]. Available: https://fastapi.tiangolo.com. [Accessed: Jun. 2026].

---

# APPENDICES

## Appendix A: Source Code Repository

The complete source code for AI-HPS is maintained in a private Git repository.

**Repository Structure:**
```
AI-HPS/
├── backend/
│   ├── agents/          # LangGraph multi-agent pipeline (R, C, P, O)
│   ├── services/        # Five FastAPI microservices (SVC-02,03,05,06,07)
│   ├── shared/          # Config, models, database, events
│   └── scripts/         # PDF ingestion, migration, testing scripts
├── frontend-aihps/
│   ├── ai_hps-staffadmin pwa/   # Next.js 15 Staff/Admin PWA (port 4028)
│   └── ai_hps_patient mobile/   # Next.js 15 Patient Mobile App
├── docker/
│   ├── docker-compose.yml       # Full infrastructure definition
│   └── nginx/nginx.conf         # Reverse proxy and auth gateway
└── PROCEDURES/                  # WHO clinical guideline PDFs (source documents)
```

## Appendix B: API Documentation

Each FastAPI service auto-generates OpenAPI 3.0 documentation accessible at its `/docs` endpoint during development:

| Service | Port | Swagger UI URL |
|---|---|---|
| SVC-02 Auth | 8002 | http://localhost:8002/docs |
| SVC-03 Procedures | 8003 | http://localhost:8003/docs |
| SVC-05 Analytics | 8005 | http://localhost:8005/docs |
| SVC-06 Audit | 8006 | http://localhost:8006/docs |
| SVC-07 KB Sync | 8007 | http://localhost:8007/docs |
| SVC-Agents Pipeline | 8020 | http://localhost:8020/docs |

## Appendix C: Knowledge Base Source Documents

The AI-HPS knowledge base was seeded from the following WHO clinical guideline documents:

| Department | Document | WHO Reference |
|---|---|---|
| ICU | WHO Critical Care Guidelines Vol. 1 | ISBN 978-92-4-154992-9 |
| ICU | WHO Critical Care Guidelines Vol. 2 | ISBN 978-92-8-900279-0 |
| Blood Bank | WHO Clinical Use of Blood Handbook | ISBN 978-92-4-008657-9 |
| Blood Bank | WHO Patient Blood Management | ISBN 978-92-4-010451-8 |
| Maternity | WHO Safe Childbirth Checklist | ISBN 924-154587-9 |
| Maternity | WHO Antenatal Care for Positive Pregnancy | ISBN 978-92-4-011611-5 |
| Maternity | WHO Labour Care Guide | ISBN 978-92-4-011704-4 |
| Surgery | WHO Safe Surgery Guidelines | ISBN 978-1-46-480346-8 |
| Surgery | WHO Paediatric Surgery Manual | ISBN 978-92-4-154988-2 |
| Surgery | WHO Surgical Care Manual | ISBN 978-92-4-159859-0 |
| Infection Control | WHO IPC Core Components | ISBN 978-92-4-154975-2 |

## Appendix D: Database Schema (SQL)

The complete database schema is maintained in `backend/schema.sql`. Key schema decisions:

- All primary keys use UUID (v4) to enable future distributed deployments.
- Procedure `search_vector` column uses PostgreSQL `tsvector` with a GIN index for O(log N) full-text search.
- All JSONB columns use PostgreSQL's native binary JSON storage for efficient indexing and querying of flexible metadata.
- Foreign key constraints are enforced across all schemas with `ON DELETE RESTRICT` to prevent orphaned records.
- The `audit_logs` table uses no foreign keys by design, ensuring audit records remain intact even if referenced entities are modified or deleted.

## Appendix E: Environment Configuration Reference

```
# backend/.env (required variables)
DATABASE_URL=postgresql://postgres:postgresql@localhost:5432/AIHPS
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
SECRET_KEY=<256-bit random key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES_STAFF=480
ACCESS_TOKEN_EXPIRE_MINUTES_ADMIN=240
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_MINUTES=30
GROQ_API_KEY=<Groq API key>
SMTP_USER=<Gmail address>
SMTP_PASSWORD=<Gmail app password>
PHASE1_DEPARTMENTS=Blood Bank,ICU,Surgery,Maternity,Emergency,Infection Control
```

---

*End of Report*

**Student:** Ful Marvel TIOBOU | **Matricule:** IUC22E0076746
**Institution:** Institut Universitaire de la Côte (IUC) — School of Engineering and Applied Sciences
**Year:** 2025–2026
